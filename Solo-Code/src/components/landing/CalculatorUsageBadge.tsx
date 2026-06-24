import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCalculatorUsageCount } from "@/server/calculator-stats.functions";

/**
 * Realtime usage badge — แสดงจำนวนคนที่กดใช้เครื่องคำนวณ
 * - โหลดยอดเริ่มต้นจาก server function (cache สั้น)
 * - subscribe postgres_changes INSERT บน calculator_usage_events
 */
const BASELINE_COUNT = 87;

export function CalculatorUsageBadge({ initialCount }: { initialCount?: number }) {
  const [count, setCount] = React.useState<number>(initialCount ?? 0);
  const [bumped, setBumped] = React.useState(false);

  // โหลดยอดถ้ายังไม่มี initial
  React.useEffect(() => {
    if (typeof initialCount === "number") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getCalculatorUsageCount();
        if (!cancelled && res && typeof res.count === "number") setCount(res.count);
      } catch {
        /* silent */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialCount]);

  // Realtime — เพิ่มเลขเมื่อมีคนกดคำนวณ
  React.useEffect(() => {
    const channel = supabase
      .channel("calculator-usage-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "calculator_usage_events" },
        () => {
          setCount((c) => c + 1);
          setBumped(true);
          window.setTimeout(() => setBumped(false), 700);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-success/10 text-success-foreground border border-success/30 px-3 py-1.5 text-xs font-semibold">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
      </span>
      <span className="text-foreground/80">
        มีคนลองใช้แล้ว{" "}
        <span
          className={`num font-bold text-foreground transition-transform inline-block ${
            bumped ? "scale-110 text-primary" : ""
          }`}
        >
          {(count + BASELINE_COUNT).toLocaleString("th-TH")}
        </span>{" "}
        ครั้ง
      </span>
    </div>
  );
}
