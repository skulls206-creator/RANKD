import type { SortField, SortDir } from "@/lib/constants";

interface SortButtonProps {
  field: SortField;
  label: string;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (f: SortField) => void;
  className?: string;
}

export function SortButton({ field, label, sortField, sortDir, onSort, className }: SortButtonProps) {
  const active = sortField === field;
  return (
    <button
      data-testid={`sort-${field}`}
      onClick={() => onSort(field)}
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
