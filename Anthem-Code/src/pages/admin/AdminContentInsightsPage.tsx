import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, Eye, Flame, Snowflake, TrendingUp, Target } from "lucide-react";
import { toast } from "sonner";
import SectionHeader from "@/components/admin/SectionHeader";
import KpiCard from "@/components/admin/KpiCard";
import { Button } from "@/components/ui/button";
import { InlineLoader } from "@/components/ui/BanterLoader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAdminContentInsights,
  useDownloadContentInsightsPack,
  type ContentInsightRow,
} from "@/hooks/admin/useAdminContentInsights";

const RANGES = [
  { key: 7, label: "7 วัน" },
  { key: 30, label: "30 วัน" },
  { key: 90, label: "90 วัน" },
] as const;

type TabKey = "top" | "bottom" | "rising" | "low_conv" | "gaps";

function ProjectTable({ rows, showRising }: { rows: ContentInsightRow[]; showRising?: boolean }) {
  if (!rows.length) {
    return <p className="text-sm text-admin-muted py-6 px-1">ยังไม่มีข้อมูลในชุดนี้</p>;
  }
  return (
    <div className="border border-admin-border rounded-sm overflow-x-auto">
      <table className="w-full text-sm min-w-[720px]">
        <thead>
          <tr className="text-left text-admin-muted border-b border-admin-border bg-admin-surface">
            <th className="px-3 py-2 font-mono text-[10px] uppercase">ผลงาน</th>
            <th className="px-3 py-2 font-mono text-[10px] uppercase">หมวด</th>
            <th className="px-3 py-2 font-mono text-[10px] uppercase">วิวช่วงนี้</th>
            <th className="px-3 py-2 font-mono text-[10px] uppercase">วิวรวม</th>
            <th className="px-3 py-2 font-mono text-[10px] uppercase">คนดู</th>
            <th className="px-3 py-2 font-mono text-[10px] uppercase">ไลก์</th>
            <th className="px-3 py-2 font-mono text-[10px] uppercase">จ้าง/คอลแลป</th>
            {showRising ? (
              <th className="px-3 py-2 font-mono text-[10px] uppercase">% พุ่ง</th>
            ) : (
              <th className="px-3 py-2 font-mono text-[10px] uppercase">แปลง %</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-admin-border/50 last:border-0">
              <td className="px-3 py-2">
                <Link to={`/project/${r.id}`} className="text-admin-accent hover:underline font-medium line-clamp-1">
                  {r.title || r.id.slice(0, 8)}
                </Link>
                <p className="text-[10px] text-admin-muted font-mono mt-0.5">
                  อายุ {Math.round(r.age_days ?? 0)} วัน
                  {r.has_cover === false ? " · ไม่มีปก" : ""}
                  {r.allow_hire ? " · เปิดจ้าง" : ""}
                </p>
              </td>
              <td className="px-3 py-2 text-admin-muted whitespace-nowrap">{r.category}</td>
              <td className="px-3 py-2 tabular-nums font-medium">{r.views_period}</td>
              <td className="px-3 py-2 tabular-nums text-admin-muted">{r.views_total ?? "—"}</td>
              <td className="px-3 py-2 tabular-nums">{r.unique_viewers ?? "—"}</td>
              <td className="px-3 py-2 tabular-nums">{r.likes_period ?? 0}</td>
              <td className="px-3 py-2 tabular-nums">
                {(r.hires_period ?? 0) + (r.collabs_period ?? 0)}
              </td>
              <td className="px-3 py-2 tabular-nums">
                {showRising ? (r.rising_pct ?? 0) : (r.opportunity_rate_pct ?? 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminContentInsightsPage() {
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState<TabKey>("top");
  const { data, isLoading, error, refetch, isFetching } = useAdminContentInsights(days);
  const download = useDownloadContentInsightsPack();

  const categoryChart = useMemo(
    () =>
      (data?.category_stats ?? []).slice(0, 12).map((c) => ({
        name: c.category.length > 14 ? `${c.category.slice(0, 12)}…` : c.category,
        full: c.category,
        views: c.views_period,
        avg: Number(c.avg_views_period),
        projects: c.project_count,
      })),
    [data?.category_stats],
  );

  const tableRows = useMemo(() => {
    if (!data) return [];
    switch (tab) {
      case "bottom":
        return data.bottom_views ?? [];
      case "rising":
        return data.rising ?? [];
      case "low_conv":
        return data.high_view_low_conversion ?? [];
      case "gaps":
        return data.opportunity_gaps ?? [];
      default:
        return data.top_views ?? [];
    }
  }, [data, tab]);

  const onExport = async () => {
    try {
      await download.mutateAsync(days);
      toast.success("ดาวน์โหลด ZIP แล้ว — เปิด CSV ด้วย Excel อ่านไทยได้");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ส่งออกไม่สำเร็จ");
    }
  };

  const s = data?.summary;

  return (
    <div>
      <SectionHeader
        eyebrow="content intelligence"
        title="Insights — ผลงานคนดูเยอะ / น้อย"
        description="วิเคราะห์ผลงานว่าหมวดไหนฮิต ไหนเงียบ และอันไหนวิวเยอะแต่ยังไม่แปลงเป็นโอกาสจ้าง"
        actions={
          <div className="flex flex-wrap gap-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setDays(r.key)}
                className={`px-3 py-1.5 text-xs font-mono uppercase rounded-sm border ${
                  days === r.key
                    ? "bg-admin-fg text-admin-bg border-admin-fg"
                    : "border-admin-border text-admin-muted hover:text-admin-fg"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="flex flex-wrap gap-2 mb-5">
        <Button
          type="button"
          size="sm"
          className="rounded-sm"
          disabled={download.isPending || isLoading}
          onClick={() => void onExport()}
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />
          {download.isPending ? "กำลังส่งออก…" : "ส่งออก Content pack (ZIP)"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-sm border-admin-border"
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          รีเฟรช
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive mb-4">{(error as Error).message}</p> : null}

      {isLoading ? (
        <InlineLoader labelClassName="text-admin-muted" />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <KpiCard label="ผลงานเผยแพร่" value={s?.published_projects ?? "—"} icon={Eye} />
            <KpiCard label={`วิว ${days} วัน`} value={s?.views_period_total ?? "—"} icon={Eye} accent />
            <KpiCard label="ฮอต (top 20%)" value={s?.hot_count ?? "—"} icon={Flame} />
            <KpiCard label="เย็น / เงียบ" value={s?.cold_count ?? "—"} icon={Snowflake} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            <KpiCard label="วิวเฉลี่ย/ผลงาน" value={s?.avg_views_period ?? "—"} />
            <KpiCard label="วิว 0 ในช่วงนี้" value={s?.zero_views_period ?? "—"} icon={Target} />
            <KpiCard label="คนดู (login)" value={s?.unique_viewers_period ?? "—"} icon={TrendingUp} />
          </div>

          <div className="border border-admin-border bg-admin-surface rounded-sm p-4 mb-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-admin-muted mb-3">
              วิวตามหมวด ({days} วัน)
            </p>
            <div className="h-56">
              {categoryChart.length === 0 ? (
                <p className="text-sm text-admin-muted py-8">ยังไม่มีข้อมูลหมวด</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChart}>
                    <CartesianGrid stroke="hsl(var(--admin-border))" strokeDasharray="2 4" vertical={false} />
                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} width={32} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--admin-surface))",
                        border: "1px solid hsl(var(--admin-border))",
                        fontSize: 12,
                      }}
                      formatter={(value: number, name: string) => [
                        value,
                        name === "views" ? "วิว" : name === "avg" ? "เฉลี่ย/ชิ้น" : name,
                      ]}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.full ?? ""}
                    />
                    <Bar dataKey="views" fill="hsl(var(--admin-accent))" name="views" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="mb-3">
            <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0">
              <TabsTrigger value="top" className="rounded-sm text-xs">คนดูเยอะ</TabsTrigger>
              <TabsTrigger value="bottom" className="rounded-sm text-xs">คนดูน้อย</TabsTrigger>
              <TabsTrigger value="rising" className="rounded-sm text-xs">กำลังพุ่ง</TabsTrigger>
              <TabsTrigger value="low_conv" className="rounded-sm text-xs">วิวสูงแต่ไม่แปลง</TabsTrigger>
              <TabsTrigger value="gaps" className="rounded-sm text-xs">ช่องว่างโอกาสจ้าง</TabsTrigger>
            </TabsList>
          </Tabs>

          <ProjectTable rows={tableRows} showRising={tab === "rising"} />

          {(data?.category_stats?.length ?? 0) > 0 ? (
            <div className="mt-6 border border-admin-border rounded-sm overflow-x-auto">
              <div className="px-3 py-2 border-b border-admin-border font-mono text-[10px] uppercase tracking-[0.2em] text-admin-muted">
                สรุปตามหมวด
              </div>
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="text-left text-admin-muted border-b border-admin-border">
                    <th className="px-3 py-2 font-mono text-[10px] uppercase">หมวด</th>
                    <th className="px-3 py-2 font-mono text-[10px] uppercase">จำนวน</th>
                    <th className="px-3 py-2 font-mono text-[10px] uppercase">วิวช่วงนี้</th>
                    <th className="px-3 py-2 font-mono text-[10px] uppercase">เฉลี่ย</th>
                    <th className="px-3 py-2 font-mono text-[10px] uppercase">โอกาส</th>
                    <th className="px-3 py-2 font-mono text-[10px] uppercase">วิว 0</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.category_stats.map((c) => (
                    <tr key={c.category} className="border-b border-admin-border/50 last:border-0">
                      <td className="px-3 py-2 font-medium">{c.category}</td>
                      <td className="px-3 py-2 tabular-nums">{c.project_count}</td>
                      <td className="px-3 py-2 tabular-nums">{c.views_period}</td>
                      <td className="px-3 py-2 tabular-nums">{c.avg_views_period}</td>
                      <td className="px-3 py-2 tabular-nums">{c.opportunities_period}</td>
                      <td className="px-3 py-2 tabular-nums">{c.zero_views_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
