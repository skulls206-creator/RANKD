# CHANGES — RANKD

> Shared change log for AI agents. Newest entry on top. One entry per meaningful change. Include commit SHAs and scope.

---

## 2026-05-18 — TypeScript strict mode enabled
**Author:** Satoshi (OpenClaw)
**Scope:** `tsconfig.base.json` (compilerOptions.strict: true), various source files
**Changes:**
- Enabled `strict: true` in `tsconfig.base.json` — cascades to all sub-tsconfigs via project references
- Fixed all type errors exposed by strict mode:
  - Fixed implicit 'any' on signal parameters in generated orval api.ts (4 locations)
  - Installed missing `zod` dependency
  - Fixed Express route types in admin.ts (checkAdminKey + route handlers)
  - Fixed CoinGeckoMarketData.image type (string → string | null)
- `pnpm run typecheck` passes clean

**Notes for next AI:**
- Strict mode is now enforced. Run `pnpm run typecheck` after any change before committing.
- The `strict: true` flag adds `strictFunctionTypes`, `strictNullChecks`, `strictPropertyInitialization`, `noImplicitAny`, `noImplicitThis`, `alwaysStrict`, `useUnknownInCatchVariables`, and `strictBindCallApply`.
- Sub-tsconfigs with `"extends": "./tsconfig.base.json"` inherit this automatically.
