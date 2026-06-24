import { Link } from "@tanstack/react-router";
import { ArrowRight, Calculator, CheckCircle2, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { LANDING_COPY } from "@/data/landingContent";
import { FadeUp } from "@/components/motion/FadeUp";
import { LandingHeroMockup } from "@/components/landing/LandingHeroMockup";

type Props = {
  user: boolean;
  approved: number;
  target: number;
  remaining: number;
  pct: number;
};

export function LandingHero({ user, approved, target, remaining, pct }: Props) {
  return (
    <section id="hero" className="relative mx-auto max-w-6xl px-4 pt-10 pb-12 sm:pt-16 sm:pb-16">
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        aria-hidden="true"
      >
        <div className="ambient-blobs" />
        <div
          className="absolute inset-x-0 top-0 h-full opacity-90"
          style={{ backgroundImage: "var(--gradient-mesh)" }}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center relative">
        <FadeUp onScroll={false} className="text-center lg:text-left order-1">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 backdrop-blur px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-soft">
            <Sparkles className="h-3 w-3 text-primary" />
            เปิดรับสมัคร Tester รุ่นแรก จำกัด {target} user
          </div>

          <h2 className="mt-5 text-2xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight leading-[1.15]">
            {LANDING_COPY.headline}
          </h2>
          <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0">
            {LANDING_COPY.subheadline}
          </p>

          <div className="mt-7 flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3">
            <Link
              to={user ? "/dashboard" : "/apply"}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-primary text-primary-foreground px-6 py-3 text-sm font-semibold shadow-elevated hover:opacity-90 transition-opacity"
            >
              {user ? "ทดลองระบบเต็มก่อนใคร" : "สมัครเข้ากลุ่มบุกเบิก"}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#calculator"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card/80 backdrop-blur text-foreground px-6 py-3 text-sm font-semibold shadow-soft hover:border-primary/40 hover:bg-card transition-colors"
            >
              <Calculator className="h-4 w-4 text-primary" />
              ลองคำนวณราคาฟรี
            </a>
          </div>

          <div className="mt-5 max-w-md mx-auto lg:mx-0 rounded-xl border border-border bg-card/60 backdrop-blur p-3 shadow-soft">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                มีคนสมัครไปแล้ว
              </span>
              <span className="text-foreground tabular-nums">
                <span className="text-primary font-bold">{approved}</span> / {target}
              </span>
            </div>
            <Progress value={pct} className="mt-2 h-1.5" />
            <p className="mt-1.5 text-[10px] text-muted-foreground text-left">
              {remaining > 0 ? `เหลือสิทธิ์อีก ${remaining} ที่นั่ง` : "ปิดรับสมัครรุ่นแรกแล้ว"}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-2 text-xs text-muted-foreground">
            {LANDING_COPY.trustChips.map((chip) => (
              <span key={chip} className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                {chip}
              </span>
            ))}
          </div>

          <p className="mt-3 text-[10px] text-muted-foreground max-w-md mx-auto lg:mx-0">
            {LANDING_COPY.earlyAccessNote}
          </p>
        </FadeUp>

        <FadeUp onScroll={false} delay={0.08} className="order-2 lg:order-none">
          <LandingHeroMockup />
        </FadeUp>
      </div>
    </section>
  );
}
