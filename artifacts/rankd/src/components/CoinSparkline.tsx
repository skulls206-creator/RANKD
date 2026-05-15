import {
  useGetCoinChart,
  getGetCoinChartQueryKey,
} from "@workspace/api-client-react";
import type { FairLaunchCoin } from "@workspace/api-client-react";
import { useInView } from "@/hooks/use-in-view";

interface CoinSparklineProps {
  coin: FairLaunchCoin;
}

export function CoinSparkline({ coin }: CoinSparklineProps) {
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
