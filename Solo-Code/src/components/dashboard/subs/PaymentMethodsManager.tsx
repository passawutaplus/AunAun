import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Pencil, Trash2, CalendarClock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useFinance } from "@/store/finance";
import { formatTHB, type PaymentMethod } from "@/data/mockData";
import { PaymentMethodFormDialog } from "./PaymentMethodFormDialog";

export function PaymentMethodsManager() {
  const { subs, paymentMethods, setPaymentMethods, setSubs } = useFinance();

  const data = paymentMethods.map((p) => {
    const items = subs.filter((s) => s.paymentMethodId === p.id);
    const total = items.reduce((a, b) => a + b.amount, 0);
    return { ...p, items, total };
  });

  function updateMethod(m: PaymentMethod) {
    setPaymentMethods((arr) => arr.map((x) => (x.id === m.id ? m : x)));
    toast.success("บันทึกการแก้ไขแล้ว");
  }

  function removeMethod(id: string, label: string) {
    const used = subs.some((s) => s.paymentMethodId === id);
    if (used) {
      toast.error("ช่องทางนี้ถูกใช้กับ subscription อยู่ — ย้าย/ลบก่อน");
      return;
    }
    setPaymentMethods((arr) => arr.filter((x) => x.id !== id));
    setSubs((arr) => arr.filter((s) => s.paymentMethodId !== id));
    toast.success(`ลบ ${label} แล้ว`);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.map((m) => {
          const Icon = m.icon;
          return (
            <Card
              key={m.id}
              className="animate-fade-up overflow-hidden border-0 shadow-elevated group"
            >
              <div className="bg-gradient-primary glow-edge p-5 text-primary-foreground relative overflow-hidden">
                <div
                  className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full blur-3xl opacity-60"
                  style={{ background: "oklch(0.92 0.12 70 / 0.7)" }}
                  aria-hidden="true"
                />
                <div
                  className="pointer-events-none absolute -bottom-16 -left-8 h-36 w-36 rounded-full blur-3xl opacity-40"
                  style={{ background: "oklch(0.5 0.22 30 / 0.7)" }}
                  aria-hidden="true"
                />
                <div className="relative flex items-start justify-between mb-8">
                  <Icon className="h-7 w-7 opacity-95" />
                  <Badge
                    variant="secondary"
                    className="bg-white/20 text-primary-foreground border-0 text-[10px] uppercase tracking-wider backdrop-blur"
                  >
                    {m.type}
                  </Badge>
                </div>
                <p className="relative num text-lg tracking-widest opacity-95">
                  {m.type === "cash" ? "เงินสด / โอน" : `•••• •••• •••• ${m.last4}`}
                </p>
                <p className="relative text-xs mt-1 opacity-85">{m.label}</p>
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition z-10">
                  <PaymentMethodFormDialog
                    title="แก้ไขช่องทาง"
                    initial={m}
                    onSave={updateMethod}
                    trigger={
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-primary-foreground hover:bg-white/20"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    }
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-primary-foreground hover:bg-white/20"
                    onClick={() => removeMethod(m.id, m.label)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground">ยอดตัดต่อเดือน</span>
                  <span className="num text-lg font-semibold">฿{formatTHB(m.total)}</span>
                </div>
                {(m.statementDay || m.dueDay) && (
                  <div className="flex items-center gap-3 mb-3 pb-3 border-b text-[11px]">
                    {m.statementDay && (
                      <div className="flex items-center gap-1.5">
                        <CalendarClock className="h-3 w-3 text-blue-600" />
                        <span className="text-muted-foreground">ตัดรอบ</span>
                        <span className="num font-semibold">วันที่ {m.statementDay}</span>
                      </div>
                    )}
                    {m.dueDay && (
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="h-3 w-3 text-destructive" />
                        <span className="text-muted-foreground">จ่ายภายใน</span>
                        <span className="num font-semibold">วันที่ {m.dueDay}</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="space-y-1.5">
                  {m.items.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">ยังไม่มีบริการที่ผูก</p>
                  )}
                  {m.items.map((s) => {
                    const I = s.icon;
                    return (
                      <div key={s.id} className="flex items-center gap-2 text-xs">
                        <I className="h-3.5 w-3.5 text-primary" />
                        <span className="flex-1 truncate">{s.name}</span>
                        <span className="num text-muted-foreground">฿{formatTHB(s.amount)}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="animate-fade-up">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" /> สรุปทั้งหมด
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">ช่องทางทั้งหมด</p>
              <p className="num text-2xl font-semibold">{paymentMethods.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">บริการที่ผูก</p>
              <p className="num text-2xl font-semibold">{subs.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">ยอดรวม/เดือน</p>
              <p className="num text-2xl font-semibold text-primary">
                ฿{formatTHB(subs.reduce((a, b) => a + b.amount, 0))}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
