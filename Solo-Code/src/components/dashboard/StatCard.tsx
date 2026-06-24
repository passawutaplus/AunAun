import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border-border/60 shadow-card animate-fade-up",
        accent && "bg-gradient-primary text-primary-foreground border-0 glow-edge",
        className,
      )}
    >
      {accent && (
        <>
          <div
            className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full opacity-60 blur-3xl"
            style={{ background: "oklch(0.92 0.12 70 / 0.7)" }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full opacity-50 blur-3xl"
            style={{ background: "oklch(0.55 0.22 30 / 0.6)" }}
            aria-hidden="true"
          />
        </>
      )}
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p
              className={cn(
                "text-xs font-medium uppercase tracking-wide",
                accent ? "text-primary-foreground/85" : "text-muted-foreground",
              )}
            >
              {label}
            </p>
            <p
              className={cn(
                "text-2xl font-semibold num tracking-tight",
                accent ? "text-primary-foreground" : "text-foreground",
              )}
            >
              {value}
            </p>
            {sub && (
              <p
                className={cn(
                  "text-xs",
                  accent ? "text-primary-foreground/75" : "text-muted-foreground",
                )}
              >
                {sub}
              </p>
            )}
          </div>
          {icon && (
            <div
              className={cn(
                "rounded-xl p-2.5 backdrop-blur",
                accent ? "bg-white/20 text-primary-foreground" : "bg-primary-soft text-primary",
              )}
            >
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
