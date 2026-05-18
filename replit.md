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
- **API codegen**: Orval (from OpenAPI spec) — generated files updated manually
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
  - Live market data from CoinGecko (free tier) for 25 coins + CoinPaprika for Crypton (CRP)
  - 26 curated fair-launch coins (BTC, LTC, XMR, DOGE, KAS, ZEN, NANO, XVG, ARRR, HNS, SIGNA, CRP, etc.)
  - Crypton (CRP) featured with rank among fair-launch peers; price from CoinPaprika, supply from Utopia Explorer
  - Stats bar: total fair market cap, coin count, Crypton rank, top coin
  - Search, sortable columns, "Why Fair" shield tooltips, 60s auto-refresh
  - **Click-to-expand row detail panel**: 7-day recharts price chart, key stats, links (website/explorer/github), fair launch story
  - Each coin has metadata: algorithm, website, explorer, github
- **Design**: Dark mode, vivid purple accent (#7C3AED / `262 83% 58%`), Space Grotesk + JetBrains Mono fonts
- **PWA**: Full Progressive Web App — manifest.json, sw.js service worker, all icon sizes (16/32/96/192/512px + apple-touch-icon)
- **Logo**: Purple bar-chart icon (favicon.svg) matching the neon-purple gaming theme; shown in browser tab and app header

### API Server (`artifacts/api-server/`)
- **Type**: Express 5 API server
- **Preview Path**: `/api`
- **Routes**:
  - `GET /api/healthz` — health check
  - `GET /api/fairlaunch/coins` — ranked list of fair-launch coins with live market data
  - `GET /api/fairlaunch/coins/:id/chart` — 7-day hourly price data for a coin (10-min cache)
  - `GET /api/fairlaunch/stats` — aggregate stats (total market cap, Crypton rank, etc.)
- **Caching**: Coins list cached 60 seconds; chart data cached 10 minutes per coin

## Data Sources
- **CoinGecko** (free tier): price, market cap, supply for all coins except CRP; 7-day chart data
- **CoinPaprika**: price + 24h% for CRP (Crypton)
- **Utopia P2P Explorer** (`utopian.is/api/explorer/blocks/get`): real CRP circulating supply

## Key Files

- `artifacts/api-server/src/lib/fair-launch-coins.ts` — curated fair-launch coin metadata (26 coins)
- `artifacts/api-server/src/routes/fairlaunch.ts` — fair-launch API route handlers
- `artifacts/rankd/src/pages/Home.tsx` — main RANKD tracker UI with expandable row panels
- `artifacts/rankd/src/lib/format.ts` — number/price formatting utilities
- `artifacts/rankd/public/crp-logo.png` — Crypton crystal gem logo (128x128, transparent)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contracts)
- `lib/api-zod/src/generated/api.ts` — Zod schemas (manually updated to match spec)
- `lib/api-client-react/src/generated/api.ts` — React Query hooks (manually updated)
- `lib/api-client-react/src/generated/api.schemas.ts` — TypeScript types (manually updated)

## Handoff notes

- Relay now requires `UAM_UPSTREAM_URL` on the VPS.
- Live VPS tests showed `127.0.0.1:22824` is closed and the UAM listen sockets on `59962`, `51605`, and `6076` are not HTTP.
- `relay.py` can only forward HTTP JSON to a real upstream endpoint; it cannot talk to the live UAM sockets directly.
- Next step is a binary bridge or official UAM HTTP endpoint from the VPS side, not more URL tweaks in the repo.
