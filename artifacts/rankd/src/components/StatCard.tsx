export function StatCard({ label, value, sub, tooltip }: { label: string; value: string; sub?: string; tooltip?: string }) {
  return (
    <div className="bg-card border border-border rounded-lg px-6 py-4 flex flex-col gap-1">
      <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className="text-2xl font-display font-bold text-foreground tabular-nums">{value}</span>
      {sub && (
        <span className="text-xs text-muted-foreground" title={tooltip}>
          {sub}
        </span>
      )}
    </div>
  );
}
