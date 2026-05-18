import { useState, useCallback, useRef, Fragment } from "react";
import {
  useGetFairLaunchCoins,
  useGetFairLaunchStats,
  getGetFairLaunchCoinsQueryKey,
  getGetFairLaunchStatsQueryKey,
} from "@workspace/api-client-react";
import {
  Search, RefreshCw, TrendingUp, TrendingDown, Info,
  Award, ChevronUp, ChevronDown, Trophy,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ContextMenuPortal } from "@/components/ContextMenu";
import { CoinLogo } from "@/components/CoinLogo";
import { CoinSparkline } from "@/components/CoinSparkline";
import { WhyFairTooltip } from "@/components/WhyFairTooltip";
import { StatCard } from "@/components/StatCard";
import { SkeletonRow } from "@/components/SkeletonRow";
import { SkeletonCard } from "@/components/SkeletonCard";
import { MobileSortControl } from "@/components/MobileSortControl";
import { SortButton } from "@/components/SortButton";
import { CoinCard } from "@/components/CoinCard";
import { CoinDetailPanel } from "@/components/CoinDetailPanel";
import { BuildInfo } from "@/components/BuildInfo";
import { useDragScroll } from "@/hooks/use-drag-scroll";
import { formatMoney, formatPrice, formatPercent, formatRelativeTime } from "@/lib/format";
import { sortCoins, type SortField, type SortDir } from "@/lib/constants";

export default function Home() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [expandedCoinId, setExpandedCoinId] = useState<string | null>(null);
  const tableScroll = useDragScroll();

  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => setDebouncedSearch(value), 300);
  }, []);

  const coinsParams = debouncedSearch ? { search: debouncedSearch } : undefined;

  const {
    data: coinsData,
    isLoading: coinsLoading,
    isError: coinsError,
    refetch: refetchCoins,
    isFetching,
  } = useGetFairLaunchCoins(coinsParams, {
    query: {
      queryKey: getGetFairLaunchCoinsQueryKey(coinsParams),
      refetchInterval: 60_000,
      staleTime: 30_000,
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 15_000),
    },
  });

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useGetFairLaunchStats({
    query: {
      queryKey: getGetFairLaunchStatsQueryKey(),
      refetchInterval: 60_000,
      staleTime: 30_000,
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 15_000),
    },
  });

  const handleRefreshData = useCallback(() => {
    refetchCoins();
    refetchStats();
  }, [refetchCoins, refetchStats]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "rank" || field === "launchYear" ? "asc" : "desc");
    }
  }

  function handleRowClick(coinId: string) {
    setExpandedCoinId((prev) => (prev === coinId ? null : coinId));
  }

  const coins = coinsData?.coins ?? [];
  const sorted = sortCoins(coins, sortField, sortDir);

  const lastUpdated = coinsData?.lastUpdated
    ? new Date(coinsData.lastUpdated).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border sticky top-0 bg-background/90 backdrop-blur-sm z-30">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <img src="/favicon.svg" alt="RANKD logo" className="w-8 h-8 rounded-md" />
              <span
                className="text-3xl font-display font-bold tracking-tighter"
                style={{ fontFamily: "var(--app-font-display)" }}
              >
                <span className="text-primary">RANK</span>
                <span className="text-foreground">D</span>
              </span>
            </div>
            <div className="hidden sm:block h-6 w-px bg-border" />
            <span className="hidden sm:block text-xs text-muted-foreground font-mono uppercase tracking-wider">
              Fair Launch Only
            </span>
          </div>

          <div className="flex items-center gap-3">
            {lastUpdated && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                <div className={`w-1.5 h-1.5 rounded-full ${isFetching ? "bg-yellow-400 animate-pulse" : "bg-green-500"}`} />
                <span className="hidden sm:inline">Updated </span>
                {lastUpdated}
              </div>
            )}
            <button
              data-testid="button-refresh"
              onClick={() => refetchCoins()}
              className="p-2 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <div className="space-y-2">
          <h1 className="text-lg font-display font-semibold text-foreground">
            The real market cap leaderboard.
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Only coins that launched like Bitcoin — mined openly from genesis, zero pre-mine, no VC wallets, no insider allocations.
            No tokens. No layer 1/2 infra plays. No noise.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-lg px-6 py-4">
                <div className="h-3 w-24 rounded bg-muted animate-pulse mb-3" />
                <div className="h-7 w-32 rounded bg-muted animate-pulse" />
              </div>
            ))
          ) : stats ? (
            <>
              <StatCard
                label="Total 24H Volume"
                value={formatMoney(stats.totalVolume24h)}
                sub="Reported exchange volume"
              />
              <StatCard
                label="Coins Tracked"
                value={stats.totalCoins.toString()}
                sub="Vetted fair launches"
              />
              <StatCard
                label="Top Coin"
                value={stats.topCoin}
                sub="By market cap"
              />
              <StatCard
                label="Top Yield"
                value={
                  (() => {
                    const crp = coinsData?.coins?.find((c: any) => c.id === "crp-crypton");
                    if (crp?.stakingApy != null) return `${crp.stakingApy}%`;
                    return "—";
                  })()
                }
                sub="🏆 Crypton (CRP) — King of fair launches"
              />
            </>
          ) : null}
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            data-testid="input-search"
            type="search"
            placeholder="Search coins..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full md:max-w-sm bg-card border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Mobile card list */}
        <div className="md:hidden rounded-xl border border-border overflow-hidden">
          <MobileSortControl sortField={sortField} sortDir={sortDir} onSort={handleSort} />
          {coinsLoading && !coins.length ? (
            Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} index={i} />)
          ) : coinsError && !coins.length ? (
            <div className="px-4 py-16 text-center">
              <div className="flex flex-col items-center gap-3">
                <Info className="w-8 h-8 text-muted-foreground" />
                <p className="text-muted-foreground">Failed to load market data.</p>
                <button
                  onClick={() => refetchCoins()}
                  className="text-primary hover:underline text-sm"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : sorted.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <p className="text-muted-foreground">No coins found matching &ldquo;{search}&rdquo;</p>
            </div>
          ) : (
            sorted.map((coin, idx) => (
              <motion.div
                key={coin.id}
                data-coin-id={coin.id}
                data-coin-name={coin.name}
                data-coin-symbol={coin.symbol}
                data-coin-price={coin.price != null ? formatPrice(coin.price) : ""}
                data-coin-website={coin.website ?? ""}
                data-coin-explorer={coin.explorer ?? ""}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.02 }}
              >
                <CoinCard
                  coin={coin}
                  isExpanded={expandedCoinId === coin.id}
                  onClick={() => handleRowClick(coin.id)}
                />
              </motion.div>
            ))
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block rounded-xl border border-border overflow-hidden">
          <div ref={tableScroll.ref} className="overflow-x-auto cursor-grab active:cursor-grabbing">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card">
                  <th className="px-4 py-3 text-left w-12">
                    <SortButton field="rank" label="#" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3 text-left min-w-[180px]">
                    <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Coin</span>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <SortButton field="price" label="Price" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3 text-right" title="Exchange-reported 24h volume. May include inflated figures from unregulated venues.">
                    <SortButton field="volume24h" label="24h Vol" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3 text-right">
                    <SortButton field="change30d" label="30D %" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3 text-center">
                    <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">7D Chart</span>
                  </th>
                  <th className="px-4 py-3 text-center">
                    <SortButton field="launchYear" label="Year" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3 text-center">
                    <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Consensus</span>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <SortButton field="stakingApy" label="Yield" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3 text-center">
                    <SortButton field="softwareVersion" label="Version" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3 text-center">
                    <SortButton field="lastReleasedAt" label="Last Release" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3 text-right">
                    <SortButton field="activeNodes" label="Active Nodes" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {coinsLoading && !coins.length ? (
                  Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} index={i} />)
                ) : coinsError && !coins.length ? (
                  <tr>
                    <td colSpan={14} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Info className="w-8 h-8 text-muted-foreground" />
                        <p className="text-muted-foreground">Failed to load market data.</p>
                        <button
                          data-testid="button-retry"
                          onClick={() => refetchCoins()}
                          className="text-primary hover:underline text-sm"
                        >
                          Try again
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : sorted.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="px-4 py-16 text-center">
                      <p className="text-muted-foreground">No coins found matching "{search}"</p>
                    </td>
                  </tr>
                ) : (
                  <>
                    {sorted.map((coin, idx) => {
                      const isPositive = coin.change30d != null && coin.change30d > 0;
                      const isNegative = coin.change30d != null && coin.change30d < 0;
                      const isExpanded = expandedCoinId === coin.id;

                      return (
                        <Fragment key={coin.id}>
                          <motion.tr
                            data-testid={`row-coin-${coin.symbol}`}
                            data-coin-id={coin.id}
                            data-coin-name={coin.name}
                            data-coin-symbol={coin.symbol}
                            data-coin-price={coin.price != null ? formatPrice(coin.price) : ""}
                            data-coin-website={coin.website ?? ""}
                            data-coin-explorer={coin.explorer ?? ""}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: idx * 0.02 }}
                            onClick={() => { if (!tableScroll.wasDrag()) handleRowClick(coin.id); }}
                            className={`border-b border-border transition-colors cursor-pointer group ${
                              isExpanded
                                ? "bg-card border-b-0"
                                : "hover:bg-card/60"
                            } ${
                              coin.isFeatured
                                ? "bg-amber-950/20 hover:bg-amber-950/30 border-l-2 border-l-primary"
                                : ""
                            }`}
                          >
                            <td className="px-4 py-4">
                              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                                {coin.rank}
                              </span>
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <CoinLogo imageUrl={coin.imageUrl} name={coin.name} symbol={coin.symbol} />
                                <div className="flex flex-col min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-foreground truncate text-sm">
                                      {coin.name}
                                    </span>
                                    {coin.isFeatured && (
                                      <span
                                        data-testid={`badge-featured-${coin.symbol}`}
                                        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-primary/20 text-primary border border-primary/30"
                                      >
                                        <Award className="w-3 h-3" />
                                        Featured
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-mono text-muted-foreground">
                                      {coin.symbol}
                                    </span>
                                    <WhyFairTooltip text={coin.whyFair} coinName={coin.name} />
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-4 text-right">
                              <span className="font-mono text-sm tabular-nums text-foreground">
                                {formatPrice(coin.price)}
                              </span>
                            </td>

                            <td className="px-4 py-4 text-right">
                              <span className="font-mono text-sm tabular-nums text-foreground">
                                {formatMoney(coin.volume24h)}
                              </span>
                            </td>

                            <td className="px-4 py-4 text-right">
                              <span
                                className={`flex items-center justify-end gap-1 font-mono text-sm tabular-nums ${
                                  isPositive
                                    ? "text-emerald-400"
                                    : isNegative
                                    ? "text-red-400"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {isPositive && <TrendingUp className="w-3 h-3" />}
                                {isNegative && <TrendingDown className="w-3 h-3" />}
                                {formatPercent(coin.change30d)}
                              </span>
                            </td>

                            <td className="px-4 py-4 text-center">
                              <div className="flex justify-center">
                                <CoinSparkline coin={coin} />
                              </div>
                            </td>

                            <td className="px-4 py-4 text-center">
                              <span className="font-mono text-xs text-muted-foreground">
                                {coin.launchYear}
                              </span>
                            </td>

                            <td className="px-4 py-4 text-center">
                              <span className="font-mono text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
                                {coin.consensusType}
                              </span>
                            </td>

                            <td className="px-4 py-4 text-right">
                              {coin.stakingApy != null ? (
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className="font-mono text-sm tabular-nums text-amber-400 font-semibold">
                                    {coin.stakingApy}%
                                  </span>
                                  {coin.yieldType && (
                                    <span className="text-xs font-mono text-muted-foreground">{coin.yieldType}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="font-mono text-sm text-muted-foreground/40">—</span>
                              )}
                            </td>

                            <td className="px-4 py-4 text-center">
                              {coin.softwareVersion ? (
                                <span className={`font-mono text-xs px-2 py-0.5 rounded ${coin.isFeatured ? "bg-primary/20 text-primary border border-primary/30" : "bg-muted text-muted-foreground"}`}>
                                  {coin.softwareVersion}
                                </span>
                              ) : (
                                <span className="font-mono text-xs text-muted-foreground/40">—</span>
                              )}
                            </td>

                            <td className="px-4 py-4 text-center">
                              <span className={`font-mono text-xs ${coin.lastReleasedAt ? (coin.isFeatured ? "text-primary" : "text-muted-foreground") : "text-muted-foreground/40"}`}>
                                {formatRelativeTime(coin.lastReleasedAt)}
                              </span>
                            </td>

                            <td className="px-4 py-4 text-right">
                              {coin.activeNodes != null ? (
                                <span className={`font-mono text-sm tabular-nums ${coin.isFeatured ? "text-primary font-semibold" : "text-foreground"}`}>
                                  {coin.activeNodes.toLocaleString()}
                                </span>
                              ) : (
                                <span className="font-mono text-sm text-muted-foreground/40">—</span>
                              )}
                            </td>

                            <td className="px-4 py-4 text-center w-8">
                              <span className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors inline-flex">
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </span>
                            </td>
                          </motion.tr>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.tr
                                key={`${coin.id}-detail`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className={`border-b border-border ${coin.isFeatured ? "border-l-2 border-l-primary" : ""}`}
                              >
                                <td
                                  colSpan={14}
                                  className={`p-0 ${coin.isFeatured ? "bg-amber-950/10" : "bg-card/40"}`}
                                >
                                  <motion.div
                                    initial={{ height: 0, overflow: "hidden" }}
                                    animate={{ height: "auto", overflow: "visible" }}
                                    exit={{ height: 0, overflow: "hidden" }}
                                    transition={{ duration: 0.25, ease: "easeInOut" }}
                                  >
                                    <CoinDetailPanel coin={coin} />
                                  </motion.div>
                                </td>
                              </motion.tr>
                            )}
                          </AnimatePresence>
                        </Fragment>
                      );
                    })}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <footer className="text-center space-y-1 pb-8">
          <p className="text-xs text-muted-foreground font-mono">
            Data sourced from CoinGecko, CoinPaprika &amp; Utopia P2P Explorer &middot; Refreshes every 60 seconds
          </p>
          <p className="text-xs text-muted-foreground/60">
            RANKD tracks only coins that launched fair — mined from genesis with no pre-mine, no team allocations, no VC wallets.
          </p>
          <BuildInfo />
        </footer>
      </main>

      <ContextMenuPortal onRefreshData={handleRefreshData} />
    </div>
  );
}
