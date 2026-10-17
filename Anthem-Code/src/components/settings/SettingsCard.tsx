import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Loader2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Settings auto-save feedback. `track(promise)` shows saving → saved (fades after 2s) or error,
 * `saved()` marks an instant local save.
 */
export function useSaveStatus() {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timer = useRef<number>();
  const seq = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const settle = useCallback((next: SaveStatus) => {
    setStatus(next);
    window.clearTimeout(timer.current);
    if (next === "saved") timer.current = window.setTimeout(() => setStatus("idle"), 2000);
  }, []);

  const track = useCallback(
    async <T,>(work: Promise<T>): Promise<T | undefined> => {
      const id = ++seq.current;
      setStatus("saving");
      window.clearTimeout(timer.current);
      try {
        const out = await work;
        if (id === seq.current) settle("saved");
        return out;
      } catch {
        if (id === seq.current) settle("error");
        return undefined;
      }
    },
    [settle],
  );

  const saved = useCallback(() => settle("saved"), [settle]);

  return { status, track, saved };
}

export function SaveStatusBadge({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  return (
    <span
      role="status"
      className={cn(
        "inline-flex items-center gap-1 text-xs animate-in fade-in duration-200",
        status === "error" ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {status === "saving" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
      {status === "saved" ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : null}
      {status === "error" ? <TriangleAlert className="h-3.5 w-3.5" /> : null}
      {status === "saving" ? "กำลังบันทึก…" : status === "saved" ? "บันทึกแล้ว" : "บันทึกไม่สำเร็จ ลองอีกครั้ง"}
    </span>
  );
}

type CardProps = {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: ReactNode;
  status?: SaveStatus;
  /** Right side of the header (e.g. a link). */
  action?: ReactNode;
  id?: string;
  className?: string;
  children?: ReactNode;
};

/** One settings card: title row with optional save status, one-line description, body. */
export function SettingsCard({ icon: Icon, title, description, status, action, id, className, children }: CardProps) {
  return (
    <section id={id} className={cn("scroll-mt-24 rounded-2xl glass-panel p-5 sm:p-6 space-y-4", className)}>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {Icon ? <Icon className="h-5 w-5 shrink-0 text-primary" /> : null}
          <h2 className="font-semibold text-foreground">{title}</h2>
          <span className="ml-auto flex items-center gap-3">
            {status ? <SaveStatusBadge status={status} /> : null}
            {action}
          </span>
        </div>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** Same switch look used across settings. */
export function SettingsSwitch({
  checked,
  label,
  disabled,
  onChange,
  size = "md",
}: {
  checked: boolean;
  label: string;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  size?: "sm" | "md";
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        size === "sm" ? "h-5 w-10" : "h-6 w-11",
        checked ? "bg-primary" : "bg-muted dark:bg-input",
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 rounded-full bg-background shadow-sm ring-1 ring-border/60 transition-transform",
          size === "sm" ? "h-4 w-4" : "h-5 w-5",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}
