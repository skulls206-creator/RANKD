import { useState, useCallback } from "react";
import { useGetFairLaunchCoins, useGetFairLaunchStats, getGetFairLaunchCoinsQueryKey, getGetFairLaunchStatsQueryKey } from "@workspace/api-client-react";
import { formatMoney, formatPrice, formatNumber, formatPercent } from "@/lib/format";
import { Search, RefreshCw, TrendingUp, TrendingDown, Shield, Info, Award } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type SortField = "rank" | "price" | "marketCap" | "circulatingSupply" | "change24h" | "launchYear";
type SortDir = "asc" | "desc";

interface WhyFairTooltipProps {
  text: string;
  coinName: string;
}

function WhyFairTooltip({ text, coinName }: WhyFairTooltipProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button
        data-testid={`tooltip-trigger-${coinName}`}
        onClick={() => setOpen((v) => !v)}
        className="p-1 rounded text-muted-foreground hover:text-primary transition-colors"
        title="Why is this a fair launch?"
      >
        <Shield className="w-4 h-4" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute left-6 top-0 z-20 w-72 bg-card border border-border rounded-lg p-4 shadow-xl text-sm"
            >
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="font-semibold text-foreground">Fair Launch Verified</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">{text}</p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-lg px-6 py-4 flex flex-col gap-1">
      <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className="text-2xl font-display font-bold text-foreground tabular-nums">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

function SkeletonRow({ index }: { index: number }) {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.03 }}
      className="border-b border-border"
    >
      {[48, 160, 120, 130, 130, 100, 80, 80, 40].map((w, i) => (
        <td key={i} className="px-4 py-4">
          <div
            className="h-4 rounded bg-muted animate-pulse"
            style={{ width: w }}
          />
        </td>
      ))}
    </motion.tr>
  );
}

export default function Home() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const debounceTimeout = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    if (debounceTimeout[0]) clearTimeout(debounceTimeout[0]);
    debounceTimeout[1](
      setTimeout(() => setDebouncedSearch(value), 300)
    );
  }, [debounceTimeout]);

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
    },
  });

  const { data: stats, isLoading: statsLoading } = useGetFairLaunchStats({
    query: {
      queryKey: getGetFairLaunchStatsQueryKey(),
      refetchInterval: 60_000,
      staleTime: 30_000,
    },
  });

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "rank" || field === "launchYear" ? "asc" : "desc");
    }
  }

  const coins = coinsData?.coins ?? [];

  const sorted = [...coins].sort((a, b) => {
    let aVal: number;
    let bVal: number;
    switch (sortField) {
      case "rank": aVal = a.rank; bVal = b.rank; break;
      case "price": aVal = a.price ?? -Infinity; bVal = b.price ?? -Infinity; break;
      case "marketCap": aVal = a.marketCap ?? -Infinity; bVal = b.marketCap ?? -Infinity; break;
      case "circulatingSupply": aVal = a.circulatingSupply ?? -Infinity; bVal = b.circulatingSupply ?? -Infinity; break;
      case "change24h": aVal = a.change24h ?? -Infinity; bVal = b.change24h ?? -Infinity; break;
      case "launchYear": aVal = a.launchYear; bVal = b.launchYear; break;
      default: aVal = a.rank; bVal = b.rank;
    }
    return sortDir === "asc" ? aVal - bVal : bVal - aVal;
  });

  function SortButton({ field, label, className }: { field: SortField; label: string; className?: string }) {
    const active = sortField === field;
    return (
      <button
        data-testid={`sort-${field}`}
        onClick={() => handleSort(field)}
        className={`flex items-center gap-1 text-xs font-mono uppercase tracking-wider whitespace-nowrap transition-colors ${
          active ? "text-primary" : "text-muted-foreground hover:text-foreground"
        } ${className ?? ""}`}
      >
        {label}
        {active && (
          <span className="text-primary">
            {sortDir === "asc" ? " ↑" : " ↓"}
          </span>
        )}
      </button>
    );
  }

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
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/90 backdrop-blur-sm z-30">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
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
              <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground font-mono">
                <div className={`w-1.5 h-1.5 rounded-full ${isFetching ? "bg-yellow-400 animate-pulse" : "bg-green-500"}`} />
                Updated {lastUpdated}
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

      <main className="max-w-[1400px] mx-auto px-6 py-8 space-y-8">
        {/* Hero text */}
        <div className="space-y-2">
          <h1 className="text-lg font-display font-semibold text-foreground">
            The real market cap leaderboard.
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Only coins that launched like Bitcoin — mined openly from genesis, zero pre-mine, no VC wallets, no insider allocations.
            No tokens. No layer 1/2 infra plays. No noise.
          </p>
        </div>

        {/* Stats row */}
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
                label="Fair Market Cap"
                value={formatMoney(stats.totalMarketCap)}
                sub="Combined fair-launch only"
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
                label="Crypton Rank"
                value={stats.cryptonRank ? `#${stats.cryptonRank}` : "Unranked"}
                sub="CRP among fair peers"
              />
            </>
          ) : null}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            data-testid="input-search"
            type="search"
            placeholder="Search coins..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full max-w-sm bg-card border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card">
                  <th className="px-4 py-3 text-left w-12">
                    <SortButton field="rank" label="#" />
                  </th>
                  <th className="px-4 py-3 text-left min-w-[180px]">
                    <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Coin</span>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <SortButton field="price" label="Price" />
                  </th>
                  <th className="px-4 py-3 text-right">
                    <SortButton field="marketCap" label="Market Cap" />
                  </th>
                  <th className="px-4 py-3 text-right">
                    <SortButton field="circulatingSupply" label="Circ. Supply" />
                  </th>
                  <th className="px-4 py-3 text-right">
                    <SortButton field="change24h" label="24h %" />
                  </th>
                  <th className="px-4 py-3 text-center">
                    <SortButton field="launchYear" label="Year" />
                  </th>
                  <th className="px-4 py-3 text-center">
                    <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Consensus</span>
                  </th>
                  <th className="px-4 py-3 text-center">
                    <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Fair?</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {coinsLoading ? (
                  Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} index={i} />)
                ) : coinsError ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center">
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
                    <td colSpan={9} className="px-4 py-16 text-center">
                      <p className="text-muted-foreground">No coins found matching "{search}"</p>
                    </td>
                  </tr>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {sorted.map((coin, idx) => {
                      const isPositive = coin.change24h != null && coin.change24h > 0;
                      const isNegative = coin.change24h != null && coin.change24h < 0;
                      return (
                        <motion.tr
                          key={coin.id}
                          data-testid={`row-coin-${coin.symbol}`}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2, delay: idx * 0.02 }}
                          className={`border-b border-border transition-colors hover:bg-card group ${
                            coin.isFeatured
                              ? "bg-amber-950/20 hover:bg-amber-950/30 border-l-2 border-l-primary"
                              : ""
                          }`}
                        >
                          {/* Rank */}
                          <td className="px-4 py-4">
                            <span className="font-mono text-xs text-muted-foreground tabular-nums">
                              {coin.rank}
                            </span>
                          </td>

                          {/* Coin name */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              {coin.imageUrl ? (
                                <img
                                  src={coin.imageUrl}
                                  alt={coin.name}
                                  className="w-7 h-7 rounded-full flex-shrink-0"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-bold text-muted-foreground">
                                    {coin.symbol.slice(0, 2)}
                                  </span>
                                </div>
                              )}
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
                                <span className="text-xs font-mono text-muted-foreground">
                                  {coin.symbol}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Price */}
                          <td className="px-4 py-4 text-right">
                            <span className="font-mono text-sm tabular-nums text-foreground">
                              {formatPrice(coin.price)}
                            </span>
                          </td>

                          {/* Market Cap */}
                          <td className="px-4 py-4 text-right">
                            <span className="font-mono text-sm tabular-nums text-foreground">
                              {formatMoney(coin.marketCap)}
                            </span>
                          </td>

                          {/* Circulating Supply */}
                          <td className="px-4 py-4 text-right">
                            <span className="font-mono text-sm tabular-nums text-muted-foreground">
                              {formatNumber(coin.circulatingSupply)}
                            </span>
                          </td>

                          {/* 24h change */}
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
                              {formatPercent(coin.change24h)}
                            </span>
                          </td>

                          {/* Launch Year */}
                          <td className="px-4 py-4 text-center">
                            <span className="font-mono text-xs text-muted-foreground">
                              {coin.launchYear}
                            </span>
                          </td>

                          {/* Consensus */}
                          <td className="px-4 py-4 text-center">
                            <span className="font-mono text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
                              {coin.consensusType}
                            </span>
                          </td>

                          {/* Why Fair */}
                          <td className="px-4 py-4 text-center">
                            <WhyFairTooltip text={coin.whyFair} coinName={coin.name} />
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center space-y-1 pb-8">
          <p className="text-xs text-muted-foreground font-mono">
            Data sourced from CoinGecko &middot; Refreshes every 60 seconds
          </p>
          <p className="text-xs text-muted-foreground/60">
            RANKD tracks only coins that launched fair — mined from genesis with no pre-mine, no team allocations, no VC wallets.
          </p>
        </footer>
      </main>
    </div>
  );
}
