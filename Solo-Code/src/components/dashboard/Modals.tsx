import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  CreditCard,
  Paperclip,
  Loader2,
  ExternalLink,
  X,
  Pencil,
  Briefcase,
  PenTool,
  ShoppingBag,
  HandCoins,
  Home,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useFinance } from "@/store/finance";
import {
  QUICK_ADD_GROUPS,
  type SubCategory,
  formatTHB,
  INCOME_TYPE_META,
  SUGGESTED_WHT_RATE,
  type IncomeType,
  type ExpenseRecord,
} from "@/data/mockData";
import { subSchema, incomeSchema, expenseSchema, parseOrToast } from "@/lib/validation";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { uploadExpenseReceipt } from "./tax/uploadReceipt";
import { IncomeWhtAiZone, type IncomeWhtAiResult } from "./tax/IncomeWhtAiZone";
import { cn } from "@/lib/utils";

const INCOME_TYPE_ICONS: Record<IncomeType, LucideIcon> = {
  freelance: Briefcase,
  professional: PenTool,
  online_sales: ShoppingBag,
  commission: HandCoins,
  rental: Home,
  other: Layers,
};

const INCOME_TYPES = Object.keys(INCOME_TYPE_META) as IncomeType[];

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

/** Reusable controlled field with built-in maxLength to limit attack surface */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

// ============================================================
// Add Subscription
// ============================================================
export function AddSubModal() {
  const { setSubs, paymentMethods } = useFinance();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [category, setCategory] = React.useState<SubCategory>("Design");
  const [billingDay, setBillingDay] = React.useState("1");
  const [pmId, setPmId] = React.useState(paymentMethods[0]?.id ?? "");
  const [activeGroup, setActiveGroup] = React.useState(QUICK_ADD_GROUPS[0].group);
  const [priceMode, setPriceMode] = React.useState<"monthly" | "installment">("monthly");
  const [fullPrice, setFullPrice] = React.useState("");
  const [installmentMonths, setInstallmentMonths] = React.useState("");

  React.useEffect(() => {
    if (!pmId && paymentMethods[0]) setPmId(paymentMethods[0].id);
  }, [paymentMethods, pmId]);

  const computedMonthly = React.useMemo(() => {
    if (priceMode !== "installment") return Number(amount) || 0;
    const fp = Number(fullPrice) || 0;
    const m = Number(installmentMonths) || 0;
    return m > 0 ? Math.round(fp / m) : 0;
  }, [priceMode, amount, fullPrice, installmentMonths]);

  function reset() {
    setName("");
    setAmount("");
    setCategory("Design");
    setBillingDay("1");
    setPmId(paymentMethods[0]?.id ?? "");
    setPriceMode("monthly");
    setFullPrice("");
    setInstallmentMonths("");
  }

  function submit() {
    if (!pmId) return toast.error("กรุณาเพิ่มช่องทางจ่ายก่อน");
    const finalAmount = priceMode === "installment" ? String(computedMonthly) : amount;
    const parsed = parseOrToast(subSchema, {
      name,
      amount: finalAmount,
      category,
      billingDay,
      paymentMethodId: pmId,
      status: "active",
      priceMode,
      fullPrice: priceMode === "installment" ? fullPrice : undefined,
      installmentMonths: priceMode === "installment" ? installmentMonths : undefined,
      installmentsPaid: 0,
    });
    if (!parsed) return;
    const quick = QUICK_ADD_GROUPS.flatMap((g) => g.items).find((p) => p.name === parsed.name);
    setSubs((s) => [
      ...s,
      {
        id: crypto.randomUUID(),
        name: parsed.name,
        amount: parsed.amount,
        category: parsed.category as SubCategory,
        billingDay: parsed.billingDay,
        paymentMethodId: parsed.paymentMethodId,
        icon: quick?.icon ?? CreditCard,
        status: "active",
        priceMode: parsed.priceMode,
        fullPrice: parsed.fullPrice,
        installmentMonths: parsed.installmentMonths,
        installmentsPaid: parsed.installmentsPaid,
      },
    ]);
    toast.success(`เพิ่ม ${parsed.name} เรียบร้อย`);
    setOpen(false);
    reset();
  }

  const activeItems = QUICK_ADD_GROUPS.find((g) => g.group === activeGroup)?.items ?? [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> เพิ่มค่าสมาชิกใหม่
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>เพิ่มค่าสมาชิก / ค่าใช้จ่ายประจำ</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 pb-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                ⚡ Quick add — เลือกหมวดแล้วแตะเพื่อกรอกอัตโนมัติ
              </Label>
              <div className="flex flex-wrap gap-1 mb-2">
                {QUICK_ADD_GROUPS.map((g) => (
                  <button
                    key={g.group}
                    type="button"
                    onClick={() => setActiveGroup(g.group)}
                    className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                      activeGroup === g.group
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary border-border hover:border-primary"
                    }`}
                  >
                    {g.group}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5 rounded-xl bg-muted/40 p-2 border border-border/60">
                {activeItems.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => {
                      setName(p.name);
                      setAmount(String(p.suggestedAmount));
                      setCategory(p.category);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs hover:border-primary hover:bg-primary-soft transition-colors"
                  >
                    <p.icon className="h-3 w-3 text-primary" />
                    <span>{p.name}</span>
                    <span className="num text-[10px] text-muted-foreground">
                      ฿{formatTHB(p.suggestedAmount)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <Field label="ชื่อบริการ / รายการ">
              <Input
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น Adobe Creative Cloud"
              />
            </Field>
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
                <Field label="จำนวน (บาท/เดือน)">
                  <Input
                    className="num"
                    type="number"
                    min={0}
                    max={1000000}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </Field>
                <Field label="วันตัดบิล">
                  <Input
                    className="num"
                    type="number"
                    min={1}
                    max={31}
                    value={billingDay}
                    onChange={(e) => setBillingDay(e.target.value)}
                  />
                </Field>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="ราคาเต็ม (บาท)">
                    <Input
                      className="num"
                      type="number"
                      min={0}
                      value={fullPrice}
                      onChange={(e) => setFullPrice(e.target.value)}
                      placeholder="เช่น 1850"
                    />
                  </Field>
                  <Field label="จำนวนงวด (เดือน)">
                    <Input
                      className="num"
                      type="number"
                      min={1}
                      max={120}
                      value={installmentMonths}
                      onChange={(e) => setInstallmentMonths(e.target.value)}
                      placeholder="10"
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="วันตัดบิล">
                    <Input
                      className="num"
                      type="number"
                      min={1}
                      max={31}
                      value={billingDay}
                      onChange={(e) => setBillingDay(e.target.value)}
                    />
                  </Field>
                  <Field label="ตกเดือนละ">
                    <div className="num flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm font-semibold">
                      ฿{formatTHB(computedMonthly)}
                    </div>
                  </Field>
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="หมวด">
                <Select value={category} onValueChange={(v) => setCategory(v as SubCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="ช่องทางจ่าย">
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
              </Field>
            </div>
            <Button onClick={submit} className="w-full">
              บันทึก
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Add Income
// ============================================================
export function AddIncomeModal({
  trigger,
  open: openProp,
  onOpenChange,
}: {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
} = {}) {
  const { addIncome } = useFinance();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [client, setClient] = React.useState("");
  const [gross, setGross] = React.useState("");
  const [month, setMonth] = React.useState(() => new Date().toISOString().slice(0, 7));
  const [incomeType, setIncomeType] = React.useState<IncomeType>("freelance");
  const [whtRate, setWhtRate] = React.useState<string>("3");
  const [certificateNo, setCertificateNo] = React.useState("");
  const [certificateReceived, setCertificateReceived] = React.useState(false);
  const [note, setNote] = React.useState("");

  // Auto-suggest WHT rate when type changes (only if user hasn't customised)
  const lastTypeRef = React.useRef(incomeType);
  React.useEffect(() => {
    if (lastTypeRef.current !== incomeType) {
      setWhtRate(String(SUGGESTED_WHT_RATE[incomeType]));
      lastTypeRef.current = incomeType;
    }
  }, [incomeType]);

  function reset() {
    setClient("");
    setGross("");
    setCertificateNo("");
    setCertificateReceived(false);
    setNote("");
    setIncomeType("freelance");
    setWhtRate("3");
    setMonth(new Date().toISOString().slice(0, 7));
  }

  function applyAiScan(result: IncomeWhtAiResult) {
    if (result.certificateNo) setCertificateNo(result.certificateNo);
    if (result.client) setClient(result.client);
    if (result.gross) setGross(result.gross);
    if (result.whtRate) setWhtRate(result.whtRate);
    if (result.note) setNote(result.note);
    if (result.certificateReceived) setCertificateReceived(true);
    if (result.incomeType) setIncomeType(result.incomeType);
  }

  function submit() {
    const parsed = parseOrToast(incomeSchema, {
      client,
      gross,
      month,
      incomeType,
      whtRate,
      certificateNo,
      certificateReceived,
      note,
    });
    if (!parsed) return;
    const wht = parsed.gross * (parsed.whtRate / 100);
    addIncome({
      client: parsed.client,
      gross: parsed.gross,
      withholding: wht,
      month: parsed.month,
      incomeType: parsed.incomeType,
      whtRate: parsed.whtRate,
      certificateNo: parsed.certificateNo || undefined,
      certificateReceived: parsed.certificateReceived,
      note: parsed.note || undefined,
    });
    toast.success("บันทึกรายได้เรียบร้อย");
    setOpen(false);
    reset();
  }

  const grossNum = Number(gross) || 0;
  const rateNum = Number(whtRate) || 0;
  const whtPreview = grossNum * (rateNum / 100);

  const defaultTrigger = (
    <Button
      size="sm"
      className="gap-1.5 text-white shrink-0 shadow-soft"
      style={{ background: "#FF5F05" }}
    >
      <Plus className="h-4 w-4" /> เพิ่มรายได้
    </Button>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>{trigger ?? defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>เพิ่มรายได้</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="ประเภทเงินได้">
            <div className="grid grid-cols-3 gap-2">
              {INCOME_TYPES.map((k) => {
                const Icon = INCOME_TYPE_ICONS[k];
                const meta = INCOME_TYPE_META[k];
                const selected = incomeType === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setIncomeType(k)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 rounded-xl border p-2.5 text-center transition-all min-h-[4.5rem]",
                      selected
                        ? "border-primary bg-primary/10 text-foreground shadow-sm"
                        : "border-border/60 bg-background hover:border-primary/40 hover:bg-muted/50",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg",
                        selected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-[10px] font-semibold leading-tight">{meta.label}</span>
                    <span className="text-[9px] text-muted-foreground">{meta.section}</span>
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label={incomeType === "online_sales" ? "ช่องทาง / ลูกค้า" : "ลูกค้า"}>
            <Input
              value={client}
              maxLength={120}
              placeholder={
                incomeType === "online_sales" ? "เช่น Shopee, TikTok Shop" : "ชื่อบริษัท / ลูกค้า"
              }
              onChange={(e) => setClient(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="ยอด Gross (บาท)">
              <Input
                className="num"
                type="number"
                min={0}
                max={100000000}
                value={gross}
                onChange={(e) => setGross(e.target.value)}
              />
            </Field>
            <Field label="เดือน">
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="อัตรา หัก ณ ที่จ่าย (%)">
              <Select value={whtRate} onValueChange={setWhtRate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">ไม่หัก (0%)</SelectItem>
                  <SelectItem value="1">1% (โฆษณา)</SelectItem>
                  <SelectItem value="2">2% (โฆษณาออนไลน์)</SelectItem>
                  <SelectItem value="3">3% (รับจ้าง / วิชาชีพ)</SelectItem>
                  <SelectItem value="5">5% (ค่าเช่า)</SelectItem>
                  <SelectItem value="7">7% (VAT — ขายของ)</SelectItem>
                  <SelectItem value="15">15% (ดอกเบี้ย)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="ภาษีหัก ณ ที่จ่าย">
              <div className="num flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm font-medium">
                ฿{formatTHB(whtPreview)}
              </div>
            </Field>
          </div>

          <Field label="เลขที่ใบ 50 ทวิ (ถ้ามี)">
            <Input
              value={certificateNo}
              maxLength={60}
              placeholder="เช่น WHT-2025-0011"
              onChange={(e) => setCertificateNo(e.target.value)}
            />
            <IncomeWhtAiZone onApply={applyAiScan} className="mt-2" />
          </Field>

          <label className="flex items-center justify-between rounded-lg border border-border/60 p-3 cursor-pointer">
            <div>
              <p className="text-sm font-medium">ได้รับใบ 50 ทวิ จากลูกค้าแล้ว</p>
              <p className="text-xs text-muted-foreground">ใช้ยื่นภาษีปลายปี (ภงด.90/91)</p>
            </div>
            <Switch checked={certificateReceived} onCheckedChange={setCertificateReceived} />
          </label>

          <Field label="หมายเหตุ (ไม่บังคับ)">
            <Textarea
              rows={2}
              value={note}
              maxLength={200}
              placeholder="เช่น โอนเข้าบัญชีกสิกร, รออินวอยซ์, ฯลฯ"
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>

          <Button onClick={submit} className="w-full">
            บันทึก
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Add / Edit Expense (work / personal) with receipt upload
// ============================================================

export function AddExpenseModal({
  kind,
  record,
  trigger,
  open: openProp,
  onOpenChange,
}: {
  kind: "work" | "personal";
  record?: ExpenseRecord;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}) {
  const { setWorkExpenses, setPersonalExpenses } = useFinance();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const isEdit = !!record;

  const [desc, setDesc] = React.useState(record?.description ?? "");
  const [amount, setAmount] = React.useState(record ? String(record.amount) : "");
  const [date, setDate] = React.useState(record?.date ?? new Date().toISOString().slice(0, 10));
  const [receiptUrl, setReceiptUrl] = React.useState<string | undefined>(record?.receiptUrl);
  const [receiptPath, setReceiptPath] = React.useState<string | undefined>(record?.receiptPath);
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open && record) {
      setDesc(record.description);
      setAmount(String(record.amount));
      setDate(record.date);
      setReceiptUrl(record.receiptUrl);
      setReceiptPath(record.receiptPath);
    }
  }, [open, record]);

  async function handleFile(f: File) {
    if (f.size > 10 * 1024 * 1024) {
      toast.error("ไฟล์ต้องไม่เกิน 10MB");
      return;
    }
    setUploading(true);
    try {
      const { path, url } = await uploadExpenseReceipt(f);
      setReceiptPath(path);
      setReceiptUrl(url);
      toast.success("อัปโหลดใบเสร็จเรียบร้อย");
    } catch (e) {
      toast.error("อัปโหลดไม่สำเร็จ: " + (e instanceof Error ? e.message : "ลองใหม่"));
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    const parsed = parseOrToast(expenseSchema, { description: desc, amount, date });
    if (!parsed) return;
    const rec: ExpenseRecord = {
      id: record?.id ?? crypto.randomUUID(),
      description: parsed.description,
      amount: parsed.amount,
      date: parsed.date,
      category: kind,
      receiptUrl,
      receiptPath,
    };
    const setter = kind === "work" ? setWorkExpenses : setPersonalExpenses;
    setter((a) => (isEdit ? a.map((x) => (x.id === rec.id ? rec : x)) : [...a, rec]));
    toast.success(isEdit ? "แก้ไขรายการเรียบร้อย" : "บันทึกรายจ่ายเรียบร้อย");
    setOpen(false);
    if (!isEdit) {
      setDesc("");
      setAmount("");
      setReceiptUrl(undefined);
      setReceiptPath(undefined);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="gap-1.5">
            <Plus className="h-4 w-4" /> เพิ่มรายจ่าย
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "แก้ไขรายการ" : kind === "work" ? "เพิ่มรายจ่ายจริง" : "รายจ่ายส่วนตัว"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="ชื่อรายการ">
            <Input
              value={desc}
              maxLength={160}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="เช่น ค่าซอฟต์แวร์, ค่าเดินทาง"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="จำนวน (บาท)">
              <Input
                className="num"
                type="number"
                min={0}
                max={100000000}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field label="วันที่">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>

          {kind === "work" && (
            <Field label="ใบเสร็จ / หลักฐาน (รูป หรือ PDF, ไม่เกิน 10MB)">
              <div className="flex flex-col gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = "";
                  }}
                />
                {receiptUrl ? (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/40 p-2.5 text-xs">
                    <a
                      href={receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-primary hover:underline truncate"
                    >
                      <Paperclip className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">เปิดดูใบเสร็จ</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                      >
                        เปลี่ยน
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive"
                        onClick={() => {
                          setReceiptUrl(undefined);
                          setReceiptPath(undefined);
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Paperclip className="h-3.5 w-3.5" />
                    )}
                    {uploading ? "กำลังอัปโหลด..." : "แนบไฟล์ใบเสร็จ"}
                  </Button>
                )}
              </div>
            </Field>
          )}

          <Button onClick={submit} className="w-full" disabled={uploading}>
            {isEdit ? "บันทึกการแก้ไข" : "บันทึก"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Inline edit trigger for an existing expense row */
export function EditExpenseButton({
  record,
  kind,
}: {
  record: ExpenseRecord;
  kind: "work" | "personal";
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <AddExpenseModal
      kind={kind}
      record={record}
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      }
    />
  );
}
