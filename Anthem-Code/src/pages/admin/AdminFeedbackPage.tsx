import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SectionHeader from "@/components/admin/SectionHeader";
import DataTable, { Column } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Download } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { toCsv, downloadCsv } from "@/lib/csv";

type FeedbackRow = {
  id: string;
  user_id: string;
  feature: string;
  route: string;
  rating: number;
  message: string;
  status: string;
  admin_note: string;
  project_id: string | null;
  user_agent: string;
  viewport: string;
  created_at: string;
};

const RANGES = [
  { key: "7d", label: "7 วัน", days: 7 },
  { key: "30d", label: "30 วัน", days: 30 },
  { key: "90d", label: "90 วัน", days: 90 },
];

const STATUSES = ["all", "new", "reviewing", "resolved", "dismissed"] as const;

export default function AdminFeedbackPage() {
  const qc = useQueryClient();
  const [rangeKey, setRangeKey] = useState("30d");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("all");
  const [feature, setFeature] = useState<string>("all");

  const days = RANGES.find((r) => r.key === rangeKey)?.days ?? 30;

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", "feedback", rangeKey],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const { data, error } = await supabase
        .from("app_feedback" as never)
        .select("*")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as unknown as FeedbackRow[];
    },
  });

  const filtered = useMemo(() => {
    return rows.filter(
      (r) => (status === "all" || r.status === status) && (feature === "all" || r.feature === feature)
    );
  }, [rows, status, feature]);

  const features = useMemo(() => Array.from(new Set(rows.map((r) => r.feature))).sort(), [rows]);

  const dailySeries = useMemo(() => {
    const byDay = new Map<string, { day: string; count: number; sum: number }>();
    filtered.forEach((r) => {
      const d = r.created_at.slice(0, 10);
      const cur = byDay.get(d) ?? { day: d, count: 0, sum: 0 };
      cur.count += 1;
      cur.sum += r.rating;
      byDay.set(d, cur);
    });
    return Array.from(byDay.values())
      .sort((a, b) => a.day.localeCompare(b.day))
      .map((d) => ({ day: d.day.slice(5), count: d.count, avg: +(d.sum / d.count).toFixed(2) }));
  }, [filtered]);

  const byFeatureSeries = useMemo(() => {
    const map = new Map<string, { feature: string; count: number; sum: number }>();
    filtered.forEach((r) => {
      const cur = map.get(r.feature) ?? { feature: r.feature, count: 0, sum: 0 };
      cur.count += 1;
      cur.sum += r.rating;
      map.set(r.feature, cur);
    });
    return Array.from(map.values())
      .map((v) => ({ feature: v.feature, count: v.count, avg: +(v.sum / v.count).toFixed(2) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filtered]);

  const byProjectSeries = useMemo(() => {
    const map = new Map<string, { project: string; count: number }>();
    filtered
      .filter((r) => r.project_id)
      .forEach((r) => {
        const k = r.project_id!;
        const cur = map.get(k) ?? { project: k.slice(0, 8), count: 0 };
        cur.count += 1;
        map.set(k, cur);
      });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [filtered]);

  const stats = useMemo(() => {
    if (filtered.length === 0) return { avg: 0, responded: 0 };
    const sum = filtered.reduce((s, r) => s + r.rating, 0);
    const responded = filtered.filter((r) => r.admin_note || r.status === "resolved").length;
    return { avg: sum / filtered.length, responded: (responded / filtered.length) * 100 };
  }, [filtered]);

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await supabase.from("app_feedback" as never).update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "feedback"] });
      toast.success("อัปเดตแล้ว");
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("app_feedback" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "feedback"] });
      toast.success("ลบแล้ว");
    },
  });

  const exportCsv = () => {
    const csv = toCsv(
      filtered.map((r) => ({
        created_at: r.created_at,
        rating: r.rating,
        feature: r.feature,
        route: r.route,
        status: r.status,
        message: r.message,
        admin_note: r.admin_note,
        project_id: r.project_id ?? "",
        user_id: r.user_id,
      }))
    );
    downloadCsv(`feedback-${rangeKey}-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  const cols: Column<FeedbackRow>[] = [
    {
      key: "at",
      header: "เวลา",
      render: (r) => <span className="font-mono text-xs">{r.created_at.slice(0, 16).replace("T", " ")}</span>,
    },
    {
      key: "rating",
      header: "★",
      render: (r) => (
        <span className="flex items-center gap-1 font-semibold">
          {r.rating}<Star className="w-3 h-3 fill-primary text-primary" />
        </span>
      ),
    },
    { key: "feature", header: "ฟีเจอร์", render: (r) => <span className="text-xs">{r.feature}</span> },
    { key: "route", header: "Route", render: (r) => <span className="font-mono text-[10px]">{r.route}</span> },
    { key: "msg", header: "ข้อความ", render: (r) => <span className="text-xs line-clamp-2 max-w-sm">{r.message || "—"}</span> },
    {
      key: "status",
      header: "สถานะ",
      render: (r) => (
        <select
          value={r.status}
          onChange={(e) => update.mutate({ id: r.id, patch: { status: e.target.value } })}
          className="text-xs bg-background border border-border rounded px-1.5 py-0.5"
        >
          {["new", "reviewing", "resolved", "dismissed"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (r) => (
        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove.mutate(r.id)}>
          ลบ
        </Button>
      ),
    },
  ];

  return (
    <div>
      <SectionHeader
        eyebrow="voice of user"
        title="ฟีดแบ็กผู้ใช้"
        description="คะแนนและความคิดเห็นจากผู้ใช้ พร้อมแนวโน้มรายวันและส่งออก CSV"
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Tabs value={rangeKey} onValueChange={setRangeKey}>
          <TabsList>
            {RANGES.map((r) => <TabsTrigger key={r.key} value={r.key}>{r.label}</TabsTrigger>)}
          </TabsList>
        </Tabs>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="text-xs bg-background border border-border rounded px-2 py-1.5"
        >
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={feature}
          onChange={(e) => setFeature(e.target.value)}
          className="text-xs bg-background border border-border rounded px-2 py-1.5"
        >
          <option value="all">ทุกฟีเจอร์</option>
          {features.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <Button size="sm" variant="outline" onClick={exportCsv} className="ml-auto">
          <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="rounded-lg border border-admin-border bg-admin-surface p-3">
          <p className="text-[10px] font-mono uppercase tracking-wider text-admin-muted">รวม</p>
          <p className="text-2xl font-medium mt-1">{filtered.length}</p>
        </div>
        <div className="rounded-lg border border-admin-border bg-admin-surface p-3">
          <p className="text-[10px] font-mono uppercase tracking-wider text-admin-muted">เฉลี่ย</p>
          <p className="text-2xl font-medium mt-1 flex items-center gap-1">
            {stats.avg.toFixed(2)}<Star className="w-4 h-4 fill-primary text-primary" />
          </p>
        </div>
        <div className="rounded-lg border border-admin-border bg-admin-surface p-3">
          <p className="text-[10px] font-mono uppercase tracking-wider text-admin-muted">ตอบกลับ</p>
          <p className="text-2xl font-medium mt-1">{stats.responded.toFixed(0)}%</p>
        </div>
        <div className="rounded-lg border border-admin-border bg-admin-surface p-3">
          <p className="text-[10px] font-mono uppercase tracking-wider text-admin-muted">ช่วง</p>
          <p className="text-2xl font-medium mt-1">{days}d</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <div className="rounded-lg border border-admin-border bg-admin-surface p-3 h-64">
          <p className="text-xs font-mono uppercase tracking-wider text-admin-muted mb-2">รายวัน</p>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={dailySeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
              <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="จำนวน" />
              <Line type="monotone" dataKey="avg" stroke="hsl(var(--accent-foreground))" strokeWidth={2} dot={false} name="เฉลี่ย" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-lg border border-admin-border bg-admin-surface p-3 h-64">
          <p className="text-xs font-mono uppercase tracking-wider text-admin-muted mb-2">ตามฟีเจอร์ (top 10)</p>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={byFeatureSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="feature" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {byProjectSeries.length > 0 && (
        <div className="rounded-lg border border-admin-border bg-admin-surface p-3 h-56 mb-4">
          <p className="text-xs font-mono uppercase tracking-wider text-admin-muted mb-2">ตามโปรเจกต์ (top 10)</p>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={byProjectSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="project" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <DataTable columns={cols} rows={filtered} loading={isLoading} rowKey={(r) => r.id} empty="ยังไม่มีฟีดแบ็กในช่วงนี้" />
    </div>
  );
}
