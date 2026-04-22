import { useState, useCallback, useRef, useEffect, Fragment } from "react";
import {
  useGetFairLaunchCoins,
  useGetFairLaunchStats,
  useGetCoinChart,
  getGetFairLaunchCoinsQueryKey,
  getGetFairLaunchStatsQueryKey,
  getGetCoinChartQueryKey,
} from "@workspace/api-client-react";
import type { FairLaunchCoin } from "@workspace/api-client-react";
import { formatMoney, formatPrice, formatNumber, formatPercent } from "@/lib/format";
import {
  Search, RefreshCw, TrendingUp, TrendingDown, Shield, Info,
  Award, Globe, ExternalLink, Github, ChevronDown, ChevronUp,
  Cpu, Activity, Percent, Tag, Radio,
} from "lucide-react";
import { ContextMenuPortal } from "@/components/ContextMenu";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

type SortField = "rank" | "price" | "volume24h" | "circulatingSupply" | "change30d" | "launchYear" | "stakingApy" | "softwareVersion" | "lastReleasedAt" | "activeNodes";
type SortDir = "asc" | "desc";

function useDragScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const pos = useRef({ down: false, startX: 0, scrollLeft: 0 });
  const draggedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function onDown(e: MouseEvent) {
      pos.current = { down: true, startX: e.clientX, scrollLeft: el!.scrollLeft };
      el!.style.cursor = "grabbing";
      el!.style.userSelect = "none";
    }
    function onMove(e: MouseEvent) {
      if (!pos.current.down) return;
      const dx = e.clientX - pos.current.startX;
      if (Math.abs(dx) > 4) draggedRef.current = true;
      el!.scrollLeft = pos.current.scrollLeft - dx;
    }
    function onUp() {
      pos.current.down = false;
      el!.style.cursor = "";
      el!.style.userSelect = "";
    }

    el.addEventListener("mousedown", onDown);
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseup", onUp);
    el.addEventListener("mouseleave", onUp);
    return () => {
      el.removeEventListener("mousedown", onDown);
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseup", onUp);
      el.removeEventListener("mouseleave", onUp);
    };
  }, []);

  const wasDrag = useCallback(() => {
    const v = draggedRef.current;
    draggedRef.current = false;
    return v;
  }, []);

  return { ref, wasDrag };
}

interface WhyFairTooltipProps {
  text: string;
  coinName: string;
}

function WhyFairTooltip({ text, coinName }: WhyFairTooltipProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function updatePos() {
      if (!btnRef.current) return;
      const rect = btnRef.current.getBoundingClientRect();
      const tooltipWidth = 288;
      const spaceRight = window.innerWidth - rect.right;
      const left = spaceRight >= tooltipWidth + 8
        ? rect.right + 8
        : rect.left - tooltipWidth - 8;
      setPos({ top: rect.top, left });
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    updatePos();
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative inline-block">
      <button
        ref={btnRef}
        data-testid={`tooltip-trigger-${coinName}`}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="p-1 rounded text-muted-foreground hover:text-primary transition-colors"
        title="Why is this a fair launch?"
      >
        <Shield className="w-4 h-4" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              style={{ position: "fixed", top: pos.top, left: pos.left, width: 288 }}
              className="z-50 bg-card border border-border rounded-lg p-4 shadow-xl text-sm"
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
      {[48, 160, 120, 130, 130, 100, 60, 80, 80, 90, 80, 90, 70, 40].map((w, i) => (
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

function SkeletonCard({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.03 }}
      className="px-4 py-3.5 border-b border-border flex items-center gap-3"
    >
      <div className="w-5 h-3.5 rounded bg-muted animate-pulse flex-shrink-0" />
      <div className="w-8 h-8 rounded-full bg-muted animate-pulse flex-shrink-0" />
      <div className="flex-1 space-y-2 min-w-0">
        <div className="h-4 w-28 rounded bg-muted animate-pulse" />
        <div className="h-3 w-10 rounded bg-muted animate-pulse" />
      </div>
      <div className="text-right space-y-2 flex-shrink-0">
        <div className="h-4 w-20 rounded bg-muted animate-pulse ml-auto" />
        <div className="h-3 w-12 rounded bg-muted animate-pulse ml-auto" />
      </div>
    </motion.div>
  );
}

const MOBILE_SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: "rank", label: "Rank" },
  { field: "price", label: "Price" },
  { field: "volume24h", label: "24h Vol" },
  { field: "change30d", label: "30D %" },
  { field: "activeNodes", label: "Nodes" },
  { field: "stakingApy", label: "Yield" },
  { field: "launchYear", label: "Year" },
  { field: "lastReleasedAt", label: "Release" },
];

interface MobileSortControlProps {
  sortField: SortField;
  sortDir: SortDir;
  onSort: (f: SortField) => void;
}

function MobileSortControl({ sortField, sortDir, onSort }: MobileSortControlProps) {
  return (
    <div className="flex gap-2 overflow-x-auto py-3 px-4 border-b border-border scrollbar-none bg-card/60">
      {MOBILE_SORT_OPTIONS.map(({ field, label }) => {
        const active = sortField === field;
        return (
          <button
            key={field}
            onClick={() => onSort(field)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-mono whitespace-nowrap transition-colors border flex-shrink-0 ${
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border"
            }`}
          >
            {label}
            {active && <span className="opacity-80">{sortDir === "asc" ? "↑" : "↓"}</span>}
          </button>
        );
      })}
    </div>
  );
}

function useInView(rootMargin = "0px") {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);
  return { ref, inView };
}

interface CoinSparklineProps {
  coin: FairLaunchCoin;
}

function CoinSparkline({ coin }: CoinSparklineProps) {
  const isPositive = coin.change30d != null && coin.change30d > 0;
  const { ref, inView } = useInView("100px");

  const { data: chartData } = useGetCoinChart(coin.id, {
    query: {
      queryKey: getGetCoinChartQueryKey(coin.id),
      staleTime: 10 * 60_000,
      enabled: inView,
    },
  });

  const prices = chartData?.prices ?? [];
  const hasData = prices.length >= 2;

  const W = 60;
  const H = 30;

  const points = (() => {
    if (!hasData) return "";
    const vals = prices.map(([, p]) => p);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    return vals
      .map((v, i) => {
        const x = (i / (vals.length - 1)) * W;
        const y = H - ((v - min) / range) * (H - 4) - 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  })();

  const isNegative = coin.change30d != null && coin.change30d < 0;
  const color = isPositive ? "#10b981" : isNegative ? "#f87171" : "#6b7280";

  if (inView && !hasData && chartData !== undefined) {
    return null;
  }

  return (
    <div ref={ref} className="flex-shrink-0">
      {inView && hasData ? (
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          className="overflow-visible"
          aria-hidden
        >
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <div style={{ width: W, height: H }} />
      )}
    </div>
  );
}

interface CoinCardProps {
  coin: FairLaunchCoin;
  isExpanded: boolean;
  onClick: () => void;
}

function CoinCard({ coin, isExpanded, onClick }: CoinCardProps) {
  const isPositive = coin.change30d != null && coin.change30d > 0;
  const isNegative = coin.change30d != null && coin.change30d < 0;

  return (
    <div
      className={`border-b border-border transition-colors ${
        coin.isFeatured ? "bg-amber-950/20 border-l-2 border-l-primary" : ""
      } ${isExpanded ? "bg-card" : ""}`}
    >
      <button
        onClick={onClick}
        className="w-full text-left px-4 py-3.5 flex items-center gap-3 active:bg-card/80"
      >
        <span className="w-6 text-xs font-mono text-muted-foreground tabular-nums text-right flex-shrink-0">
          {coin.rank}
        </span>
        <CoinLogo imageUrl={coin.imageUrl} name={coin.name} symbol={coin.symbol} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-sm text-foreground truncate">{coin.name}</span>
            {coin.isFeatured && <Award className="w-3 h-3 text-primary flex-shrink-0" />}
          </div>
          <span className="text-xs font-mono text-muted-foreground">{coin.symbol}</span>
        </div>
        <CoinSparkline coin={coin} />
        <div className="text-right flex-shrink-0">
          <div className="font-mono text-sm font-semibold text-foreground tabular-nums">
            {formatPrice(coin.price)}
          </div>
          <div
            className={`text-xs font-mono tabular-nums ${
              isPositive ? "text-emerald-400" : isNegative ? "text-red-400" : "text-muted-foreground"
            }`}
          >
            {formatPercent(coin.change30d)}
          </div>
        </div>
        <span className="ml-1 text-muted-foreground/50 flex-shrink-0">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0, overflow: "hidden" }}
            animate={{ height: "auto", opacity: 1, overflow: "visible" }}
            exit={{ height: 0, opacity: 0, overflow: "hidden" }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className={`border-t border-border ${coin.isFeatured ? "bg-amber-950/10" : "bg-card/40"}`}
          >
            <CoinDetailPanel coin={coin} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface CoinLogo {
  imageUrl?: string | null;
  name: string;
  symbol: string;
  size?: "sm" | "lg";
}

function CoinLogo({ imageUrl, name, symbol, size = "sm" }: CoinLogo) {
  const dim = size === "lg" ? "w-12 h-12 text-base" : "w-7 h-7 text-xs";
  const [failed, setFailed] = useState(false);
  if (!imageUrl || failed) {
    return (
      <div className={`${dim} rounded-full bg-muted flex items-center justify-center flex-shrink-0`}>
        <span className="font-bold text-muted-foreground">{symbol.slice(0, 2)}</span>
      </div>
    );
  }
  return (
    <img
      src={imageUrl}
      alt={name}
      className={`${dim} rounded-full flex-shrink-0 object-cover`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function formatRelativeTime(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return "—";
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return "just now";
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return "1 month ago";
  if (diffMonths < 12) return `${diffMonths} months ago`;
  const diffYears = Math.floor(diffDays / 365);
  if (diffYears === 1) return "1 year ago";
  return `${diffYears} years ago`;
}

const CHART_TOOLTIP_FORMATTER = (value: number) =>
  [`$${value < 0.01 ? value.toFixed(6) : value < 1 ? value.toFixed(4) : value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Price"];

const CHART_LABEL_FORMATTER = (label: number) =>
  new Date(label).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

interface CoinDetailPanelProps {
  coin: FairLaunchCoin;
}

const MOBILE_TABS = ["Story", "Chart", "Stats"] as const;
type MobileTab = typeof MOBILE_TABS[number];

function CoinDetailPanel({ coin }: CoinDetailPanelProps) {
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
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.25} />
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
                type="monotone"
                dataKey="price"
                stroke={chartColor}
                strokeWidth={2}
                fill={`url(#grad-${coin.id})`}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: chartColor }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
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
        <div className="mt-auto pt-2 border-t border-border">
          <div className="text-xs text-muted-foreground">
            No pre-mine · No VC allocation · No insider wallets
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
        <div className="bg-background rounded-lg border border-border p-3">
          <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Supply</div>
          <div className="text-sm font-mono font-semibold text-foreground">{formatNumber(coin.circulatingSupply)}</div>
        </div>
        {coin.stakingApy != null && (
          <div className="col-span-2 bg-amber-950/20 rounded-lg border border-primary/30 p-3">
            <div className="text-xs font-mono text-primary uppercase tracking-wider mb-1 flex items-center gap-1">
              <Percent className="w-3 h-3" /> Staking Yield
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

      {/* Network Health */}
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
      {/* ── Mobile: tab bar + single panel ── */}
      <div
        className="lg:hidden flex flex-col p-4 gap-3"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Tab bar */}
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

        {/* Active section */}
        {activeTab === "Story" && storySection}
        {activeTab === "Chart" && chartSection}
        {activeTab === "Stats" && statsSection}
      </div>

      {/* ── Desktop: unchanged 3-column layout ── */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_2fr_1fr] gap-6 p-6">
        {storySection}
        {chartSection}
        {statsSection}
      </div>
    </>
  );
}

export default function Home() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [expandedCoinId, setExpandedCoinId] = useState<string | null>(null);
  const tableScroll = useDragScroll();

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

  const sorted = [...coins].sort((a, b) => {
    if (sortField === "softwareVersion") {
      const aStr = a.softwareVersion ?? "";
      const bStr = b.softwareVersion ?? "";
      return sortDir === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    }
    let aVal: number;
    let bVal: number;
    switch (sortField) {
      case "rank": aVal = a.rank; bVal = b.rank; break;
      case "price": aVal = a.price ?? -Infinity; bVal = b.price ?? -Infinity; break;
      case "volume24h": aVal = a.volume24h ?? -Infinity; bVal = b.volume24h ?? -Infinity; break;
      case "circulatingSupply": aVal = a.circulatingSupply ?? -Infinity; bVal = b.circulatingSupply ?? -Infinity; break;
      case "change30d": aVal = a.change30d ?? -Infinity; bVal = b.change30d ?? -Infinity; break;
      case "launchYear": aVal = a.launchYear; bVal = b.launchYear; break;
      case "stakingApy": aVal = a.stakingApy ?? -Infinity; bVal = b.stakingApy ?? -Infinity; break;
      case "lastReleasedAt": {
        const aTs = a.lastReleasedAt ? new Date(a.lastReleasedAt).getTime() : -Infinity;
        const bTs = b.lastReleasedAt ? new Date(b.lastReleasedAt).getTime() : -Infinity;
        aVal = aTs; bVal = bTs; break;
      }
      case "activeNodes": aVal = a.activeNodes ?? -Infinity; bVal = b.activeNodes ?? -Infinity; break;
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
            className="w-full md:max-w-sm bg-card border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Mobile card list (< md) */}
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

        {/* Desktop table (≥ md) */}
        <div className="hidden md:block rounded-xl border border-border overflow-hidden">
          <div ref={tableScroll.ref} className="overflow-x-auto cursor-grab active:cursor-grabbing">
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
                  <th className="px-4 py-3 text-right" title="Exchange-reported 24h volume. May include inflated figures from unregulated venues.">
                    <SortButton field="volume24h" label="24h Vol" />
                  </th>
                  <th className="px-4 py-3 text-right">
                    <SortButton field="circulatingSupply" label="Circ. Supply" />
                  </th>
                  <th className="px-4 py-3 text-right">
                    <SortButton field="change30d" label="30D %" />
                  </th>
                  <th className="px-4 py-3 text-center">
                    <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">7D Chart</span>
                  </th>
                  <th className="px-4 py-3 text-center">
                    <SortButton field="launchYear" label="Year" />
                  </th>
                  <th className="px-4 py-3 text-center">
                    <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Consensus</span>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <SortButton field="stakingApy" label="Yield" />
                  </th>
                  <th className="px-4 py-3 text-center">
                    <SortButton field="softwareVersion" label="Version" />
                  </th>
                  <th className="px-4 py-3 text-center">
                    <SortButton field="lastReleasedAt" label="Last Release" />
                  </th>
                  <th className="px-4 py-3 text-right">
                    <SortButton field="activeNodes" label="Active Nodes" />
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
                            {/* Rank */}
                            <td className="px-4 py-4">
                              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                                {coin.rank}
                              </span>
                            </td>

                            {/* Coin name */}
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

                            {/* Price */}
                            <td className="px-4 py-4 text-right">
                              <span className="font-mono text-sm tabular-nums text-foreground">
                                {formatPrice(coin.price)}
                              </span>
                            </td>

                            {/* 24h Volume */}
                            <td className="px-4 py-4 text-right">
                              <span className="font-mono text-sm tabular-nums text-foreground">
                                {formatMoney(coin.volume24h)}
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
                                {formatPercent(coin.change30d)}
                              </span>
                            </td>

                            {/* 7D Sparkline */}
                            <td className="px-4 py-4 text-center">
                              <div className="flex justify-center">
                                <CoinSparkline coin={coin} />
                              </div>
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

                            {/* Yield */}
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

                            {/* Version */}
                            <td className="px-4 py-4 text-center">
                              {coin.softwareVersion ? (
                                <span className={`font-mono text-xs px-2 py-0.5 rounded ${coin.isFeatured ? "bg-primary/20 text-primary border border-primary/30" : "bg-muted text-muted-foreground"}`}>
                                  {coin.softwareVersion}
                                </span>
                              ) : (
                                <span className="font-mono text-xs text-muted-foreground/40">—</span>
                              )}
                            </td>

                            {/* Last Release */}
                            <td className="px-4 py-4 text-center">
                              <span className={`font-mono text-xs ${coin.lastReleasedAt ? (coin.isFeatured ? "text-primary" : "text-muted-foreground") : "text-muted-foreground/40"}`}>
                                {formatRelativeTime(coin.lastReleasedAt)}
                              </span>
                            </td>

                            {/* Active Nodes */}
                            <td className="px-4 py-4 text-right">
                              {coin.activeNodes != null ? (
                                <span className={`font-mono text-sm tabular-nums ${coin.isFeatured ? "text-primary font-semibold" : "text-foreground"}`}>
                                  {coin.activeNodes.toLocaleString()}
                                </span>
                              ) : (
                                <span className="font-mono text-sm text-muted-foreground/40">—</span>
                              )}
                            </td>

                            {/* Expand indicator */}
                            <td className="px-4 py-4 text-center w-8">
                              <span className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors inline-flex">
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </span>
                            </td>
                          </motion.tr>

                          {/* Expanded detail panel */}
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

        {/* Footer */}
        <footer className="text-center space-y-1 pb-8">
          <p className="text-xs text-muted-foreground font-mono">
            Data sourced from CoinGecko, CoinPaprika &amp; Utopia P2P Explorer &middot; Refreshes every 60 seconds
          </p>
          <p className="text-xs text-muted-foreground/60">
            RANKD tracks only coins that launched fair — mined from genesis with no pre-mine, no team allocations, no VC wallets.
          </p>
        </footer>
      </main>

      <ContextMenuPortal onRefreshData={handleRefreshData} />
    </div>
  );
}
