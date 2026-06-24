import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { PLANS } from "@/data/plans";
import { FadeUp } from "@/components/motion/FadeUp";

const TEASER_PLANS = PLANS.filter((p) => p.id === "free" || p.id === "pro");

export function LandingPricingTeaser() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
      <FadeUp className="text-center max-w-2xl mx-auto mb-8">
        <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">
          เริ่มฟรี อัพเกรดเมื่อพร้อม
        </h3>
        <p className="mt-3 text-sm sm:text-base text-muted-foreground">
          100 คนแรกได้สิทธิพิเศษ — ดูรายละเอียดแพ็กทั้งหมด
        </p>
      </FadeUp>

      <FadeUp delay={0.06} className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
        {TEASER_PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`rounded-2xl border p-5 shadow-soft backdrop-blur ${
              plan.highlighted
                ? "border-primary/40 bg-card/90 ring-1 ring-primary/20"
                : "border-border bg-card/70"
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <h4 className="text-lg font-bold">{plan.name}</h4>
              <span className="text-2xl font-bold tabular-nums">
                {plan.monthly === 0 ? "฿0" : `฿${plan.monthly}`}
                {plan.monthly > 0 && (
                  <span className="text-xs font-normal text-muted-foreground">/เดือน</span>
                )}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{plan.tagline}</p>
            <ul className="mt-4 space-y-2">
              {plan.highlights.slice(0, 3).map((h) => (
                <li key={h} className="flex gap-2 text-xs text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  {h}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </FadeUp>

      <FadeUp delay={0.1} className="mt-6 text-center">
        <Link
          to="/pricing"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-2.5 text-sm font-semibold hover:border-primary/40 transition-colors"
        >
          ดูตารางราคาเต็ม
          <ArrowRight className="h-4 w-4" />
        </Link>
      </FadeUp>
    </section>
  );
}
