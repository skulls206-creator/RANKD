import type { SortField, SortDir } from "@/lib/constants";
import { MOBILE_SORT_OPTIONS } from "@/lib/constants";

interface MobileSortControlProps {
  sortField: SortField;
  sortDir: SortDir;
  onSort: (f: SortField) => void;
}

export function MobileSortControl({ sortField, sortDir, onSort }: MobileSortControlProps) {
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
