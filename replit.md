# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### RANKD (`artifacts/rankd/`)
- **Type**: React + Vite web app
- **Preview Path**: `/` (root)
- **Purpose**: Fair-launch cryptocurrency tracker — only coins with no pre-mine, no VC allocations, mined from genesis
- **Key Features**:
  - Live market data from CoinGecko API (free tier)
  - 20 curated fair-launch coins (BTC, LTC, XMR, DOGE, KAS, CRP, etc.)
  - Crypton (CRP) featured with rank among fair-launch peers
  - Stats bar: total fair market cap, coin count, Crypton rank, top coin
  - Search, sortable columns, "Why Fair" tooltips, 60s auto-refresh
- **Design**: Dark mode, amber/orange accent, Space Grotesk + JetBrains Mono fonts

### API Server (`artifacts/api-server/`)
- **Type**: Express 5 API server
- **Preview Path**: `/api`
- **Routes**:
  - `GET /api/healthz` — health check
  - `GET /api/fairlaunch/coins` — ranked list of fair-launch coins with live CoinGecko data
  - `GET /api/fairlaunch/stats` — aggregate stats (total market cap, Crypton rank, etc.)
- **Caching**: CoinGecko responses cached for 60 seconds

## Key Files

- `artifacts/api-server/src/lib/fair-launch-coins.ts` — curated fair-launch coin metadata list
- `artifacts/api-server/src/routes/fairlaunch.ts` — fair-launch API route handlers
- `artifacts/rankd/src/pages/Home.tsx` — main RANKD tracker UI
- `artifacts/rankd/src/lib/format.ts` — number/price formatting utilities
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contracts)
