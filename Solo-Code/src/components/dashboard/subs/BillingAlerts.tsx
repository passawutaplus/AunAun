import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  AlertTriangle,
  CalendarClock,
  Receipt,
  CreditCard,
  CheckCircle2,
} from "lucide-react";
import { formatTHB, type PaymentMethod, type Subscription } from "@/data/mockData";
import { useClientInvoices, type ClientInvoice } from "@/store/clientInvoices";

interface UpcomingItem {
  key: string;
  kind: "subscription" | "card" | "invoice";
  label: string;
  sub?: string;
  amount?: number;
  daysLeft: number; // negative = overdue
  date: Date;
}

function daysBetween(a: Date, b: Date) {
  const ms = a.setHours(0, 0, 0, 0) - b.setHours(0, 0, 0, 0);
  return Math.round(ms / 86400000);
}

function nextOccurrence(day: number, today: Date): Date {
  const candidate = new Date(today.getFullYear(), today.getMonth(), day);
  if (candidate < today) candidate.setMonth(candidate.getMonth() + 1);
  return candidate;
}

export function BillingAlerts({
  subs,
  paymentMethods,
  compact = false,
}: {
  subs: Subscription[];
  paymentMethods: PaymentMethod[];
  compact?: boolean;
}) {
  const { list: invoices } = useClientInvoices();

  const items = React.useMemo<UpcomingItem[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const out: UpcomingItem[] = [];

    for (const s of subs) {
      if ((s.status ?? "active") !== "active") continue;
      const date = nextOccurrence(s.billingDay, new Date(today));
      out.push({
        key: `sub-${s.id}`,
        kind: "subscription",
        label: s.name,
        sub: s.category,
        amount: s.amount,
        daysLeft: daysBetween(new Date(date), new Date(today)),
        date,
      });
    }

    for (const m of paymentMethods) {
      if (!m.dueDay) continue;
      const date = nextOccurrence(m.dueDay, new Date(today));
      out.push({
        key: `pm-${m.id}`,
        kind: "card",
        label: m.label,
        sub: m.last4 ? `••${m.last4}` : undefined,
        daysLeft: daysBetween(new Date(date), new Date(today)),
        date,
      });
    }

    for (const inv of invoices) {
      if (inv.status === "paid") continue;
      if (!inv.dueDate) continue;
      const date = new Date(inv.dueDate + "T00:00:00");
      out.push({
        key: `inv-${inv.id}`,
        kind: "invoice",
        label: inv.name,
        sub: inv.project,
        amount: inv.amount,
        daysLeft: daysBetween(new Date(date), new Date(today)),
        date,
      });
    }

    return out;
  }, [subs, paymentMethods, invoices]);

  const upcoming = items
    .filter((i) => i.daysLeft >= 0 && i.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft);
  const overdueInvoices = invoices.filter((i) => i.status === "late7" || i.status === "late30");
  const overdue = items.filter((i) => i.daysLeft < 0).sort((a, b) => a.daysLeft - b.daysLeft);

  const isEmpty = upcoming.length === 0 && overdue.length === 0 && overdueInvoices.length === 0;
  const nextBill = items
    .filter((i) => i.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)[0];

  if (isEmpty) {
    if (compact) {
      const nextLabel = nextBill
        ? `${nextBill.label}${
            nextBill.daysLeft === 0
              ? " · วันนี้"
              : nextBill.daysLeft === 1
                ? " · พรุ่งนี้"
                : ` · อีก ${nextBill.daysLeft} วัน`
          }`
        : null;
      return (
        <Card className="animate-fade-up border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-card to-card h-full">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  แจ้งเตือนบิล
                </p>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  สบายใจได้
                </p>
                <p className="text-xs text-muted-foreground">ไม่มีบิลครบภายใน 7 วัน</p>
                {nextLabel && (
                  <p className="text-xs text-muted-foreground truncate">ถัดไป: {nextLabel}</p>
                )}
              </div>
              <div className="rounded-xl bg-emerald-500/15 p-2.5 text-emerald-600 shrink-0">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="animate-fade-up border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-card to-card h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-emerald-600" /> แจ้งเตือนบิล
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                ไม่มีบิลใกล้ครบกำหนด — สบายใจได้
              </p>
              <p className="text-muted-foreground">
                ไม่มี subscription, บัตร หรือใบแจ้งหนี้ที่ครบภายใน 7 วัน
              </p>
              {nextBill && (
                <p className="text-muted-foreground pt-0.5">
                  บิลถัดไป:{" "}
                  <span className="font-medium text-foreground">{nextBill.label}</span>
                  {nextBill.daysLeft === 0
                    ? " วันนี้"
                    : nextBill.daysLeft === 1
                      ? " พรุ่งนี้"
                      : ` อีก ${nextBill.daysLeft} วัน`}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const alertCount = upcoming.length + overdue.length + overdueInvoices.length;

  if (compact) {
    const preview = [
      ...overdueInvoices.map((inv) => ({ key: `ov-${inv.id}`, kind: "overdue-inv" as const, inv })),
      ...overdue.map((it) => ({ key: it.key, kind: "overdue" as const, item: it })),
      ...upcoming.map((it) => ({ key: it.key, kind: "upcoming" as const, item: it })),
    ].slice(0, 3);
    const more = alertCount - preview.length;

    return (
      <Card className="animate-fade-up border-primary/30 h-full">
        <CardContent className="p-5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              แจ้งเตือนบิล
            </p>
            <Badge variant="secondary" className="text-[10px] rounded-full shrink-0">
              {alertCount}
            </Badge>
          </div>
          <div className="space-y-1.5 max-h-[88px] overflow-y-auto">
            {preview.map((row) => {
              if (row.kind === "overdue-inv") {
                return <OverdueInvoiceRow key={row.key} inv={row.inv} />;
              }
              return (
                <AlertRow
                  key={row.key}
                  item={row.item}
                  overdue={row.kind === "overdue"}
                />
              );
            })}
          </div>
          {more > 0 && (
            <p className="text-[10px] text-muted-foreground">+ อีก {more} รายการ</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-up border-primary/30 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" /> แจ้งเตือนบิล
          <Badge variant="secondary" className="text-[10px] rounded-full">
            {alertCount}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcoming.length > 0 && (
          <section>
            <p className="text-[11px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide flex items-center gap-1">
              <CalendarClock className="h-3 w-3" /> ใกล้ครบกำหนด (7 วัน)
            </p>
            <div className="space-y-1.5">
              {upcoming.map((it) => (
                <AlertRow key={it.key} item={it} />
              ))}
            </div>
          </section>
        )}

        {(overdue.length > 0 || overdueInvoices.length > 0) && (
          <section>
            <p className="text-[11px] font-semibold text-destructive mb-1.5 uppercase tracking-wide flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> ค้างชำระ / เลยกำหนด
            </p>
            <div className="space-y-1.5">
              {overdueInvoices.map((inv) => (
                <OverdueInvoiceRow key={`ov-${inv.id}`} inv={inv} />
              ))}
              {overdue.map((it) => (
                <AlertRow key={it.key} item={it} overdue />
              ))}
            </div>
          </section>
        )}
      </CardContent>
    </Card>
  );
}

function iconFor(kind: UpcomingItem["kind"]) {
  if (kind === "subscription") return Receipt;
  if (kind === "card") return CreditCard;
  return Bell;
}

function AlertRow({ item, overdue }: { item: UpcomingItem; overdue?: boolean }) {
  const Icon = iconFor(item.kind);
  const label = overdue
    ? `เลย ${Math.abs(item.daysLeft)} วัน`
    : item.daysLeft === 0
      ? "วันนี้"
      : item.daysLeft === 1
        ? "พรุ่งนี้"
        : `อีก ${item.daysLeft} วัน`;
  return (
    <div
      className={`flex items-center gap-2 rounded-md p-1.5 text-xs ${overdue ? "bg-destructive/5" : "bg-muted/40"}`}
    >
      <div
        className={`rounded-md p-1.5 ${overdue ? "bg-destructive/15 text-destructive" : "bg-primary-soft text-primary"}`}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{item.label}</p>
        {item.sub && <p className="text-[10px] text-muted-foreground truncate">{item.sub}</p>}
      </div>
      <div className="text-right shrink-0">
        {item.amount !== undefined && item.amount > 0 && (
          <p className="num text-xs font-semibold">฿{formatTHB(item.amount)}</p>
        )}
        <p
          className={`text-[10px] ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}
        >
          {label}
        </p>
      </div>
    </div>
  );
}

function OverdueInvoiceRow({ inv }: { inv: ClientInvoice }) {
  return (
    <div className="flex items-center gap-2 rounded-md p-1.5 text-xs bg-destructive/5">
      <div className="rounded-md p-1.5 bg-destructive/15 text-destructive">
        <AlertTriangle className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{inv.name}</p>
        {inv.project && <p className="text-[10px] text-muted-foreground truncate">{inv.project}</p>}
      </div>
      <div className="text-right shrink-0">
        <p className="num text-xs font-semibold">฿{formatTHB(inv.amount)}</p>
        <p className="text-[10px] text-destructive font-medium">
          {inv.status === "late30" ? "เลท 1 เดือน" : "เลท 7 วัน"}
        </p>
      </div>
    </div>
  );
}
