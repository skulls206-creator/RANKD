import { useState, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { Activity, BarChart3, Users } from "lucide-react";

interface BlockData {
  block: number;
  miningThreads: number;
  blockReward: number;
  crpSupply: number;
  timestamp: string;
  apr: number;
}

type ViewMode = "nodes" | "apr";

export function CrpHistoryChart() {
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("nodes");

  useEffect(() => {
    fetch("/api/fairlaunch/crp/history")
      .then((r) => r.json())
      .then((data) => {
        setBlocks(data.blocks ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-52 rounded-lg bg-muted/30 animate-pulse flex items-center justify-center">
        <span className="text-xs text-muted-foreground">Loading CRP history...</span>
      </div>
    );
  }

  if (blocks.length === 0) {
    return (
      <div className="h-52 rounded-lg border border-border/50 flex flex-col items-center justify-center gap-2">
        <Activity className="w-6 h-6 text-muted-foreground/50" />
        <span className="text-xs text-muted-foreground">Block history unavailable</span>
      </div>
    );
  }

  const firstBlock = blocks[0];
  const lastBlock = blocks[blocks.length - 1];
  const threadRange = [
    Math.min(...blocks.map((b) => b.miningThreads)),
    Math.max(...blocks.map((b) => b.miningThreads)),
  ];
  const aprRange = [
    Math.min(...blocks.map((b) => b.apr)),
    Math.max(...blocks.map((b) => b.apr)),
  ];

  const chartData = blocks.map((b) => ({
    block: b.block,
    label: `#${b.block.toLocaleString()}`,
    nodes: b.miningThreads,
    apr: Math.round(b.apr * 100) / 100,
    date: b.timestamp,
  }));

  const dataKey = viewMode === "nodes" ? "nodes" : "apr";
  const color = viewMode === "nodes" ? "#10b981" : "#f59e0b";
  const domain = viewMode === "nodes"
    ? [Math.max(0, threadRange[0] - 100), threadRange[1] + 100]
    : [Math.max(0, aprRange[0] - 50), aprRange[1] + 50];

  const xTicks = [
    chartData[0]?.block,
    chartData[Math.floor(chartData.length / 4)]?.block,
    chartData[Math.floor(chartData.length / 2)]?.block,
    chartData[Math.floor(chartData.length * 3 / 4)]?.block,
    chartData[chartData.length - 1]?.block,
  ].filter(Boolean);

  return (
    <div className="col-span-2 bg-card rounded-lg border border-border p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          {viewMode === "nodes" ? "Active Nodes (500 blocks)" : "APR History (500 blocks)"}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode("nodes")}
            className={`px-2 py-1 rounded text-[10px] font-mono font-semibold transition-colors ${
              viewMode === "nodes"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "text-muted-foreground hover:text-foreground border border-transparent"
            }`}
          >
            <Users className="w-3 h-3 inline mr-1" />Nodes
          </button>
          <button
            onClick={() => setViewMode("apr")}
            className={`px-2 py-1 rounded text-[10px] font-mono font-semibold transition-colors ${
              viewMode === "apr"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "text-muted-foreground hover:text-foreground border border-transparent"
            }`}
          >
            <BarChart3 className="w-3 h-3 inline mr-1" />APR
          </button>
        </div>
      </div>

      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="crpChartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="block"
              ticks={xTicks}
              tickFormatter={(v: number) => `#${(v / 1000).toFixed(0)}K`}
              tick={{ fontSize: 10, fill: "#6b7280" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={domain as [number, number]}
              tickFormatter={(v: number) =>
                viewMode === "nodes"
                  ? v.toLocaleString()
                  : `${Math.round(v)}%`
              }
              tick={{ fontSize: 10, fill: "#6b7280" }}
              tickLine={false}
              axisLine={false}
              width={50}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "#1c2333", border: "1px solid #374151", borderRadius: "8px", fontSize: 12 }}
              labelStyle={{ color: "#9ca3af" }}
              itemStyle={{ color }}
              formatter={(value: number, name: string) => {
                if (name === "nodes") return [value.toLocaleString(), "Active Nodes"];
                return [`${value}%`, "APR"];
              }}
              labelFormatter={(label: number) => `Block #${label.toLocaleString()}`}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={1.5}
              fill="url(#crpChartGrad)"
              dot={false}
              activeDot={{ r: 3, fill: color }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-between mt-2 text-[10px] text-muted-foreground/60 font-mono">
        <span>Block {firstBlock.block.toLocaleString()}</span>
        <span>
          {viewMode === "nodes"
            ? `${threadRange[0]} – ${threadRange[1]} nodes`
            : `${aprRange[0].toFixed(1)}% – ${aprRange[1].toFixed(1)}% APR`
          }
        </span>
        <span>Block {lastBlock.block.toLocaleString()}</span>
      </div>
    </div>
  );
}
