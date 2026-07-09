import * as React from "react";
import { cn } from "@/lib/utils";

export function LabsInspectorSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-2 min-w-0", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground truncate">
        {title}
      </p>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function LabsInspectorField({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-foreground truncate">{label}</span>
        {value != null && (
          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{value}</span>
        )}
      </div>
      {children}
    </div>
  );
}
