import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { useDashboardJobs } from "@/store/dashboardJobs";

type MiniPost = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  status: string;
  approval_status: string | null;
};

function dotClass(p: MiniPost) {
  if (p.approval_status === "pending") return "bg-primary";
  if (p.status === "scheduled") return "bg-blue-500";
  if (p.status === "published") return "bg-success";
  if (p.approval_status === "changes_requested") return "bg-destructive";
  return "bg-muted-foreground";
}

export function MiniContentCalendar({ onGo }: { onGo: (tab: string) => void }) {
  const { user } = useAuth();
  const jobs = useDashboardJobs();
  const [cursor, setCursor] = React.useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const monthEnd = `${year}-${String(month + 1).padStart(2, "0")}-31`;

  const { data: posts = [] } = useQuery({
    queryKey: ["overview_planner_posts", user?.id, monthStart],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planner_posts")
        .select("id,title,post_date,status,approval_status")
        .gte("post_date", monthStart)
        .lte("post_date", monthEnd)
        .order("post_date", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(
        (r): MiniPost => ({
          id: r.id,
          title: r.title ?? "",
          date: r.post_date,
          status: r.status ?? "draft",
          approval_status: r.approval_status,
        }),
      );
    },
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const postsForDay = (day: number) => {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return posts.filter((p) => p.date === iso);
  };

  const monthLabel = cursor.toLocaleDateString("th-TH", { month: "long", year: "numeric" });

  // Upcoming: jobs with dueDate >= today (next 5)
  const upcoming = React.useMemo(() => {
    const items: { date: string; label: string; color: string }[] = [];
    jobs.list
      .filter((j) => j.dueDate && j.dueDate >= todayISO && !j.done)
      .forEach((j) => {
        items.push({
          date: j.dueDate as string,
          label: `ส่งงาน ${j.brand}`,
          color: "bg-primary",
        });
      });
    posts
      .filter((p) => p.date >= todayISO && p.status === "scheduled")
      .forEach((p) => {
        items.push({
          date: p.date,
          label: p.title || "นัดโพสต์",
          color: "bg-blue-500",
        });
      });
    items.sort((a, b) => a.date.localeCompare(b.date));
    return items.slice(0, 4);
  }, [jobs.list, posts, todayISO]);

  const fmtUpcoming = (iso: string) => {
    if (iso === todayISO) return "วันนี้";
    const d = new Date(iso);
    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    if (
      iso ===
      `${tom.getFullYear()}-${String(tom.getMonth() + 1).padStart(2, "0")}-${String(tom.getDate()).padStart(2, "0")}`
    )
      return "พรุ่งนี้";
    return d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
  };

  return (
    <Card className="rounded-xl border-border/60 shadow-soft h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <span className="rounded-lg bg-primary-soft text-primary p-1.5">
            <CalendarIcon className="h-3.5 w-3.5" />
          </span>
          ปฏิทิน
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          onClick={() => onGo("planner")}
        >
          Planner <ArrowRight className="h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Month nav */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold">{monthLabel}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-0.5">
          {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((d) => (
            <div
              key={d}
              className="text-center text-[10px] font-medium text-muted-foreground py-0.5"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day grid (compact, no per-cell border) */}
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, idx) => {
            if (day === null) return <div key={idx} className="h-8" />;
            const dayPosts = postsForDay(day);
            const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isToday = iso === todayISO;
            const hasDot = dayPosts.length > 0;
            return (
              <button
                key={idx}
                type="button"
                onClick={hasDot ? () => onGo("planner") : undefined}
                className={`h-8 rounded-md flex flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
                  isToday
                    ? "bg-primary-soft text-primary font-semibold"
                    : hasDot
                      ? "hover:bg-muted/60 cursor-pointer"
                      : "text-foreground/80"
                }`}
              >
                <span className="leading-none">{day}</span>
                {hasDot && <span className={`h-1 w-1 rounded-full ${dotClass(dayPosts[0])}`} />}
              </button>
            );
          })}
        </div>

        {/* Upcoming list */}
        <div className="pt-2 border-t border-border/40">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            กำหนดส่ง / นัดหมาย
          </div>
          {upcoming.length === 0 ? (
            <p className="text-[11px] text-muted-foreground italic">ยังไม่มีนัดหมาย</p>
          ) : (
            <div className="space-y-1">
              {upcoming.map((u, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px]">
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${u.color}`} />
                  <span className="font-semibold tabular-nums">{fmtUpcoming(u.date)}</span>
                  <span className="text-muted-foreground">—</span>
                  <span className="truncate">{u.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
