import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  name: string | null | undefined;
  avatarUrl?: string | null;
  to?: string | null;
  initialClassName?: string;
};

/** Compact identity card for inbox expand (customer / sender). */
export function InboxPersonCard({
  label,
  name,
  avatarUrl,
  to,
  initialClassName = "bg-muted text-muted-foreground",
}: Props) {
  const display = (name ?? "").trim() || label;
  const body = (
    <>
      {avatarUrl?.trim() ? (
        <img loading="lazy" decoding="async" src={avatarUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
      ) : (
        <div
          className={cn(
            "flex h-16 w-16 shrink-0 items-center justify-center rounded-lg text-lg font-medium text-white",
            initialClassName,
          )}
        >
          {display[0] ?? "?"}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-sm font-medium text-foreground">{display}</p>
        {to ? <p className="mt-0.5 text-[11px] text-primary">ดูโปรไฟล์</p> : null}
      </div>
    </>
  );

  const surface = cn(
    "flex w-full items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-3",
    to && "transition-colors hover:border-primary/40 hover:bg-muted/50",
  );

  if (to) {
    return (
      <Link to={to} className={surface} aria-label={`ดูโปรไฟล์ ${display}`}>
        {body}
      </Link>
    );
  }

  return <div className={surface}>{body}</div>;
}
