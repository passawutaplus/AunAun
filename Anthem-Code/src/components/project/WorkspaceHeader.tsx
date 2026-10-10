import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  onTitleChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  statusLabel: string;
  hasCategory: boolean;
  moduleCount: number;
  imageCount: number;
};

/** Quick drop's workspace card: the work's name, live, with a one-line status underneath. */
export function WorkspaceHeader({
  title,
  onTitleChange,
  disabled,
  invalid,
  statusLabel,
  hasCategory,
  moduleCount,
  imageCount,
}: Props) {
  return (
    <header className="rounded-[28px] border border-border bg-card px-5 pb-4 pt-4 sm:px-6">
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>workspace</span>
        <span aria-hidden>•</span>
        <span>{statusLabel}</span>
      </p>
      <Input
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="ผลงานที่ยังไม่มีชื่อ"
        aria-label="ชื่องาน"
        aria-invalid={invalid || undefined}
        disabled={disabled}
        className={cn(
          "mt-6 h-auto rounded-none border-0 bg-transparent px-0 py-1 text-3xl font-medium tracking-tight shadow-none",
          "placeholder:text-3xl placeholder:font-medium placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0 md:text-3xl",
          invalid && "text-destructive placeholder:text-destructive/60",
        )}
      />
      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span>
          หมวด <span className="text-muted-foreground">{hasCategory ? "เลือกแล้ว" : "ยังไม่เลือก"}</span>
        </span>
        <span>
          โมดูล <span className="text-muted-foreground">{moduleCount}</span>
        </span>
        <span>
          รูป <span className="text-muted-foreground">{imageCount}</span>
        </span>
      </p>
    </header>
  );
}
