# Plan: CRP APR math + deeper Utopia VPS data ingestion

**Owner**: nebula.gg agent
**Status**: Ready to pick up
**Last updated**: 2026-05-14 by replit-agent

## Context

We already have a working relay from the Replit API server → user's VPS → Utopia daemon. The relay is hit by `fetchUtopiaNodeCount()` in `artifacts/api-server/src/routes/fairlaunch.ts` (lines 243–307). It uses two env vars on the API server:

- `UTOPIA_VPS_URL` — base URL of `relay.py` on the VPS (e.g. `https://vps.example.com`)
- `UTOPIA_RELAY_TOKEN` — shared secret, sent as `X-Relay-Token` header

The relay accepts `POST {UTOPIA_VPS_URL}/api/1.0` with body `{ "method": "...", "params": {...} }`. Two methods are already exercised:

1. `getMiningInfo` — returns `miningThreads` / `activeNodes` / `nodesCount` (we read the first one that's non-null)
2. `getMiningBlocksWithTreasury` with `{ fromBlockId, toBlockId, limit }` — used today only as a fallback to extract `miningThreads` from the latest block

**`relay.py` lives on the VPS and is gitignored (AGENTS.md rule #3). Do not try to add it to the repo.**

## Goal

Compute and display a real, live **CRP staking APR** on the CRP row in the RANKD frontend, sourced from on-chain reward data via the VPS relay.

## The math (verify these constants before building)

- **Block interval**: 15 minutes (Utopia/CRP confirmed)
- **Blocks per year**: `4 × 24 × 365 = 35,040`
- **Minimum stake per node**: `64 CRP` (Utopia PoS Staking threshold — confirm via relay or Utopia docs before hardcoding)
- **Reward per block**: variable, read from `getMiningBlocksWithTreasury` response. Field name is likely `treasury` / `treasuryAmount` / `blockReward` — inspect actual response shape before locking in.

**Formula** (per active node, assuming the reward is split evenly across all `miningThreads`):

```
crp_per_block_per_node = avg_reward_per_block / active_nodes
crp_per_year_per_node  = crp_per_block_per_node × 35,040
apr_pct                = (crp_per_year_per_node / 64) × 100
```

Use an **average over the last N blocks** (suggest N=288 → last 3 days at 15-min blocks) to smooth out per-block variance. Cache the result for 15 minutes so we're not hammering the VPS.

If `active_nodes` or `avg_reward_per_block` is null/zero, return `apr: null` and let the frontend render an explicit "—" or "unavailable" state. **Never invent a fallback APR number.** (AGENTS.md code conventions: "Errors should be loud, not silent.")

## Implementation plan

### Step 1 — Inspect the relay's actual block-data response

Before coding, fire one curl from the API server side to see the real shape of `getMiningBlocksWithTreasury`:

```bash
curl -X POST "$UTOPIA_VPS_URL/api/1.0" \
  -H "Content-Type: application/json" \
  -H "X-Relay-Token: $UTOPIA_RELAY_TOKEN" \
  -d '{"method":"getMiningBlocksWithTreasury","params":{"fromBlockId":0,"toBlockId":0,"limit":5}}'
```

Document the actual field names you see in a comment at the top of the new code. Then proceed.

### Step 2 — Add a CRP APR fetcher

New file: `artifacts/api-server/src/lib/crp-apr.ts`

Exports:
```ts
export interface CRPYieldData {
  apr: number | null;            // annualized percent, e.g. 12.5
  activeNodes: number | null;
  avgRewardPerBlock: number | null;
  sampleBlockCount: number;      // how many blocks averaged
  computedAt: Date;
}

export async function getCRPYield(): Promise<CRPYieldData>;
```

Internals:
- Reuse the same `UTOPIA_VPS_URL` / `UTOPIA_RELAY_TOKEN` env pattern. If unset, return `apr: null` and don't throw.
- Pull last 288 blocks via `getMiningBlocksWithTreasury` (paginate if the relay caps per-call limit).
- Average the per-block reward, divide by active nodes from `getMiningInfo`, run the formula, return.
- 15-minute in-memory cache — same pattern as `utopiaNodeCountCache` in `fairlaunch.ts`.
- Use the existing `console.warn("[utopia-relay] ...")` log prefix for any fetch failures.

### Step 3 — Wire it into the coin response

In `artifacts/api-server/src/routes/fairlaunch.ts`:

- Add `crpYieldData` to the parallel `Promise.all(...)` inside `refreshMarketDataCache()` so it lands alongside the node counts.
- In `buildCoin()` (around line 498), when `meta.id === "crp-crypton"`, populate two new fields on the coin response: `aprPct` and `yieldMeta` (or extend the existing `yieldType` shape — your call, but keep it backwards-compatible with the OpenAPI schema in `lib/api-spec/openapi.yaml`).

### Step 4 — Update the API contract

Edit `lib/api-spec/openapi.yaml`:
- Add `aprPct: { type: number, nullable: true }` to the `FairLaunchCoin` schema.
- Optionally add `yieldMeta` as a nested object with `minStake`, `blockInterval`, `sampleBlockCount`, `computedAt`.

Then regen:
```bash
pnpm --filter @workspace/api-spec run codegen
```

This will update `lib/api-zod/` and `lib/api-client-react/` automatically. Don't edit those generated files by hand.

### Step 5 — Frontend rendering

In `artifacts/rankd/src/pages/Home.tsx`:
- The table already has a `YIELD` column (per the visible screenshot of the rendered app).
- For CRP specifically: render the live `aprPct` (e.g. "12.5% APR") instead of the static `yieldType` text. Fall back to the static text when `aprPct == null`.
- Hover tooltip should show: "Based on last N blocks · 64 CRP min stake · 15 min blocks · last updated HH:MM UTC".

Do NOT add a separate column or break the responsive layout. Just enrich the existing YIELD cell.

### Step 6 — Verification checklist

1. `curl -s https://rankd-x.replit.app/api/fairlaunch/coins | jq '.coins[] | select(.id=="crp-crypton") | {aprPct, activeNodes}'` → returns a real number, not null (assuming VPS env vars are set on the deployment).
2. Refresh `https://rankd.khurk.xyz`, find the CRP row, confirm the YIELD cell shows a live percentage.
3. Watch API server logs for any `[utopia-relay]` warnings — there should be none under normal operation.
4. Append an AAR entry to `.agents/aar.md` describing what landed.

## Constraints

- **No `marketCap` exposure** — APR is fine to expose; market cap stays internal (AGENTS.md rule #1).
- **No fake fallbacks** — if VPS env vars missing or relay down, `apr` is `null` and the UI says so explicitly.
- **`relay.py` stays on VPS** — if you need new RPC methods on the relay side, write them up in `.agents/plans/relay-endpoint-changes.md` and ping the maintainer to update the VPS. Do not touch the relay from this repo.
- **Backwards-compatible OpenAPI changes only** — new fields are optional/nullable so the existing GH-Pages bundle doesn't break before it's rebuilt.

## Open questions for the maintainer

1. **Min-stake confirmation** — is it 64 CRP across all node types, or do different node tiers have different thresholds? If tiered, we need a `nodeTier` enum and per-tier APR.
2. **Reward field name** — exact key in the `getMiningBlocksWithTreasury` response (need a sample to lock this in).
3. **Sample window** — 288 blocks (~3 days) is a reasonable default; the user may want 1 day or 7 days based on how stable they think the reward is.

Drop answers inline in this file or in `.agents/aar.md` when known.
