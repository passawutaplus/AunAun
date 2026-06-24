import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreditCard, CalendarClock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { paymentMethodSchema } from "@/lib/validation";
import { PRESET_PAYMENT_PROVIDERS, type PaymentMethod } from "@/data/mockData";

export function PaymentMethodFormDialog({
  trigger,
  initial,
  onSave,
  title,
}: {
  trigger: React.ReactNode;
  initial?: PaymentMethod;
  onSave: (m: PaymentMethod) => void;
  title: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [providerId, setProviderId] = React.useState<string>(
    initial
      ? (PRESET_PAYMENT_PROVIDERS.find((p) => p.label === initial.label)?.id ?? "custom")
      : "kbank",
  );
  const [customLabel, setCustomLabel] = React.useState(initial?.label ?? "");
  const [type, setType] = React.useState<PaymentMethod["type"]>(initial?.type ?? "credit");
  const [last4, setLast4] = React.useState(initial?.last4 ?? "");
  const [statementDay, setStatementDay] = React.useState<string>(
    initial?.statementDay ? String(initial.statementDay) : "",
  );
  const [dueDay, setDueDay] = React.useState<string>(initial?.dueDay ? String(initial.dueDay) : "");

  React.useEffect(() => {
    if (providerId !== "custom") {
      const p = PRESET_PAYMENT_PROVIDERS.find((x) => x.id === providerId);
      if (p) {
        setCustomLabel(p.label);
        setType(p.type);
      }
    }
  }, [providerId]);

  function submit() {
    const isCash = type === "cash";
    const parsed = paymentMethodSchema.safeParse({
      label: customLabel,
      type,
      last4: isCash ? "" : last4,
      statementDay: isCash || type === "wallet" ? undefined : statementDay || undefined,
      dueDay: isCash || type === "wallet" ? undefined : dueDay || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
      return;
    }
    const preset = PRESET_PAYMENT_PROVIDERS.find((p) => p.label === parsed.data.label);
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      label: parsed.data.label,
      type: parsed.data.type,
      last4: parsed.data.last4 || (isCash ? "" : "----"),
      icon: preset?.icon ?? initial?.icon ?? CreditCard,
      statementDay: parsed.data.statementDay,
      dueDay: parsed.data.dueDay,
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>เลือกช่องทาง</Label>
            <Select value={providerId} onValueChange={setProviderId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[280px]">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground">
                  ธนาคาร
                </div>
                {PRESET_PAYMENT_PROVIDERS.filter((p) => p.type !== "wallet").map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
                <div className="px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground mt-1">
                  E-Wallet / BNPL
                </div>
                {PRESET_PAYMENT_PROVIDERS.filter((p) => p.type === "wallet").map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
                <div className="px-2 py-1 text-[10px] font-semibold uppercase text-muted-foreground mt-1">
                  อื่นๆ
                </div>
                <SelectItem value="custom">กำหนดเอง…</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {providerId === "custom" && (
            <div className="grid gap-2">
              <Label>ชื่อช่องทาง</Label>
              <Input
                value={customLabel}
                maxLength={60}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="เช่น KBank Platinum"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>ประเภท</Label>
              <Select value={type} onValueChange={(v) => setType(v as PaymentMethod["type"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">บัตรเครดิต</SelectItem>
                  <SelectItem value="debit">บัตรเดบิต</SelectItem>
                  <SelectItem value="wallet">E-Wallet</SelectItem>
                  <SelectItem value="cash">เงินสด / โอน</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {type !== "cash" && (
              <div className="grid gap-2">
                <Label>เลขท้าย (4 หลัก)</Label>
                <Input
                  className="num"
                  maxLength={4}
                  value={last4}
                  onChange={(e) => setLast4(e.target.value.replace(/\D/g, ""))}
                  placeholder="1234"
                />
              </div>
            )}
          </div>

          {type !== "wallet" && type !== "cash" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5 text-blue-600" />
                  วันที่ตัดรอบบัตร
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  className="num"
                  value={statementDay}
                  onChange={(e) => setStatementDay(e.target.value)}
                  placeholder="เช่น 25"
                />
              </div>
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                  วันสุดท้ายต้องจ่าย
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  className="num"
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  placeholder="เช่น 15"
                />
              </div>
            </div>
          )}

          <Button onClick={submit} className="w-full">
            บันทึก
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
