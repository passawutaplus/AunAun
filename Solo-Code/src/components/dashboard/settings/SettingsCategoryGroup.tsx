import * as React from "react";
import { cn } from "@/lib/utils";

export function SettingsCategoryGroup({
  id,
  title,
  description,
  children,
  className,
}: {
  id?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-20", className)}>
      <div className="mb-3 px-0.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </h2>
        {description ? (
          <p className="text-xs text-muted-foreground/90 mt-1 leading-relaxed">{description}</p>
        ) : null}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function SettingsJumpNav({ items }: { items: { id: string; label: string }[] }) {
  return (
    <nav className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" aria-label="ไปยังหมวดตั้งค่า">
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className="shrink-0 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}

export function SettingsFormSubsection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 pt-1">
      <div className="border-b border-border/50 pb-2">
        <p className="text-xs font-semibold text-foreground">{title}</p>
        {description ? (
          <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
        ) : null}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
