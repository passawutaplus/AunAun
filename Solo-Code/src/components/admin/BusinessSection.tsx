import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/StatCard";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Wallet, FileText, Receipt, TrendingUp } from "lucide-react";
import { type AdminMetrics, fmtTHB } from "./useAdminMetrics";

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  draft: { label: "ร่าง", cls: "bg-muted text-muted-foreground" },
  sent: { label: "ส่งแล้ว", cls: "bg-primary/15 text-primary" },
  pending_payment: { label: "รอชำระ", cls: "bg-amber-500/15 text-amber-700" },
  pending_receipt: { label: "รอใบเสร็จ", cls: "bg-blue-500/15 text-blue-700" },
  completed: { label: "เสร็จสิ้น", cls: "bg-emerald-500/15 text-emerald-700" },
  cancelled: { label: "ยกเลิก", cls: "bg-rose-500/15 text-rose-700" },
};

export function BusinessSection({ m }: { m: AdminMetrics }) {
  const totalGross = m.incomes.reduce((s, r) => s + Number(r.gross || 0), 0);
  const totalNet = m.incomes.reduce((s, r) => s + Number(r.net || 0), 0);
  const avgInvoice = m.incomes.length ? totalGross / m.incomes.length : 0;

  const byStatus = React.useMemo(() => {
    const map = new Map<string, number>();
    m.quotations.forEach((q) => map.set(q.status, (map.get(q.status) ?? 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [m.quotations]);

  const topUsers = React.useMemo(() => {
    const map = new Map<string, number>();
    m.incomes.forEach((i) => map.set(i.user_id, (map.get(i.user_id) ?? 0) + Number(i.gross || 0)));
    return Array.from(map.entries())
      .map(([uid, gross]) => {
        const p = m.profiles.find((x) => x.user_id === uid);
        return {
          uid,
          gross,
          email: p?.email ?? "—",
          brand: p?.brand_name ?? p?.display_name ?? "—",
        };
      })
      .sort((a, b) => b.gross - a.gross)
      .slice(0, 10);
  }, [m.incomes, m.profiles]);

  const recentQuotes = m.quotations.slice(0, 12);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Business KPIs</h2>
        <p className="text-xs text-muted-foreground">
          รายได้, ใบเสนอราคา และผู้ใช้ที่ใช้งานมากที่สุด
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="รายได้รวม (Gross)"
          value={`฿${fmtTHB(totalGross)}`}
          sub={`${m.incomes.length} รายการ`}
          icon={<Wallet className="h-4 w-4" />}
          accent
        />
        <StatCard
          label="รายได้สุทธิ"
          value={`฿${fmtTHB(totalNet)}`}
          sub="หลังหัก ภาษี/ค่าธรรมเนียม"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          label="ค่าเฉลี่ย/ใบ"
          value={`฿${fmtTHB(avgInvoice)}`}
          sub={`เฉลี่ยจาก ${m.incomes.length} ใบ`}
          icon={<Receipt className="h-4 w-4" />}
        />
        <StatCard
          label="ใบเสนอราคา"
          value={m.quotations.length}
          sub={`${byStatus.find((s) => s[0] === "completed")?.[1] ?? 0} เสร็จแล้ว`}
          icon={<FileText className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">สถานะใบเสนอ</h3>
            <div className="space-y-2">
              {byStatus.length === 0 ? (
                <p className="text-xs text-muted-foreground">ยังไม่มีข้อมูล</p>
              ) : (
                byStatus.map(([s, n]) => {
                  const meta = STATUS_LABEL[s] ?? {
                    label: s,
                    cls: "bg-muted text-muted-foreground",
                  };
                  const pct = m.quotations.length ? (n / m.quotations.length) * 100 : 0;
                  return (
                    <div key={s} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <Badge className={`${meta.cls} text-[10px]`} variant="secondary">
                          {meta.label}
                        </Badge>
                        <span className="num font-medium">{n}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border lg:col-span-2">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Top 10 ผู้ใช้ตามรายได้</h3>
            <div className="rounded-lg border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-10">#</TableHead>
                    <TableHead className="text-xs">แบรนด์ / อีเมล</TableHead>
                    <TableHead className="text-xs text-right">รายได้รวม</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topUsers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center text-xs text-muted-foreground py-6"
                      >
                        ยังไม่มีรายได้ในระบบ
                      </TableCell>
                    </TableRow>
                  ) : (
                    topUsers.map((u, i) => (
                      <TableRow key={u.uid}>
                        <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="text-xs">
                          <div className="font-medium">{u.brand}</div>
                          <div className="text-[10px] text-muted-foreground">{u.email}</div>
                        </TableCell>
                        <TableCell className="text-xs text-right num font-semibold">
                          ฿{fmtTHB(u.gross)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">ใบเสนอราคาล่าสุด</h3>
          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">เลขที่</TableHead>
                  <TableHead className="text-xs">ลูกค้า / โปรเจกต์</TableHead>
                  <TableHead className="text-xs">สถานะ</TableHead>
                  <TableHead className="text-xs">สร้าง</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentQuotes.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-xs text-muted-foreground py-6"
                    >
                      ยังไม่มีใบเสนอ
                    </TableCell>
                  </TableRow>
                ) : (
                  recentQuotes.map((q) => {
                    const meta = STATUS_LABEL[q.status] ?? { label: q.status, cls: "bg-muted" };
                    return (
                      <TableRow key={q.id}>
                        <TableCell className="text-xs font-mono">{q.number}</TableCell>
                        <TableCell className="text-xs">
                          <div className="font-medium">{q.client_name || "—"}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {q.project_name || "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${meta.cls} text-[10px]`} variant="secondary">
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(q.created_at).toLocaleDateString("th-TH", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
