# AGENTS.md

This project is built collaboratively by multiple AI agents working alongside the maintainer. This document is the shared contract.

## Who works on what

| Agent | Environment | Typical work |
|---|---|---|
| **Replit Agent** | The Replit workspace where the codebase originates | Big features, architectural changes, new artifacts, schema migrations, API additions, code review of substantive PRs from nebula.gg |
| **nebula.gg Agent** | Working off the GitHub repo | Bug fixes, small refactors, UI polish, copy changes, dependency bumps, can take on large features when needed. Reviews substantive PRs from Replit Agent. |
| **Maintainer** | Final approver | Reviews and merges. Picks who tackles what. |

Both agents are competent enough to work on anything; the split above is about **cost efficiency**, not capability. Default to the cheaper agent for routine work; reach for the more expensive one when the task genuinely needs deeper reasoning.

## Review model — After-Action Report (ARR)

Before any substantive change lands on `main`:

1. The implementing agent writes a short **ARR comment** on the PR/commit answering:
   - **What changed** (1–3 bullets)
   - **Why** (the user-visible or architectural reason)
   - **Risk** (what could break; any migrations or env changes required)
   - **Verification** (how it was tested, including any e2e/screenshot)
2. The reviewing agent reads the diff and the ARR, then replies with one of:
   - ✅ **Approved** — ready to merge
   - 🔁 **Changes requested** — list specific items
   - 🚫 **Blocked** — describe the structural concern; escalate to maintainer

Trivial changes (typo fixes, dependency patch bumps, doc-only edits) skip ARR.

## Architectural constraints — do not violate

These rules predate either agent and are not up for re-negotiation without maintainer sign-off:

1. **Never expose `marketCap`.** It exists internally as a sort key and may appear in private logs, but no public API response, UI element, URL parameter, or rendered chart may ever surface it. Only `volume24h` is public-facing.
2. **Fair-launch-only filter is sacred.** A coin appears on RANKD if and only if it had no premine, no VC allocation, no team allocation, no token sale. If you can't verify that for a new coin, don't add it.
3. **`relay.py` stays out of the repo.** It is gitignored intentionally. The user's VPS is the only place it should live.
4. **Secrets never enter the repo.** All credentials live in Replit Secrets (for the API server) and GitHub Actions secrets/variables (for the build).
5. **The Replit dev experience must keep working.** Any change that requires GitHub Pages-specific behavior must degrade gracefully when env vars are unset, so local Replit dev continues to function.
6. **Purple `#7C3AED`. Dark gaming aesthetic.** No light mode by default. The bar-chart logo is the brand.

## Project layout

```
artifacts/
  rankd/              # GH Pages — React + Vite UI
  api-server/         # Replit — Express + TypeScript API
  mockup-sandbox/     # Internal — design preview server, not deployed
lib/
  api-spec/           # OpenAPI yaml + orval config (source of truth for API)
  api-zod/            # Generated Zod schemas
  api-client-react/   # Generated react-query hooks + customFetch + setBaseUrl
  db/                 # Drizzle schema
```

After editing `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen` to regenerate clients.

## Code conventions

- **TypeScript strict.** No `any` without justification.
- **No unused imports, no dead code.** If a feature is yanked, delete its code.
- **Tailwind for styling.** No CSS-in-JS, no styled-components.
- **shadcn-style primitives** for UI components (already vendored in `artifacts/rankd/src/components/ui`).
- **Fetch only via the generated hooks** (`useGetFairLaunchCoins`, etc.). Don't add raw `fetch()` calls in components.
- **Errors should be loud, not silent.** When data is unavailable, render an explicit error/empty state — never fall back to a fake/mock value.
- **Caches are explicit.** API server caches have clear TTLs and named refresh functions. Don't add ad-hoc in-memory caching without documenting the TTL.

## Common workflows

### Adding a new fair-launch coin
1. Add the coin entry to `artifacts/api-server/src/lib/fair-launch-coins.ts` with verified fair-launch credentials in `whyFair`
2. Confirm CoinPaprika has price data for it (or add a special-case adapter)
3. Restart the API server workflow
4. Verify the row renders on the frontend with a sparkline

### Adding a new field to the coin schema
1. Edit `lib/api-spec/openapi.yaml`
2. Run `pnpm --filter @workspace/api-spec run codegen`
3. Update the fetch logic in `artifacts/api-server/src/routes/fairlaunch.ts` to populate the new field
4. Update `artifacts/rankd/src/pages/Home.tsx` to render it

### Updating the production API
The API is on Replit. Push commits, then redeploy via the Replit deployment UI. The GitHub-Pages frontend will pick up new data on its next fetch (60-second client refetch interval).

## Communication style

- Be terse and load-bearing. The maintainer prefers short specific paragraphs over long marketing-style explanations.
- Show your math when you cite numbers (APR, %, ranks, etc.).
- When you're wrong, just say so, correct it, and move on.
- Don't add emoji to code comments. Light emoji in PR descriptions is fine.
- No flattery, no "great question". Get to the point.
