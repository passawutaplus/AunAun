import * as React from "react";
import { Calculator, Sparkles } from "lucide-react";
import { CalculatorUsageBadge } from "@/components/landing/CalculatorUsageBadge";
import { FadeUp } from "@/components/motion/FadeUp";

const PriceCalculator = React.lazy(() =>
  import("@/components/landing/PriceCalculator").then((m) => ({ default: m.PriceCalculator })),
);

export function LandingCalculatorSection({ remaining }: { remaining: number }) {
  return (
    <section id="calculator" className="mx-auto max-w-5xl px-4 pb-14 sm:pb-20">
      <FadeUp className="space-y-4">
        <div className="rounded-3xl border border-border bg-card/80 backdrop-blur p-5 sm:p-6 shadow-soft">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-2xl bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-elevated">
              <Calculator className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-primary uppercase tracking-wider">
                <Sparkles className="h-3 w-3" /> The Freelance Fair Price
              </div>
              <h3 className="mt-1 text-lg sm:text-xl font-bold tracking-tight">
                ลองคำนวณราคางานฟรีใน 30 วินาที
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                ตอบคำถามสั้นๆ แล้วรู้ทันทีว่าควรเสนอราคาเท่าไหร่ — ฟรี ไม่ต้องสมัคร
              </p>
              <div className="mt-3">
                <CalculatorUsageBadge />
              </div>
            </div>
          </div>
        </div>
        <React.Suspense
          fallback={
            <div className="rounded-3xl border border-border bg-card/60 h-96 animate-pulse" />
          }
        >
          <PriceCalculator remaining={remaining} />
        </React.Suspense>
      </FadeUp>
    </section>
  );
}
