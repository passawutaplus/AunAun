import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Briefcase, CalendarClock, ArrowRight, Loader2 } from "lucide-react";
import { JOB_STEPS } from "../jobtracker/steps";

type MiniJob = {
  id: string;
  title: string;
  client_name: string;
  status: string;
  current_step: number;
  progress_percent: number;
  deadline: string | null;
  updated_at: string;
};

const MAX_ITEMS = 5;

function daysUntil(d: string | null): number | null {
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(d);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

function dueLabel(d: string | null): { text: string; tone: string } {
  const n = daysUntil(d);
  if (n === null) return { text: "ไม่กำหนด", tone: "text-muted-foreground" };
  if (n < 0) return { text: `เลย ${Math.abs(n)} วัน`, tone: "text-destructive" };
  if (n === 0) return { text: "วันนี้", tone: "text-destructive font-semibold" };
  if (n === 1) return { text: "พรุ่งนี้", tone: "text-amber-600 font-semibold" };
  if (n <= 7) return { text: `อีก ${n} วัน`, tone: "text-amber-600" };
  return { text: `อีก ${n} วัน`, tone: "text-muted-foreground" };
}

export function JobTrackerMiniWidget({ onGo }: { onGo: (tab: string, sub?: string) => void }) {
  const { user } = useAuth();
  const userId = user?.id;
  const lastStep = JOB_STEPS.length - 1;

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["job_trackers_mini", userId ?? "anon"],
    enabled: !!userId,
    queryFn: async (): Promise<MiniJob[]> => {
      const { data, error } = await supabase
        .from("job_trackers")
        .select("id,title,client_name,status,current_step,progress_percent,deadline,updated_at")
        .neq("status", "completed")
        .lt("current_step", lastStep);
      if (error) throw error;
      return (data ?? []) as MiniJob[];
    },
  });

  // Sort by deadline (nulls last), then updated_at
  const sorted = React.useMemo(() => {
    return [...jobs].sort((a, b) => {
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return b.updated_at.localeCompare(a.updated_at);
    });
  }, [jobs]);

  const visible = sorted.slice(0, MAX_ITEMS);

  return (
    <Card className="border-border/60 shadow-card overflow-hidden h-full flex flex-col">
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-primary" />
          ติดตามงาน (Job Tracker)
        </CardTitle>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onGo("finance", "jobs")}
          className="h-7 text-xs gap-1"
        >
          ดูทั้งหมด <ArrowRight className="h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground gap-2 text-xs">
            <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลด…
          </div>
        ) : visible.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-6 text-muted-foreground">
            <Briefcase className="h-7 w-7 mb-2 opacity-40" />
            <p className="text-xs">ยังไม่มีงานที่กำลังทำอยู่</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 h-7 text-xs"
              onClick={() => onGo("finance", "jobs")}
            >
              + เพิ่มงานใหม่
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((j) => {
              const stepLabel = JOB_STEPS[j.current_step]?.label ?? "—";
              const due = dueLabel(j.deadline);
              return (
                <button
                  key={j.id}
                  onClick={() => onGo("finance", "jobs")}
                  className="w-full text-left rounded-lg border border-border/40 bg-card/60 p-2.5 hover:border-primary/40 hover:bg-primary-soft/30 transition-colors group"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-xs font-medium truncate flex-1">
                      {j.title || "(ไม่มีชื่อ)"}
                    </p>
                    <span className={`text-[10px] flex items-center gap-0.5 shrink-0 ${due.tone}`}>
                      <CalendarClock className="h-2.5 w-2.5" />
                      {due.text}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <p className="text-[10px] text-muted-foreground truncate">
                      {j.client_name || "—"} · {stepLabel}
                    </p>
                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      {j.progress_percent}%
                    </span>
                  </div>
                  <Progress value={j.progress_percent} className="h-1" />
                </button>
              );
            })}
            {sorted.length > MAX_ITEMS && (
              <p className="text-[10px] text-center text-muted-foreground pt-1">
                + อีก {sorted.length - MAX_ITEMS} งาน · กด "ดูทั้งหมด"
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
