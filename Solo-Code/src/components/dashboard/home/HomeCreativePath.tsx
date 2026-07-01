import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Check, FlaskConical } from "lucide-react";
import { getCreativePathStatus, markDailyRead } from "@/lib/designDrillStorage";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "readDaily" as const, label: "อ่าน So1o Daily", href: null as string | null },
  { key: "drillDone" as const, label: "ทำ Design Drill", href: null },
  { key: "labsVisited" as const, label: "ใช้ Creative Labs", href: "/labs/creative" },
  { key: "postedPixel100" as const, label: "แชร์ที่ Aplus1", href: null },
];

export function HomeCreativePath() {
  const [status, setStatus] = React.useState(getCreativePathStatus);

  const refresh = React.useCallback(() => {
    setStatus(getCreativePathStatus());
  }, []);

  React.useEffect(() => {
    refresh();
    window.addEventListener("so1o:creative-path-update", refresh);
    return () => window.removeEventListener("so1o:creative-path-update", refresh);
  }, [refresh]);

  React.useEffect(() => {
    const el = document.getElementById("news");
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          markDailyRead();
          refresh();
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [refresh]);

  const doneCount = STEPS.filter((s) => status[s.key]).length;

  return (
    <div className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5 sm:px-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          เส้นทางครีเอทีฟวันนี้
        </p>
        <span className="text-[10px] font-bold text-primary tabular-nums">
          {doneCount}/{STEPS.length}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {STEPS.map((step) => {
          const done = status[step.key];
          const chipClass = cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors",
            done
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border bg-background text-muted-foreground",
            step.href && !done && "hover:border-primary/40 hover:text-primary",
          );
          const inner = (
            <>
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full border shrink-0",
                  done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                )}
              >
                {done && <Check className="h-2.5 w-2.5" aria-hidden />}
              </span>
              {step.key === "labsVisited" && <FlaskConical className="h-3 w-3 shrink-0 opacity-70" />}
              {step.label}
            </>
          );
          if (step.href && !done) {
            return (
              <Link key={step.key} to={step.href} className={chipClass}>
                {inner}
              </Link>
            );
          }
          return (
            <span key={step.key} className={chipClass}>
              {inner}
            </span>
          );
        })}
      </div>
    </div>
  );
}
