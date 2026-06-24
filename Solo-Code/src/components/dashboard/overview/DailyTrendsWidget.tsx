import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DAILY_TRENDS } from "@/data/dailyTrends";
import { TrendIcon } from "@/lib/trendIcons";

const ROTATE_MS = 10_000;

export function DailyTrendsWidget() {
  const [idx, setIdx] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (paused) return;
    const t = window.setInterval(() => {
      setIdx((i) => (i + 1) % DAILY_TRENDS.length);
    }, ROTATE_MS);
    return () => window.clearInterval(t);
  }, [paused]);

  const trend = DAILY_TRENDS[idx];
  const go = (delta: number) =>
    setIdx((i) => (i + delta + DAILY_TRENDS.length) % DAILY_TRENDS.length);

  return (
    <Card
      className="relative overflow-hidden border-primary/20 shadow-soft"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent pointer-events-none" />
      <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-primary/20 blur-3xl pointer-events-none" />

      <div className="relative p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-gradient-primary text-primary-foreground p-1.5 shadow-soft">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <div>
              <h3 className="text-sm font-semibold leading-tight">Daily Creative Insights</h3>
              <p className="text-[10px] text-muted-foreground">เทรนด์ดีไซน์อัปเดตให้ทุกวัน</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => go(-1)}
              aria-label="ก่อนหน้า"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => go(1)}
              aria-label="ถัดไป"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="relative min-h-[88px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex gap-3"
            >
              <TrendIcon
                iconKey={trend.iconKey}
                category={trend.category}
                size="sm"
                variant="soft"
                className="shrink-0 mt-0.5"
              />
              <div className="min-w-0">
                <span className="inline-block text-[10px] font-semibold uppercase tracking-wide text-primary bg-primary/10 rounded-full px-2 py-0.5 mb-1">
                  {trend.category}
                </span>
                <h4 className="text-sm font-semibold leading-snug">{trend.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{trend.body}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-center gap-1.5 mt-3">
          {DAILY_TRENDS.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`สไลด์ที่ ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === idx
                  ? "bg-primary w-5"
                  : "bg-muted-foreground/30 w-1.5 hover:bg-muted-foreground/60"
              }`}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}
