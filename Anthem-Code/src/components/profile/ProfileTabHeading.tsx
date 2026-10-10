import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  /** Item count shown as a small badge after the title. */
  count?: number;
  description?: ReactNode;
  /** Buttons aligned to the right of the title. */
  actions?: ReactNode;
  className?: string;
};

/** Big section title shared by every profile tab (owner and public). */
export default function ProfileTabHeading({ title, count, description, actions, className }: Props) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-4 gap-y-2", className)}>
      <div className="min-w-0">
        <h2 className="flex min-w-0 items-baseline gap-2.5 font-display text-2xl font-normal uppercase leading-tight tracking-tight text-foreground sm:text-3xl">
          <span className="truncate">{title}</span>
          {typeof count === "number" && count > 0 ? (
            <span className="shrink-0 font-sans text-sm font-medium tabular-nums tracking-normal text-muted-foreground">
              {count}
            </span>
          ) : null}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
    </div>
  );
}
