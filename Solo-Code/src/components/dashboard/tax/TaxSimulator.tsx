import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { TaxBracketGauge } from "./TaxBracketGauge";
import {
  calcThaiTax,
  formatTHB,
  INCOME_TYPE_META,
  SUGGESTED_WHT_RATE,
  type IncomeType,
} from "@/data/mockData";
import { TAX_BRACKETS } from "./whtUtils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import {
  TrendingUp,
  Sparkles,
  RotateCcw,
  X,
  Download,
  Lightbulb,
  Plus,
  Trash2,
  FileDown,
  ShieldCheck,
  HeartPulse,
  ShoppingBag,
  Users,
  Landmark,
  Stethoscope,
  Baby,
  GraduationCap,
  Home as HomeIcon,
  HandCoins,
  Info,
  Save,
  FolderOpen,
  ChevronDown,
  ChevronUp,
  Pencil,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentIncome: number;
};

type SimIncomeItem = {
  id: string;
  name: string;
  type: IncomeType;
  amount: number;
  months: number; // number of months this income occurs (1-12)
  hasVat: boolean;
  hasWht: boolean;
  whtRate: number;
};

type ActualExpItem = { id: string; name: string; amount: number };

type GroupKey = "personal" | "insurance" | "investment" | "economy";

type DeductionDef = {
  key: string;
  label: string;
  cap: number;
  icon: LucideIcon;
  group: GroupKey;
  hint?: string;
  doubled?: boolean;
  pctCap?: number;
};

const GROUPS: Record<GroupKey, { label: string; emoji: string }> = {
  personal: { label: "ส่วนตัว & ครอบครัว", emoji: "👨‍👩‍👧" },
  insurance: { label: "ประกัน", emoji: "🏥" },
  investment: { label: "การลงทุน", emoji: "📈" },
  economy: { label: "ศก. & บริจาค", emoji: "🛍️" },
};

const DEDUCTIONS: DeductionDef[] = [
  {
    key: "sso",
    label: "ประกันสังคม (ม.40)",
    cap: 9000,
    icon: ShieldCheck,
    group: "personal",
    hint: "ตามจริง สูงสุด ฿9,000",
  },
  {
    key: "spouse",
    label: "คู่สมรส (ไม่มีรายได้)",
    cap: 60000,
    icon: Users,
    group: "personal",
    hint: "฿60,000",
  },
  {
    key: "parents",
    label: "ค่าเลี้ยงดูบิดามารดา",
    cap: 60000,
    icon: Users,
    group: "personal",
    hint: "คนละ ฿30,000 รวมสูงสุด ฿60,000",
  },
  {
    key: "child",
    label: "บุตร",
    cap: 60000,
    icon: Baby,
    group: "personal",
    hint: "คนละ ฿30,000 (คนที่ 2 ปี 61+ = ฿60k)",
  },
  {
    key: "homeLoan",
    label: "ดอกเบี้ยบ้าน",
    cap: 100000,
    icon: HomeIcon,
    group: "personal",
    hint: "ตามจริง สูงสุด ฿100,000",
  },

  {
    key: "lifeInsurance",
    label: "ประกันชีวิต",
    cap: 100000,
    icon: HeartPulse,
    group: "insurance",
    hint: "กรมธรรม์ ≥10 ปี สูงสุด ฿100,000",
  },
  {
    key: "healthInsurance",
    label: "ประกันสุขภาพตนเอง",
    cap: 25000,
    icon: Stethoscope,
    group: "insurance",
    hint: "รวมกับประกันชีวิต ≤ ฿100,000",
  },
  {
    key: "parentsHealth",
    label: "ประกันสุขภาพบิดามารดา",
    cap: 15000,
    icon: HeartPulse,
    group: "insurance",
    hint: "สูงสุด ฿15,000",
  },
  {
    key: "pensionInsurance",
    label: "ประกันบำนาญ",
    cap: 200000,
    icon: ShieldCheck,
    group: "insurance",
    hint: "≤15% เงินได้ สูงสุด ฿200,000",
  },

  {
    key: "ssf",
    label: "SSF (กองทุนรวมเพื่อการออม)",
    cap: 200000,
    icon: Landmark,
    group: "investment",
    hint: "≤30% เงินได้ สูงสุด ฿200,000",
    pctCap: 0.3,
  },
  {
    key: "rmf",
    label: "RMF (กองทุนเลี้ยงชีพ)",
    cap: 500000,
    icon: Landmark,
    group: "investment",
    hint: "≤30% เงินได้ สูงสุด ฿500,000",
    pctCap: 0.3,
  },
  {
    key: "thaiESG",
    label: "Thai ESG",
    cap: 300000,
    icon: Landmark,
    group: "investment",
    hint: "ถือ 5 ปี, ≤30% เงินได้ สูงสุด ฿300,000",
    pctCap: 0.3,
  },
  {
    key: "pvd",
    label: "PVD / กบข. / กอช.",
    cap: 500000,
    icon: Landmark,
    group: "investment",
    hint: "รวมเกษียณอื่นไม่เกิน ฿500,000",
  },

  {
    key: "shopping",
    label: "Easy E-Receipt 2025",
    cap: 50000,
    icon: ShoppingBag,
    group: "economy",
    hint: "e-Tax Invoice/e-Receipt สูงสุด ฿50,000",
  },
  {
    key: "education",
    label: "บริจาคเพื่อการศึกษา (×2)",
    cap: 0,
    icon: GraduationCap,
    group: "economy",
    hint: "ลดหย่อนได้ 2 เท่า",
    doubled: true,
  },
  {
    key: "donation",
    label: "เงินบริจาคทั่วไป",
    cap: 0,
    icon: HandCoins,
    group: "economy",
    hint: "ตามจริง ≤10% เงินได้",
  },
];

const DEFAULT_PERSONAL = 60_000;

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function newItem(months = 12): SimIncomeItem {
  return {
    id: uid(),
    name: "",
    type: "freelance",
    amount: 0,
    months,
    hasVat: false,
    hasWht: true,
    whtRate: SUGGESTED_WHT_RATE.freelance,
  };
}

type ScenarioPayload = {
  items: SimIncomeItem[];
  mode: "monthly" | "yearly";
  defaultMonths: number;
  expMethod: "lumpsum" | "actual";
  actualItems: ActualExpItem[];
  personal: number;
  active: Record<string, boolean>;
  amounts: Record<string, number>;
};

type SavedScenario = {
  id: string;
  name: string;
  updated_at: string;
  payload: ScenarioPayload;
};

export function TaxSimulator({ open, onOpenChange, currentIncome }: Props) {
  const { user } = useAuth();

  const [items, setItems] = React.useState<SimIncomeItem[]>([
    { ...newItem(12), name: "งานประจำ Client A", amount: 30000 },
  ]);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<"monthly" | "yearly">("monthly");
  const [defaultMonths, setDefaultMonths] = React.useState<number>(12);
  const [expMethod, setExpMethod] = React.useState<"lumpsum" | "actual">("lumpsum");
  const [actualItems, setActualItems] = React.useState<ActualExpItem[]>([]);
  const [personal, setPersonal] = React.useState<number>(DEFAULT_PERSONAL);

  const [active, setActive] = React.useState<Record<string, boolean>>({});
  const [amounts, setAmounts] = React.useState<Record<string, number>>({});
  const [tab, setTab] = React.useState<GroupKey>("personal");

  const reportRef = React.useRef<HTMLDivElement | null>(null);

  // Initial: expand the first item
  React.useEffect(() => {
    if (open && items.length > 0 && !expandedId) {
      setExpandedId(items[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function reset() {
    const first = { ...newItem(12), name: "งานประจำ Client A", amount: 30000 };
    setItems([first]);
    setExpandedId(first.id);
    setMode("monthly");
    setDefaultMonths(12);
    setExpMethod("lumpsum");
    setActualItems([]);
    setPersonal(DEFAULT_PERSONAL);
    setActive({});
    setAmounts({});
  }

  function updateItem(id: string, patch: Partial<SimIncomeItem>) {
    setItems((arr) => arr.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }
  function removeItem(id: string) {
    setItems((arr) => arr.filter((x) => x.id !== id));
    if (expandedId === id) setExpandedId(null);
  }
  function addItem() {
    const it = newItem(defaultMonths);
    setItems((arr) => [...arr, it]);
    setExpandedId(it.id); // open the new one so user can fill in
  }

  // Actual expenses
  function addActual() {
    setActualItems((a) => [...a, { id: uid(), name: "", amount: 0 }]);
  }
  function updateActual(id: string, patch: Partial<ActualExpItem>) {
    setActualItems((a) => a.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }
  function removeActual(id: string) {
    setActualItems((a) => a.filter((x) => x.id !== id));
  }

  // === Calculations ===
  const perItemAnnual = React.useMemo(
    () =>
      items.map((it) => {
        const annual =
          mode === "monthly" ? it.amount * Math.min(12, Math.max(0, it.months)) : it.amount;
        const wht = it.hasWht ? (annual * it.whtRate) / 100 : 0;
        const vat = it.hasVat ? annual * 0.07 : 0;
        return { ...it, annual, wht, vat };
      }),
    [items, mode],
  );

  const totalGross = perItemAnnual.reduce((s, x) => s + x.annual, 0);
  const totalWht = perItemAnnual.reduce((s, x) => s + x.wht, 0);
  const totalVat = perItemAnnual.reduce((s, x) => s + x.vat, 0);

  const lumpSumExpense = React.useMemo(() => {
    const byType = new Map<IncomeType, number>();
    for (const x of perItemAnnual) {
      byType.set(x.type, (byType.get(x.type) ?? 0) + x.annual);
    }
    let total = 0;
    for (const [t, g] of byType) {
      const meta = INCOME_TYPE_META[t];
      let exp = g * meta.lumpSumPct;
      if (meta.lumpSumCap !== undefined) exp = Math.min(exp, meta.lumpSumCap);
      total += exp;
    }
    return total;
  }, [perItemAnnual]);

  const actualTotal = actualItems.reduce((s, x) => s + (x.amount || 0), 0);

  const expense = expMethod === "lumpsum" ? lumpSumExpense : Math.min(actualTotal, totalGross);

  const computeDeductionFor = React.useCallback(
    (d: DeductionDef, raw: number) => {
      let capped = raw;
      if (d.cap > 0) capped = Math.min(capped, d.cap);
      if (d.pctCap) capped = Math.min(capped, totalGross * d.pctCap);
      return d.doubled ? capped * 2 : capped;
    },
    [totalGross],
  );

  const activeDeductionTotal = React.useMemo(() => {
    let s = 0;
    for (const d of DEDUCTIONS) {
      if (!active[d.key]) continue;
      const raw = amounts[d.key] ?? 0;
      s += computeDeductionFor(d, raw);
    }
    return s;
  }, [active, amounts, computeDeductionFor]);

  const net = Math.max(0, totalGross - expense - personal - activeDeductionTotal);
  const tax = calcThaiTax(net);
  const baselineNet = Math.max(0, totalGross - expense - personal);
  const baselineTax = calcThaiTax(baselineNet);
  const saved = Math.max(0, baselineTax - tax);
  const diff = tax - totalWht;

  const suggestion = React.useMemo(() => {
    let idx = 0;
    for (let i = 0; i < TAX_BRACKETS.length; i++) {
      if (net > TAX_BRACKETS[i].from) idx = i;
    }
    if (idx === 0) return null;
    const cur = TAX_BRACKETS[idx];
    const lower = TAX_BRACKETS[idx - 1];
    const need = Math.max(0, net - cur.from);
    if (need <= 0) return null;
    const saveTax = (cur.rate - lower.rate) * need;
    return { need, saveTax, fromRate: cur.rate, toRate: lower.rate };
  }, [net]);

  // === Save / Load ===
  const [saving, setSaving] = React.useState(false);
  const [scenarios, setScenarios] = React.useState<SavedScenario[]>([]);
  const [loadOpen, setLoadOpen] = React.useState(false);
  const [scenarioName, setScenarioName] = React.useState("แผนภาษีของฉัน");

  const loadScenarios = React.useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from("finance_tax_scenarios")
      .select("id,name,updated_at,payload")
      .order("updated_at", { ascending: false });
    if (error) {
      toast.error("โหลดรายการที่บันทึกไว้ไม่สำเร็จ");
      return;
    }
    setScenarios((data ?? []) as unknown as SavedScenario[]);
  }, [user?.id]);

  React.useEffect(() => {
    if (open && user?.id) void loadScenarios();
  }, [open, user?.id, loadScenarios]);

  async function saveScenario() {
    if (!user?.id) {
      toast.error("กรุณาเข้าสู่ระบบเพื่อบันทึก");
      return;
    }
    setSaving(true);
    try {
      const payload: ScenarioPayload = {
        items,
        mode,
        defaultMonths,
        expMethod,
        actualItems,
        personal,
        active,
        amounts,
      };
      const { error } = await supabase.from("finance_tax_scenarios").insert([
        {
          user_id: user.id,
          name: scenarioName || "แผนภาษีของฉัน",
          payload: payload as never,
        },
      ]);
      if (error) throw error;
      toast.success("บันทึกแผนภาษีเรียบร้อย");
      await loadScenarios();
    } catch (e) {
      toast.error("บันทึกไม่สำเร็จ", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  function applyScenario(s: SavedScenario) {
    const p = s.payload || ({} as ScenarioPayload);
    if (p.items?.length) setItems(p.items);
    if (p.mode) setMode(p.mode);
    if (p.defaultMonths) setDefaultMonths(p.defaultMonths);
    if (p.expMethod) setExpMethod(p.expMethod);
    setActualItems(p.actualItems ?? []);
    if (typeof p.personal === "number") setPersonal(p.personal);
    setActive(p.active ?? {});
    setAmounts(p.amounts ?? {});
    setScenarioName(s.name);
    setLoadOpen(false);
    toast.success(`โหลด "${s.name}" แล้ว`);
  }

  async function deleteScenario(id: string) {
    const { error } = await supabase.from("finance_tax_scenarios").delete().eq("id", id);
    if (error) {
      toast.error("ลบไม่สำเร็จ");
      return;
    }
    toast.success("ลบเรียบร้อย");
    await loadScenarios();
  }

  // PDF export
  const [exporting, setExporting] = React.useState(false);
  async function exportPDF() {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const { exportElementToPdfA4 } = await import("@/lib/printPdf");
      await exportElementToPdfA4(
        reportRef.current,
        `tax-sandbox-${new Date().toISOString().slice(0, 10)}.pdf`,
      );
      toast.success("ดาวน์โหลด PDF เรียบร้อย");
    } catch (e) {
      toast.error("ส่งออก PDF ไม่สำเร็จ", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[94vh] overflow-y-auto bg-white border-2 border-dashed border-primary/60">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-primary/15 text-primary border-primary/40 border">
              🚧 โหมดจำลองวางแผนภาษี · Simulation Mode
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              ทดลองได้ไม่กระทบข้อมูลจริง
            </Badge>
          </div>
          <DialogTitle className="text-xl flex items-center gap-2 text-foreground">
            <Sparkles className="h-5 w-5 text-primary" />
            Tax Sandbox · ทดลองวางแผนภาษีล่วงหน้า
          </DialogTitle>
          <DialogDescription className="text-xs">
            กรอกรายได้ที่คาดว่าจะได้รับและทดลองใส่ค่าลดหย่อน — กดบันทึกเพื่อย้อนกลับมาดูทีหลังได้
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr] mt-2">
          {/* LEFT — Inputs */}
          <div className="space-y-4">
            {/* SECTION 1 — Income */}
            <Section
              step={1}
              title="รายการรายได้"
              desc="เพิ่มงาน/ลูกค้าทีละราย ระบุประเภทเงินได้ จำนวนเงิน VAT และหัก ณ ที่จ่าย"
              emoji="💼"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <ToggleGroup
                  type="single"
                  value={mode}
                  onValueChange={(v) => v && setMode(v as "monthly" | "yearly")}
                  className="justify-start"
                >
                  <ToggleGroupItem value="monthly" className="text-[11px] h-8">
                    รายเดือน
                  </ToggleGroupItem>
                  <ToggleGroupItem value="yearly" className="text-[11px] h-8">
                    รายปี
                  </ToggleGroupItem>
                </ToggleGroup>
                {mode === "monthly" && (
                  <div className="flex items-center gap-1.5">
                    <Label className="text-[11px] text-muted-foreground">จำนวนเดือนตั้งต้น</Label>
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      value={defaultMonths}
                      onChange={(e) =>
                        setDefaultMonths(Math.min(12, Math.max(1, Number(e.target.value) || 1)))
                      }
                      className="h-8 w-16 num text-sm"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {items.map((it, idx) => {
                  const expanded = expandedId === it.id;
                  const months = mode === "monthly" ? Math.min(12, Math.max(0, it.months)) : 12;
                  const annual = mode === "monthly" ? it.amount * months : it.amount;
                  const wht = it.hasWht ? (annual * it.whtRate) / 100 : 0;
                  return (
                    <div
                      key={it.id}
                      className={`rounded-lg border bg-white transition-colors ${
                        expanded ? "border-primary/40 shadow-sm" : "border-border"
                      }`}
                    >
                      {/* Header (always visible) */}
                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : it.id)}
                        className="w-full flex items-center gap-2 p-2.5 text-left hover:bg-muted/30 transition-colors rounded-lg"
                      >
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-semibold shrink-0">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {it.name || (
                              <span className="text-muted-foreground italic">
                                ยังไม่ได้ตั้งชื่อ — กดเพื่อแก้ไข
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {INCOME_TYPE_META[it.type].section} ·{" "}
                            <span className="num">฿{formatTHB(Math.round(annual))}</span>/ปี
                            {it.hasWht && (
                              <>
                                {" "}
                                · WHT <span className="num">฿{formatTHB(Math.round(wht))}</span>
                              </>
                            )}
                          </p>
                        </div>
                        {!expanded && (
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                        {expanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                      </button>

                      {expanded && (
                        <div className="border-t border-border/60 p-3 space-y-2">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="space-y-1">
                              <Label className="text-[11px]">ชื่อรายการ / ลูกค้า</Label>
                              <Input
                                value={it.name}
                                onChange={(e) => updateItem(it.id, { name: e.target.value })}
                                placeholder="เช่น Client A — Design"
                                className="h-9 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px]">ประเภทเงินได้ (ยื่นหมวด)</Label>
                              <Select
                                value={it.type}
                                onValueChange={(v) =>
                                  updateItem(it.id, {
                                    type: v as IncomeType,
                                    whtRate: SUGGESTED_WHT_RATE[v as IncomeType],
                                  })
                                }
                              >
                                <SelectTrigger className="h-9 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {(Object.keys(INCOME_TYPE_META) as IncomeType[]).map((t) => (
                                    <SelectItem key={t} value={t}>
                                      {INCOME_TYPE_META[t].section} · {INCOME_TYPE_META[t].label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                            <div className="space-y-1">
                              <Label className="text-[11px]">
                                จำนวนเงิน ({mode === "monthly" ? "ต่อเดือน" : "ต่อปี"})
                              </Label>
                              <Input
                                type="number"
                                min={0}
                                value={it.amount || ""}
                                onChange={(e) =>
                                  updateItem(it.id, {
                                    amount: Math.max(0, Number(e.target.value) || 0),
                                  })
                                }
                                className="h-9 num text-sm"
                                placeholder="0"
                              />
                            </div>
                            {mode === "monthly" && (
                              <div className="space-y-1">
                                <Label className="text-[11px]">จำนวนเดือน</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  max={12}
                                  value={it.months}
                                  onChange={(e) =>
                                    updateItem(it.id, {
                                      months: Math.min(
                                        12,
                                        Math.max(1, Number(e.target.value) || 1),
                                      ),
                                    })
                                  }
                                  className="h-9 w-20 num text-sm"
                                />
                              </div>
                            )}
                          </div>

                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-3 h-10">
                              <Label className="text-[11px] cursor-pointer">VAT 7%</Label>
                              <Switch
                                checked={it.hasVat}
                                onCheckedChange={(v) => updateItem(it.id, { hasVat: v })}
                              />
                            </div>
                            <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/20 px-3 h-10">
                              <Label className="text-[11px] cursor-pointer">หัก ณ ที่จ่าย</Label>
                              <div className="flex items-center gap-1.5">
                                <Switch
                                  checked={it.hasWht}
                                  onCheckedChange={(v) => updateItem(it.id, { hasWht: v })}
                                />
                                {it.hasWht && (
                                  <Select
                                    value={String(it.whtRate)}
                                    onValueChange={(v) => updateItem(it.id, { whtRate: Number(v) })}
                                  >
                                    <SelectTrigger className="h-7 w-[70px] text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {[1, 2, 3, 5, 10, 15].map((r) => (
                                        <SelectItem key={r} value={String(r)}>
                                          {r}%
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                            <p className="text-[11px] text-muted-foreground">
                              รวมต่อปี:{" "}
                              <span className="num font-semibold text-foreground">
                                ฿{formatTHB(Math.round(annual))}
                              </span>
                            </p>
                            {items.length > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-destructive gap-1"
                                onClick={() => removeItem(it.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" /> ลบ
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={addItem}
                className="w-full gap-1.5 border-dashed"
              >
                <Plus className="h-3.5 w-3.5" /> เพิ่มรายการรายได้
              </Button>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60">
                <Stat label="รายได้รวม/ปี" value={totalGross} accent />
                <Stat label="WHT รวม" value={totalWht} />
                <Stat label="VAT (แยกต่างหาก)" value={totalVat} muted />
              </div>
            </Section>

            {/* SECTION 2 — Expense */}
            <Section
              step={2}
              title="วิธีหักค่าใช้จ่าย"
              desc="เลือกหักแบบเหมาตามมาตรา 40 หรือบันทึกค่าใช้จ่ายจริงเป็นรายการ"
              emoji="🧾"
            >
              <ToggleGroup
                type="single"
                value={expMethod}
                onValueChange={(v) => v && setExpMethod(v as "lumpsum" | "actual")}
                className="justify-start"
              >
                <ToggleGroupItem value="lumpsum" className="text-xs">
                  หักเหมา
                </ToggleGroupItem>
                <ToggleGroupItem value="actual" className="text-xs">
                  หักตามจริง
                </ToggleGroupItem>
              </ToggleGroup>

              {expMethod === "lumpsum" ? (
                <p className="text-[11px] text-muted-foreground">
                  ระบบจะหักให้อัตโนมัติตามมาตรา 40 — เช่น 40(2) เหมา 50% (ไม่เกิน 100k), 40(8) เหมา
                  60%
                </p>
              ) : (
                <div className="space-y-2">
                  {actualItems.length === 0 && (
                    <p className="text-[11px] text-muted-foreground italic">
                      ยังไม่มีรายการ — กดด้านล่างเพื่อเพิ่ม
                    </p>
                  )}
                  {actualItems.map((a, idx) => (
                    <div
                      key={a.id}
                      className="grid grid-cols-[auto_1fr_auto_auto] gap-2 items-center"
                    >
                      <span className="text-[11px] text-muted-foreground w-5 text-center">
                        {idx + 1}.
                      </span>
                      <Input
                        value={a.name}
                        onChange={(e) => updateActual(a.id, { name: e.target.value })}
                        placeholder="ชื่อรายการ เช่น ค่าอุปกรณ์"
                        className="h-9 text-sm"
                      />
                      <Input
                        type="number"
                        min={0}
                        value={a.amount || ""}
                        onChange={(e) =>
                          updateActual(a.id, { amount: Math.max(0, Number(e.target.value) || 0) })
                        }
                        placeholder="0"
                        className="h-9 w-32 num text-sm"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeActual(a.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addActual}
                    className="w-full gap-1.5 border-dashed"
                  >
                    <Plus className="h-3.5 w-3.5" /> เพิ่มค่าใช้จ่าย
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2">
                <span className="text-[11px] flex items-center gap-1.5 text-muted-foreground">
                  <Info className="h-3 w-3" /> หักได้ทั้งหมด
                </span>
                <span className="num text-sm font-semibold text-foreground">
                  ฿{formatTHB(Math.round(expense))}
                </span>
              </div>
            </Section>

            {/* SECTION 3 — Deductions */}
            <Section
              step={3}
              title="ทดลองใส่รายละเอียดการลดหย่อน"
              desc="ใส่จำนวนเงินที่ตั้งใจจะใช้สิทธิ — ระบบจะคำนวณเพดานและภาษีที่ประหยัดได้ทันที"
              emoji="✨"
            >
              <Tabs value={tab} onValueChange={(v) => setTab(v as GroupKey)}>
                <TabsList className="grid grid-cols-2 sm:grid-cols-4 h-auto p-1 gap-1 w-full">
                  {(Object.entries(GROUPS) as [GroupKey, (typeof GROUPS)[GroupKey]][]).map(
                    ([k, g]) => (
                      <TabsTrigger
                        key={k}
                        value={k}
                        className="text-[11px] h-auto py-1.5 gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                      >
                        <span>{g.emoji}</span>
                        <span className="truncate">{g.label}</span>
                      </TabsTrigger>
                    ),
                  )}
                </TabsList>

                {(Object.keys(GROUPS) as GroupKey[]).map((g) => (
                  <TabsContent key={g} value={g} className="mt-3 space-y-2">
                    {/* Personal deduction lives inside the Personal tab */}
                    {g === "personal" && (
                      <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-3 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-sm font-semibold flex items-center gap-1.5">
                            👤 ค่าลดหย่อนส่วนตัว
                          </Label>
                          <Badge variant="outline" className="text-[10px]">
                            ทุกคนได้สิทธินี้
                          </Badge>
                        </div>
                        <Input
                          type="number"
                          value={personal}
                          onChange={(e) => setPersonal(Math.max(0, Number(e.target.value) || 0))}
                          className="num text-sm h-9"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          ตั้งต้น ฿60,000 ตามกฎหมาย — ปรับเพิ่ม-ลดได้
                        </p>
                      </div>
                    )}

                    {DEDUCTIONS.filter((d) => d.group === g).map((d) => {
                      const checked = !!active[d.key];
                      const raw = amounts[d.key] ?? 0;
                      const eff = computeDeductionFor(d, raw);
                      const Icon = d.icon;
                      return (
                        <div
                          key={d.key}
                          className={`rounded-lg border p-3 transition-colors ${
                            checked ? "border-primary/50 bg-primary/5" : "border-border bg-card/30"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div
                              className={`rounded-md p-1.5 shrink-0 ${
                                checked
                                  ? "bg-primary/15 text-primary"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium leading-tight">{d.label}</p>
                                <Switch
                                  checked={checked}
                                  onCheckedChange={(v) => setActive((s) => ({ ...s, [d.key]: v }))}
                                />
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{d.hint}</p>
                              {checked && (
                                <div className="mt-2 grid grid-cols-[1fr_auto] gap-2 items-end">
                                  <Input
                                    type="number"
                                    min={0}
                                    value={raw || ""}
                                    onChange={(e) =>
                                      setAmounts((s) => ({
                                        ...s,
                                        [d.key]: Math.max(0, Number(e.target.value) || 0),
                                      }))
                                    }
                                    placeholder={
                                      d.cap > 0 ? `สูงสุด ${formatTHB(d.cap)}` : "ตามจริง"
                                    }
                                    className="h-8 num text-sm"
                                  />
                                  <div className="text-right">
                                    <p className="text-[10px] text-muted-foreground leading-none">
                                      ใช้สิทธิได้
                                    </p>
                                    <p className="num text-sm font-semibold text-success leading-tight">
                                      ฿{formatTHB(Math.round(eff))}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </TabsContent>
                ))}
              </Tabs>

              <div className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/30 p-2.5">
                <span className="text-xs text-primary">รวมลดหย่อนที่ใช้สิทธิ (รวมส่วนตัว)</span>
                <span className="num text-base font-bold text-primary">
                  ฿{formatTHB(Math.round(activeDeductionTotal + personal))}
                </span>
              </div>
            </Section>
          </div>

          {/* RIGHT — Results */}
          <div className="space-y-3 lg:sticky lg:top-2 self-start">
            <div ref={reportRef} data-pdf-export-root className="space-y-3 bg-white p-1">
              <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 text-center space-y-1">
                <p className="text-xs text-muted-foreground">ภาษีที่ต้องชำระ (ประมาณการ)</p>
                <p className="num text-4xl font-bold text-primary leading-none">
                  ฿{formatTHB(Math.round(tax))}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  เงินได้สุทธิ ฿{formatTHB(Math.round(net))} · รายได้รวม ฿
                  {formatTHB(Math.round(totalGross))}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-success/40 bg-success/10 p-3 text-center">
                  <p className="text-[10px] text-success-foreground/80 flex items-center justify-center gap-1">
                    <TrendingUp className="h-3 w-3" /> ประหยัดภาษีได้
                  </p>
                  <p className="num text-lg font-bold text-success">
                    ฿{formatTHB(Math.round(saved))}
                  </p>
                </div>
                <div
                  className={`rounded-xl border p-3 text-center ${
                    diff > 0 ? "border-warning/40 bg-warning/10" : "border-success/40 bg-success/10"
                  }`}
                >
                  <p className="text-[10px] text-muted-foreground">
                    {diff > 0 ? "ต้องจ่ายเพิ่ม" : "จะได้คืน"}
                  </p>
                  <p
                    className={`num text-lg font-bold ${
                      diff > 0 ? "text-warning" : "text-success"
                    }`}
                  >
                    ฿{formatTHB(Math.round(Math.abs(diff)))}
                  </p>
                  <p className="text-[9px] text-muted-foreground">เทียบกับ WHT ที่ถูกหักไว้</p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-white p-3">
                <TaxBracketGauge netIncome={net} estimatedTax={tax} />
              </div>

              <div className="rounded-xl border border-border bg-white p-3 space-y-1.5 text-xs">
                <p className="font-semibold text-sm mb-1">📊 สรุปการคำนวณ</p>
                <Row label="รายได้รวมทั้งปี" value={totalGross} />
                <Row
                  label={`- ค่าใช้จ่าย (${expMethod === "lumpsum" ? "เหมา" : "จริง"})`}
                  value={-expense}
                />
                <Row label="- ลดหย่อนส่วนตัว" value={-personal} />
                <Row label="- ลดหย่อนเพิ่มเติม" value={-activeDeductionTotal} />
                <div className="border-t border-border/60 pt-1.5 mt-1.5">
                  <Row label="= เงินได้สุทธิ" value={net} bold />
                  <Row label="× อัตราภาษีก้าวหน้า" value={tax} bold accent />
                </div>
              </div>

              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-1.5">
                <p className="text-xs font-semibold flex items-center gap-1.5 text-primary">
                  <Lightbulb className="h-4 w-4" /> AI Tax Insight
                </p>
                {suggestion ? (
                  <p className="text-xs leading-relaxed">
                    💡 ลดหย่อนเพิ่มอีก{" "}
                    <span className="num font-bold text-primary">
                      ฿{formatTHB(Math.round(suggestion.need))}
                    </span>{" "}
                    จะตกฐานภาษีจาก{" "}
                    <span className="font-bold">{(suggestion.fromRate * 100).toFixed(0)}%</span>{" "}
                    ลงมาที่{" "}
                    <span className="font-bold text-success">
                      {(suggestion.toRate * 100).toFixed(0)}%
                    </span>{" "}
                    — ประหยัดเพิ่ม{" "}
                    <span className="num font-bold text-success">
                      ฿{formatTHB(Math.round(suggestion.saveTax))}
                    </span>
                  </p>
                ) : tax === 0 ? (
                  <p className="text-xs">🎉 เงินได้สุทธิยังอยู่ในเกณฑ์ยกเว้นภาษี</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    คุณอยู่ฐานภาษีต่ำสุดแล้ว — ลงทุนเพิ่มเพื่อสร้างวินัยการออมระยะยาวได้
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground italic pt-1 border-t border-primary/20 mt-2">
                  * ตัวเลขเป็นการคาดการณ์จากโปรแกรม โปรดตรวจสอบความถูกต้องอีกครั้งเมื่อยื่นภาษีจริง
                </p>
              </div>
            </div>

            {/* Save / Load row */}
            <div className="rounded-xl border border-border bg-white p-3 space-y-2">
              <Label className="text-xs font-semibold">💾 บันทึกแผนนี้</Label>
              <div className="flex gap-2">
                <Input
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  placeholder="ตั้งชื่อแผน เช่น แผนปี 2026"
                  className="h-9 text-sm"
                />
                <Button
                  size="sm"
                  onClick={saveScenario}
                  disabled={saving || !user?.id}
                  className="gap-1.5 shrink-0"
                >
                  <Save className="h-3.5 w-3.5" /> {saving ? "กำลังบันทึก..." : "บันทึก"}
                </Button>
              </div>
              <Popover open={loadOpen} onOpenChange={setLoadOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full gap-1.5">
                    <FolderOpen className="h-3.5 w-3.5" />
                    แผนที่บันทึกไว้ ({scenarios.length})
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-2" align="end">
                  {scenarios.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      ยังไม่มีแผนที่บันทึก
                    </p>
                  ) : (
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {scenarios.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center gap-2 rounded-md hover:bg-muted/50 p-2"
                        >
                          <button
                            type="button"
                            onClick={() => applyScenario(s)}
                            className="flex-1 text-left min-w-0"
                          >
                            <p className="text-sm font-medium truncate">{s.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(s.updated_at).toLocaleString("th-TH")}
                            </p>
                          </button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => deleteScenario(s.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={reset} className="gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" /> รีเซ็ต
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportPDF}
                disabled={exporting}
                className="gap-1.5 border-primary/50 text-primary hover:bg-primary/10"
              >
                <FileDown className="h-3.5 w-3.5" />
                {exporting ? "กำลังสร้าง..." : "PDF"}
              </Button>
            </div>
            <Button size="sm" onClick={() => onOpenChange(false)} className="w-full gap-1.5">
              <X className="h-3.5 w-3.5" /> ปิดโหมดจำลอง
            </Button>
            {currentIncome > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const it = { ...newItem(12), name: "รายได้จริงรวม", amount: currentIncome };
                  setItems([it]);
                  setExpandedId(it.id);
                  setMode("yearly");
                  toast.success("ดึงรายได้จริงมาเป็นรายการเริ่มต้น");
                }}
                className="w-full gap-1.5 text-xs"
              >
                <Download className="h-3.5 w-3.5" /> ใช้รายได้จริงเป็นจุดเริ่ม
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  step,
  title,
  desc,
  emoji,
  children,
}: {
  step: number;
  title: string;
  desc: string;
  emoji: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-white overflow-hidden">
      <div className="flex items-start gap-3 p-3 border-b border-border/60 bg-muted/30">
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
          {step}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <span>{emoji}</span>
            {title}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
        </div>
      </div>
      <div className="p-3 space-y-3">{children}</div>
    </section>
  );
}

function Stat({
  label,
  value,
  accent,
  muted,
}: {
  label: string;
  value: number;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`rounded-lg p-2 text-center border ${
        accent
          ? "border-primary/40 bg-primary/5"
          : muted
            ? "border-border bg-muted/30"
            : "border-border bg-card/40"
      }`}
    >
      <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
      <p
        className={`num text-sm font-bold leading-tight ${
          accent ? "text-primary" : "text-foreground"
        }`}
      >
        ฿{formatTHB(Math.round(value))}
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  accent,
}: {
  label: string;
  value: number;
  bold?: boolean;
  accent?: boolean;
}) {
  const sign = value < 0 ? "-" : "";
  return (
    <div
      className={`flex items-center justify-between ${bold ? "font-semibold" : ""} ${
        accent ? "text-primary" : ""
      }`}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="num">
        {sign}฿{formatTHB(Math.round(Math.abs(value)))}
      </span>
    </div>
  );
}
