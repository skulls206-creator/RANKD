import { motion } from "framer-motion";

export function SkeletonRow({ index }: { index: number }) {
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
