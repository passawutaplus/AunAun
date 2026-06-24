import SectionHeader from "@/components/admin/SectionHeader";
import KpiCard from "@/components/admin/KpiCard";
import { useAdminAiMonitor } from "@/hooks/admin/useAdminAiMonitor";
import { Bot, ExternalLink, Loader2, RefreshCw, AlertTriangle, CheckCircle2, Wallet, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

function fmtThb(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default function AdminAiMonitorPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useAdminAiMonitor();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-admin-muted" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div>
        <SectionHeader eyebrow="ai" title="AI Monitor" description="โหลดไม่สำเร็จ" />
        <div className="border border-red-500/30 bg-red-500/5 p-4 rounded-sm text-sm">
          {error instanceof Error ? error.message : "unknown"} — deploy{" "}
          <code className="text-xs">admin-ai-monitor</code>
        </div>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => void refetch()}>
          ลองใหม่
        </Button>
      </div>
    );
  }

  const { gemini, summary, byFeature, topUsers, recentLedger, legacyGuestChat } = data;
  const geminiOk = gemini.configured && gemini.reachable;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionHeader
          eyebrow="ai"
          title="AI Monitor"
          description={`Ecosystem credits + Gemini · ${fmtWhen(data.generated_at)}`}
        />
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 border-admin-border"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          รีเฟรช
        </Button>
      </div>

      <div
        className={`border rounded-sm p-4 space-y-3 ${
          geminiOk ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"
        }`}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-admin-fg">
          {geminiOk ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          )}
          Google Gemini API
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-mono">
          <span className="px-2 py-0.5 rounded bg-admin-hover">
            Key {gemini.configured ? "OK" : "MISSING"}
          </span>
          <span className="px-2 py-0.5 rounded bg-admin-hover">
            {gemini.reachable ? "REACHABLE" : "FAIL"}
          </span>
          <span className="px-2 py-0.5 rounded bg-admin-hover">{gemini.modelFast}</span>
        </div>
        {gemini.error && <p className="text-xs font-mono text-amber-700">{gemini.error}</p>}
        <p className="text-xs text-admin-muted">{gemini.balanceNote}</p>
        <div className="flex flex-wrap gap-2">
          <a
            href={gemini.consoleLinks.aiStudio}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-admin-accent hover:underline"
          >
            AI Studio <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href={gemini.consoleLinks.cloudBilling}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-admin-accent hover:underline"
          >
            Cloud Billing <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="text-[11px] text-admin-muted space-y-1 border-t border-admin-border pt-3">
          {gemini.keySurfaces.map((s) => (
            <p key={s.surface}>
              <span className="text-admin-fg">{s.surface}</span> — {s.features}
            </p>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="ต้นทุนวันนี้" value={`${fmtThb(summary.estCostThbToday)} ฿`} icon={Wallet} />
        <KpiCard label="7 วัน" value={`${fmtThb(summary.estCostThb7d)} ฿`} icon={Sparkles} />
        <KpiCard label="30 วัน" value={`${fmtThb(summary.estCostThb30d)} ฿`} icon={Bot} />
        <KpiCard
          label="เครดิตซื้อคงเหลือ"
          value={String(summary.purchasedBalanceRemaining)}
          icon={Wallet}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="border border-admin-border bg-admin-surface rounded-sm p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-admin-muted mb-3">ตามฟีเจอร์</p>
          {byFeature.length === 0 ? (
            <p className="text-sm text-admin-muted">ยังไม่มีข้อมูล</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {byFeature.map((f) => (
                <li key={f.feature} className="flex justify-between gap-2 border-b border-admin-border/50 pb-2">
                  <span className="truncate">{f.label}</span>
                  <span className="shrink-0 text-xs text-admin-muted font-mono">
                    {f.credits}cr ~{fmtThb(f.estThb)}฿
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border border-admin-border bg-admin-surface rounded-sm p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-admin-muted mb-3">Top ผู้ใช้</p>
          {topUsers.length === 0 ? (
            <p className="text-sm text-admin-muted">ยังไม่มีข้อมูล</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {topUsers.map((u, i) => (
                <li key={u.user_id} className="flex justify-between gap-2 border-b border-admin-border/50 pb-2">
                  <span className="truncate">
                    #{i + 1} {u.display_name || u.email || u.user_id.slice(0, 8)}{" "}
                    <span className="text-[10px] text-admin-muted">{u.tier}</span>
                  </span>
                  <span className="shrink-0 text-xs font-mono text-admin-muted">{u.credits} cr</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="border border-admin-border bg-admin-surface rounded-sm overflow-x-auto">
        <p className="font-mono text-[10px] uppercase tracking-widest text-admin-muted p-4 pb-2">Ledger ล่าสุด</p>
        {recentLedger.length === 0 ? (
          <p className="text-sm text-admin-muted px-4 pb-4">ยังไม่มีรายการ</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-admin-muted border-t border-admin-border">
                <th className="text-left p-2 font-mono">เวลา</th>
                <th className="text-left p-2 font-mono">ผู้ใช้</th>
                <th className="text-left p-2 font-mono">ฟีเจอร์</th>
                <th className="text-right p-2 font-mono">cr</th>
              </tr>
            </thead>
            <tbody>
              {recentLedger.map((row) => (
                <tr key={row.id} className="border-t border-admin-border/50">
                  <td className="p-2 text-admin-muted whitespace-nowrap">{fmtWhen(row.created_at)}</td>
                  <td className="p-2 max-w-[120px] truncate">
                    {row.display_name || row.email || row.user_id.slice(0, 8)}
                  </td>
                  <td className="p-2">{row.label}</td>
                  <td className="p-2 text-right font-mono">{row.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-[11px] text-admin-muted font-mono">
        guest chat: today={legacyGuestChat.messagesToday} · 7d={legacyGuestChat.messages7d}
      </p>
    </div>
  );
}
