import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Check, Circle, ArrowRight, BookOpen, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "brand", label: "ตั้งค่าโปรไฟล์ร้าน (โลโก้/ธนาคาร)", tab: "settings" as const },
  { id: "client", label: "เพิ่มลูกค้าคนแรก", tab: "mydata", sub: "clients" },
  { id: "quotation", label: "สร้างใบเสนอราคา / ดีล", tab: "finance", sub: "pipeline" },
  { id: "tracker", label: "แชร์ Job Tracker ให้ลูกค้า", tab: "finance", sub: "jobs" },
  { id: "income", label: "บันทึกรายได้เมื่อได้เงิน", tab: "finance", sub: "income" },
  { id: "tax", label: "ดูภาษีประมาณการปีนี้", tab: "finance", sub: "tax" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

type OnboardingProgress = Partial<Record<StepId, boolean>>;

export function OnboardingChecklist({
  onGo,
  stats,
}: {
  onGo: (tab: string, sub?: string) => void;
  stats: {
    clients: number;
    quotations: number;
    jobs: number;
    incomes: number;
    hasBrand?: boolean;
  };
}) {
  const { user, profile } = useAuth();
  const [collapsed, setCollapsed] = React.useState(false);
  const [manual, setManual] = React.useState<OnboardingProgress>({});

  React.useEffect(() => {
    const data = (profile?.onboarding_data ?? {}) as Record<string, unknown>;
    if (data.pipeline_checklist_dismissed) setCollapsed(true);
    if (data.pipeline_checklist_manual) {
      setManual(data.pipeline_checklist_manual as OnboardingProgress);
    }
  }, [profile?.onboarding_data]);

  const autoDone: OnboardingProgress = {
    brand: stats.hasBrand ?? false,
    client: stats.clients > 0,
    quotation: stats.quotations > 0,
    tracker: stats.jobs > 0,
    income: stats.incomes > 0,
    tax: stats.incomes > 0,
  };

  const done = (id: StepId) => !!(autoDone[id] || manual[id]);
  const completedCount = STEPS.filter((s) => done(s.id)).length;
  const allDone = completedCount === STEPS.length;
  const progressPct = Math.round((completedCount / STEPS.length) * 100);
  const nextStep = STEPS.find((s) => !done(s.id));

  if (allDone) return null;

  const persistCollapsed = async (value: boolean) => {
    if (!user) return;
    const prev = (profile?.onboarding_data ?? {}) as Record<string, unknown>;
    await supabase
      .from("profiles")
      .update({
        onboarding_data: { ...prev, pipeline_checklist_dismissed: value },
      } as never)
      .eq("user_id", user.id);
  };

  const collapse = async () => {
    setCollapsed(true);
    await persistCollapsed(true);
  };

  const expand = async () => {
    setCollapsed(false);
    await persistCollapsed(false);
  };

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={expand}
        className="w-full rounded-xl border border-[#FF5F05]/25 bg-gradient-to-br from-[#FF5F05]/5 to-transparent px-4 py-3 text-left transition hover:shadow-card hover:border-[#FF5F05]/40"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              เริ่มต้นใช้ So1o — {completedCount}/{STEPS.length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {nextStep ? `ถัดไป: ${nextStep.label}` : "เกือบครบแล้ว!"}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary shrink-0">
            ดูทั้งหมด
            <ChevronDown className="h-3.5 w-3.5" />
          </span>
        </div>
        <Progress value={progressPct} className="h-1.5 mt-2.5 [&>div]:bg-gradient-primary" />
      </button>
    );
  }

  return (
    <Card className="border-[#FF5F05]/25 bg-gradient-to-br from-[#FF5F05]/5 to-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">
            เริ่มต้นใช้ So1o — {completedCount}/{STEPS.length}
          </CardTitle>
          <button
            type="button"
            onClick={collapse}
            className="text-[10px] text-muted-foreground hover:text-foreground"
          >
            ซ่อน
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          ทำครบ {STEPS.length} ขั้นเพื่อบริหารงานแบบมืออาชีพ
        </p>
        <Progress value={progressPct} className="h-1.5 mt-1 [&>div]:bg-gradient-primary" />
      </CardHeader>
      <CardContent className="space-y-1.5">
        {STEPS.map((step) => {
          const isDone = done(step.id);
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onGo(step.tab, "sub" in step ? step.sub : undefined)}
              className={cn(
                "w-full flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition hover:bg-muted/50",
                isDone && "opacity-70",
              )}
            >
              {isDone ? (
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className={cn("flex-1", isDone && "line-through text-muted-foreground")}>
                {step.label}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </button>
          );
        })}
        <div className="flex gap-2 mt-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs"
            onClick={() => onGo("finance", "pipeline")}
          >
            เปิด Pipeline
          </Button>
          <Button size="sm" variant="ghost" className="text-xs gap-1" asChild>
            <Link to="/help/getting-started">
              <BookOpen className="h-3.5 w-3.5" />
              คู่มือ
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
