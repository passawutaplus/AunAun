import { useMemo, useState } from "react";
import { useAdDailyStats, type AdCampaign } from "@/hooks/useAds";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  campaigns: AdCampaign[];
}

/**
 * Per-campaign daily impressions / clicks chart with auto-refresh (30s) via useAdDailyStats.
 * Lets the admin pick a campaign and see CTR trend over the last 14 days.
 */
export default function AdStatsPanel({ campaigns }: Props) {
  const eligible = useMemo(
    () => campaigns.filter((c) => c.status === "active" || c.status === "paused" || c.impressions > 0),
    [campaigns]
  );
  const [adId, setAdId] = useState<string | undefined>(() => eligible[0]?.id);
  const { data: rows = [], isLoading } = useAdDailyStats(adId, 14);

  const active = campaigns.find((c) => c.id === adId);

  const totals = useMemo(() => {
    const imp = rows.reduce((s, r) => s + r.impressions, 0);
    const clk = rows.reduce((s, r) => s + r.clicks, 0);
    const ctr = imp > 0 ? ((clk / imp) * 100).toFixed(2) + "%" : "—";
    return { imp, clk, ctr };
  }, [rows]);

  const chartRows = rows.map((r) => ({
    ...r,
    label: new Date(r.day).toLocaleDateString("th-TH", { month: "short", day: "numeric" }),
    ctr: r.impressions > 0 ? Number(((r.clicks / r.impressions) * 100).toFixed(2)) : 0,
  }));

  if (eligible.length === 0) {
    return (
      <div className="border border-admin-border bg-admin-surface rounded-sm p-6 text-sm text-admin-muted">
        ยังไม่มีแคมเปญที่มีข้อมูลให้แสดงสถิติ
      </div>
    );
  }

  return (
    <div className="border border-admin-border bg-admin-surface rounded-sm p-4 md:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-admin-muted">Campaign trend (14d)</p>
          <p className="font-medium text-admin-fg mt-0.5 truncate max-w-[480px]">{active?.title ?? "—"}</p>
        </div>
        <Select value={adId} onValueChange={setAdId}>
          <SelectTrigger className="w-[260px]"><SelectValue placeholder="เลือกแคมเปญ" /></SelectTrigger>
          <SelectContent>
            {eligible.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title} <span className="text-muted-foreground">· {c.status}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-sm border border-admin-border p-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-admin-muted">Impressions</p>
          <p className="text-xl font-semibold text-admin-fg tabular-nums mt-1">{totals.imp.toLocaleString()}</p>
        </div>
        <div className="rounded-sm border border-admin-border p-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-admin-muted">Clicks</p>
          <p className="text-xl font-semibold text-admin-fg tabular-nums mt-1">{totals.clk.toLocaleString()}</p>
        </div>
        <div className="rounded-sm border border-admin-accent/40 bg-admin-accent/5 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-admin-accent">CTR</p>
          <p className="text-xl font-semibold text-admin-fg tabular-nums mt-1">{totals.ctr}</p>
        </div>
      </div>

      <div className="h-[260px]">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-admin-muted text-sm">กำลังโหลด...</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartRows} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="hsl(var(--primary))" />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  fontSize: 12,
                  borderRadius: 4,
                }}
              />
              <Line yAxisId="left" type="monotone" dataKey="impressions" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />
              <Line yAxisId="left" type="monotone" dataKey="clicks" stroke="hsl(var(--foreground))" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="ctr" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="CTR %" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <p className="text-[11px] font-mono uppercase tracking-wider text-admin-muted">
        Auto-refresh every 30s · realtime invalidation on new events
      </p>
    </div>
  );
}
