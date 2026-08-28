import { ChevronRight, Eye } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type InboxExpandColumn = {
  key: string;
  label: string;
  /** CSS grid track, e.g. minmax(0,1fr) or 7.5rem */
  width?: string;
  mdOnly?: boolean;
  className?: string;
  align?: "start" | "center" | "end";
};

function columnCellClass(col: InboxExpandColumn, isHeader = false) {
  return cn(
    "min-w-0",
    col.mdOnly && (isHeader ? "hidden md:block" : "hidden md:flex"),
    !col.mdOnly && !isHeader && "flex",
    col.align === "center" && (isHeader ? "text-center" : "items-center justify-center text-center"),
    col.align === "end" && (isHeader ? "text-right" : "items-center justify-end text-right"),
    col.align === "start" && (isHeader ? "text-left" : "items-center justify-start text-left"),
    col.className,
  );
}

export type InboxExpandRow = {
  id: string;
  cells: Record<string, ReactNode>;
  detail: ReactNode;
  actions: ReactNode;
};

type Props = {
  columns: InboxExpandColumn[];
  rows: InboxExpandRow[];
  expandedId: string | null;
  onExpandedIdChange: (id: string | null) => void;
  empty: ReactNode;
};

export function InboxPersonCell({
  name,
  avatarUrl,
  initialClassName,
  subtitle,
}: {
  name: string | null | undefined;
  avatarUrl?: string | null;
  initialClassName: string;
  subtitle?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
      ) : (
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-medium text-white",
            initialClassName,
          )}
        >
          {(name?.trim() || "?")[0]}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{name?.trim() || "—"}</p>
        {subtitle ? <div className="mt-0.5 md:hidden">{subtitle}</div> : null}
      </div>
    </div>
  );
}

export function InboxExpandTable({
  columns,
  rows,
  expandedId,
  onExpandedIdChange,
  empty,
}: Props) {
  const template = `2rem ${columns.map((c) => c.width ?? "minmax(0,1fr)").join(" ")} minmax(4.75rem,auto)`;
  const colsStyle = { ["--inbox-cols" as string]: template } as CSSProperties;

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border/70 bg-card px-4 py-8 text-center text-sm text-muted-foreground">
        {empty}
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-border/70 bg-card">
      <div
        className="hidden w-full items-center gap-x-2 border-b border-border/70 bg-muted/40 px-3 py-2.5 text-[11px] font-semibold tracking-wide text-muted-foreground md:grid md:[grid-template-columns:var(--inbox-cols)]"
        style={colsStyle}
      >
        <span className="flex h-5 items-center text-muted-foreground" title="ดูรายละเอียด">
          <Eye className="h-3.5 w-3.5" aria-hidden />
          <span className="sr-only">ดูรายละเอียด</span>
        </span>
        {columns.map((col) => (
          <span
            key={col.key}
            className={cn("truncate whitespace-nowrap", columnCellClass(col, true))}
          >
            {col.label}
          </span>
        ))}
        <span className="sr-only">การกระทำ</span>
      </div>
      <ul className="divide-y divide-border/60">
        {rows.map((row) => {
          const open = expandedId === row.id;
          return (
            <li key={row.id} className={cn(open && "bg-muted/20")}>
              <div
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 hover:bg-muted/25 md:grid md:gap-x-2 md:[grid-template-columns:var(--inbox-cols)]"
                style={colsStyle}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("a, button")) return;
                  onExpandedIdChange(open ? null : row.id);
                }}
              >
                <button
                  type="button"
                  aria-expanded={open}
                  aria-label={open ? "หุบรายละเอียด" : "กางรายละเอียด"}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => onExpandedIdChange(open ? null : row.id)}
                >
                  <ChevronRight
                    className={cn("h-4 w-4 transition-transform", open && "rotate-90")}
                  />
                </button>
                {columns.map((col) => (
                  <div key={col.key} className={columnCellClass(col)}>
                    {row.cells[col.key]}
                  </div>
                ))}
                <div className="ml-auto flex shrink-0 items-center justify-end gap-1.5 md:ml-0">
                  {row.actions}
                </div>
              </div>
              {open ? (
                <div className="border-t border-border/50 bg-muted/15 px-3 py-4 md:px-6 md:pb-5">
                  {row.detail}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
