import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { WORKFLOW_STEPS } from "@/data/landingContent";
import { LANDING_MOCKUPS } from "@/data/landingAssets";
import { FadeUp } from "@/components/motion/FadeUp";
import { MockupImage } from "@/components/landing/BrowserFrame";
import { cn } from "@/lib/utils";

export function LandingWorkflow() {
  const thumbs = LANDING_MOCKUPS.workflow;

  return (
    <section id="workflow" className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
      <FadeUp className="text-center max-w-2xl mx-auto mb-10">
        <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">Flow งานฟรีแลนซ์ครบวงจร</h3>
        <p className="mt-3 text-sm sm:text-base text-muted-foreground">
          จากบรีฟจนถึงยื่นภาษี — ทุกขั้นอยู่ใน So1o
        </p>
      </FadeUp>

      <FadeUp delay={0.06}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {WORKFLOW_STEPS.map((step, i) => {
            const thumb = thumbs[i];
            return (
              <div key={step.id} className="min-w-0 group">
                <div
                  className={cn(
                    "rounded-xl border border-border bg-card overflow-hidden shadow-soft h-full",
                    "transition-all duration-300 ease-out",
                    "hover:border-primary/35 hover:shadow-elevated hover:-translate-y-1",
                  )}
                >
                  {thumb && (
                    <div className="overflow-hidden">
                      <MockupImage
                        src={thumb.src}
                        alt={thumb.alt}
                        className="aspect-[400/280] object-cover object-top w-full transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    </div>
                  )}
                  <div className="p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      {step.label}
                    </span>
                    <h4 className="mt-0.5 text-sm font-semibold">{step.title}</h4>
                    <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
                      {step.desc}
                    </p>
                    <Link
                      to={step.helpTo}
                      className="mt-2 inline-flex items-center gap-0.5 text-[11px] font-medium text-primary hover:underline opacity-80 group-hover:opacity-100 transition-opacity"
                    >
                      {step.helpLabel}
                      <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </FadeUp>
    </section>
  );
}
