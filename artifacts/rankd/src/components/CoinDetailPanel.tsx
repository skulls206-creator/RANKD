import { useState, useRef, useEffect } from "react";
import type { FairLaunchCoin } from "@workspace/api-client-react";
import {
  useGetCoinChart,
  getGetCoinChartQueryKey,
} from "@workspace/api-client-react";
import { formatPrice, formatMoney, formatPercent, formatRelativeTime } from "@/lib/format";
import { CoinLogo } from "./CoinLogo";
import { CrpHistoryChart } from "./CrpHistoryChart";
import {
  Activity, Shield, ExternalLink, Globe, Github, Award,
  TrendingUp, TrendingDown, Cpu, Percent, Tag, Radio,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

const MOBILE_TABS = ["Story", "Chart", "Stats"] as const;
type MobileTab = typeof MOBILE_TABS[number];

const CHART_TOOLTIP_FORMATTER = (value: number) =>
  [`$${value < 0.01 ? value.toFixed(6) : value < 1 ? value.toFixed(4) : value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Price"];

const CHART_LABEL_FORMATTER = (label: number) =>
  new Date(label).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

interface CoinDetailPanelProps {
  coin: FairLaunchCoin;
}

export function CoinDetailPanel({ coin }: CoinDetailPanelProps) {
  const { data: chartData, isLoading: chartLoading } = useGetCoinChart(coin.id, {
    query: { queryKey: getGetCoinChartQueryKey(coin.id), staleTime: 10 * 60_000 },
  });

  const isPositive = coin.change30d != null && coin.change30d > 0;
  const isNegative = coin.change30d != null && coin.change30d < 0;

  const chartPoints = chartData?.prices?.map(([ts, price]) => ({ ts, price })) ?? [];

  const minPrice = chartPoints.length ? Math.min(...chartPoints.map((p) => p.price)) : 0;
  const maxPrice = chartPoints.length ? Math.max(...chartPoints.map((p) => p.price)) : 0;
  const priceRange = maxPrice - minPrice;
  const yDomain = chartPoints.length
    ? [minPrice - priceRange * 0.05, maxPrice + priceRange * 0.05]
    : ["auto", "auto"];

  const chartColor = isNegative ? "#f87171" : "#10b981";

  const [yAxisWidth, setYAxisWidth] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? 45 : 55
  );
  useEffect(() => {
    function update() { setYAxisWidth(window.innerWidth < 768 ? 45 : 55); }
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const chartTicks = chartPoints.length > 1
    ? [0, 1, 2, 3, 4]
        .map((i) => Math.round(i * (chartPoints.length - 1) / 4))
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .map((i) => chartPoints[i].ts)
    : chartPoints.map((p) => p.ts);

  const links = [
    coin.website && { href: coin.website, icon: Globe, label: "Website" },
    coin.explorer && { href: coin.explorer, icon: Activity, label: "Explorer" },
    coin.github && { href: coin.github, icon: Github, label: "GitHub" },
  ].filter(Boolean) as { href: string; icon: typeof Globe; label: string }[];

  const [activeTab, setActiveTab] = useState<MobileTab>("Story");
  const touchStartX = useRef<number | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    const idx = MOBILE_TABS.indexOf(activeTab);
    if (dx < 0 && idx < MOBILE_TABS.length - 1) setActiveTab(MOBILE_TABS[idx + 1]);
    if (dx > 0 && idx > 0) setActiveTab(MOBILE_TABS[idx - 1]);
  }

  const chartSection = (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">7-Day Price</div>
      <div className="h-52 lg:h-48 w-full">
        {chartLoading ? (
          <div className="h-full w-full rounded-lg bg-muted/30 animate-pulse flex items-center justify-center">
            <span className="text-xs text-muted-foreground">Loading chart...</span>
          </div>
        ) : !chartData?.hasData || chartPoints.length === 0 ? (
          <div className="h-full w-full rounded-lg border border-border/50 flex flex-col items-center justify-center gap-2">
            <Activity className="w-6 h-6 text-muted-foreground/50" />
            <span className="text-xs text-muted-foreground">Chart data unavailable</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartPoints} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${coin.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="ts"
                ticks={chartTicks}
                tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                tick={{ fontSize: 10, fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={yDomain as [number, number]}
                tickFormatter={(v: number) => {
                  if (v < 0.001) return `$${v.toFixed(6)}`;
                  if (v < 0.01)  return `$${v.toFixed(4)}`;
                  if (v < 1)     return `$${v.toFixed(3)}`;
                  if (v < 10)    return `$${v.toFixed(1)}`;
                  if (v < 1000)  return `$${Math.round(v)}`;
                  if (v < 1e6)   return `$${(v / 1000).toFixed(1)}K`;
                  return `$${(v / 1e6).toFixed(1)}M`;
                }}
                tick={{ fontSize: 10, fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
                width={yAxisWidth}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "#1c2333", border: "1px solid #374151", borderRadius: "8px", fontSize: 12 }}
                labelStyle={{ color: "#9ca3af" }}
                itemStyle={{ color: chartColor }}
                formatter={CHART_TOOLTIP_FORMATTER}
                labelFormatter={CHART_LABEL_FORMATTER}
              />
              <Area
                type="linear"
                dataKey="price"
                stroke={chartColor}
                strokeWidth={1.5}
                fill={`url(#grad-${coin.id})`}
                dot={false}
                isAnimationActive={false}
                activeDot={{ r: 3, strokeWidth: 1, stroke: '#1c2333', fill: chartColor }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      {coin.id === "crp-crypton" && <CrpHistoryChart />}
    </div>
  );

  const storySection = (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Fair Launch Story</div>
      <div className="bg-background rounded-lg border border-border p-4 flex flex-col gap-3 h-full">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-sm font-semibold text-foreground">Verified Fair Launch</span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{coin.whyFair}</p>
        <div className="flex flex-col gap-1.5 mt-2">
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <span className="text-emerald-500 shrink-0">✓</span>
            <span className="text-muted-foreground">No pre-mine — all supply mined from genesis block</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <span className="text-emerald-500 shrink-0">✓</span>
            <span className="text-muted-foreground">No VC allocation or insider presale wallets</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <span className="text-emerald-500 shrink-0">✓</span>
            <span className="text-muted-foreground">{coin.algorithm} · {coin.consensusType} · launched {coin.launchYear}</span>
          </div>
          {coin.activeNodes != null && (
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <span className="text-emerald-500 shrink-0">✓</span>
              <span className="text-muted-foreground"><span className="text-foreground font-semibold">{coin.activeNodes.toLocaleString()}</span> active nodes securing the network</span>
            </div>
          )}
          {coin.stakingApy != null && (
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <span className="text-emerald-500 shrink-0">✓</span>
              <span className="text-muted-foreground"><span className="text-amber-400 font-semibold">{coin.stakingApy}% APR</span> mining yield on min stake</span>
            </div>
          )}
        </div>
        <div className="mt-2 pt-2 border-t border-border">
          <div className="text-xs font-mono text-muted-foreground/60 italic">
            Independently verified against blockchain explorer data
          </div>
        </div>
      </div>
    </div>
  );

  const statsSection = (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <CoinLogo imageUrl={coin.imageUrl} name={coin.name} symbol={coin.symbol} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h2 className="text-xl font-display font-bold text-foreground truncate min-w-0">{coin.name}</h2>
            {coin.isFeatured && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-primary/20 text-primary border border-primary/30 flex-shrink-0">
                <Award className="w-3 h-3" /> Featured
              </span>
            )}
          </div>
          <span className="text-sm font-mono text-muted-foreground">{coin.symbol} · Rank #{coin.rank}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-background rounded-lg border border-border p-3">
          <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Price</div>
          <div className="text-lg font-mono font-bold text-foreground">{formatPrice(coin.price)}</div>
        </div>
        <div className="bg-background rounded-lg border border-border p-3">
          <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">30D Change</div>
          <div className={`text-lg font-mono font-bold flex items-center gap-1 ${isPositive ? "text-emerald-400" : isNegative ? "text-red-400" : "text-muted-foreground"}`}>
            {isPositive && <TrendingUp className="w-4 h-4" />}
            {isNegative && <TrendingDown className="w-4 h-4" />}
            {formatPercent(coin.change30d)}
          </div>
        </div>
        <div className="bg-background rounded-lg border border-border p-3">
          <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">24h Volume</div>
          <div className="text-sm font-mono font-semibold text-foreground">{formatMoney(coin.volume24h)}</div>
        </div>
        {coin.stakingApy != null && (
          <div className="col-span-2 bg-amber-950/20 rounded-lg border border-primary/30 p-3">
            <div className="text-xs font-mono text-primary uppercase tracking-wider mb-1 flex items-center gap-1">
              <Percent className="w-3 h-3" /> Yield
            </div>
            <div className="flex items-center justify-between">
              <div className="text-lg font-mono font-bold text-primary">{coin.stakingApy}% APY</div>
              {coin.yieldType && (
                <span className="text-xs font-mono px-1.5 py-0.5 bg-primary/20 text-primary rounded">{coin.yieldType}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {(coin.softwareVersion || coin.lastReleasedAt || coin.activeNodes != null) && (
        <div className="flex flex-col gap-2">
          <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Network Health</div>
          <div className="grid grid-cols-2 gap-2">
            {coin.softwareVersion && (
              <div className="bg-background rounded-lg border border-border p-3 flex flex-col gap-1">
                <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  <Tag className="w-3 h-3" /> Version
                </div>
                <div className="text-sm font-mono font-semibold text-foreground truncate">{coin.softwareVersion}</div>
              </div>
            )}
            {coin.lastReleasedAt && (
              <div className="bg-background rounded-lg border border-border p-3 flex flex-col gap-1">
                <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  <Activity className="w-3 h-3" /> Last Release
                </div>
                <div className="text-sm font-mono font-semibold text-foreground">{formatRelativeTime(coin.lastReleasedAt)}</div>
              </div>
            )}
            {coin.activeNodes != null && (
              <div className={`${coin.softwareVersion || coin.lastReleasedAt ? "col-span-2" : ""} bg-emerald-950/20 rounded-lg border border-emerald-500/30 p-3 flex flex-col gap-1`}>
                <div className="flex items-center gap-1 text-xs font-mono text-emerald-400 uppercase tracking-wider">
                  <Radio className="w-3 h-3" /> Active Nodes
                </div>
                <div className="text-lg font-mono font-bold text-emerald-400">{coin.activeNodes.toLocaleString()}</div>
                <div className="text-xs text-emerald-600">nodes online · proof of life</div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Cpu className="w-3.5 h-3.5" />
          <span className="font-mono">{coin.algorithm}</span>
          <span className="text-border">·</span>
          <span className="font-mono px-1.5 py-0.5 bg-muted rounded">{coin.consensusType}</span>
          <span className="text-border">·</span>
          <span>{coin.launchYear}</span>
        </div>

        {links.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {links.map(({ href, icon: Icon, label }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div
        className="lg:hidden flex flex-col p-4 gap-3"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex rounded-lg border border-border overflow-hidden">
          {MOBILE_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-xs font-mono font-semibold transition-colors ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Story" && storySection}
        {activeTab === "Chart" && chartSection}
        {activeTab === "Stats" && statsSection}
      </div>

      <div className="hidden lg:grid lg:grid-cols-[1fr_2fr_1fr] gap-6 p-6">
        {storySection}
        {chartSection}
        {statsSection}
      </div>
    </>
  );
}
