import type { WorkItemFilters as Filters } from "@/lib/work-items";
import { BOARD_COLUMNS, SOURCE_LABELS, type WorkItemSource } from "@/lib/work-items";
import { PRIORITY_LABELS } from "@/lib/labels-th";

const SOURCES: (WorkItemSource | "all")[] = [
  "all",
  "support_ticket",
  "feature_suggestion",
  "app_feedback",
  "user_report",
  "ops_issue",
];

export function WorkItemFilters({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="search"
        placeholder="ค้นหา..."
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        className="rounded-lg border border-border px-3 py-1.5 text-sm outline-none focus:border-brand"
      />
      <select
        value={filters.source}
        onChange={(e) =>
          onChange({ ...filters, source: e.target.value as Filters["source"] })
        }
        className="rounded-lg border border-border px-2 py-1.5 text-sm"
      >
        {SOURCES.map((s) => (
          <option key={s} value={s}>
            {s === "all" ? "ทุกแหล่ง" : SOURCE_LABELS[s]}
          </option>
        ))}
      </select>
      <select
        value={filters.column}
        onChange={(e) =>
          onChange({ ...filters, column: e.target.value as Filters["column"] })
        }
        className="rounded-lg border border-border px-2 py-1.5 text-sm"
      >
        <option value="all">ทุกสถานะ</option>
        {BOARD_COLUMNS.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
      <select
        value={filters.priority}
        onChange={(e) =>
          onChange({ ...filters, priority: e.target.value as Filters["priority"] })
        }
        className="rounded-lg border border-border px-2 py-1.5 text-sm"
      >
        <option value="all">ทุกระดับความสำคัญ</option>
        {(Object.keys(PRIORITY_LABELS) as Array<keyof typeof PRIORITY_LABELS>).map((p) => (
          <option key={p} value={p}>
            {PRIORITY_LABELS[p]}
          </option>
        ))}
      </select>
    </div>
  );
}
