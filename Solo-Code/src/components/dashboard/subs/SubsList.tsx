import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, X, Pause, Play, Ban, ChevronDown, ChevronRight, Calculator } from "lucide-react";
import { toast } from "sonner";
import { useFinance } from "@/store/finance";
import {
  formatTHB,
  type Subscription,
  type SubCategory,
  type SubStatus,
  type SubPriceMode,
} from "@/data/mockData";
import { subSchema, parseOrToast } from "@/lib/validation";
import { CATEGORY_LABELS } from "./shared";

const ALL_CATEGORIES: SubCategory[] = [
  "Design",
  "AI",
  "Dev",
  "Cloud",
  "Streaming",
  "Music",
  "Productivity",
  "Internet",
  "Housing",
  "Utilities",
  "Health",
  "Beauty",
  "Insurance",
  "Investments",
  "CardFees",
  "Family",
  "Donations",
  "Pets",
  "Learning",
  "Operations",
];

const STATUS_META: Record<SubStatus, { label: string; cls: string }> = {
  active: {
    label: "Active",
    cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  },
  paused: {
    label: "Paused",
    cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  },
  cancelled: {
    label: "Cancelled",
    cls: "bg-muted text-muted-foreground border-border line-through",
  },
};

export function SubsList() {
  const { subs, setSubs, paymentMethods } = useFinance();
  const [editing, setEditing] = React.useState<Subscription | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<Subscription | null>(null);
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

  function remove(s: Subscription) {
    setSubs((arr) => arr.filter((x) => x.id !== s.id));
    toast.success(`ลบ ${s.name} แล้ว`);
    setConfirmDelete(null);
  }

  function save(updated: Subscription) {
    setSubs((arr) => arr.map((s) => (s.id === updated.id ? updated : s)));
    toast.success(`อัปเดต ${updated.name} แล้ว`);
    setEditing(null);
  }

  function setStatus(s: Subscription, status: SubStatus) {
    setSubs((arr) => arr.map((x) => (x.id === s.id ? { ...x, status } : x)));
    toast.success(`${s.name} → ${STATUS_META[status].label}`);
  }

  // group by category
  const grouped = React.useMemo(() => {
    const map = new Map<string, Subscription[]>();
    for (const s of subs) {
      const k = s.category;
      const arr = map.get(k) ?? [];
      arr.push(s);
      map.set(k, arr);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [subs]);

  return (
    <Card className="animate-fade-up">
      <CardContent className="pt-5 space-y-4">
        {grouped.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">ยังไม่มีรายการ</p>
        )}
        {grouped.map(([cat, items]) => {
          const isCollapsed = collapsed[cat];
          const total = items
            .filter((x) => (x.status ?? "active") === "active")
            .reduce((a, b) => a + b.amount, 0);
          return (
            <div key={cat} className="rounded-xl border border-border/60 bg-card/50">
              <button
                type="button"
                onClick={() => setCollapsed((c) => ({ ...c, [cat]: !c[cat] }))}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/40 rounded-t-xl"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm font-semibold">{CATEGORY_LABELS[cat] ?? cat}</span>
                <Badge variant="secondary" className="h-5 text-[10px]">
                  {items.length}
                </Badge>
                <span className="ml-auto text-xs num text-muted-foreground">
                  ฿{formatTHB(total)}/ด.
                </span>
              </button>
              {!isCollapsed && (
                <div className="grid gap-2 sm:grid-cols-2 p-2 pt-0">
                  {items.map((s) => {
                    const Icon = s.icon;
                    const status = s.status ?? "active";
                    const sm = STATUS_META[status];
                    const isInstall = s.priceMode === "installment" && s.installmentMonths;
                    return (
                      <div
                        key={s.id}
                        className={`flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3 hover:border-primary/40 hover:shadow-card transition-all ${
                          status === "cancelled" ? "opacity-60" : ""
                        }`}
                      >
                        <div className="rounded-lg bg-primary-soft p-2 text-primary shrink-0">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-medium truncate">{s.name}</p>
                            <Badge variant="outline" className={`h-4 text-[9px] px-1.5 ${sm.cls}`}>
                              {sm.label}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            ตัดทุกวันที่ {s.billingDay}
                            {isInstall && (
                              <>
                                {" "}
                                · ผ่อน {s.installmentsPaid ?? 0}/{s.installmentMonths} งวด
                              </>
                            )}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="num text-sm font-semibold">฿{formatTHB(s.amount)}</p>
                          {isInstall && s.fullPrice && (
                            <p className="text-[10px] text-muted-foreground num">
                              เต็ม ฿{formatTHB(s.fullPrice)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {status === "active" ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setStatus(s, "paused")}
                              aria-label="พัก"
                              title="พักรายการ"
                            >
                              <Pause className="h-3.5 w-3.5" />
                            </Button>
                          ) : status === "paused" ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-emerald-600"
                              onClick={() => setStatus(s, "active")}
                              aria-label="เปิดใช้"
                              title="เปิดใช้งาน"
                            >
                              <Play className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-emerald-600"
                              onClick={() => setStatus(s, "active")}
                              aria-label="เปิดใช้"
                            >
                              <Play className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {status !== "cancelled" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground"
                              onClick={() => setStatus(s, "cancelled")}
                              aria-label="ยกเลิก"
                              title="ยกเลิกบริการ"
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setEditing(s)}
                            aria-label={`แก้ไข ${s.name}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => setConfirmDelete(s)}
                            aria-label={`ลบ ${s.name}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>

      <EditSubDialog
        sub={editing}
        paymentMethods={paymentMethods}
        onClose={() => setEditing(null)}
        onSave={save}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบรายการนี้?</AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการลบ <span className="font-medium text-foreground">{confirmDelete?.name}</span>{" "}
              ออกจากรายการสมาชิกหรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && remove(confirmDelete)}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              ลบทิ้ง
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function EditSubDialog({
  sub,
  paymentMethods,
  onClose,
  onSave,
}: {
  sub: Subscription | null;
  paymentMethods: ReturnType<typeof useFinance>["paymentMethods"];
  onClose: () => void;
  onSave: (s: Subscription) => void;
}) {
  const open = !!sub;
  const [name, setName] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [category, setCategory] = React.useState<SubCategory>("Design");
  const [billingDay, setBillingDay] = React.useState("1");
  const [pmId, setPmId] = React.useState("");
  const [status, setStatus] = React.useState<SubStatus>("active");
  const [priceMode, setPriceMode] = React.useState<SubPriceMode>("monthly");
  const [fullPrice, setFullPrice] = React.useState("");
  const [installmentMonths, setInstallmentMonths] = React.useState("");
  const [installmentsPaid, setInstallmentsPaid] = React.useState("0");

  React.useEffect(() => {
    if (sub) {
      setName(sub.name);
      setAmount(String(sub.amount));
      setCategory(sub.category);
      setBillingDay(String(sub.billingDay));
      setPmId(sub.paymentMethodId);
      setStatus(sub.status ?? "active");
      setPriceMode(sub.priceMode ?? "monthly");
      setFullPrice(sub.fullPrice ? String(sub.fullPrice) : "");
      setInstallmentMonths(sub.installmentMonths ? String(sub.installmentMonths) : "");
      setInstallmentsPaid(String(sub.installmentsPaid ?? 0));
    }
  }, [sub]);

  const computedMonthly = React.useMemo(() => {
    if (priceMode !== "installment") return Number(amount) || 0;
    const fp = Number(fullPrice) || 0;
    const m = Number(installmentMonths) || 0;
    return m > 0 ? Math.round(fp / m) : 0;
  }, [priceMode, amount, fullPrice, installmentMonths]);

  React.useEffect(() => {
    if (priceMode === "installment" && computedMonthly > 0) {
      setAmount(String(computedMonthly));
    }
  }, [priceMode, computedMonthly]);

  function submit() {
    if (!sub) return;
    const parsed = parseOrToast(subSchema, {
      name,
      amount: String(computedMonthly),
      category,
      billingDay,
      paymentMethodId: pmId,
      status,
      priceMode,
      fullPrice: priceMode === "installment" ? fullPrice : undefined,
      installmentMonths: priceMode === "installment" ? installmentMonths : undefined,
      installmentsPaid: priceMode === "installment" ? installmentsPaid : undefined,
    });
    if (!parsed) return;
    onSave({
      ...sub,
      name: parsed.name,
      amount: parsed.amount,
      category: parsed.category as SubCategory,
      billingDay: parsed.billingDay,
      paymentMethodId: parsed.paymentMethodId,
      status: parsed.status,
      priceMode: parsed.priceMode,
      fullPrice: parsed.fullPrice,
      installmentMonths: parsed.installmentMonths,
      installmentsPaid: parsed.installmentsPaid,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>แก้ไขรายการสมาชิก</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>ชื่อบริการ</Label>
            <Input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>รูปแบบราคา</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPriceMode("monthly")}
                className={`text-xs rounded-lg border px-3 py-2 transition ${
                  priceMode === "monthly"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border hover:border-primary"
                }`}
              >
                จ่ายต่อเดือน
              </button>
              <button
                type="button"
                onClick={() => setPriceMode("installment")}
                className={`text-xs rounded-lg border px-3 py-2 transition ${
                  priceMode === "installment"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border hover:border-primary"
                }`}
              >
                ราคาเต็ม + ผ่อน
              </button>
            </div>
          </div>

          {priceMode === "monthly" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>ราคา (บาท/เดือน)</Label>
                <Input
                  className="num"
                  type="number"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>วันตัดบิล</Label>
                <Input
                  className="num"
                  type="number"
                  min={1}
                  max={31}
                  value={billingDay}
                  onChange={(e) => setBillingDay(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>ราคาเต็ม (บาท)</Label>
                  <Input
                    className="num"
                    type="number"
                    min={0}
                    value={fullPrice}
                    onChange={(e) => setFullPrice(e.target.value)}
                    placeholder="เช่น 1850"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>จำนวนงวด (เดือน)</Label>
                  <Input
                    className="num"
                    type="number"
                    min={1}
                    max={120}
                    value={installmentMonths}
                    onChange={(e) => setInstallmentMonths(e.target.value)}
                    placeholder="10"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>วันตัดบิล</Label>
                  <Input
                    className="num"
                    type="number"
                    min={1}
                    max={31}
                    value={billingDay}
                    onChange={(e) => setBillingDay(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>จ่ายไปแล้ว (งวด)</Label>
                  <Input
                    className="num"
                    type="number"
                    min={0}
                    value={installmentsPaid}
                    onChange={(e) => setInstallmentsPaid(e.target.value)}
                  />
                </div>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-2.5 flex items-center gap-2 text-xs">
                <Calculator className="h-3.5 w-3.5 text-primary" />
                <span className="text-muted-foreground">ตกเดือนละ</span>
                <span className="ml-auto num font-semibold">฿{formatTHB(computedMonthly)}</span>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>หมวด</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as SubCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABELS[c] ?? c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>สถานะ</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as SubStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>ช่องทางจ่าย</Label>
            <Select value={pmId} onValueChange={setPmId}>
              <SelectTrigger>
                <SelectValue placeholder="เลือก..." />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label} {p.type !== "cash" && p.last4 ? `••${p.last4}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button onClick={submit}>บันทึก</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
