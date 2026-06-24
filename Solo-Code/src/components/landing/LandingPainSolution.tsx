import { ArrowRight } from "lucide-react";
import { PAIN_SOLUTIONS } from "@/data/landingContent";
import { FadeUp } from "@/components/motion/FadeUp";
import { cn } from "@/lib/utils";

export function LandingPainSolution() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:py-16 bg-muted/20 rounded-3xl my-2 sm:my-4">
      <FadeUp className="text-center max-w-2xl mx-auto mb-10">
        <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">เคยเจอปัญหานี้ไหม?</h3>
        <p className="mt-3 text-sm sm:text-base text-muted-foreground">
          So1o ออกแบบมาแก้ pain point ที่ฟรีแลนซ์เจอทุกวัน
        </p>
      </FadeUp>

      <FadeUp delay={0.06} className="space-y-3 max-w-3xl mx-auto">
        {PAIN_SOLUTIONS.map((item, i) => (
          <div
            key={item.pain}
            className={cn(
              "rounded-2xl border border-border bg-card/60 backdrop-blur p-4 sm:p-5 shadow-soft",
              "grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 sm:gap-4 items-center",
            )}
          >
            <p className="text-sm text-muted-foreground leading-relaxed">{item.pain}</p>
            <ArrowRight className="h-4 w-4 text-primary shrink-0 hidden sm:block" aria-hidden />
            <div>
              <p className="text-sm font-medium text-foreground leading-relaxed">{item.solution}</p>
              <span className="mt-1 inline-block text-[10px] font-semibold uppercase tracking-wider text-primary">
                {item.feature}
              </span>
            </div>
          </div>
        ))}
      </FadeUp>
    </section>
  );
}
