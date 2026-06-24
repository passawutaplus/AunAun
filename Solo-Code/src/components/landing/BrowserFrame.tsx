import * as React from "react";
import { cn } from "@/lib/utils";

type BrowserFrameProps = {
  children: React.ReactNode;
  className?: string;
  label?: string;
};

export function BrowserFrame({
  children,
  className,
  label = "solofreelancer.com",
}: BrowserFrameProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card/90 shadow-elevated ring-1 ring-border/50 overflow-hidden",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-3 py-2.5">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        </span>
        <span className="flex-1 text-center text-[10px] text-muted-foreground truncate px-2">
          {label}
        </span>
      </div>
      <div className="relative bg-background/50">{children}</div>
    </div>
  );
}

type MockupImageProps = {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
};

export function MockupImage({ src, alt, className, priority }: MockupImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      className={cn("w-full h-auto block", className)}
    />
  );
}
