# RANKD

A CoinMarketCap-style leaderboard for **fair-launch-only** cryptocurrencies — no pre-mines, no VC allocations, no insider wallets. Internally ranked by market cap (never exposed publicly); only 24-hour exchange volume is shown.

Live: **https://&lt;your-github-username&gt;.github.io/rankd/**

---

## What makes a coin "fair-launch"

Every coin on RANKD launched the way Bitcoin did:
- Mined openly from genesis with no premine
- No founder, team, or VC allocations
- No token sale, no airdrop, no insider allocations

If a project's economic history doesn't match that pattern, it doesn't appear on the leaderboard.

## Architecture

RANKD is three pieces that talk to each other across the internet:

```
┌────────────────────────────┐         ┌────────────────────────────┐         ┌──────────────────────┐
│ GitHub Pages (static)      │  HTTPS  │ Replit deployment          │  HTTPS  │ Your VPS             │
│ artifacts/rankd            │ ──────► │ artifacts/api-server       │ ──────► │ relay.py             │
│ React + Vite               │         │ Express + CoinPaprika      │         │ Utopia UAM node      │
└────────────────────────────┘         └────────────────────────────┘         └──────────────────────┘
```

- **Frontend** (`artifacts/rankd`) — React + Vite app, builds to static files, hosted on GitHub Pages
- **API server** (`artifacts/api-server`) — Express + TypeScript, hosted on Replit. Fetches CoinPaprika prices, GitHub release info, and the live Crypton (CRP) node count via the VPS relay. Aggressively cached so the public-facing endpoint responds in ~0.5 s.
- **Utopia relay** (`relay.py`) — Lightweight Python stdlib relay that runs on the user's VPS and forwards requests to the local Utopia node's UAM API. **This file is intentionally not in the repo** (gitignored) to avoid making relay internals public.

## Monorepo layout

```
artifacts/
  rankd/              # The public-facing UI (deploys to GitHub Pages)
  api-server/         # The Express API (deploys to Replit)
  mockup-sandbox/     # Internal: design-variant preview server (not deployed)
lib/
  api-zod/            # OpenAPI-generated Zod schemas
  api-client-react/   # OpenAPI-generated react-query hooks + customFetch wrapper
  api-spec/           # Orval config + the OpenAPI yaml
  db/                 # Drizzle ORM schema (Postgres)
```

The repo is a pnpm monorepo. Workspace deps are linked locally via `workspace:*` — no publishing required.

## Running locally on Replit

The Replit project is already wired up. Three workflows run in parallel:

| Workflow | Command | Purpose |
|---|---|---|
| `artifacts/rankd: web` | `pnpm --filter @workspace/rankd run dev` | Frontend on `$PORT` |
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` | API on its own `$PORT` |
| `artifacts/mockup-sandbox: Component Preview Server` | `pnpm --filter @workspace/mockup-sandbox run dev` | Internal design previews |

When running on Replit, the frontend calls the API on the same host (relative `/api/...` URLs) via the Replit artifact proxy — no CORS, no env vars needed.

## Building & deploying

### Frontend → GitHub Pages

Pushes to `main` trigger `.github/workflows/deploy.yml`, which:
1. Installs deps with pnpm
2. Builds `artifacts/rankd` with `BASE_PATH=/rankd/` and `VITE_API_BASE_URL=<repo variable>`
3. Publishes `artifacts/rankd/dist/public` to Pages

**Required GitHub repository variables** (Settings → Secrets and variables → Actions → Variables):
- `RANKD_API_BASE_URL` — full origin of the Replit-deployed API server (e.g. `https://your-app.replit.app`)
- `RANKD_BASE_PATH` *(optional)* — defaults to `/rankd/`; change if your repo name differs

**Pages settings**: Settings → Pages → Source → "GitHub Actions".

### First-time push to GitHub (one-time setup)

The Replit project is already a git repo on `main`. To create the public `rankd` repo and push:

```bash
# 1. Authenticate (opens a browser, paste the one-time code)
gh auth login                    # choose: GitHub.com → HTTPS → web browser

# 2. Create the repo and push in one shot
gh repo create rankd --public --source=. --remote=origin --push

# 3. Verify
git remote -v                    # should show origin → github.com/<you>/rankd
```

After the push:
1. Go to **Settings → Pages** in the new repo → set **Source: GitHub Actions**
2. Go to **Settings → Secrets and variables → Actions → Variables** and add:
   - `RANKD_API_BASE_URL` = your Replit deployment URL (e.g. `https://rankd-api.<your-user>.replit.app`)
   - `RANKD_BASE_PATH` = `/rankd/` (only if your repo name differs)
3. Push any commit (or click "Run workflow" on the Deploy action) to trigger the first build
4. Once the action completes, visit `https://<your-user>.github.io/rankd/`

### API → Replit deployment

Already deployed via Replit's deployment system. On the deployment, set:
- `CORS_ALLOWED_ORIGINS` — comma-separated list, must include the GitHub Pages origin: `https://<your-github-username>.github.io`
- `UTOPIA_VPS_URL`, `UTOPIA_RELAY_TOKEN`, `UTOPIA_API_TOKEN`, `UTOPIA_PUBLIC_KEY` — for the Crypton node-count relay
- All other secrets currently configured in the Replit dev workspace

## Configuration reference

### Frontend (Vite build-time env)
| Variable | Purpose | Required |
|---|---|---|
| `BASE_PATH` | The path the app is served from (`/rankd/` for Pages, `/` for root) | Yes (`vite.config.ts` enforces it) |
| `PORT` | Dev server port (Replit provides this) | Yes |
| `VITE_API_BASE_URL` | Absolute origin of the API server. Unset = relative URLs (Replit dev). | No |

### API server (runtime env)
| Variable | Purpose |
|---|---|
| `PORT` | Port to bind |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowlist. Unset = allow all (dev only). |
| `UTOPIA_VPS_URL` | Base URL of the Utopia relay (your VPS) |
| `UTOPIA_RELAY_TOKEN` | Shared secret sent as `X-Relay-Token` |
| `UTOPIA_API_TOKEN` | Optional Utopia UAM API token |

## The Utopia relay (`relay.py`)

A small Python stdlib HTTP relay that runs on your VPS and forwards JSON-RPC calls to the Utopia node's local API on `127.0.0.1:22824`. It is **not in this repo** to keep its internals private. To set up your own relay, contact the maintainer for the script (or write your own — the API server expects POST `/api/1.0` with `X-Relay-Token` auth and forwards the JSON body verbatim).

## Conventions

- **Never expose `marketCap`** in any API response or UI surface. It's an internal sort key. Only `volume24h` is public.
- **Purple brand**: `#7C3AED`. Dark-mode gaming aesthetic. Bar-chart logo.
- All API contracts live in `lib/api-spec/openapi.yaml`. Regenerate clients with `pnpm --filter @workspace/api-spec run codegen` after schema changes.
- TypeScript everywhere except `relay.py`.

## Contributing

See [`AGENTS.md`](./AGENTS.md) for the multi-agent collaboration model.
