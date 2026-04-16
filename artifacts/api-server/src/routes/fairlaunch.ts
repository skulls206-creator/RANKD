import { Router, type IRouter } from "express";
import {
  GetFairLaunchCoinsQueryParams,
  GetFairLaunchCoinsResponse,
  GetFairLaunchStatsResponse,
} from "@workspace/api-zod";
import {
  FAIR_LAUNCH_COINS,
  COIN_GECKO_IDS,
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

interface CacheEntry {
  data: CoinGeckoMarketData[];
  fetchedAt: Date;
}

let cache: CacheEntry | null = null;
const CACHE_TTL_MS = 60_000;

async function fetchCoinGeckoData(): Promise<CoinGeckoMarketData[]> {
  if (cache && Date.now() - cache.fetchedAt.getTime() < CACHE_TTL_MS) {
    return cache.data;
  }

  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${encodeURIComponent(COIN_GECKO_IDS)}&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=24h`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    if (cache) {
      return cache.data;
    }
    throw new Error(`CoinGecko API error: ${response.status}`);
  }

  const data = (await response.json()) as CoinGeckoMarketData[];
  cache = { data, fetchedAt: new Date() };
  return data;
}

function buildCoinResponse(
  meta: FairLaunchCoinMeta,
  rank: number,
  liveData: CoinGeckoMarketData | undefined,
) {
  return {
    rank,
    id: meta.id,
    name: meta.name,
    symbol: meta.symbol.toUpperCase(),
    price: liveData?.current_price ?? null,
    marketCap: liveData?.market_cap ?? null,
    circulatingSupply: liveData?.circulating_supply ?? null,
    change24h: liveData?.price_change_percentage_24h ?? null,
    launchYear: meta.launchYear,
    consensusType: meta.consensusType,
    whyFair: meta.whyFair,
    imageUrl: liveData?.image ?? null,
    isFeatured: meta.isFeatured,
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

    let liveData: CoinGeckoMarketData[];
    try {
      liveData = await fetchCoinGeckoData();
    } catch (err) {
      req.log.error({ err }, "Failed to fetch CoinGecko data");
      res.status(500).json({
        error: "upstream_error",
        message: "Failed to fetch live market data. Please try again shortly.",
      });
      return;
    }

    const liveMap = new Map(liveData.map((d) => [d.id, d]));

    let coins = FAIR_LAUNCH_COINS;

    if (search && search.trim().length > 0) {
      const q = search.trim().toLowerCase();
      coins = coins.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.symbol.toLowerCase().includes(q),
      );
    }

    const withData = coins.map((meta) => ({
      meta,
      live: liveMap.get(meta.id),
    }));

    withData.sort((a, b) => {
      const mcA = a.live?.market_cap ?? -1;
      const mcB = b.live?.market_cap ?? -1;
      if (mcB !== mcA) return mcB - mcA;
      return a.meta.name.localeCompare(b.meta.name);
    });

    const ranked = withData.map(({ meta, live }, idx) =>
      buildCoinResponse(meta, idx + 1, live),
    );

    const lastUpdated = cache ? cache.fetchedAt.toISOString() : new Date().toISOString();

    const result = GetFairLaunchCoinsResponse.parse({
      coins: ranked,
      lastUpdated,
      totalCoins: ranked.length,
    });

    res.json(result);
  },
);

router.get(
  "/fairlaunch/stats",
  async (_req, res): Promise<void> => {
    let liveData: CoinGeckoMarketData[];
    try {
      liveData = await fetchCoinGeckoData();
    } catch (err) {
      res.status(500).json({
        error: "upstream_error",
        message: "Failed to fetch live market data.",
      });
      return;
    }

    const liveMap = new Map(liveData.map((d) => [d.id, d]));

    const withData = FAIR_LAUNCH_COINS.map((meta) => ({
      meta,
      live: liveMap.get(meta.id),
    }));

    withData.sort((a, b) => {
      const mcA = a.live?.market_cap ?? -1;
      const mcB = b.live?.market_cap ?? -1;
      if (mcB !== mcA) return mcB - mcA;
      return a.meta.name.localeCompare(b.meta.name);
    });

    const totalMarketCap = withData.reduce(
      (sum, { live }) => sum + (live?.market_cap ?? 0),
      0,
    );

    const topCoin = withData[0]?.meta?.name ?? "Bitcoin";

    const cryptonIdx = withData.findIndex((c) => c.meta.isFeatured);
    const cryptonRank = cryptonIdx >= 0 ? cryptonIdx + 1 : null;

    const lastUpdated = cache ? cache.fetchedAt.toISOString() : new Date().toISOString();

    const result = GetFairLaunchStatsResponse.parse({
      totalMarketCap,
      totalCoins: FAIR_LAUNCH_COINS.length,
      topCoin,
      cryptonRank,
      lastUpdated,
    });

    res.json(result);
  },
);

export default router;
