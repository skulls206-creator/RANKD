# Plan: CRP APR math + deeper Utopia VPS data ingestion

**Owner**: nebula.gg agent
**Status**: Ready to pick up
**Last updated**: 2026-05-14 by replit-agent (open questions answered by maintainer)

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
- **Minimum stake per node**: `64 CRP` per node/server. **Linear, no tiers** — a user running 10 servers needs `640 CRP` (held or delegated to them). Hardcode `64` as a constant.
- **Reward per block**: variable, read from `getMiningBlocksWithTreasury` response. **Exact field name is unknown** — the full Utopia API spec is at **https://u.is/docs/api.html**. Read that doc first; the reward field will be documented there.

**Formula** (per active node, assuming the reward is split evenly across all `miningThreads`):

```
crp_per_block_per_node = avg_reward_per_block / active_nodes
crp_per_year_per_node  = crp_per_block_per_node × 35,040
apr_pct                = (crp_per_year_per_node / 64) × 100
```

Use an **average over a user-selectable window** to smooth per-block variance. Mirror the Web3-dapp convention of letting users toggle between 3 / 7 / 30 day averages for expected APY — we do the same for estimated APR here.

- **Default**: 3 days (`288 blocks`)
- **User-selectable options**: 3d (`288`), 7d (`672`), 30d (`2880`)
- The selected window is passed from the frontend as a query param (e.g. `?aprWindow=3d`), and the API caches each window separately.

Cache TTL per window: 15 minutes. The relay may paginate per-call (Utopia API has a `limit` param) — chunk requests if 2880 blocks exceeds a single response.

If `active_nodes` or `avg_reward_per_block` is null/zero, return `apr: null` and let the frontend render an explicit "—" or "unavailable" state. **Never invent a fallback APR number.** (AGENTS.md code conventions: "Errors should be loud, not silent.")

## Implementation plan

### Step 1 — Look up the response shape from the official Utopia API docs

Read **https://u.is/docs/api.html** first. Find the `getMiningBlocksWithTreasury` entry and note:
- The exact key name for the per-block reward amount
- The unit (raw integer vs. floating CRP — Utopia may report rewards in the smallest denomination)
- The pagination/limit cap per request (relevant for the 30-day window = 2880 blocks)

Cross-check by firing one curl from the API server side to see the real shape returned through our relay:

```bash
curl -X POST "$UTOPIA_VPS_URL/api/1.0" \
  -H "Content-Type: application/json" \
  -H "X-Relay-Token: $UTOPIA_RELAY_TOKEN" \
  -d '{"method":"getMiningBlocksWithTreasury","params":{"fromBlockId":0,"toBlockId":0,"limit":5}}'
```

Document the actual field name + unit in a comment at the top of `crp-apr.ts`. Then proceed.

### Step 2 — Add a CRP APR fetcher

New file: `artifacts/api-server/src/lib/crp-apr.ts`

Exports:
```ts
export type AprWindow = "3d" | "7d" | "30d";
export const APR_WINDOW_BLOCKS: Record<AprWindow, number> = {
  "3d": 288,
  "7d": 672,
  "30d": 2880,
};
export const CRP_MIN_STAKE = 64;

export interface CRPYieldData {
  apr: number | null;            // annualized percent, e.g. 12.5
  window: AprWindow;
  activeNodes: number | null;
  avgRewardPerBlock: number | null;
  sampleBlockCount: number;      // how many blocks actually averaged
  minStake: number;              // always 64 for now
  blockIntervalMinutes: number;  // always 15 for now
  computedAt: Date;
}

export async function getCRPYield(window?: AprWindow): Promise<CRPYieldData>;
```

Internals:
- Reuse the same `UTOPIA_VPS_URL` / `UTOPIA_RELAY_TOKEN` env pattern. If unset, return `apr: null` and don't throw.
- Default `window` to `"3d"` when unset.
- Pull the last `APR_WINDOW_BLOCKS[window]` blocks via `getMiningBlocksWithTreasury`. **Paginate if the Utopia API's per-call limit is below 2880** (check u.is/docs/api.html for the cap).
- Average the per-block reward, divide by active nodes from `getMiningInfo`, run the formula, return.
- **Separate 15-minute cache entry per window** — use a `Map<AprWindow, CRPYieldData>` so toggling between 3d/7d/30d doesn't blow away the cache.
- Use the existing `console.warn("[utopia-relay] ...")` log prefix for any fetch failures.

### Step 3 — Wire it into the coin response

In `artifacts/api-server/src/routes/fairlaunch.ts`:

- Accept an optional `aprWindow` query param on `GET /api/fairlaunch/coins` and `GET /api/fairlaunch/coins/:id`. Validate against `"3d" | "7d" | "30d"`; default to `"3d"`.
- Add `crpYieldData` to the parallel `Promise.all(...)` inside `refreshMarketDataCache()` so it lands alongside the node counts. Note: the cache key for the response now includes the window — either parameterize the cache or compute yield outside the main cache.
- In `buildCoin()` (around line 498), when `meta.id === "crp-crypton"`, populate `aprPct` (number | null) and `yieldMeta` (the full `CRPYieldData` minus the raw computation noise) on the coin response.
- Other coins return `aprPct: null` and `yieldMeta: null` — the field exists on the schema but is only computed for CRP today. Other PoS coins can be added later using the same pattern.

### Step 4 — Update the API contract

Edit `lib/api-spec/openapi.yaml`:
- Add `aprPct: { type: number, nullable: true }` to the `FairLaunchCoin` schema.
- Add `yieldMeta` as a nullable nested object with: `window` (enum: `3d`|`7d`|`30d`), `minStake` (number), `blockIntervalMinutes` (number), `sampleBlockCount` (number), `activeNodes` (number, nullable), `computedAt` (string, date-time).
- Add a query param `aprWindow` (optional, enum `3d`|`7d`|`30d`, default `3d`) to the `/fairlaunch/coins` and `/fairlaunch/coins/{id}` operations.

Then regen:
```bash
pnpm --filter @workspace/api-spec run codegen
```

This will update `lib/api-zod/` and `lib/api-client-react/` automatically. Don't edit those generated files by hand.

### Step 5 — Frontend rendering

In `artifacts/rankd/src/pages/Home.tsx`:
- The table already has a `YIELD` column (per the visible screenshot of the rendered app).
- For CRP specifically: render the live `aprPct` (e.g. "12.5% APR") instead of the static `yieldType` text. Fall back to the static text when `aprPct == null`.
- Hover tooltip should show: "Estimated APR based on last N blocks (Xd window) · 64 CRP min stake · 15 min blocks · last updated HH:MM UTC".

**Window selector (Web3-dapp pattern):**
- Add a small `3d / 7d / 30d` segmented toggle near the top of the page (next to the existing refresh control), not per-row.
- Default to `3d`. Persist user's choice to `localStorage` under key `rankd.aprWindow`.
- Pass the selected window as the `aprWindow` query param via the generated `useGetFairLaunchCoins` hook (the regenerated client will accept the new param after step 4).
- When the toggle changes, react-query refetches with the new param — no manual cache management needed.

Do NOT add a separate column or break the responsive layout. Just enrich the existing YIELD cell + add the window toggle in the header area.

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

## Answered open questions (locked in 2026-05-14)

1. **Min-stake**: ✅ Always 64 CRP per node/server. Linear scaling — 10 servers = 640 CRP. No tier system. Hardcode `CRP_MIN_STAKE = 64`.
2. **Reward field name**: ❓ Not known a priori. Source of truth is **https://u.is/docs/api.html**. Nebula: read that doc, find the `getMiningBlocksWithTreasury` reward field, document it in a code comment, and confirm via curl through the relay.
3. **Sample window**: ✅ Default **3 days**, with user-selectable toggle for **3d / 7d / 30d** (Web3-dapp convention). Default + options codified in `APR_WINDOW_BLOCKS` above.

## Things to watch out for

- **Block reward units**: Utopia rewards may be reported in the smallest denomination (similar to satoshis for BTC). If the docs at u.is/docs/api.html show a divisor (e.g. 1 CRP = 10^N raw units), apply it inside `crp-apr.ts`, not in the frontend. Frontend always receives clean CRP-denominated numbers.
- **Pagination cap**: A 30-day window needs 2,880 blocks. If the Utopia API caps `getMiningBlocksWithTreasury` at e.g. 1,000 per call, the fetcher must page through multiple calls and concat. Watch the relay's response times — if a 30d refresh takes >5s, consider pre-warming the 30d cache on a 15-minute timer alongside the existing node-count refresh in `startNodeCountRefresh()`.
- **`activeNodes` snapshot timing**: We currently read `activeNodes` once via `getMiningInfo`. That's a "right now" snapshot, but the historical average reward is over N days. This is technically inconsistent (rewards N days ago were split across however many nodes existed *then*, not now). If the docs expose per-block `activeNodes` / `miningThreads`, use the per-block value when dividing, not the current global value. This gives a more accurate historical APR.
- **Empty/zero handling**: If `activeNodes` is 0 (network silent) or `avg_reward_per_block` is 0 (some blocks have no treasury reward?), don't divide by zero — return `apr: null` and surface a tooltip explaining why.
- **AAR entry required**: Append an entry to `.agents/aar.md` after this lands describing exactly which reward field was used, what unit conversion (if any) was applied, and the verified live APR value at deploy time.
