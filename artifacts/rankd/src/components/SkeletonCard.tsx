import { motion } from "framer-motion";

export function SkeletonCard({ index }: { index: number }) {
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
