import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  onTitleChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
};

/** The workspace card: just the work's name, editable in place (synced with the details dialog). */
export function WorkspaceHeader({ title, onTitleChange, disabled, invalid }: Props) {
  return (
    <header className="rounded-[28px] border border-border bg-card px-5 py-3 sm:px-6">
      <Input
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="ผลงานที่ยังไม่มีชื่อ"
        aria-label="ชื่องาน"
        aria-invalid={invalid || undefined}
        disabled={disabled}
        className={cn(
          "h-auto rounded-none border-0 bg-transparent px-0 py-1 text-3xl font-medium tracking-tight shadow-none",
          "placeholder:text-3xl placeholder:font-medium placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0 md:text-3xl",
          invalid && "text-destructive placeholder:text-destructive/60",
        )}
      />
    </header>
  );
}
