import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/auth/AuthProvider";
import { useTheme } from "@/hooks/useTheme";
import { HomeInsightsSection } from "@/components/blog/HomeInsightsSection";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingStickyCta } from "@/components/landing/LandingStickyCta";
import { LandingPainSolution } from "@/components/landing/LandingPainSolution";
import { LandingWorkflow } from "@/components/landing/LandingWorkflow";
import { LandingCalculatorSection } from "@/components/landing/LandingCalculatorSection";
import { LandingFeaturesTabs } from "@/components/landing/LandingFeaturesTabs";
import { LandingShowcase } from "@/components/landing/LandingShowcase";
import { LandingHowItWorks } from "@/components/landing/LandingHowItWorks";
import { LandingPricingTeaser } from "@/components/landing/LandingPricingTeaser";
import { LandingFaq } from "@/components/landing/LandingFaq";
import { LandingFinalCta } from "@/components/landing/LandingFinalCta";

export type LandingStats = {
  approved: number;
  target: number;
};

export function LandingPage({ stats }: { stats: LandingStats | null | undefined }) {
  const { user, isAdmin } = useAuth();
  const { theme, toggle } = useTheme();
  const approved = stats?.approved ?? 0;
  const target = stats?.target ?? 100;
  const remaining = Math.max(0, target - approved);
  const pct = Math.min(100, Math.round((approved / target) * 100));

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <LandingHeader user={!!user} isAdmin={!!isAdmin} theme={theme} onToggleTheme={toggle} />

      <main className="relative z-10 pb-16 sm:pb-0">
        <LandingHero
          user={!!user}
          approved={approved}
          target={target}
          remaining={remaining}
          pct={pct}
        />
        <LandingPainSolution />
        <LandingWorkflow />
        <LandingCalculatorSection remaining={remaining} />
        <LandingFeaturesTabs />
        <LandingShowcase user={!!user} />
        <LandingHowItWorks />
        <LandingPricingTeaser />
        <LandingFaq />
        <HomeInsightsSection />
        <LandingFinalCta user={!!user} remaining={remaining} />
        <SiteFooter variant="full" />
      </main>

      <LandingStickyCta user={!!user} />
      <Toaster position="top-center" richColors />
    </div>
  );
}
