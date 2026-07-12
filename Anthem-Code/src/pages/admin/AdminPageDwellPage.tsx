import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Clock, Timer } from "lucide-react";
import SectionHeader from "@/components/admin/SectionHeader";
import KpiCard from "@/components/admin/KpiCard";
import { InlineLoader } from "@/components/ui/BanterLoader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatDwellMinutes,
  useAdminPageDwellInsights,
  type PageDwellRow,
} from "@/hooks/admin/useAdminPageDwellInsights";

const RANGES = [
  { key: 7, label: "7 วัน" },
  { key: 30, label: "30 วัน" },
  { key: 90, label: "90 วัน" },
] as const;

type TabKey = "longest_avg" | "shortest_avg" | "longest_max" | "total";

function RankTable({ rows, mode }: { rows: PageDwellRow[]; mode: TabKey }) {
  if (!rows.length) {
    return (
      <p className="text-sm text-admin-muted py-6 px-1">
        ยังไม่มีข้อมูลเวลาบนหน้า — ต้องมีผู้ใช้เปิดเว็บ (พร้อม consent analytics) สะสมก่อน
      </p>
    );
  }
  return (
    <div className="border border-admin-border rounded-sm overflow-x-auto">
      <table className="w-full text-sm min-w-[720px]">
        <thead>
          <tr className="text-left text-admin-muted border-b border-admin-border bg-admin-surface">
            <th className="px-3 py-2 font-mono text-[10px] uppercase w-10">#</th>
            <th className="px-3 py-2 font-mono text-[10px] uppercase">หน้า / path</th>
            <th className="px-3 py-2 font-mono text-[10px] uppercase">ฟีเจอร์</th>
            <th className="px-3 py-2 font-mono text-[10px] uppercase">ครั้ง</th>
            <th className="px-3 py-2 font-mono text-[10px] uppercase">session</th>
            <th className="px-3 py-2 font-mono text-[10px] uppercase">เฉลี่ย</th>
            <th className="px-3 py-2 font-mono text-[10px] uppercase">น้อยสุด</th>
            <th className="px-3 py-2 font-mono text-[10px] uppercase">นานสุด</th>
            <th className="px-3 py-2 font-mono text-[10px] uppercase">
              {mode === "total" ? "รวม" : "มัธยฐาน"}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.path_key}-${i}`} className="border-b border-admin-border/50 last:border-0">
              <td className="px-3 py-2 font-mono text-admin-muted tabular-nums">{i + 1}</td>
              <td className="px-3 py-2 font-mono text-xs text-admin-fg max-w-[280px] truncate" title={r.path_key}>
                {r.path_key}
              </td>
              <td className="px-3 py-2 text-admin-muted whitespace-nowrap">{r.feature}</td>
              <td className="px-3 py-2 tabular-nums">{r.visits}</td>
              <td className="px-3 py-2 tabular-nums text-admin-muted">{r.sessions}</td>
              <td className="px-3 py-2 tabular-nums font-medium">{formatDwellMinutes(r.avg_ms)}</td>
              <td className="px-3 py-2 tabular-nums text-admin-muted">{formatDwellMinutes(r.min_ms)}</td>
              <td className="px-3 py-2 tabular-nums">{formatDwellMinutes(r.max_ms)}</td>
              <td className="px-3 py-2 tabular-nums text-admin-muted">
                {formatDwellMinutes(mode === "total" ? r.total_ms : r.p50_ms)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminPageDwellPage() {
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState<TabKey>("longest_avg");
  const { data, isLoading, error, refetch, isFetching } = useAdminPageDwellInsights(days);

  const featureChart = useMemo(
    () =>
      (data?.by_feature ?? []).slice(0, 12).map((f) => ({
        name: f.feature.length > 12 ? `${f.feature.slice(0, 10)}…` : f.feature,
        full: f.feature,
        avgMin: Number(((f.avg_ms ?? 0) / 60_000).toFixed(2)),
        visits: f.visits,
      })),
    [data?.by_feature],
  );

  const tableRows = useMemo(() => {
    if (!data) return [];
    switch (tab) {
      case "shortest_avg":
        return data.shortest_avg ?? [];
      case "longest_max":
        return data.longest_max ?? [];
      case "total":
        return data.paths_ranked ?? [];
      default:
        return data.longest_avg ?? [];
    }
  }, [data, tab]);

  return (
    <div>
      <SectionHeader
        eyebrow="analytics / dwell"
        title="เวลาบนหน้า"
        description="ผู้ใช้อยู่แต่ละหน้ากี่นาที — เฉลี่ย นานสุด น้อยสุด จัดลำดับเพื่อวิเคราะห์ UX"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-sm border border-admin-border overflow-hidden">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setDays(r.key)}
                  className={`px-2.5 py-1.5 text-xs font-mono ${
                    days === r.key
                      ? "bg-admin-accent text-black"
                      : "bg-admin-surface text-admin-muted hover:text-admin-fg"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void refetch()}
              className="text-xs text-admin-muted hover:text-admin-accent font-mono"
            >
              {isFetching ? "…" : "รีเฟรช"}
            </button>
          </div>
        }
      />

      {isLoading ? (
        <div className="py-16 flex justify-center">
          <InlineLoader />
        </div>
      ) : error ? (
        <p className="text-sm text-admin-accent">{(error as Error).message}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <KpiCard label="ครั้งที่นับได้" value={data?.summary.visits ?? 0} icon={Timer} delta="live" />
            <KpiCard
              label="เฉลี่ยทั้งระบบ"
              value={formatDwellMinutes(data?.summary.avg_ms)}
              icon={Clock}
              delta="live"
            />
            <KpiCard label="นานสุด" value={formatDwellMinutes(data?.summary.max_ms)} delta="live" />
            <KpiCard label="จำนวน path" value={data?.summary.paths ?? 0} delta="live" />
          </div>

          <p className="mb-4 text-[11px] text-admin-muted">
            นับเฉพาะเวลาที่แท็บมองเห็น · ไม่นับ &lt; 3 วิ · ตัดเพดาน 30 นาที/ครั้ง · ต้องมี analytics consent
          </p>

          <div className="mb-8 rounded-sm border border-admin-border bg-admin-surface p-4">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-admin-muted">
              เฉลี่ยตามฟีเจอร์ (นาที)
            </p>
            <div className="h-56">
              {featureChart.length === 0 ? (
                <p className="text-sm text-admin-muted py-10 text-center">ยังไม่มีข้อมูล</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={featureChart}>
                    <CartesianGrid stroke="hsl(var(--admin-border))" strokeDasharray="2 4" vertical={false} />
                    <XAxis dataKey="name" stroke="hsl(var(--admin-muted))" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--admin-muted))" fontSize={10} tickLine={false} axisLine={false} width={28} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--admin-surface))",
                        border: "1px solid hsl(var(--admin-border))",
                        fontSize: 12,
                        color: "hsl(var(--admin-fg))",
                      }}
                      formatter={(v: number, _n, item) => [
                        `${v} น. · ${item.payload.visits} ครั้ง`,
                        item.payload.full,
                      ]}
                    />
                    <Bar dataKey="avgMin" fill="hsl(var(--admin-accent))" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
            <TabsList className="mb-3 bg-admin-surface border border-admin-border">
              <TabsTrigger value="longest_avg">นานสุด (เฉลี่ย)</TabsTrigger>
              <TabsTrigger value="shortest_avg">น้อยสุด (เฉลี่ย)</TabsTrigger>
              <TabsTrigger value="longest_max">นานสุด (ครั้งเดียว)</TabsTrigger>
              <TabsTrigger value="total">รวมเวลามากสุด</TabsTrigger>
            </TabsList>
            <RankTable rows={tableRows} mode={tab} />
          </Tabs>
        </>
      )}
    </div>
  );
}
