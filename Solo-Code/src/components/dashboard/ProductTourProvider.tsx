import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { Compass, X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getPageGuide } from "@/lib/pageGuides";
import {
  PRODUCT_TOUR_STEPS,
  readTourResumeIndex,
  tourFlags,
  writeTourResumeIndex,
  type ProductTourStep,
} from "@/lib/productTour";
import type { DashSection } from "@/components/dashboard/layout/DashboardSidebar";
import { cn } from "@/lib/utils";
import { trackFeature } from "@/lib/featureUsage";

type DashboardNavigator = (tab: DashSection, sub?: string) => void;

type ProductTourContextValue = {
  active: boolean;
  stepIndex: number;
  startTour: (fromStep?: number) => void;
  startFromFeature: (feature: string) => void;
  stopTour: (opts?: { completed?: boolean; skipped?: boolean }) => void;
  registerDashboardNavigator: (fn: DashboardNavigator | null) => void;
};

const ProductTourContext = React.createContext<ProductTourContextValue | null>(null);

export function useProductTour() {
  const ctx = React.useContext(ProductTourContext);
  if (!ctx) throw new Error("useProductTour must be used within ProductTourProvider");
  return ctx;
}

export function useProductTourOptional() {
  return React.useContext(ProductTourContext);
}

async function patchTourData(
  userId: string,
  prev: Record<string, unknown>,
  patch: Record<string, unknown>,
) {
  await supabase
    .from("profiles")
    .update({ onboarding_data: { ...prev, ...patch } } as never)
    .eq("user_id", userId);
}

function navigateToStep(
  step: ProductTourStep,
  navigate: ReturnType<typeof useNavigate>,
  dashNav: DashboardNavigator | null,
) {
  if (step.target.kind === "labs") {
    void navigate({ to: step.target.to });
    return;
  }
  if (dashNav) {
    dashNav(step.target.tab, step.target.sub);
    return;
  }
  void navigate({
    to: "/dashboard",
    search: {
      tab: step.target.tab,
      ...(step.target.sub ? { sub: step.target.sub } : {}),
    },
  });
}

export function ProductTourProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const dashNavRef = React.useRef<DashboardNavigator | null>(null);

  const [active, setActive] = React.useState(false);
  const [stepIndex, setStepIndex] = React.useState(0);
  const [welcomeOpen, setWelcomeOpen] = React.useState(false);

  const onboardingData = (profile?.onboarding_data ?? {}) as Record<string, unknown>;
  const flags = tourFlags(onboardingData);

  const registerDashboardNavigator = React.useCallback((fn: DashboardNavigator | null) => {
    dashNavRef.current = fn;
  }, []);

  const goToIndex = React.useCallback(
    (index: number) => {
      const step = PRODUCT_TOUR_STEPS[index];
      if (!step) return;
      setStepIndex(index);
      writeTourResumeIndex(index);
      navigateToStep(step, navigate, dashNavRef.current);
    },
    [navigate],
  );

  const startTour = React.useCallback(
    (fromStep = 0) => {
      const resume = fromStep === 0 ? readTourResumeIndex() : null;
      const start = resume ?? fromStep;
      setActive(true);
      setWelcomeOpen(false);
      goToIndex(start);
      void trackFeature("product_tour.start");
    },
    [goToIndex],
  );

  const startFromFeature = React.useCallback(
    (feature: string) => {
      const idx = PRODUCT_TOUR_STEPS.findIndex((s) => s.feature === feature);
      startTour(idx >= 0 ? idx : 0);
    },
    [startTour],
  );

  const stopTour = React.useCallback(
    async (opts?: { completed?: boolean; skipped?: boolean }) => {
      setActive(false);
      writeTourResumeIndex(null);
      if (!user) return;
      const patch: Record<string, unknown> = {};
      if (opts?.completed) patch.product_tour_completed = true;
      if (opts?.skipped) patch.product_tour_skipped = true;
      if (Object.keys(patch).length) {
        await patchTourData(user.id, onboardingData, patch);
        await refreshProfile();
      }
      void trackFeature(opts?.completed ? "product_tour.complete" : "product_tour.skip");
    },
    [user, onboardingData, refreshProfile],
  );

  React.useEffect(() => {
    if (!user || !profile?.onboarding_completed) return;
    if (flags.completed || flags.skipped || flags.welcomed) return;
    const t = window.setTimeout(() => setWelcomeOpen(true), 800);
    return () => window.clearTimeout(t);
  }, [user, profile?.onboarding_completed, flags.completed, flags.skipped, flags.welcomed]);

  const markWelcomed = React.useCallback(async () => {
    if (!user) return;
    await patchTourData(user.id, onboardingData, { product_tour_welcomed: true });
    await refreshProfile();
  }, [user, onboardingData, refreshProfile]);

  const step = PRODUCT_TOUR_STEPS[stepIndex];
  const guide = step ? getPageGuide(step.feature) : null;
  const total = PRODUCT_TOUR_STEPS.length;
  const isLast = stepIndex >= total - 1;

  const value = React.useMemo(
    () => ({
      active,
      stepIndex,
      startTour,
      startFromFeature,
      stopTour,
      registerDashboardNavigator,
    }),
    [active, stepIndex, startTour, startFromFeature, stopTour, registerDashboardNavigator],
  );

  return (
    <ProductTourContext.Provider value={value}>
      {children}

      <Dialog
        open={welcomeOpen}
        onOpenChange={(o) => {
          if (!o) void markWelcomed();
          setWelcomeOpen(o);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              ยินดีต้อนรับสู่ So1o
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              อยากให้พาไปดูทีละหน้าไหม? ใช้เวลาประมาณ 3–5 นาที — ครบทุกระบบหลังบ้าน
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                void markWelcomed();
                void stopTour({ skipped: true });
                setWelcomeOpen(false);
              }}
            >
              ข้ามไปก่อน
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto gap-1.5"
              onClick={() => {
                void markWelcomed();
                startTour(0);
              }}
            >
              <Compass className="h-4 w-4" />
              เริ่มทัวร์
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {active && step && guide && (
        <div
          className="fixed inset-x-0 bottom-0 z-[60] pointer-events-none px-3 sm:px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          role="dialog"
          aria-label="ทัวร์แนะนำ So1o"
        >
          <div
            className={cn(
              "pointer-events-auto mx-auto max-w-lg rounded-2xl border border-border/70",
              "bg-background/95 backdrop-blur-xl shadow-elevated overflow-hidden",
            )}
          >
            <div className="flex items-start justify-between gap-2 border-b border-border/60 px-4 py-3 bg-gradient-to-br from-primary/8 to-transparent">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                  ทัวร์แนะนำ · {stepIndex + 1}/{total}
                </p>
                <p className="text-sm font-bold truncate">{guide.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{guide.summary}</p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
                aria-label="ปิดทัวร์"
                onClick={() => void stopTour({ skipped: true })}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ol className="px-4 py-3 space-y-2 max-h-[28vh] overflow-y-auto">
              {guide.steps.slice(0, 4).map((line, i) => (
                <li key={i} className="flex gap-2 text-xs text-muted-foreground leading-relaxed">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{line}</span>
                </li>
              ))}
            </ol>

            <div className="flex items-center gap-2 border-t border-border/60 px-3 py-2.5 bg-muted/20">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 text-xs"
                disabled={stepIndex === 0}
                onClick={() => goToIndex(stepIndex - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                ก่อนหน้า
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 text-xs ml-auto"
                onClick={() => void stopTour({ skipped: true })}
              >
                ข้ามทัวร์
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => {
                  if (isLast) void stopTour({ completed: true });
                  else goToIndex(stepIndex + 1);
                }}
              >
                {isLast ? "เสร็จแล้ว" : "ถัดไป"}
                {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ProductTourContext.Provider>
  );
}

export function ProductTourHeaderButton({ className }: { className?: string }) {
  const tour = useProductTourOptional();
  if (!tour) return null;
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("h-8 gap-1.5 text-xs rounded-full", className)}
      onClick={() => tour.startTour(0)}
    >
      <Compass className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">สอนใช้งาน</span>
    </Button>
  );
}

export function ProductTourReplayButton({
  className,
  variant = "outline",
  size = "sm",
  label = "สอนใช้งานอีกครั้ง",
}: {
  className?: string;
  variant?: "outline" | "secondary" | "ghost";
  size?: "sm" | "default";
  label?: string;
}) {
  const tour = useProductTourOptional();
  if (!tour) return null;
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn("gap-1.5 text-xs", className)}
      onClick={() => tour.startTour(0)}
    >
      <Compass className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
