import { ChevronDown, ChevronUp, Award } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { FairLaunchCoin } from "@workspace/api-client-react";
import { formatPrice, formatPercent } from "@/lib/format";
import { CoinLogo } from "./CoinLogo";
import { CoinSparkline } from "./CoinSparkline";
import { CoinDetailPanel } from "./CoinDetailPanel";

interface CoinCardProps {
  coin: FairLaunchCoin;
  isExpanded: boolean;
  onClick: () => void;
}

export function CoinCard({ coin, isExpanded, onClick }: CoinCardProps) {
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
          {coin.stakingApy != null ? (
            <div className="text-xs font-mono tabular-nums text-amber-400">
              {coin.stakingApy}%
            </div>
          ) : (
            <span className={`text-xs font-mono tabular-nums ${
              isPositive ? "text-emerald-400" : isNegative ? "text-red-400" : "text-muted-foreground"
            }`}>
              {formatPercent(coin.change30d)}
            </span>
          )}
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
