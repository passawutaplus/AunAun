import { type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, FileText, PanelRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  children: ReactNode;
  className?: string;
};

export function ProjectEditorMetaSidebar({
  expanded,
  onExpandedChange,
  children,
  className,
}: Props) {
  const expandTab =
    typeof document !== "undefined" && !expanded
      ? createPortal(
          <button
            type="button"
            onClick={() => onExpandedChange(true)}
            className="fixed right-0 top-1/2 z-[60] hidden h-14 w-7 -translate-y-1/2 items-center justify-center rounded-l-full bg-orange-500 text-white shadow-md shadow-orange-500/30 transition hover:bg-orange-400 hover:shadow-lg hover:shadow-orange-500/40 lg:flex"
            aria-label="ขยายแถบรายละเอียด"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
          </button>,
          document.body,
        )
      : null;

  return (
    <>
      <aside
        className={cn(
          "order-first shrink-0 transition-[width] duration-200 ease-out lg:order-none lg:sticky lg:top-16 lg:z-auto lg:self-start",
          expanded
            ? "w-full border-b border-border/80 bg-card/95 backdrop-blur-md lg:w-[300px] lg:border-b-0 lg:border-l"
            : "w-full border-b border-border/80 bg-card/95 lg:w-0 lg:overflow-hidden lg:border-0 lg:bg-transparent",
          className,
        )}
        aria-label="รายละเอียดผลงาน"
      >
        {expanded ? (
          <div className="flex flex-col lg:h-[calc(100dvh-4rem)]">
            <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-4 lg:pt-5">
              <p className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
                รายละเอียดผลงาน
              </p>
              <button
                type="button"
                onClick={() => onExpandedChange(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="ย่อแถบรายละเอียด"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-5 overflow-y-auto px-3 pb-4 pt-1 lg:flex-1">{children}</div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onExpandedChange(true)}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left lg:hidden"
          >
            <span className="inline-flex items-center gap-2 text-sm text-foreground">
              <PanelRight className="h-4 w-4 text-muted-foreground" />
              รายละเอียดผลงาน
            </span>
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </aside>
      {expandTab}
    </>
  );
}
