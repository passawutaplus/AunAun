import * as React from "react";
import { Link } from "@tanstack/react-router";
import { PageFooterActions } from "@/components/dashboard/PageFooterActions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useFinance } from "@/store/finance";
import { useDashboardJobs } from "@/store/dashboardJobs";
import { useClientInvoices } from "@/store/clientInvoices";
import { toast } from "sonner";
import { DebtWidget } from "./DebtWidget";
import {
  Wallet,
  Users,
  ArrowRight,
  TrendingUp,
  Receipt,
  Target,
  Check,
  Pencil,
} from "lucide-react";

import { HeroGreeting } from "./overview/HeroGreeting";
import { MiniContentCalendar } from "./overview/MiniContentCalendar";
import { JobListWidget } from "./overview/JobListWidget";
import { TaskListWidget } from "./overview/TaskListWidget";
import { QuickNoteWidget } from "./overview/QuickNoteWidget";
import { JobTrackerMiniWidget } from "./overview/JobTrackerMiniWidget";
import { OnboardingChecklist } from "./overview/OnboardingChecklist";
import { PipelineMiniWidget } from "./overview/PipelineMiniWidget";
import { OverviewPerformanceCharts } from "./overview/OverviewPerformanceCharts";
import { DashboardShortcuts } from "./overview/DashboardShortcuts";
import { PipelineNewDealButton } from "./layout/PipelineNewDealButton";
import { Aplus1JobsPanel } from "./ecosystem/Aplus1JobsPanel";

interface OverviewTabProps {
  onGo: (tab: string, sub?: string) => void;
}

interface Snapshot {
  unreadNotif: number;
  clients: number;
  quotations: number;
  recentNotif: { id: string; message: string; type: string; created_at: string; read: boolean }[];
}

export function OverviewTab({ onGo }: OverviewTabProps) {
  const { user, profile } = useAuth();
  const finance = useFinance();
  const [snap, setSnap] = React.useState<Snapshot | null>(null);

  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [notifRes, clientsRes, quotesRes, recentRes] = await Promise.all([
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("read", false),
        supabase
          .from("saved_clients")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("quotations")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("notifications")
          .select("id,message,type,created_at,read")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (cancelled) return;
      setSnap({
        unreadNotif: notifRes.count || 0,
        clients: clientsRes.count || 0,
        quotations: quotesRes.count || 0,
        recentNotif: (recentRes.data ?? []).flatMap((notification) =>
          notification.id &&
          notification.message &&
          notification.type &&
          notification.created_at &&
          notification.read !== null
            ? [
                {
                  id: notification.id,
                  message: notification.message,
                  type: notification.type,
                  created_at: notification.created_at,
                  read: notification.read,
                },
              ]
            : [],
        ),
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Finance roll-up (current month)
  const ym = new Date().toISOString().slice(0, 7);
  const monthIncome = finance.incomes
    .filter((i) => i.month === ym)
    .reduce((s, i) => s + (i.gross || 0), 0);
  const ymPrefix = `${ym}-`;
  const monthExp = [...finance.workExpenses, ...finance.personalExpenses]
    .filter((e) => e.date?.startsWith(ymPrefix))
    .reduce((s, e) => s + (e.amount || 0), 0);
  const subsActive = finance.subs.length;
  const subsCost = finance.subs.reduce((sum, s) => sum + (s.amount || 0), 0);
  const goal = finance.monthlyGoal || 0;
  const goalPct = goal > 0 ? Math.min(100, Math.round((monthIncome / goal) * 100)) : 0;
  const goalRemaining = Math.max(0, goal - monthIncome);

  const fmt = (n: number) => new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(n);

  const greet = profile?.brand_name || profile?.display_name || "";

  // Productivity widgets data
  const jobsList = useDashboardJobs().list;
  const activeJobs = jobsList.filter((j) => !j.done).length;
  const invoices = useClientInvoices().list;
  const pendingInvoices = invoices.filter((i) => i.status !== "paid").length;
  const [todayPosts, setTodayPosts] = React.useState(0);
  React.useEffect(() => {
    if (!user) return;
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    supabase
      .from("planner_posts")
      .select("id", { count: "exact", head: true })
      .eq("post_date", iso)
      .then(({ count }) => setTodayPosts(count || 0));
  }, [user]);

  return (
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      <OnboardingChecklist
        onGo={onGo}
        stats={{
          clients: snap?.clients ?? 0,
          quotations: snap?.quotations ?? 0,
          jobs: jobsList.length,
          incomes: finance.incomes.length,
          hasBrand: !!(
            profile?.logo_url ||
            profile?.brand_name ||
            (profile?.bank_account_number && profile?.bank_name)
          ),
        }}
      />

      <div className="flex items-center justify-end">
        <PipelineNewDealButton variant="header" onNavigate={onGo} />
      </div>

      <DashboardShortcuts onGo={onGo} />

      {/* Monthly income goal — moved to top */}
      <MonthlyGoalCard
        goal={goal}
        income={monthIncome}
        pct={goalPct}
        remaining={goalRemaining}
        onGoIncome={() => onGo("finance", "income")}
        onSave={(g) => {
          finance.setMonthlyGoal(g);
          toast.success(
            g > 0 ? `บันทึกเป้าหมาย ฿${fmt(g)}/เดือนแล้ว` : "ปิดการใช้งานเป้าหมายรายได้",
          );
        }}
      />

      {/* Finance stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
        <StatCard
          accent
          label="รายได้เดือนนี้"
          value={`฿${fmt(monthIncome)}`}
          sub={goal > 0 ? `${goalPct}% ของเป้า ฿${fmt(goal)}` : "ตั้งเป้าได้ในการ์ดด้านบน"}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          label="รายจ่ายเดือนนี้"
          value={`฿${fmt(monthExp)}`}
          sub={`สุทธิ ฿${fmt(monthIncome - monthExp)}`}
          icon={<Wallet className="h-5 w-5" />}
        />
        <StatCard
          label="Subscriptions ใช้งาน"
          value={subsActive}
          sub={`฿${fmt(subsCost)}/เดือน`}
          icon={<Receipt className="h-5 w-5" />}
        />
        <StatCard
          label="ลูกค้าในระบบ"
          value={snap?.clients ?? "—"}
          sub="คลิกเพื่อดู CRM"
          icon={<Users className="h-5 w-5" />}
        />
      </div>

      <OverviewPerformanceCharts />

      {/* Pipeline + Job tracker + Debt */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5 items-stretch">
        <PipelineMiniWidget onGo={onGo} />
        <JobTrackerMiniWidget onGo={onGo} />
        <DebtWidget onGo={onGo} />
      </div>

      <Aplus1JobsPanel onOpenQuotations={() => onGo("finance", "quotations")} />

      {/* Quick Note */}
      <QuickNoteWidget />

      {/* Jobs + Tasks + Calendar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 lg:gap-5">
        <div className="lg:col-span-4">
          <JobListWidget />
        </div>
        <div className="lg:col-span-3">
          <TaskListWidget />
        </div>
        <div className="md:col-span-2 lg:col-span-5">
          <MiniContentCalendar onGo={onGo} />
        </div>
      </div>

      <PageFooterActions feature="overview" label="ภาพรวมหน้า Dashboard" />
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
  badge,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group text-left rounded-xl border border-border/60 bg-card/60 hover:bg-card hover:shadow-elevated hover:-translate-y-0.5 transition-all p-4 flex items-start gap-3"
    >
      <div className="rounded-lg bg-primary-soft text-primary p-2.5 shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold truncate">{title}</p>
          {badge && (
            <span className="text-[10px] font-semibold rounded-full bg-primary text-primary-foreground px-1.5 py-0.5">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{desc}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
    </button>
  );
}

function MonthlyGoalCard({
  goal,
  income,
  pct,
  remaining,
  onSave,
  onGoIncome,
}: {
  goal: number;
  income: number;
  pct: number;
  remaining: number;
  onSave: (g: number) => void;
  onGoIncome: () => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(String(goal || ""));
  const fmt = (n: number) => new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(n);

  React.useEffect(() => {
    if (!editing) setDraft(String(goal || ""));
  }, [goal, editing]);

  const save = () => {
    const n = Number(draft.replace(/[^\d.]/g, "")) || 0;
    onSave(n);
    setEditing(false);
  };

  const reached = goal > 0 && income >= goal;

  return (
    <Card className="border-border/60 shadow-card overflow-hidden">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`rounded-xl p-2.5 ${reached ? "bg-success/15 text-success" : "bg-primary-soft text-primary"}`}
            >
              <Target className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                เป้าหมายรายได้เดือนนี้
              </p>
              {!editing ? (
                <p className="text-xl sm:text-2xl font-semibold num tracking-tight mt-0.5">
                  ฿{fmt(income)}
                  {goal > 0 && (
                    <span className="text-muted-foreground text-sm font-normal">
                      {" "}
                      / ฿{fmt(goal)}
                    </span>
                  )}
                </p>
              ) : (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-muted-foreground">฿</span>
                  <Input
                    autoFocus
                    inputMode="numeric"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") save();
                      if (e.key === "Escape") setEditing(false);
                    }}
                    placeholder="เช่น 50000"
                    className="h-9 w-40"
                  />
                  <span className="text-xs text-muted-foreground">/ เดือน</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" onClick={onGoIncome} className="h-8 text-xs">
              หน้ารายได้ <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
            </Button>
            {!editing ? (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="h-8">
                <Pencil className="h-3.5 w-3.5" />
                {goal > 0 ? "แก้ไขเป้า" : "ตั้งเป้า"}
              </Button>
            ) : (
              <>
                <Button size="sm" onClick={save} className="h-8">
                  <Check className="h-3.5 w-3.5" /> บันทึก
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)} className="h-8">
                  ยกเลิก
                </Button>
              </>
            )}
          </div>
        </div>

        {goal > 0 ? (
          <div className="mt-4 space-y-2">
            <Progress
              value={pct}
              className={`h-3 ${reached ? "[&>div]:bg-success" : "[&>div]:bg-gradient-primary"}`}
            />
            <div className="flex items-center justify-between text-xs">
              <span className={`font-semibold ${reached ? "text-success" : "text-foreground"}`}>
                {pct}% ของเป้า
              </span>
              <span className="text-muted-foreground">
                {reached ? "🎉 ถึงเป้าแล้ว!" : `เหลืออีก ฿${fmt(remaining)}`}
              </span>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            ยังไม่ได้ตั้งเป้าหมายรายได้รายเดือน — กดปุ่ม "ตั้งเป้า" เพื่อเริ่มติดตามความคืบหน้า
          </p>
        )}
      </CardContent>
    </Card>
  );
}
