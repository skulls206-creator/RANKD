import { Router, type IRouter } from "express";
import {
  GetFairLaunchCoinsQueryParams,
  GetFairLaunchCoinsResponse,
  GetFairLaunchStatsResponse,
  GetCoinChartResponse,
} from "@workspace/api-zod";
import {
  FAIR_LAUNCH_COINS,
  COINGECKO_IDS,
  COINPAPRIKA_COINS,
  type FairLaunchCoinMeta,
} from "../lib/fair-launch-coins";
import { getCRPOverrides } from "../lib/crp-config";

const router: IRouter = Router();

interface CoinGeckoMarketData {
  id: string;
  symbol: string;
  name: string;
  image: string | null;
  current_price: number | null;
  market_cap: number | null;
  total_volume: number | null;
  circulating_supply: number | null;
  price_change_percentage_30d_in_currency: number | null;
  sparkline_in_7d?: { price: number[] } | null;
}

interface CoinPaprikaMarketData {
  id: string;
  symbol: string;
  name: string;
  circulating_supply: number | null;
  total_supply: number | null;
  quotes: {
    USD: {
      price: number | null;
      market_cap: number | null;
      volume_24h?: number | null;
      percent_change_30d?: number | null;
    };
  };
}

interface GitHubRelease {
  tag_name: string;
  published_at: string;
}

interface GitHubReleaseCache {
  softwareVersion: string | null;
  lastReleasedAt: string | null;
  fetchedAt: Date;
}

const GITHUB_CACHE_TTL_MS = 6 * 60 * 60_000;
const GITHUB_CACHE_ERROR_TTL_MS = 5 * 60_000; // on error retry after 5 min instead of 6 hours
const GITHUB_REFRESH_INTERVAL_MS = 5 * 60 * 60_000; // shorter than TTL so entries never expire between runs
const GITHUB_STAGGER_DELAY_MS = 2_000;
const githubReleaseCache = new Map<string, GitHubReleaseCache>();

interface LiveNodeEntry {
  count: number;
  fetchedAt: Date;
}
const liveNodeCache = new Map<string, LiveNodeEntry>();
const LIVE_NODE_TTL_MS = 30 * 60_000;

function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 5_000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeout));
}

async function fetchBitcoinNodeCount(): Promise<number | null> {
  const cached = liveNodeCache.get("bitcoin");
  if (cached && Date.now() - cached.fetchedAt.getTime() < LIVE_NODE_TTL_MS) return cached.count;
  try {
    const resp = await fetchWithTimeout("https://bitnodes.io/api/v1/snapshots/latest/", {
      headers: { Accept: "application/json" },
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as { total_nodes: number };
    const count = data?.total_nodes;
    if (!count) return null;
    liveNodeCache.set("bitcoin", { count, fetchedAt: new Date() });
    return count;
  } catch {
    return null;
  }
}

async function fetchFluxNodeCount(): Promise<number | null> {
  const cached = liveNodeCache.get("zelcash");
  if (cached && Date.now() - cached.fetchedAt.getTime() < LIVE_NODE_TTL_MS) return cached.count;
  try {
    const resp = await fetchWithTimeout("https://api.runonflux.io/daemon/getzelnodecount", {
      headers: { Accept: "application/json" },
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as { status: string; data: { total: number } };
    const count = data?.data?.total;
    if (!count) return null;
    liveNodeCache.set("zelcash", { count, fetchedAt: new Date() });
    return count;
  } catch {
    return null;
  }
}

async function fetchMoneroNodeCount(): Promise<number | null> {
  const cached = liveNodeCache.get("monero");
  if (cached && Date.now() - cached.fetchedAt.getTime() < LIVE_NODE_TTL_MS) return cached.count;
  try {
    const resp = await fetchWithTimeout("https://monero.fail/nodes.json", {
      headers: { Accept: "application/json" },
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as { monero: { clear: string[]; i2p: string[]; onion: string[] } };
    const xmr = data?.monero;
    if (!xmr) return null;
    const count = (xmr.clear?.length ?? 0) + (xmr.i2p?.length ?? 0) + (xmr.onion?.length ?? 0);
    if (!count) return null;
    liveNodeCache.set("monero", { count, fetchedAt: new Date() });
    return count;
  } catch {
    return null;
  }
}

interface NormalizedMarketData {
  id: string;
  price: number | null;
  marketCap: number | null;
  volume24h: number | null;
  circulatingSupply: number | null;
  change30d: number | null;
  imageUrl: string | null;
  activeNodes?: number | null;
  /** Live-computed staking APR (e.g. CRP from Utopia network data) */
  stakingApr?: number | null;
}

interface CacheEntry {
  coingecko: CoinGeckoMarketData[];
  coinpaprika: Map<string, NormalizedMarketData>;
  fetchedAt: Date;
}

interface ChartCacheEntry {
  prices: number[][];
  fetchedAt: Date;
}

let cache: CacheEntry | null = null;
let isRefreshing = false;
const CACHE_TTL_MS = 5 * 60_000;

const chartCache = new Map<string, ChartCacheEntry>();
const CHART_CACHE_TTL_MS = 30 * 60_000;

async function fetchChartForCoin(id: string): Promise<number[][] | null> {
  const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=7`;
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    const data = (await response.json()) as { prices: number[][] };
    return data.prices ?? [];
  } catch {
    return null;
  }
}

// Fetch 7-day daily price history for CRP from CoinPaprika (free-tier supports
// daily intervals going back months — hourly requires a paid plan).
async function fetchCRPChartFromCoinPaprika(): Promise<number[][] | null> {
  const start = new Date(Date.now() - 7 * 24 * 3600_000).toISOString().split(".")[0] + "Z";
  const url = `https://api.coinpaprika.com/v1/tickers/crp-crypton/historical?start=${start}&interval=1d`;
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    const data = (await response.json()) as Array<{ timestamp: string; price: number }>;
    if (!Array.isArray(data) || data.length === 0) return null;
    return data.map((d) => [new Date(d.timestamp).getTime(), d.price]);
  } catch {
    return null;
  }
}

// Seed the chart cache from the sparkline_in_7d field returned by the markets
// endpoint. This uses a single API call instead of one call per coin, keeping
// us well within CoinGecko's free-tier rate limit.
function seedChartCacheFromSparklines(
  coingeckoData: CoinGeckoMarketData[],
  logger: { info: (msg: string) => void },
): void {
  const now = Date.now();
  let seeded = 0;
  for (const d of coingeckoData) {
    const prices = d.sparkline_in_7d?.price;
    if (!prices || prices.length === 0) continue;
    // Reconstruct hourly timestamps: sparkline covers the past `prices.length`
    // hours ending at roughly now.
    const intervalMs = 3600_000;
    const pairs: number[][] = prices.map((p, i) => [
      now - (prices.length - 1 - i) * intervalMs,
      p,
    ]);
    const existing = chartCache.get(d.id);
    if (existing && existing.prices.length > 0 && now - existing.fetchedAt.getTime() < CHART_CACHE_TTL_MS) {
      continue;
    }
    chartCache.set(d.id, { prices: pairs, fetchedAt: new Date() });
    seeded++;
  }
  if (seeded > 0) logger.info(`Chart cache: seeded ${seeded} coins from sparkline data`);
}

// Eagerly populate the chart cache on startup by triggering the first market
// data fetch. Chart data arrives via sparklines bundled in the CoinGecko bulk
// response — no extra API calls needed. After this, the first user request to
// the chart endpoint will find a warm cache.
export async function startChartCacheWarmup(logger?: {
  info: (msg: string) => void;
  error: (msg: string) => void;
}): Promise<void> {
  try {
    await getCache();
    logger?.info("Chart cache: warmed up from initial market data fetch");
  } catch (err) {
    logger?.error(`Chart cache: initial warmup failed: ${(err as Error).message}`);
  }
}

async function fetchCoinGeckoData(): Promise<CoinGeckoMarketData[]> {
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${encodeURIComponent(COINGECKO_IDS)}&order=market_cap_desc&per_page=250&page=1&sparkline=true&price_change_percentage=30d`;

  // Retry the bulk call twice with linear backoff
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { headers: { Accept: "application/json" } });
      if (response.ok) {
        return response.json() as Promise<CoinGeckoMarketData[]>;
      }
      if (response.status === 429 && attempt < 2) {
        // Rate limited — wait and retry
        await new Promise((r) => setTimeout(r, 1_000 * (attempt + 1)));
        continue;
      }
      console.warn(`CoinGecko bulk API error: ${response.status} (attempt ${attempt + 1})`);
    } catch {
      console.warn(`CoinGecko bulk fetch network error (attempt ${attempt + 1})`);
    }
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 1_000 * (attempt + 1)));
    }
  }

  // Bulk call exhausted all retries — fall back to individual coin lookups.
  // This is slower but ensures every coin gets a chance at live price data.
  console.warn("CoinGecko bulk failed, falling back to per-coin fetches");
  const ids = COINGECKO_IDS.split(",");
  const results: CoinGeckoMarketData[] = [];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]!;
    try {
      const resp = await fetch(
        `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=true`,
        { headers: { Accept: "application/json" } },
      );
      if (resp.ok) {
        const data = (await resp.json()) as Record<string, unknown>;
        results.push({
          id,
          symbol: (data.symbol as string) ?? "",
          name: (data.name as string) ?? "",
          image: ((data.image as Record<string, string>)?.large ?? null) as string | null,
          current_price: ((data.market_data as Record<string, unknown>)?.current_price as Record<string, number>)?.usd ?? null,
          market_cap: ((data.market_data as Record<string, unknown>)?.market_cap as Record<string, number>)?.usd ?? null,
          total_volume: ((data.market_data as Record<string, unknown>)?.total_volume as Record<string, number>)?.usd ?? null,
          circulating_supply: (data.market_data as Record<string, unknown>)?.circulating_supply as number | null ?? null,
          price_change_percentage_30d_in_currency: null,
          sparkline_in_7d: null,
        });
      }
    } catch {
      // Individual coin fetch failed — skip; coin will show null data
    }
    if (i < ids.length - 1) {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  return results;
}

/** CRP monetary constants */
const CRP_BLOCKS_PER_YEAR = 35_040; // 1 block / 15 min × 4 blocks/h × 24 h × 365 d
const CRP_REWARD_PER_BLOCK = 48; // ~48 CRP per block (pool-shared among active nodes)
const CRP_MAX_SUPPLY = 64_000_000; // 64M CRP total
/** Minimum stake to run a node (CRP). APR = per-staker annual yield ÷ this denominator. */
const CRP_MIN_STAKE = 64;

interface UtopiaNetworkData {
  nodeCount: number | null;
  /** Raw block reward (CRP per block) as seen on the latest block */
  blockReward: number | null;
  fetchedAt: Date;
}

/**
 * If set, overrides the explorer's miningThreads count with your local UAM value.
 * Set this in Replit deployment secrets (CRP_ACTIVE_NODES=7237) for a quick
 * manual update without touching code. Faster than the explorer (real-time),
 * but needs manual bumping.
 */
function resolveCrpActiveNodes(explorerCount: number | null): number | null {
  const envOverride = process.env["CRP_ACTIVE_NODES"];
  if (envOverride) {
    const n = parseInt(envOverride, 10);
    if (!isNaN(n) && n > 0) return n;
  }
  return explorerCount;
}

let utopiaNetworkCache: { entry: UtopiaNetworkData | null } = { entry: null };
const UTOPIA_NODE_TTL_MS = 5 * 60_000;

function computeCrpApr(networkData: UtopiaNetworkData | null): number | null {
  const { nodeCount, blockReward } = networkData ?? { nodeCount: null, blockReward: null };
  if (nodeCount == null || nodeCount <= 0) return null;
  // Use explorer-provided reward if available, otherwise fall back to the known constant.
  // The file-fallback exists because the explorer API may be down or rate-limited.
  const effectiveReward = (blockReward != null && blockReward > 0) ? blockReward : CRP_REWARD_PER_BLOCK;
  // Per-staker APR: each block rewards ~48 CRP shared across all active nodes.
  // Blocks arrive every ~15 min (semi-random, max 96/day).
  //
  // Per-staker yield = (blocks/yr × reward/block) ÷ active_nodes → CRP earned
  // per staker per year.
  //
  // APR = (per-staker yield ÷ min stake) × 100
  //
  // Example at 500 nodes:
  //   yield_per_staker = (35,040 × 48) ÷ 500 = 3,363.84 CRP/yr
  //   APR = (3,363.84 ÷ 64) × 100 ≈ 5,256%
  //
  // Note: this is the return on the *minimum* 64 CRP stake. A staker with
  // more CRP locked earns the same absolute reward, so their effective APR
  // is proportionally lower (e.g. 640 CRP staked → 5,256% ÷ 10 = 525.6%).
  const totalAnnualYield = CRP_BLOCKS_PER_YEAR * effectiveReward;
  const yieldPerStaker = totalAnnualYield / nodeCount;
  const apr = (yieldPerStaker / CRP_MIN_STAKE) * 100;
  return Math.round(apr * 100) / 100; // round to 2 decimal places
}

// ── UAM API Client ────────────────────────────────────────────────────────

/**
 * Post a JSON-RPC call to your personal UAM instance at uam.khurk.xyz.
 * Falls back to the public utopian.is explorer when UAM is unavailable
 * or hasn't finished syncing.
 */
const UAM_API_URL =
  process.env["UAM_API_URL"] ?? "https://uam.khurk.xyz/api/1.0";
const UAM_API_TOKEN =
  process.env["UAM_API_TOKEN"] ?? "";

type UamJsonRpcResponse<T> = { result: T; error?: never } | { result?: never; error: string };

async function uamRpc<T>(method: string, params: Record<string, unknown> = {}): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const resp = await fetchWithTimeout(
      UAM_API_URL,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, params, token: UAM_API_TOKEN }),
      },
      10_000,
    );
    if (!resp.ok) {
      return { ok: false, error: `UAM HTTP ${resp.status}` };
    }
    const json = (await resp.json()) as UamJsonRpcResponse<T>;
    if (json.error) {
      return { ok: false, error: json.error };
    }
    return { ok: true, data: json.result as T }; // guarded by discriminant check above
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ── Explorer fallback ──────────────────────────────────────────────────────

interface ExplorerBlock {
  id: number;
  block: number;
  miningThreads: string;
  RewardPerThread: string;
  BlockReward: string;
  TotalCRPAmount: string;
  CRPSupply: string;
  TotalCRPTransferred: string;
  CRPTransferred: string;
  CRPTransactions: string;
  TotalCRPTransactions: string;
  USDTSupply: string;
  created_at: string;
  updated_at: string;
}

async function fetchExplorerLatestBlock(): Promise<{ nodeCount: number; blockReward: number; crpSupply: number } | null> {
  try {
    const resp = await fetchWithTimeout(
      "https://utopian.is/api/explorer/blocks/get?fromBlockId=0&toBlockId=0&limit=1",
      { headers: { Accept: "application/json" } },
      10_000,
    );
    if (!resp.ok) {
      console.warn(`[explorer-fallback] HTTP ${resp.status}`);
      return null;
    }
    const data = (await resp.json()) as ExplorerBlock[] | { blocks: ExplorerBlock[] };
    const blocks = Array.isArray(data) ? data : (data.blocks ?? []);
    if (!Array.isArray(blocks) || blocks.length === 0) {
      console.warn("[explorer-fallback] no blocks");
      return null;
    }
    const block = blocks[0];
    const nodeCount = parseInt(String(block.miningThreads), 10);
    const blockReward = parseFloat(String(block.BlockReward));
    const crpSupply = parseFloat(String(block.CRPSupply));
    if (isNaN(nodeCount) || isNaN(blockReward)) return null;
    return { nodeCount, blockReward, crpSupply };
  } catch (err) {
    console.warn("[explorer-fallback] fetch failed:", (err as Error).message);
    return null;
  }
}

/**
 * Fetch Utopia network data from your personal UAM instance (primary) or
 * the public utopian.is explorer (fallback). Cached for 5 minutes.
 *
 * Data flow:
 *   1. Try UAM getMiningBlocksWithTreasury for latest block
 *   2. If UAM returns empty (not synced yet), fall back to explorer
 *   3. If neither works, return null
 */
async function fetchUtopiaNetworkData(): Promise<UtopiaNetworkData | null> {
  const cached = utopiaNetworkCache.entry;
  if (cached && Date.now() - cached.fetchedAt.getTime() < UTOPIA_NODE_TTL_MS) {
    return cached;
  }

  const store = (data: UtopiaNetworkData) => {
    utopiaNetworkCache.entry = data;
    return data;
  };
  const emptyStore = () => store({ nodeCount: null, blockReward: null, fetchedAt: new Date() });

  // ── Primary: your UAM node ────────────────────────────────────────────
  try {
    // Get the latest block(s) — getMiningBlocksWithTreasury returns an array at result.
    // The latest block id tells us how synced the node is (current real block ≈ 226278).
    // If the node is still syncing (only genesis-era blocks), fall through to explorer.
    const blockInfo = await uamRpc<
      { id: number; numberMiners: number; dateTime: string }[]
    >(
      "getMiningBlocksWithTreasury",
      { fromBlockId: 227000, toBlockId: 300000 },
    );

    if (blockInfo.ok && Array.isArray(blockInfo.data) && blockInfo.data.length > 0) {
      const sorted = [...blockInfo.data].sort((a, b) => b.id - a.id);
      const latest = sorted[0];
      // Only trust UAM data if it has synced past the genesis epoch
      // (block 226278 at ~May 2026 — if block id is below ~200K we're still syncing)
      if (latest.id > 100_000) {
        const nodeCount = latest.numberMiners ?? null;
        const resolvedCount = resolveCrpActiveNodes(nodeCount);
        console.log(`[uam] network data via ${UAM_API_URL}: ${resolvedCount} nodes (block ${latest.id})`);
        return store({ nodeCount: resolvedCount, blockReward: CRP_REWARD_PER_BLOCK, fetchedAt: new Date() });
      }
      console.log(`[uam] node still syncing (latest block ${latest.id} from ${latest.dateTime}), falling through`);
    }

    console.log("[uam] getMiningBlocksWithTreasury returned empty or stale — node is still syncing");

    const sysInfo = await uamRpc<{ numberOfConnections: number }>("getSystemInfo", {});
    if (sysInfo.ok) {
      // Use numberOfConnections as a proxy for network health;
      // fall through to explorer for real block data
      console.log(`[uam] system info: ${sysInfo.data.numberOfConnections} connections, uptime info available`);
    }
  } catch (err) {
    console.warn("[uam] RPC call failed:", (err as Error).message);
  }

  // ── Fallback: public explorer ────────────────────────────────────────
  console.log("[utopia] falling back to public explorer");
  const explorer = await fetchExplorerLatestBlock();
  if (explorer) {
    const resolvedCount = resolveCrpActiveNodes(explorer.nodeCount);
    return store({ nodeCount: resolvedCount, blockReward: explorer.blockReward, fetchedAt: new Date() });
  }

  // ── Last resort: env override ────────────────────────────────────────
  const envOverride = resolveCrpActiveNodes(null);
  if (envOverride != null) {
    return store({ nodeCount: envOverride, blockReward: CRP_REWARD_PER_BLOCK, fetchedAt: new Date() });
  }

  return emptyStore();
}

/** Legacy wrapper — returns just the node count */
async function fetchUtopiaNodeCount(): Promise<number | null> {
  const data = await fetchUtopiaNetworkData();
  return data?.nodeCount ?? null;
}

/** Returns dynamic APR for CRP, computed from live network data, or falls back to the hardcoded stakingApy */
async function fetchCrpDynamicApr(): Promise<number | null> {
  const networkData = await fetchUtopiaNetworkData();
  return computeCrpApr(networkData);
}

/** Returns live CRP supply from the UAM instance or explorer fallback */
async function fetchCrpSupply(): Promise<number | null> {
  // Try UAM treasury info first — getTreasuryCrpSupply returns { totalSupply: string, records: [...] }
  const treasury = await uamRpc<{ totalSupply: string }>(
    "getTreasuryCrpSupply",
    {},
  );
  if (treasury.ok && treasury.data?.totalSupply) {
    return parseFloat(treasury.data.totalSupply);
  }

  // Fall back to explorer
  const explorer = await fetchExplorerLatestBlock();
  return explorer?.crpSupply ?? null;
}

/**
 * Build GitHub API request headers.
 * GITHUB_TOKEN should be treated as a secret — it grants elevated API rate
 * limits tied to your account. Keep it out of version control and logs.
 */
function buildGitHubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = process.env["GITHUB_TOKEN"];
  if (token) {
    if (!token.startsWith("github_pat_") && !token.startsWith("ghp_")) {
      console.warn("GITHUB_TOKEN may have overly broad permissions. Consider using a fine-grained token.");
    }
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function fetchGitHubReleaseFromNetwork(githubUrl: string): Promise<GitHubReleaseCache> {
  const errorTtl = GITHUB_CACHE_ERROR_TTL_MS;
  const nullEntry: GitHubReleaseCache = { softwareVersion: null, lastReleasedAt: null, fetchedAt: new Date(0) };
  try {
    const match = githubUrl.match(/github\.com\/([^/]+\/[^/]+)/);
    if (!match) {
      // Permanent failure (invalid URL) — still cache, but with short TTL since
      // the URL might be fixed in a config update.
      githubReleaseCache.set(githubUrl, { ...nullEntry, fetchedAt: new Date() });
      return nullEntry;
    }
    const repo = match[1].replace(/\.git$/, "");
    const apiUrl = `https://api.github.com/repos/${repo}/releases/latest`;
    const response = await fetch(apiUrl, { headers: buildGitHubHeaders() });
    if (!response.ok) {
      // On error (non-200), cache with a short TTL so temporary outages
      // recover faster instead of waiting 6 hours.
      githubReleaseCache.set(githubUrl, { ...nullEntry, fetchedAt: new Date() });
      return nullEntry;
    }
    const data = (await response.json()) as GitHubRelease;
    const entry: GitHubReleaseCache = {
      softwareVersion: data.tag_name ?? null,
      lastReleasedAt: data.published_at ?? null,
      fetchedAt: new Date(),
    };
    githubReleaseCache.set(githubUrl, entry);
    return entry;
  } catch {
    // Network error — cache with short TTL to retry quickly
    githubReleaseCache.set(githubUrl, { ...nullEntry, fetchedAt: new Date() });
    return nullEntry;
  }
}

async function fetchGitHubRelease(githubUrl: string): Promise<GitHubReleaseCache> {
  const cached = githubReleaseCache.get(githubUrl);
  if (cached) {
    // Use shorter TTL for error entries (softwareVersion is null) so temporary
    // outages recover faster. Use the full TTL for successful entries.
    const ageMs = Date.now() - cached.fetchedAt.getTime();
    const isError = cached.softwareVersion === null && cached.fetchedAt.getTime() > 0;
    const ttl = isError ? GITHUB_CACHE_ERROR_TTL_MS : GITHUB_CACHE_TTL_MS;
    if (ageMs < ttl) {
      return cached;
    }
  }
  return fetchGitHubReleaseFromNetwork(githubUrl);
}

async function refreshAllGitHubReleases(logger?: { info: (msg: string) => void; error: (msg: string) => void }): Promise<void> {
  const coinsWithGitHub = FAIR_LAUNCH_COINS.filter((meta) => meta.github && !meta.softwareVersion);
  logger?.info(`GitHub cache refresh: updating ${coinsWithGitHub.length} coins`);

  for (let i = 0; i < coinsWithGitHub.length; i++) {
    const meta = coinsWithGitHub[i]!;
    try {
      await fetchGitHubReleaseFromNetwork(meta.github!);
    } catch {
      logger?.error(`GitHub cache refresh: failed for ${meta.id}`);
    }
    if (i < coinsWithGitHub.length - 1) {
      await new Promise<void>((resolve) => setTimeout(resolve, GITHUB_STAGGER_DELAY_MS));
    }
  }

  logger?.info("GitHub cache refresh: complete");
}

export function startNodeCountRefresh(logger?: { info: (msg: string) => void; error: (msg: string) => void }): void {
  const refresh = () =>
    Promise.all([fetchBitcoinNodeCount(), fetchFluxNodeCount(), fetchMoneroNodeCount()])
      .then(() => logger?.info("Node count cache: refreshed"))
      .catch(() => logger?.error("Node count cache: refresh failed"));
  void refresh();
  setInterval(refresh, 25 * 60_000).unref();
}

export async function startGitHubCacheRefresh(logger?: { info: (msg: string) => void; error: (msg: string) => void }): Promise<void> {
  try {
    await refreshAllGitHubReleases(logger);
  } catch {
    logger?.error("GitHub cache refresh: initial refresh failed");
  }

  setInterval(() => {
    refreshAllGitHubReleases(logger).catch(() => {
      logger?.error("GitHub cache refresh: scheduled refresh failed");
    });
  }, GITHUB_REFRESH_INTERVAL_MS).unref();
}

async function fetchCoinPaprikaData(
  meta: FairLaunchCoinMeta,
): Promise<NormalizedMarketData | null> {
  if (!meta.coinPaprikaId) return null;
  try {
    const [paprikaResp, utopiaNetworkData] = await Promise.all([
      fetch(`https://api.coinpaprika.com/v1/tickers/${encodeURIComponent(meta.coinPaprikaId)}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      }),
      meta.utopiaExplorer ? fetchUtopiaNetworkData() : Promise.resolve(null),
    ]);

    if (!paprikaResp.ok) return null;
    const data = (await paprikaResp.json()) as CoinPaprikaMarketData;
    const price = data.quotes?.USD?.price ?? null;
    const circulatingSupply = data.circulating_supply ?? data.total_supply ?? null;
    const marketCap = price != null && circulatingSupply != null
      ? price * circulatingSupply
      : data.quotes?.USD?.market_cap ?? null;

    const utopiaNodeCount = utopiaNetworkData?.nodeCount ?? null;
    const stakingApr = utopiaNetworkData ? computeCrpApr(utopiaNetworkData) : null;

    return {
      id: meta.id,
      price,
      marketCap,
      volume24h: data.quotes?.USD?.volume_24h ?? null,
      circulatingSupply,
      change30d: data.quotes?.USD?.percent_change_30d ?? null,
      imageUrl: meta.logoUrl ?? `https://static.coinpaprika.com/coin/${meta.coinPaprikaId}/logo.png`,
      activeNodes: utopiaNodeCount ?? null,
      stakingApr: stakingApr ?? null,
    };
  } catch {
    return null;
  }
}

async function refreshCache(): Promise<CacheEntry> {
  const [coingeckoData, ...coinpaprikaResults] = await Promise.all([
    fetchCoinGeckoData(),
    ...COINPAPRIKA_COINS.map((meta) => fetchCoinPaprikaData(meta)),
  ]);

  // Seed the chart cache from the bulk sparkline data included in the market
  // fetch — zero extra API calls required.
  seedChartCacheFromSparklines(coingeckoData, { info: (msg) => console.log(msg) });

  const coinpaprikaMap = new Map<string, NormalizedMarketData>();
  COINPAPRIKA_COINS.forEach((meta, idx) => {
    const result = coinpaprikaResults[idx];
    if (result) {
      coinpaprikaMap.set(meta.id, result);
    }
  });

  return {
    coingecko: coingeckoData,
    coinpaprika: coinpaprikaMap,
    fetchedAt: new Date(),
  };
}

async function getCache(): Promise<CacheEntry> {
  if (cache && Date.now() - cache.fetchedAt.getTime() < CACHE_TTL_MS) {
    return cache;
  }
  // Guard against concurrent refresh calls. If another request is already
  // refreshing, wait up to 10 s for it to finish, then return the result.
  if (isRefreshing) {
    const pollStart = Date.now();
    while (isRefreshing && Date.now() - pollStart < 10_000) {
      await new Promise((r) => setTimeout(r, 200));
      // If cache was updated while we waited, use it
      if (cache && Date.now() - cache.fetchedAt.getTime() < CACHE_TTL_MS) {
        return cache;
      }
    }
  }
  isRefreshing = true;
  try {
    cache = await refreshCache();
  } catch (err) {
    // If a stale cache exists, keep using it rather than failing the request.
    if (cache) {
      console.warn("Market data refresh failed, serving stale cache:", (err as Error).message);
      return cache;
    }
    // On cold start with no cache, return an empty entry so the app can load.
    // Coins will show with no price data, which is better than a 500 error.
    console.error("Market data unavailable on cold start:", (err as Error).message);
    return { coingecko: [], coinpaprika: new Map(), fetchedAt: new Date(0) };
  } finally {
    isRefreshing = false;
  }
  return cache;
}

function normalizeCoingecko(d: CoinGeckoMarketData | undefined, meta: FairLaunchCoinMeta): NormalizedMarketData {
  return {
    id: meta.id,
    price: d?.current_price ?? null,
    marketCap: d?.market_cap ?? null,
    volume24h: d?.total_volume ?? null,
    circulatingSupply: d?.circulating_supply ?? null,
    change30d: d?.price_change_percentage_30d_in_currency ?? null,
    imageUrl: d?.image ?? null,
  };
}

function buildCoinResponse(
  meta: FairLaunchCoinMeta,
  rank: number,
  live: NormalizedMarketData,
  githubRelease: GitHubReleaseCache,
  versionOverride?: { softwareVersion: string | null; lastReleasedAt: string | null },
  liveNodeCount?: number | null,
) {
  const softwareVersion = versionOverride?.softwareVersion ?? meta.softwareVersion ?? githubRelease.softwareVersion ?? null;
  const lastReleasedAt = versionOverride?.lastReleasedAt ?? meta.lastReleasedAt ?? githubRelease.lastReleasedAt ?? null;
  // Use live-computed APR when available, fall back to hardcoded meta value
  const stakingApy = live.stakingApr != null ? live.stakingApr : (meta.stakingApy ?? null);
  return {
    rank,
    id: meta.id,
    name: meta.name,
    symbol: meta.symbol.toUpperCase(),
    price: live.price,
    volume24h: live.volume24h,
    circulatingSupply: live.circulatingSupply,
    change30d: live.change30d,
    launchYear: meta.launchYear,
    consensusType: meta.consensusType,
    algorithm: meta.algorithm,
    whyFair: meta.whyFair,
    imageUrl: live.imageUrl,
    isFeatured: meta.isFeatured,
    website: meta.website ?? null,
    explorer: meta.explorer ?? null,
    github: meta.github ?? null,
    stakingApy,
    yieldType: meta.yieldType ?? null,
    softwareVersion,
    lastReleasedAt,
    activeNodes: liveNodeCount ?? meta.activeNodes ?? live.activeNodes ?? null,
  };
}

router.get(
  "/fairlaunch/coins",
  async (req, res): Promise<void> => {
    const queryParse = GetFairLaunchCoinsQueryParams.safeParse(req.query);
    if (!queryParse.success) {
      res.status(400).json({
        error: "Invalid query parameters",
        message: queryParse.error.message,
      });
      return;
    }

    const { search } = queryParse.data;

    let cacheEntry: CacheEntry;
    try {
      cacheEntry = await getCache();
    } catch (err) {
      req.log.error({ err }, "Failed to fetch market data");
      res.status(500).json({
        error: "upstream_error",
        message: "Failed to fetch live market data. Please try again shortly.",
      });
      return;
    }

    const cgMap = new Map(cacheEntry.coingecko.map((d) => [d.id, d]));

    const allWithData = FAIR_LAUNCH_COINS.map((meta) => {
      let live: NormalizedMarketData;
      if (meta.coinPaprikaId) {
        live = cacheEntry.coinpaprika.get(meta.id) ?? {
          id: meta.id, price: null, marketCap: null, volume24h: null,
          circulatingSupply: null, change30d: null, imageUrl: null,
        };
      } else {
        live = normalizeCoingecko(cgMap.get(meta.id), meta);
      }
      return { meta, live };
    });

    allWithData.sort((a, b) => {
      const mcA = a.live.marketCap ?? -1;
      const mcB = b.live.marketCap ?? -1;
      if (mcB !== mcA) return mcB - mcA;
      return a.meta.name.localeCompare(b.meta.name);
    });

    const nullGitHubEntry: GitHubReleaseCache = { softwareVersion: null, lastReleasedAt: null, fetchedAt: new Date(0) };
    const [githubResults] = await Promise.all([
      Promise.all(
        allWithData.map(({ meta }) =>
          meta.github && !meta.softwareVersion
            ? fetchGitHubRelease(meta.github)
            : Promise.resolve(nullGitHubEntry),
        ),
      ),
    ]);

    const liveNodeCounts = new Map<string, number | null>([
      ["bitcoin", liveNodeCache.get("bitcoin")?.count ?? null],
      ["zelcash", liveNodeCache.get("zelcash")?.count ?? null],
      ["monero", liveNodeCache.get("monero")?.count ?? null],
    ]);

    const crpOverrides = getCRPOverrides();
    const globallyRanked = allWithData.map(({ meta, live }, idx) =>
      buildCoinResponse(
        meta,
        idx + 1,
        live,
        githubResults[idx],
        meta.id === "crp-crypton" ? crpOverrides : undefined,
        liveNodeCounts.get(meta.id),
      ),
    );

    let ranked = globallyRanked;

    if (search && search.trim().length > 0) {
      const q = search.trim().toLowerCase();
      ranked = globallyRanked.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.symbol.toLowerCase().includes(q),
      );
    }

    const lastUpdated = cacheEntry.fetchedAt.toISOString();

    const result = GetFairLaunchCoinsResponse.parse({
      coins: ranked,
      lastUpdated,
      totalCoins: ranked.length,
    });

    res.json(result);
  },
);

router.get(
  "/fairlaunch/coins/:id/chart",
  async (req, res): Promise<void> => {
    const { id } = req.params;

    const meta = FAIR_LAUNCH_COINS.find((c) => c.id === id);
    if (!meta) {
      res.status(404).json({ error: "not_found", message: `Coin '${id}' not found` });
      return;
    }

    const cached = chartCache.get(id);
    if (cached && cached.prices.length > 0 && Date.now() - cached.fetchedAt.getTime() < CHART_CACHE_TTL_MS) {
      const result = GetCoinChartResponse.parse({ id, prices: cached.prices, hasData: true });
      res.json(result);
      return;
    }

    // For CRP (CoinPaprika-only coin) use daily historical data from CoinPaprika.
    // For all other coins use CoinGecko. Never cache failures so the next request retries.
    const prices = meta.coinPaprikaId
      ? await fetchCRPChartFromCoinPaprika()
      : await fetchChartForCoin(id);

    if (prices && prices.length > 0) {
      chartCache.set(id, { prices, fetchedAt: new Date() });
      const result = GetCoinChartResponse.parse({ id, prices, hasData: true });
      res.json(result);
    } else {
      const fallback = GetCoinChartResponse.parse({ id, prices: [], hasData: false });
      res.json(fallback);
    }
  },
);

interface UtopiaBlockHistoryCache {
  blocks: Array<{
    block: number;
    miningThreads: number;
    blockReward: number;
    crpSupply: number;
    timestamp: string;
    apr: number;
  }>;
  fetchedAt: Date;
}

let blockHistoryCache: UtopiaBlockHistoryCache | null = null;
const BLOCK_HISTORY_TTL_MS = 10 * 60_000;

interface UamMiningBlock {
  id: number;
  numberMiners: number;
  dateTime: string;
  treasury?: {
    CRP?: Array<{ type: string; amount: number }>;
  };
}

/**
 * Fetch ALL mining blocks from UAM in a single range call, then
 * convert to our internal format. The Utopia client handles up to
 * 227K+ blocks in one request (~30-60s).
 */
async function fetchUtopiaBlockHistory(): Promise<UtopiaBlockHistoryCache["blocks"]> {
  try {
    // Fetch the tip block (small range, fast)
    const tipResp = await uamRpc<UamMiningBlock[]>(
      "getMiningBlocksWithTreasury",
      { fromBlockId: 227000, toBlockId: 300000 },
    );
    if (!tipResp.ok || !Array.isArray(tipResp.data) || tipResp.data.length === 0) {
      console.warn("[uam-block-history] could not get chain tip");
      return [];
    }
    const latestId = tipResp.data[0].id;

    // Fetch ALL blocks from chain genesis to tip.
    // Use direct fetch instead of uamRpc to get a longer timeout (120s)
    const allResp = await fetchWithTimeout(
      UAM_API_URL,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "getMiningBlocksWithTreasury",
          params: { fromBlockId: 1, toBlockId: latestId },
          token: UAM_API_TOKEN,
        }),
      },
      120_000,
    );

    if (!allResp.ok) {
      console.warn(`[uam-block-history] HTTP ${allResp.status}`);
      return [];
    }

    const allResult = (await allResp.json()) as { result?: UamMiningBlock[] };
    const rawBlocks = allResult.result;
    if (!Array.isArray(rawBlocks)) {
      console.warn("[uam-block-history] result is not an array");
      return [];
    }

    const blocks: UtopiaBlockHistoryCache["blocks"] = [];
    // rawBlocks comes in descending order (highest id first)
    for (const b of rawBlocks) {
      const threads = b.numberMiners ?? 0;
      const reward = CRP_REWARD_PER_BLOCK;
      let supply = 0;
      if (b.treasury?.CRP) {
        const totalSupply = b.treasury.CRP.find((t) => t.type === "TOTAL_SUPPLY");
        if (totalSupply) supply = totalSupply.amount;
      }

      const apr = computeCrpApr({ nodeCount: threads, blockReward: reward, fetchedAt: new Date() }) ?? 0;

      blocks.push({
        block: b.id,
        miningThreads: threads,
        blockReward: reward,
        crpSupply: supply,
        timestamp: b.dateTime,
        apr,
      });
    }

    // Sort ascending by block id
    blocks.sort((a, b) => a.block - b.block);
    console.log(`[uam-block-history] fetched ${blocks.length} blocks (id 1..${latestId})`);
    return blocks;
  } catch (err) {
    console.warn("[uam-block-history] fetch failed:", (err as Error).message);
    return [];
  }
}

async function getBlockHistory(): Promise<UtopiaBlockHistoryCache["blocks"]> {
  if (blockHistoryCache && Date.now() - blockHistoryCache.fetchedAt.getTime() < BLOCK_HISTORY_TTL_MS) {
    return blockHistoryCache.blocks;
  }
  const blocks = await fetchUtopiaBlockHistory();
  blockHistoryCache = { blocks, fetchedAt: new Date() };
  return blocks;
}

router.get(
  "/fairlaunch/crp/history",
  async (req, res): Promise<void> => {
    const allBlocks = await getBlockHistory();

    const range = (req.query["range"] as string) ?? "all";
    const now = Date.now();
    let cutoff: number | null = null;

    switch (range) {
      case "1d":
        cutoff = now - 24 * 60 * 60 * 1000;
        break;
      case "7d":
        cutoff = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "30d":
        cutoff = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case "1y":
        cutoff = now - 365 * 24 * 60 * 60 * 1000;
        break;
      case "all":
      default:
        break;
    }

    const blocks = cutoff
      ? allBlocks.filter((b) => {
          const ts = new Date(b.timestamp).getTime();
          return !isNaN(ts) && ts >= cutoff!;
        })
      : allBlocks;

    res.json({ blocks, count: blocks.length, range });
  },
);

router.get(
  "/fairlaunch/stats",
  async (_req, res): Promise<void> => {
    let cacheEntry: CacheEntry;
    try {
      cacheEntry = await getCache();
    } catch (err) {
      res.status(500).json({
        error: "upstream_error",
        message: "Failed to fetch live market data.",
      });
      return;
    }

    const cgMap = new Map(cacheEntry.coingecko.map((d) => [d.id, d]));

    const withData = FAIR_LAUNCH_COINS.map((meta) => {
      let live: NormalizedMarketData;
      if (meta.coinPaprikaId) {
        live = cacheEntry.coinpaprika.get(meta.id) ?? {
          id: meta.id, price: null, marketCap: null, volume24h: null,
          circulatingSupply: null, change30d: null, imageUrl: null,
        };
      } else {
        live = normalizeCoingecko(cgMap.get(meta.id), meta);
      }
      return { meta, live };
    });

    withData.sort((a, b) => {
      const mcA = a.live.marketCap ?? -1;
      const mcB = b.live.marketCap ?? -1;
      if (mcB !== mcA) return mcB - mcA;
      return a.meta.name.localeCompare(b.meta.name);
    });

    const totalVolume24h = withData.reduce(
      (sum, { live }) => sum + (live.volume24h ?? 0),
      0,
    );

    const topCoin = withData[0]?.meta?.name ?? "Bitcoin";
    const cryptonIdx = withData.findIndex((c) => c.meta.isFeatured);
    const cryptonRank = cryptonIdx >= 0 ? cryptonIdx + 1 : null;

    const result = GetFairLaunchStatsResponse.parse({
      totalVolume24h,
      totalCoins: FAIR_LAUNCH_COINS.length,
      topCoin,
      cryptonRank,
      lastUpdated: cacheEntry.fetchedAt.toISOString(),
    });

    res.json(result);
  },
);

export default router;
