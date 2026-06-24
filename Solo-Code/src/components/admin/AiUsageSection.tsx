import * as React from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/dashboard/StatCard";

type UsageRow = {
  user_id: string;
  usage_date: string;
  count: number;
};

export function AiUsageSection() {
  const [rows, setRows] = React.useState<UsageRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const since = new Date();
        since.setDate(since.getDate() - 30);
        const { data } = await supabase
          .from("ai_chat_usage")
          .select("user_id, usage_date, count")
          .gte("usage_date", since.toISOString().slice(0, 10))
          .order("usage_date", { ascending: false });
        setRows((data ?? []) as UsageRow[]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const todayTotal = rows.filter((r) => r.usage_date === today).reduce((s, r) => s + r.count, 0);
  const weekTotal = rows
    .filter((r) => Date.now() - new Date(r.usage_date).getTime() < 7 * 86_400_000)
    .reduce((s, r) => s + r.count, 0);
  const activeUsers = new Set(rows.map((r) => r.user_id)).size;

  const topUsers = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.user_id, (map.get(r.user_id) ?? 0) + r.count);
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [rows]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Usage
        </h2>
        <p className="text-sm text-muted-foreground">การใช้ AI Chat 30 วันล่าสุด</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          label="วันนี้"
          value={String(todayTotal)}
          sub="ครั้งถาม AI"
          icon={<Sparkles className="h-4 w-4" />}
        />
        <StatCard
          label="7 วัน"
          value={String(weekTotal)}
          sub="รวมทุกผู้ใช้"
          icon={<Sparkles className="h-4 w-4" />}
        />
        <StatCard
          label="ผู้ใช้ AI"
          value={String(activeUsers)}
          sub="30 วัน"
          icon={<Sparkles className="h-4 w-4" />}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Top 10 ผู้ใช้ AI</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {topUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">ยังไม่มีข้อมูล</p>
          ) : (
            topUsers.map(([uid, count], i) => (
              <div
                key={uid}
                className="flex items-center justify-between text-sm border-b border-border/40 pb-2 last:border-0"
              >
                <span className="text-muted-foreground">
                  #{i + 1} <span className="font-mono text-xs">{uid.slice(0, 8)}</span>
                </span>
                <span className="font-semibold">{count} ครั้ง</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
