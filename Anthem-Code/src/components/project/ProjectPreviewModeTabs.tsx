import { cn } from "@/lib/utils";

export type ProjectPreviewMode = "pc" | "mobile" | "feed";

const MODES: { id: ProjectPreviewMode; label: string }[] = [
  { id: "pc", label: "PC" },
  { id: "mobile", label: "Mobile" },
  { id: "feed", label: "Project Feed" },
];

type Props = {
  value: ProjectPreviewMode;
  onChange: (mode: ProjectPreviewMode) => void;
  className?: string;
};

export function ProjectPreviewModeTabs({ value, onChange, className }: Props) {
  return (
    <div
      className={cn(
        "flex w-full rounded-full border border-border bg-muted/40 p-0.5",
        className,
      )}
      role="tablist"
      aria-label="โหมดพรีวิวผลงาน"
    >
      {MODES.map((mode) => (
        <button
          key={mode.id}
          type="button"
          role="tab"
          aria-selected={value === mode.id}
          onClick={() => onChange(mode.id)}
          className={cn(
            "flex-1 rounded-full px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap",
            value === mode.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
