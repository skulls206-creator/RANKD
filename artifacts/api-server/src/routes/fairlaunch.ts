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

const router: IRouter = Router();

interface CoinGeckoMarketData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number | null;
  market_cap: number | null;
  circulating_supply: number | null;
  price_change_percentage_24h: number | null;
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
      percent_change_24h: number | null;
    };
  };
}

interface UtopiaExplorerBlock {
  id: number;
  CRPSupply: string;
  TotalCRPAmount: string;
  BlockReward: string;
  miningThreads: string;
  created_at: string;
}

interface NormalizedMarketData {
  id: string;
  price: number | null;
  marketCap: number | null;
  circulatingSupply: number | null;
  change24h: number | null;
  imageUrl: string | null;
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
const CACHE_TTL_MS = 60_000;

const chartCache = new Map<string, ChartCacheEntry>();
const CHART_CACHE_TTL_MS = 10 * 60_000;

async function fetchCoinGeckoData(): Promise<CoinGeckoMarketData[]> {
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${encodeURIComponent(COINGECKO_IDS)}&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=24h`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status}`);
  }
  return response.json() as Promise<CoinGeckoMarketData[]>;
}

async function fetchUtopiaSupply(): Promise<number | null> {
  try {
    const url = "https://utopian.is/api/explorer/blocks/get";
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    const blocks = (await response.json()) as UtopiaExplorerBlock[];
    const latest = blocks?.[0];
    if (!latest?.CRPSupply) return null;
    const supply = parseFloat(latest.CRPSupply);
    return isNaN(supply) ? null : supply;
  } catch {
    return null;
  }
}

async function fetchCoinPaprikaData(
  meta: FairLaunchCoinMeta,
): Promise<NormalizedMarketData | null> {
  if (!meta.coinPaprikaId) return null;
  try {
    const [paprikaResp, utopiaSupply] = await Promise.all([
      fetch(`https://api.coinpaprika.com/v1/tickers/${encodeURIComponent(meta.coinPaprikaId)}`, {
        headers: { Accept: "application/json" },
      }),
      meta.utopiaExplorer ? fetchUtopiaSupply() : Promise.resolve(null),
    ]);

    if (!paprikaResp.ok) return null;
    const data = (await paprikaResp.json()) as CoinPaprikaMarketData;
    const price = data.quotes?.USD?.price ?? null;
    const circulatingSupply = utopiaSupply ?? data.circulating_supply ?? data.total_supply ?? null;
    const marketCap = price != null && circulatingSupply != null
      ? price * circulatingSupply
      : data.quotes?.USD?.market_cap ?? null;

    return {
      id: meta.id,
      price,
      marketCap,
      circulatingSupply,
      change24h: data.quotes?.USD?.percent_change_24h ?? null,
      imageUrl: meta.logoUrl ?? `https://static.coinpaprika.com/coin/${meta.coinPaprikaId}/logo.png`,
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
  try {
    cache = await refreshCache();
  } catch {
    if (cache) return cache;
    throw new Error("Failed to fetch market data from all sources");
  }
  return cache;
}

function normalizeCoingecko(d: CoinGeckoMarketData | undefined, meta: FairLaunchCoinMeta): NormalizedMarketData {
  return {
    id: meta.id,
    price: d?.current_price ?? null,
    marketCap: d?.market_cap ?? null,
    circulatingSupply: d?.circulating_supply ?? null,
    change24h: d?.price_change_percentage_24h ?? null,
    imageUrl: d?.image ?? null,
  };
}

function buildCoinResponse(
  meta: FairLaunchCoinMeta,
  rank: number,
  live: NormalizedMarketData,
) {
  return {
    rank,
    id: meta.id,
    name: meta.name,
    symbol: meta.symbol.toUpperCase(),
    price: live.price,
    marketCap: live.marketCap,
    circulatingSupply: live.circulatingSupply,
    change24h: live.change24h,
    launchYear: meta.launchYear,
    consensusType: meta.consensusType,
    algorithm: meta.algorithm,
    whyFair: meta.whyFair,
    imageUrl: live.imageUrl,
    isFeatured: meta.isFeatured,
    website: meta.website ?? null,
    explorer: meta.explorer ?? null,
    github: meta.github ?? null,
    stakingApy: meta.stakingApy ?? null,
    yieldType: meta.yieldType ?? null,
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
          id: meta.id, price: null, marketCap: null,
          circulatingSupply: null, change24h: null, imageUrl: null,
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

    const globallyRanked = allWithData.map(({ meta, live }, idx) =>
      buildCoinResponse(meta, idx + 1, live),
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

    if (meta.coinPaprikaId) {
      const result = GetCoinChartResponse.parse({ id, prices: [], hasData: false });
      res.json(result);
      return;
    }

    const cached = chartCache.get(id);
    if (cached && Date.now() - cached.fetchedAt.getTime() < CHART_CACHE_TTL_MS) {
      const result = GetCoinChartResponse.parse({ id, prices: cached.prices, hasData: cached.prices.length > 0 });
      res.json(result);
      return;
    }

    try {
      const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=7`;
      const response = await fetch(url, { headers: { Accept: "application/json" } });
      if (!response.ok) {
        const fallback = GetCoinChartResponse.parse({ id, prices: [], hasData: false });
        res.json(fallback);
        return;
      }
      const data = (await response.json()) as { prices: number[][] };
      const prices = data.prices ?? [];
      chartCache.set(id, { prices, fetchedAt: new Date() });
      const result = GetCoinChartResponse.parse({ id, prices, hasData: prices.length > 0 });
      res.json(result);
    } catch {
      const fallback = GetCoinChartResponse.parse({ id, prices: [], hasData: false });
      res.json(fallback);
    }
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
          id: meta.id, price: null, marketCap: null,
          circulatingSupply: null, change24h: null, imageUrl: null,
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

    const totalMarketCap = withData.reduce(
      (sum, { live }) => sum + (live.marketCap ?? 0),
      0,
    );

    const topCoin = withData[0]?.meta?.name ?? "Bitcoin";
    const cryptonIdx = withData.findIndex((c) => c.meta.isFeatured);
    const cryptonRank = cryptonIdx >= 0 ? cryptonIdx + 1 : null;

    const result = GetFairLaunchStatsResponse.parse({
      totalMarketCap,
      totalCoins: FAIR_LAUNCH_COINS.length,
      topCoin,
      cryptonRank,
      lastUpdated: cacheEntry.fetchedAt.toISOString(),
    });

    res.json(result);
  },
);

export default router;
