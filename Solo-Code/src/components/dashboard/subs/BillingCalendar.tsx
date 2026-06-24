import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  CalendarClock,
  AlertCircle,
  FileText,
} from "lucide-react";
import { formatTHB, type PaymentMethod, type Subscription } from "@/data/mockData";
import { useClientInvoices, type ClientInvoice } from "@/store/clientInvoices";

export function BillingCalendar({
  subs,
  paymentMethods,
}: {
  subs: Subscription[];
  paymentMethods: PaymentMethod[];
}) {
  const { list: invoices } = useClientInvoices();

  const billingDays = React.useMemo(() => new Set(subs.map((s) => s.billingDay)), [subs]);

  const statementByDay = React.useMemo(() => {
    const map = new Map<number, PaymentMethod[]>();
    for (const m of paymentMethods) {
      if (m.statementDay) {
        const arr = map.get(m.statementDay) ?? [];
        arr.push(m);
        map.set(m.statementDay, arr);
      }
    }
    return map;
  }, [paymentMethods]);
  const dueByDay = React.useMemo(() => {
    const map = new Map<number, PaymentMethod[]>();
    for (const m of paymentMethods) {
      if (m.dueDay) {
        const arr = map.get(m.dueDay) ?? [];
        arr.push(m);
        map.set(m.dueDay, arr);
      }
    }
    return map;
  }, [paymentMethods]);

  const today = new Date();
  const [cursor, setCursor] = React.useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const cursorYear = cursor.getFullYear();
  const cursorMonth = cursor.getMonth();
  const daysInMonth = new Date(cursorYear, cursorMonth + 1, 0).getDate();
  const firstWeekday = (new Date(cursorYear, cursorMonth, 1).getDay() + 6) % 7;
  const monthLabel = cursor.toLocaleDateString("th-TH", { month: "long", year: "numeric" });
  const isCurrentMonth = cursorYear === today.getFullYear() && cursorMonth === today.getMonth();

  const invoicesByDay = React.useMemo(() => {
    const map = new Map<number, ClientInvoice[]>();
    for (const inv of invoices) {
      if (!inv.dueDate || inv.status === "paid") continue;
      const d = new Date(inv.dueDate + "T00:00:00");
      if (d.getFullYear() === cursorYear && d.getMonth() === cursorMonth) {
        const day = d.getDate();
        const arr = map.get(day) ?? [];
        arr.push(inv);
        map.set(day, arr);
      }
    }
    return map;
  }, [invoices, cursorYear, cursorMonth]);

  return (
    <Card className="animate-fade-up">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" /> ปฏิทินตัดบิล
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            onClick={() => setCursor(new Date(cursorYear, cursorMonth - 1, 1))}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs font-medium min-w-[110px] text-center">{monthLabel}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            onClick={() => setCursor(new Date(cursorYear, cursorMonth + 1, 1))}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          {!isCurrentMonth && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 rounded-lg text-[10px] px-2"
              onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
            >
              วันนี้
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground mb-2 px-1">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Subscription
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> ตัดรอบบัตร
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive" /> วันสุดท้ายจ่าย
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> ใบแจ้งหนี้ลูกค้า
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map((d) => (
            <div key={d} className="text-[10px] font-medium text-muted-foreground py-1">
              {d}
            </div>
          ))}
          {Array.from({ length: firstWeekday }).map((_, i) => (
            <div key={`blank-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const has = billingDays.has(day);
            const todays = subs.filter((s) => s.billingDay === day);
            const dayTotal = todays.reduce((sum, t) => sum + t.amount, 0);
            const stmts = statementByDay.get(day) ?? [];
            const dues = dueByDay.get(day) ?? [];
            const invs = invoicesByDay.get(day) ?? [];
            const hasAny = has || stmts.length > 0 || dues.length > 0 || invs.length > 0;
            const isToday = isCurrentMonth && day === today.getDate();
            const cell = (
              <button
                type="button"
                disabled={!hasAny}
                className={`relative aspect-square w-full rounded-lg flex items-center justify-center text-xs num transition-all ${
                  hasAny
                    ? "bg-primary-soft/60 text-primary font-semibold hover:bg-primary hover:text-primary-foreground hover:scale-105 cursor-pointer"
                    : "text-muted-foreground cursor-default"
                } ${isToday ? "ring-2 ring-primary ring-offset-1" : ""}`}
              >
                {day}
                {hasAny && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {has && <span className="h-1 w-1 rounded-full bg-primary" />}
                    {stmts.length > 0 && <span className="h-1 w-1 rounded-full bg-blue-500" />}
                    {dues.length > 0 && <span className="h-1 w-1 rounded-full bg-destructive" />}
                    {invs.length > 0 && <span className="h-1 w-1 rounded-full bg-amber-500" />}
                  </span>
                )}
              </button>
            );
            if (!hasAny) return <div key={day}>{cell}</div>;
            return (
              <Popover key={day}>
                <PopoverTrigger asChild>{cell}</PopoverTrigger>
                <PopoverContent className="w-72 p-3" align="center">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b">
                    <p className="text-sm font-semibold">
                      วันที่ {day} {monthLabel}
                    </p>
                    {dayTotal > 0 && (
                      <p className="text-xs text-muted-foreground num">฿{formatTHB(dayTotal)}</p>
                    )}
                  </div>
                  <div className="space-y-2.5 max-h-72 overflow-auto">
                    {todays.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
                          Subscriptions
                        </p>
                        <div className="space-y-1">
                          {todays.map((t) => {
                            const Icon = t.icon;
                            return (
                              <div
                                key={t.id}
                                className="flex items-center gap-2 rounded-md p-1.5 hover:bg-muted/50"
                              >
                                <div className="rounded-md bg-primary-soft p-1.5 text-primary">
                                  <Icon className="h-3.5 w-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">{t.name}</p>
                                  <p className="text-[10px] text-muted-foreground">{t.category}</p>
                                </div>
                                <p className="num text-xs font-semibold">฿{formatTHB(t.amount)}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {stmts.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-blue-600 mb-1 uppercase tracking-wide flex items-center gap-1">
                          <CalendarClock className="h-3 w-3" /> ตัดรอบบัตร
                        </p>
                        <div className="space-y-1">
                          {stmts.map((m) => (
                            <div
                              key={m.id}
                              className="flex items-center gap-2 rounded-md p-1.5 bg-blue-500/5"
                            >
                              <div className="rounded-md bg-blue-500/15 p-1.5 text-blue-600">
                                <CreditCard className="h-3.5 w-3.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{m.label}</p>
                                <p className="text-[10px] text-muted-foreground num">••{m.last4}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {dues.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-destructive mb-1 uppercase tracking-wide flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> วันสุดท้ายต้องจ่าย
                        </p>
                        <div className="space-y-1">
                          {dues.map((m) => (
                            <div
                              key={m.id}
                              className="flex items-center gap-2 rounded-md p-1.5 bg-destructive/5"
                            >
                              <div className="rounded-md bg-destructive/15 p-1.5 text-destructive">
                                <CreditCard className="h-3.5 w-3.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{m.label}</p>
                                <p className="text-[10px] text-muted-foreground num">••{m.last4}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        {invs.length > 0 && (
                          <div>
                            <p className="text-[10px] font-semibold text-amber-600 mb-1 uppercase tracking-wide flex items-center gap-1">
                              <FileText className="h-3 w-3" /> ใบแจ้งหนี้ลูกค้า
                            </p>
                            <div className="space-y-1">
                              {invs.map((inv) => (
                                <div
                                  key={inv.id}
                                  className="flex items-center gap-2 rounded-md p-1.5 bg-amber-500/5"
                                >
                                  <div className="rounded-md bg-amber-500/15 p-1.5 text-amber-600">
                                    <FileText className="h-3.5 w-3.5" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{inv.name}</p>
                                    {inv.project && (
                                      <p className="text-[10px] text-muted-foreground truncate">
                                        {inv.project}
                                      </p>
                                    )}
                                  </div>
                                  <p className="num text-xs font-semibold">
                                    ฿{formatTHB(inv.amount)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
