import { useState, useRef, useEffect } from "react";
import { Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface WhyFairTooltipProps {
  text: string;
  coinName: string;
}

export function WhyFairTooltip({ text, coinName }: WhyFairTooltipProps) {
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
