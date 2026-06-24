import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Send, TrendingUp } from "lucide-react";
import { useQuotations, computeTotals, type Quotation } from "@/store/quotations";
import {
  isOverdue,
  daysOverdue,
  outstandingAmount,
  FollowUpDialog,
} from "./quotations/FollowUpDialog";

export function DebtWidget({ onGo }: { onGo: (tab: string, sub?: string) => void }) {
  const { list } = useQuotations();
  const [followup, setFollowup] = React.useState<Quotation | null>(null);

  const overdue = React.useMemo(
    () => list.filter(isOverdue).sort((a, b) => daysOverdue(b) - daysOverdue(a)),
    [list],
  );
  const pending = list.filter(
    (q) => q.status === "pending_payment" || q.status === "pending_receipt",
  );
  const totalReceivable = pending.reduce((s, q) => s + outstandingAmount(q), 0);
  const totalOverdue = overdue.reduce((s, q) => s + outstandingAmount(q), 0);
  const totalPaid = list
    .filter((q) => q.status === "completed")
    .reduce((s, q) => s + computeTotals(q).grandTotal, 0);

  const total = totalPaid + totalReceivable;
  const paidPct = total > 0 ? (totalPaid / total) * 100 : 0;
  const overduePct = total > 0 ? (totalOverdue / total) * 100 : 0;
  const waitPct = Math.max(0, 100 - paidPct - overduePct);

  const fmt = (n: number) => new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(n);

  return (
    <>
      <Card className="border-border/60 shadow-card overflow-hidden h-full flex flex-col">
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle
              className={`h-4 w-4 ${overdue.length > 0 ? "text-destructive" : "text-muted-foreground"}`}
            />
            สถานะการเก็บเงิน
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onGo("finance", "quotations")}
            className="h-7 text-xs"
          >
            ดูใบเสนอราคา
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 flex-1">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="รวมรอเก็บ" value={`฿${fmt(totalReceivable)}`} tone="text-foreground" />
            <Stat
              label="เกินกำหนด"
              value={`฿${fmt(totalOverdue)}`}
              tone={totalOverdue > 0 ? "text-destructive" : "text-muted-foreground"}
            />
            <Stat label="ได้รับแล้ว" value={`฿${fmt(totalPaid)}`} tone="text-success" />
          </div>

          {/* Pie/segmented bar */}
          {total > 0 && (
            <div>
              <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                <div className="bg-success transition-all" style={{ width: `${paidPct}%` }} />
                <div className="bg-amber-400 transition-all" style={{ width: `${waitPct}%` }} />
                <div
                  className="bg-destructive transition-all"
                  style={{ width: `${overduePct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1.5">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  ได้รับ {Math.round(paidPct)}%
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  รอ {Math.round(waitPct)}%
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-destructive" />
                  เกิน {Math.round(overduePct)}%
                </span>
              </div>
            </div>
          )}

          {overdue.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4 flex items-center justify-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-success" />
              ไม่มีใบแจ้งหนี้เกินกำหนด — เยี่ยมมาก!
            </p>
          ) : (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                เกินกำหนด ({overdue.length})
              </p>
              {overdue.slice(0, 4).map((q) => (
                <div
                  key={q.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">
                      {q.invoiceNumber ?? q.number} — {q.clientName}
                    </p>
                    <p className="text-[10px] text-destructive font-semibold">
                      เกิน {daysOverdue(q)} วัน · ฿{fmt(outstandingAmount(q))}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                    onClick={() => setFollowup(q)}
                  >
                    <Send className="h-3 w-3" />
                    ทวง
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <FollowUpDialog q={followup} open={!!followup} onClose={() => setFollowup(null)} />
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-lg border border-border/40 p-2.5 bg-card/60">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-sm font-bold num mt-0.5 ${tone}`}>{value}</p>
    </div>
  );
}
