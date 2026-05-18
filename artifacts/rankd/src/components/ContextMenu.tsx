import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, Zap, ArrowUp, Link2, Share2,
  BarChart2, Globe, Search, DollarSign, Hash,
} from "lucide-react";

interface CoinContext {
  id: string;
  name: string;
  symbol: string;
  price: string;
  website: string;
  explorer: string;
}

interface MenuItem {
  type: "item" | "separator";
  label?: string;
  icon?: React.ReactNode;
  action?: () => void;
  danger?: boolean;
  badge?: string;
}

interface ContextMenuProps {
  onRefreshData: () => void;
}

function buildItems(coin: CoinContext | null, onRefreshData: () => void): MenuItem[] {
  const items: MenuItem[] = [];

  if (coin) {
    items.push({
      type: "item",
      label: `Copy Price — ${coin.price || "N/A"}`,
      icon: <DollarSign className="w-3.5 h-3.5" />,
      action: () => navigator.clipboard.writeText(coin.price || ""),
    });
    items.push({
      type: "item",
      label: `Copy $${coin.symbol}`,
      icon: <Hash className="w-3.5 h-3.5" />,
      action: () => navigator.clipboard.writeText(coin.symbol),
    });

    if (coin.website) {
      items.push({ type: "separator" });
      items.push({
        type: "item",
        label: `${coin.name} Website`,
        icon: <Globe className="w-3.5 h-3.5" />,
        action: () => window.open(coin.website, "_blank", "noopener"),
      });
    }

    if (coin.explorer) {
      if (!coin.website) items.push({ type: "separator" });
      items.push({
        type: "item",
        label: "View Block Explorer",
        icon: <Search className="w-3.5 h-3.5" />,
        action: () => window.open(coin.explorer, "_blank", "noopener"),
      });
    }

    items.push({ type: "separator" });
  }

  items.push({
    type: "item",
    label: "Refresh Market Data",
    icon: <BarChart2 className="w-3.5 h-3.5" />,
    action: onRefreshData,
    badge: "live",
  });

  items.push({ type: "separator" });

  items.push({
    type: "item",
    label: "Reload Page",
    icon: <RefreshCw className="w-3.5 h-3.5" />,
    action: () => window.location.reload(),
  });

  items.push({
    type: "item",
    label: "Hard Refresh",
    icon: <Zap className="w-3.5 h-3.5" />,
    action: async () => {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      window.location.reload();
    },
    badge: "clears cache",
  });

  items.push({ type: "separator" });

  items.push({
    type: "item",
    label: "Back to Top",
    icon: <ArrowUp className="w-3.5 h-3.5" />,
    action: () => window.scrollTo({ top: 0, behavior: "smooth" }),
  });

  items.push({
    type: "item",
    label: "Copy Link",
    icon: <Link2 className="w-3.5 h-3.5" />,
    action: () => navigator.clipboard.writeText(window.location.href),
  });

  if (typeof navigator.share === "function") {
    items.push({
      type: "item",
      label: "Share RANKD",
      icon: <Share2 className="w-3.5 h-3.5" />,
      action: () =>
        navigator.share({
          title: "RANKD — Fair Launch Only",
          text: "Track real fair-launch crypto — no pre-mines, no VC.",
          url: window.location.href,
        }).catch(() => {}),
    });
  }

  return items;
}

export function useContextMenu(onRefreshData: () => void) {
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    coin: CoinContext | null;
  } | null>(null);

  const close = useCallback(() => setMenu(null), []);

  useEffect(() => {
    function onContext(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const coinEl = target.closest("[data-coin-id]") as HTMLElement | null;

      // Only intercept context menu on coin rows; let native copy/paste work everywhere else
      if (!coinEl) return;

      e.preventDefault();

      const coin: CoinContext | null = {
        id: coinEl.dataset.coinId ?? "",
        name: coinEl.dataset.coinName ?? "",
        symbol: coinEl.dataset.coinSymbol ?? "",
        price: coinEl.dataset.coinPrice ?? "",
        website: coinEl.dataset.coinWebsite ?? "",
        explorer: coinEl.dataset.coinExplorer ?? "",
      };

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const menuW = 240;
      const menuH = 380;
      const x = e.clientX + menuW > vw ? e.clientX - menuW : e.clientX;
      const y = e.clientY + menuH > vh ? e.clientY - menuH : e.clientY;

      setMenu({ x, y, coin });
    }

    document.addEventListener("contextmenu", onContext);
    return () => document.removeEventListener("contextmenu", onContext);
  }, []);

  useEffect(() => {
    if (!menu) return;
    function onDismiss(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent && e.key !== "Escape") return;
      setMenu(null);
    }
    document.addEventListener("click", onDismiss);
    document.addEventListener("keydown", onDismiss);
    return () => {
      document.removeEventListener("click", onDismiss);
      document.removeEventListener("keydown", onDismiss);
    };
  }, [menu]);

  const ContextMenuEl = menu ? (
    <ContextMenuPopup
      x={menu.x}
      y={menu.y}
      coin={menu.coin}
      onRefreshData={onRefreshData}
      onClose={close}
    />
  ) : null;

  return { ContextMenuEl };
}

function ContextMenuPopup({
  x,
  y,
  coin,
  onRefreshData,
  onClose,
}: {
  x: number;
  y: number;
  coin: CoinContext | null;
  onRefreshData: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const items = buildItems(coin, onRefreshData);

  return (
    <div
      ref={ref}
      style={{ position: "fixed", left: x, top: y, zIndex: 9999 }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: -4 }}
        transition={{ duration: 0.1, ease: "easeOut" }}
        className="min-w-[220px] rounded-lg border border-border bg-card shadow-2xl shadow-black/60 backdrop-blur-sm py-1 overflow-hidden"
      >
        {coin && (
          <div className="px-3 py-2 border-b border-border mb-1">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              {coin.name}
            </p>
            <p className="text-xs font-mono text-primary font-bold">${coin.symbol}</p>
          </div>
        )}

        {items.map((item, i) => {
          if (item.type === "separator") {
            return <div key={i} className="my-1 border-t border-border/60" />;
          }

          return (
            <button
              key={i}
              onClick={() => {
                onClose();
                item.action?.();
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-xs transition-colors group
                ${item.danger
                  ? "text-red-400 hover:bg-red-500/10"
                  : "text-foreground hover:bg-primary/10 hover:text-primary"
                }`}
            >
              <span className="text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                {item.icon}
              </span>
              <span className="flex-1 font-mono">{item.label}</span>
              {item.badge && (
                <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/20">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </motion.div>
    </div>
  );
}

export function ContextMenuPortal({ onRefreshData }: ContextMenuProps) {
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    coin: CoinContext | null;
  } | null>(null);

  useEffect(() => {
    function onContext(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const coinEl = target.closest("[data-coin-id]") as HTMLElement | null;

      // Only intercept context menu on coin rows; let native copy/paste work everywhere else
      if (!coinEl) return;

      e.preventDefault();

      const coin: CoinContext | null = {
        id: coinEl.dataset.coinId ?? "",
        name: coinEl.dataset.coinName ?? "",
        symbol: coinEl.dataset.coinSymbol ?? "",
        price: coinEl.dataset.coinPrice ?? "",
        website: coinEl.dataset.coinWebsite ?? "",
        explorer: coinEl.dataset.coinExplorer ?? "",
      };

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const menuW = 240;
      const menuH = 380;
      const x = e.clientX + menuW > vw ? e.clientX - menuW : e.clientX;
      const y = e.clientY + menuH > vh ? e.clientY - menuH : e.clientY;

      setMenu({ x, y, coin });
    }

    document.addEventListener("contextmenu", onContext);
    return () => document.removeEventListener("contextmenu", onContext);
  }, []);

  useEffect(() => {
    if (!menu) return;
    function onDismiss(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent && e.key !== "Escape") return;
      setMenu(null);
    }
    document.addEventListener("click", onDismiss);
    document.addEventListener("keydown", onDismiss);
    return () => {
      document.removeEventListener("click", onDismiss);
      document.removeEventListener("keydown", onDismiss);
    };
  }, [menu]);

  return (
    <AnimatePresence>
      {menu && (
        <ContextMenuPopup
          x={menu.x}
          y={menu.y}
          coin={menu.coin}
          onRefreshData={onRefreshData}
          onClose={() => setMenu(null)}
        />
      )}
    </AnimatePresence>
  );
}
