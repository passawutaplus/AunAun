import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import {
  Activity,
  Loader2,
  MessageSquareHeart,
  Ticket,
  CreditCard,
  BarChart3,
  User,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type FeedRow = {
  occurred_at: string;
  category: string;
  event_type: string;
  title: string;
  detail: string | null;
  user_id: string | null;
  ref_id: string | null;
};

const CATEGORY_TABS = [
  { id: "all", label: "ทั้งหมด" },
  { id: "user", label: "ผู้ใช้" },
  { id: "feedback", label: "ฟีดแบ็ก" },
  { id: "business", label: "ธุรกิจ" },
  { id: "system", label: "ระบบ" },
] as const;

const DAY_OPTIONS = [
  { days: 1, label: "24 ชม." },
  { days: 7, label: "7 วัน" },
  { days: 30, label: "30 วัน" },
] as const;

function categoryIcon(category: string, eventType: string) {
  if (category === "feedback") {
    return eventType.startsWith("ticket") ? (
      <Ticket className="h-4 w-4 text-primary" />
    ) : (
      <MessageSquareHeart className="h-4 w-4 text-primary" />
    );
  }
  if (category === "business") return <BarChart3 className="h-4 w-4 text-emerald-600" />;
  if (category === "system") return <CreditCard className="h-4 w-4 text-violet-600" />;
  return <User className="h-4 w-4 text-sky-600" />;
}

export function ActivityFeedSection() {
  const [rows, setRows] = React.useState<FeedRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [category, setCategory] = React.useState<string>("all");
  const [days, setDays] = React.useState(7);

  const load = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await (
        supabase.rpc as unknown as (
          fn: string,
          args: Record<string, unknown>,
        ) => Promise<{ data: FeedRow[] | null; error: { message: string } | null }>
      ).call(supabase, "get_admin_activity_feed", {
        _days: days,
        _category: category,
        _limit: 100,
      });
      if (error) throw new Error(error.message);
      setRows(data ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "โหลดไทม์ไลน์ไม่สำเร็จ";
      setLoadError(msg);
      setRows([]);
      toast.error("โหลดไทม์ไลน์ไม่สำเร็จ", { description: msg });
    } finally {
      setLoading(false);
    }
  }, [category, days]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            ไทม์ไลน์
          </h2>
          <p className="text-sm text-muted-foreground">
            ทุกการเคลื่อนไหวของเว็บในที่เดียว — ผู้ใช้ ฟีดแบ็ก ธุรกิจ ระบบ
          </p>
        </div>
        <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => void load()}>
          <RefreshCw className="h-3.5 w-3.5" />
          รีเฟรช
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList className="h-8">
            {CATEGORY_TABS.map((t) => (
              <TabsTrigger key={t.id} value={t.id} className="text-xs px-2.5 h-7">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex gap-1">
          {DAY_OPTIONS.map((d) => (
            <Button
              key={d.days}
              size="sm"
              variant={days === d.days ? "secondary" : "ghost"}
              className="h-7 text-xs"
              onClick={() => setDays(d.days)}
            >
              {d.label}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              กำลังโหลด...
            </div>
          ) : loadError ? (
            <div className="text-center py-16 text-sm text-destructive px-4">
              โหลดไม่สำเร็จ: {loadError}
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-16 text-sm text-muted-foreground">
              ยังไม่มีกิจกรรมในช่วงเวลานี้
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {rows.map((r, i) => (
                <li
                  key={`${r.ref_id}-${i}`}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                    {categoryIcon(r.category, r.event_type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-sm font-medium truncate">{r.title}</p>
                      <Badge variant="outline" className="text-[9px] h-5">
                        {r.event_type}
                      </Badge>
                    </div>
                    {r.detail && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {r.detail}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(r.occurred_at), {
                        addSuffix: true,
                        locale: th,
                      })}
                      {r.user_id && (
                        <span className="ml-1 font-mono">· {r.user_id.slice(0, 8)}</span>
                      )}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
