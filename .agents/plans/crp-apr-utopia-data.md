# CRP APR & Utopia Data — Implementation Plan

> **Created**: 2026-05-18 (from Replit talk notes)
> **Status**: `[BUILT]` — see `artifacts/api-server/src/routes/fairlaunch.ts:294-439`
> **Next agent (nebula.gg)**: READ THIS BEFORE TOUCHING CRP APR CODE

## ⚠️ HARD GATE FOR NEBULA.GG

**Do not start coding until you have:**
1. Read the u.is API docs at https://u.is/docs/api.html (JS SPA — may need browser)
2. Pasted the exact JSON field name(s) for per-block CRP reward into this plan
3. Verified the field name matches what the VPS relay actually returns

The code currently guesses at field names (`blockReward`, `miningReward`, `treasuryReward`, `totalReward`). If the real field is something else (e.g. `rewardCoins`, `miningRewardCoins`), the APR will silently return null and fall back to the hardcoded 1%. **No error, no debug clue.**

Gates before any code change:
- [ ] Run `curl -X POST <VPS_URL>/api/1.0 ...` with the relay token and inspect `getMiningInfo` + `getMiningBlocksWithTreasury` full responses
- [ ] Document the exact field path for reward per block
- [ ] Update `fetchUtopiaNetworkData()` in `fairlaunch.ts` if the field name differs
- [ ] Verify `computeCrpApr()` returns a sensible number (expected range: 0.01–1.5%)

## What Exists (already built)

### API side — `fairlaunch.ts`
- **Utopia relay fetch**: `fetchUtopiaNetworkData()` calls VPS relay at `UTOPIA_VPS_URL/api/1.0` with `X-Relay-Token` header
  - Two parallel calls: `getMiningInfo` + `getMiningBlocksWithTreasury` (limit=3)
  - 5-minute cache via `utopiaNetworkCache`
  - Returns `{ nodeCount, blockReward, fetchedAt }`
- **APR computation**: `computeCrpApr(networkData)`:
  ```
  blocks_per_year = 525600 (1 block/min)
  reward_per_block = 64 CRP (current constant)
  max_supply = 64,000,000 CRP
  APR = (525600 × 64 ÷ active_nodes) ÷ 64000000 × 100
  ```
- **CoinPaprika/line + buildCoinResponse**: Live `stakingApr` from network data overrides hardcoded `meta.stakingApy`

### Frontend — `Home.tsx`
- Already renders `stakingApy` with `%` suffix in table + detail panel
- Already renders `activeNodes` with `toLocaleString()` format
- Already supports sort by `stakingApy` + `activeNodes`
- No UI changes needed

## What Needs Verification

1. **Does the relay return a reward-per-block field?** The code tries these keys (in order):
   - `getMiningInfo` top-level: `blockReward`, `miningReward`, `blockRewardCoins`
   - `getMiningBlocksWithTreasury` block object: `miningReward`, `blockReward`, `treasuryReward`, `totalReward`
2. **Is 64 CRP/block still correct?** Verify against explorer / block data.
3. **Are all fallbacks correct?** If relay is down, hardcoded 1% shows (graceful).

## Example Response (corrected, per-staker APR)

If 500 active nodes: `((525600 × 64) ÷ 500) ÷ 64 × 100 ≈ 105% APR`
If 100 active nodes: `((525600 × 64) ÷ 100) ÷ 64 × 100 ≈ 525% APR`
If 50 active nodes:  `((525600 × 64) ÷ 50)  ÷ 64 × 100 ≈ 1050% APR`

Realistic range given CRP's emission schedule is probably **10–200%** depending on how many nodes are active. The per-mining-reward block reward (not 64) is what the relay would return via `getMiningBlocksWithTreasury` — if that differs from 64, update `CRP_REWARD_PER_BLOCK` in `fairlaunch.ts:298`.

## File Map

| File | Lines | What |
|------|-------|------|
| `artifacts/api-server/src/routes/fairlaunch.ts` | 294-299 | CRP monetary constants |
| `artifacts/api-server/src/routes/fairlaunch.ts` | 301-321 | APR computation formula |
| `artifacts/api-server/src/routes/fairlaunch.ts` | 324-435 | `fetchUtopiaNetworkData()` — relay calls + field parsing |
| `artifacts/api-server/src/routes/fairlaunch.ts` | 437-439 | `fetchCrpDynamicApr()` convenience wrapper |
| `artifacts/api-server/src/routes/fairlaunch.ts` | 534-570 | `fetchCoinPaprikaData()` — uses `fetchUtopiaNetworkData()` |
| `artifacts/api-server/src/routes/fairlaunch.ts` | 573-600 | `buildCoinResponse()` — picks live `stakingApr` |
