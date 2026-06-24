import * as React from "react";
import {
  Bot,
  ExternalLink,
  Loader2,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/StatCard";
import { useAdminAiMonitor } from "@/hooks/useAdminAiMonitor";

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

export function AiMonitorSection() {
  const { data, isLoading, isError, error, refetch, isFetching } = useAdminAiMonitor();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 space-y-3">
        <p className="text-sm font-medium text-destructive">โหลด AI Monitor ไม่สำเร็จ</p>
        <p className="text-xs text-muted-foreground">
          {error instanceof Error ? error.message : "unknown"} — ต้อง deploy edge function{" "}
          <code className="text-[10px]">admin-ai-monitor</code>
        </p>
        <Button size="sm" variant="outline" onClick={() => void refetch()}>
          ลองใหม่
        </Button>
      </div>
    );
  }

  const { gemini, summary, byFeature, topUsers, recentLedger, legacyGuestChat } = data;
  const geminiOk = gemini.configured && gemini.reachable;
  const modelUpdate = gemini.latestModelUpdate;
  const modelUpdateRecent =
    modelUpdate &&
    Date.now() - new Date(modelUpdate.at).getTime() < 30 * 86_400_000;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            AI Monitor
          </h2>
          <p className="text-sm text-muted-foreground">
            Ecosystem credits + ประมาณต้นทุน Gemini · อัปเดต {fmtWhen(data.generated_at)}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          รีเฟรช
        </Button>
      </div>

      <Card className={geminiOk ? "border-emerald-500/30" : "border-amber-500/40"}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            {geminiOk ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            )}
            Google Gemini API
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge variant={gemini.configured ? "default" : "destructive"}>
              Key {gemini.configured ? "ตั้งแล้ว" : "ยังไม่มี"}
            </Badge>
            <Badge variant={gemini.reachable ? "default" : "secondary"}>
              {gemini.reachable ? "เชื่อมต่อ OK" : "เชื่อมต่อไม่ได้"}
            </Badge>
            <Badge variant="outline">{gemini.modelFast}</Badge>
            <Badge variant="outline">{gemini.modelDefault}</Badge>
            <Badge variant="outline">{gemini.modelVision} · vision</Badge>
          </div>
          {modelUpdateRecent && modelUpdate && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1">
              <p className="text-xs font-medium text-primary flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                อัปเดต Gemini model ล่าสุด ({fmtWhen(modelUpdate.at)})
              </p>
              <ul className="text-[11px] text-muted-foreground space-y-0.5">
                {modelUpdate.changes.map((c) => (
                  <li key={`${c.slot}-${c.to}`}>
                    <span className="font-mono">{c.slot}</span>: {c.from} → {c.to}
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-muted-foreground">
                ดูรายละเอียดใน docs/gemini-models-changelog.md
              </p>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground">
            Model pins อัปเดตล่าสุด: {fmtWhen(gemini.modelsUpdatedAt)}
          </p>
          {gemini.error && (
            <p className="text-xs text-amber-700 dark:text-amber-400 font-mono">{gemini.error}</p>
          )}
          <p className="text-xs text-muted-foreground">{gemini.balanceNote}</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1">
              <a href={gemini.consoleLinks.aiStudio} target="_blank" rel="noopener noreferrer">
                AI Studio <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
            <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1">
              <a href={gemini.consoleLinks.cloudBilling} target="_blank" rel="noopener noreferrer">
                Cloud Billing <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
            <Button asChild size="sm" variant="ghost" className="h-8 text-xs gap-1">
              <a href={gemini.consoleLinks.pricing} target="_blank" rel="noopener noreferrer">
                ราคา API <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
          <div className="rounded-lg bg-muted/40 p-3 space-y-1.5">
            <p className="text-xs font-medium">Key นี้ใช้ที่ไหน</p>
            {gemini.keySurfaces.map((s) => (
              <p key={s.surface} className="text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">{s.surface}</span> ({s.env}) —{" "}
                {s.features}
              </p>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="ต้นทุนประมาณวันนี้"
          value={`${fmtThb(summary.estCostThbToday)} ฿`}
          sub={`${summary.creditsDebitedToday} เครดิตหัก`}
          icon={<Wallet className="h-4 w-4" />}
        />
        <StatCard
          label="7 วัน"
          value={`${fmtThb(summary.estCostThb7d)} ฿`}
          sub={`${summary.creditsDebited7d} เครดิต`}
          icon={<Sparkles className="h-4 w-4" />}
        />
        <StatCard
          label="30 วัน"
          value={`${fmtThb(summary.estCostThb30d)} ฿`}
          sub={`${summary.ledgerEvents30d} ครั้ง · ~${gemini.estThbPerCredit} ฿/credit`}
          icon={<Bot className="h-4 w-4" />}
        />
        <StatCard
          label="เครดิตซื้อคงเหลือ (user pool)"
          value={String(summary.purchasedBalanceRemaining)}
          sub={`ซื้อสะสม ${summary.lifetimeCreditsPurchased} · sub used ${summary.subscriptionIncludedUsed}`}
          icon={<Wallet className="h-4 w-4" />}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">ตามฟีเจอร์ (30 วัน)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {byFeature.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                ยังไม่มีการใช้งานใน ledger
              </p>
            ) : (
              byFeature.map((f) => (
                <div
                  key={f.feature}
                  className="flex items-center justify-between gap-2 text-sm border-b border-border/40 pb-2 last:border-0"
                >
                  <span className="truncate">{f.label}</span>
                  <span className="shrink-0 text-muted-foreground text-xs">
                    {f.count}× · {f.credits} cr · ~{fmtThb(f.estThb)} ฿
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top ผู้ใช้ (30 วัน)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">ยังไม่มีข้อมูล</p>
            ) : (
              topUsers.map((u, i) => (
                <div
                  key={u.user_id}
                  className="flex items-center justify-between gap-2 text-sm border-b border-border/40 pb-2 last:border-0"
                >
                  <div className="min-w-0">
                    <span className="text-muted-foreground">#{i + 1} </span>
                    <span className="font-medium truncate">
                      {u.display_name || u.email || u.user_id.slice(0, 8)}
                    </span>
                    <Badge variant="outline" className="ml-1 text-[10px] h-5">
                      {u.tier}
                    </Badge>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {u.credits} cr · ~{fmtThb(u.estThb)} ฿
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">ล่าสุดใน ledger</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {recentLedger.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">ยังไม่มีรายการ</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b">
                  <th className="text-left py-2 pr-2 font-medium">เวลา</th>
                  <th className="text-left py-2 pr-2 font-medium">ผู้ใช้</th>
                  <th className="text-left py-2 pr-2 font-medium">ฟีเจอร์</th>
                  <th className="text-right py-2 font-medium">เครดิต</th>
                </tr>
              </thead>
              <tbody>
                {recentLedger.map((row) => (
                  <tr key={row.id} className="border-b border-border/30">
                    <td className="py-1.5 pr-2 whitespace-nowrap text-muted-foreground">
                      {fmtWhen(row.created_at)}
                    </td>
                    <td className="py-1.5 pr-2 max-w-[140px] truncate">
                      {row.display_name || row.email || row.user_id.slice(0, 8)}
                    </td>
                    <td className="py-1.5 pr-2">{row.label}</td>
                    <td className="py-1.5 text-right font-mono">{row.cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground">
        Landing mentor (guest): วันนี้ {legacyGuestChat.messagesToday} · 7 วัน{" "}
        {legacyGuestChat.messages7d} — {legacyGuestChat.note}
      </p>
    </div>
  );
}
