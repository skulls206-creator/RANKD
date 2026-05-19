# CODING-NOTES — RANKD

## What This Project Is
(No description yet — early stage TypeScript project.)

## Tech Stack
- pnpm monorepo
- TypeScript (strict: false)
- Vitest for testing
- Shared libs: db, api-client-react, api-zod, api-spec
- No main app artifact yet — still in setup

## Structure
```
/
├── lib/
│   ├── db/
│   ├── api-client-react/
│   ├── api-zod/
│   └── api-spec/
├── artifacts/           # Empty or minimal
└── package.json
```

## Build & Dev
- **Install:** `pnpm install`
- **Typecheck:** `pnpm run typecheck`
- **Test:** `pnpm test` / `pnpm test:watch`
- **Build:** `pnpm run build`

## Deploy
- GitHub Pages via `.github/workflows/deploy.yml` (pre-configured)

## TypeScript
- Root: strict: false. Enable strict: true early before codebase grows.
- Project references (tsc --build)

## Known Gotchas
- This is early-stage — architecture is not yet settled
- Uses the same lib patterns as ballpoint/foldr/rippd/streamd — consistent API approach

## Previous Bugs / Regressions
*(Fill in as they happen)*
