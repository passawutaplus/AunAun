import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { useFinance } from "@/store/finance";
import { formatTHB } from "@/data/mockData";
import {
  ChevronDown,
  Info,
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
  type LucideIcon,
} from "lucide-react";
import { FundEntryList, parseFundItems, serializeFundItems, type FundItem } from "./FundEntryList";

type GroupKey = "personal" | "insurance" | "investment" | "economy";

type Deduction = {
  key: string;
  label: string;
  cap: number;
  icon: LucideIcon;
  short: string;
  detail: string;
  group: GroupKey;
  notePlaceholder?: string;
  /** Multi-entry list (กองทุน) */
  multi?: boolean;
  /** % of income cap for investment-type deductions */
  pctCap?: number;
};

const GROUPS: Record<GroupKey, { label: string; emoji: string }> = {
  personal: { label: "ส่วนตัว & ครอบครัว", emoji: "👨‍👩‍👧" },
  insurance: { label: "ประกัน", emoji: "🏥" },
  investment: { label: "การลงทุน", emoji: "📈" },
  economy: { label: "ศก. & บริจาค", emoji: "🛍️" },
};

const DEDUCTIONS: Deduction[] = [
  {
    key: "sso",
    label: "ประกันสังคม (ม.40)",
    cap: 9000,
    icon: ShieldCheck,
    group: "personal",
    short: "ฟรีแลนซ์ ม.40 จ่ายเอง",
    detail: "ผู้ประกันตน ม.40 ลดหย่อนตามจริง สูงสุด ฿9,000/ปี",
    notePlaceholder: "ทางเลือก 1/2/3",
  },
  {
    key: "parents",
    label: "ค่าเลี้ยงดูบิดามารดา",
    cap: 60000,
    icon: Users,
    group: "personal",
    short: "คนละ ฿30,000 (ตน + คู่สมรส)",
    detail: "บิดามารดาอายุ ≥60 ปี รายได้ไม่เกิน ฿30,000/ปี ลดหย่อนคนละ ฿30,000",
    notePlaceholder: "พ่อ + แม่",
  },
  {
    key: "child",
    label: "บุตร",
    cap: 30000,
    icon: Baby,
    group: "personal",
    short: "คนละ ฿30k (คนที่ 2 ปี 61+ = ฿60k)",
    detail: "บุตรชอบด้วยกฎหมาย อายุไม่เกิน 25 ปี คนละ ฿30,000",
    notePlaceholder: "ระบุจำนวนบุตร",
  },
  {
    key: "homeLoan",
    label: "ดอกเบี้ยบ้าน",
    cap: 100000,
    icon: HomeIcon,
    group: "personal",
    short: "ดอกเบี้ยกู้ซื้อ/สร้างบ้าน",
    detail: "ดอกเบี้ยเงินกู้ที่อยู่อาศัย ลดหย่อนตามจริง สูงสุด ฿100,000",
    notePlaceholder: "ธนาคาร / เลขสัญญา",
  },

  {
    key: "lifeInsurance",
    label: "ประกันชีวิต",
    cap: 100000,
    icon: HeartPulse,
    group: "insurance",
    short: "กรมธรรม์ ≥10 ปี",
    detail: "เบี้ยประกันชีวิตของตนเอง กรมธรรม์ ≥10 ปี ลดหย่อนตามจริง สูงสุด ฿100,000",
    notePlaceholder: "เลขกรมธรรม์ / บริษัท",
  },
  {
    key: "healthInsurance",
    label: "ประกันสุขภาพตนเอง",
    cap: 25000,
    icon: Stethoscope,
    group: "insurance",
    short: "รวมกับประกันชีวิต ≤ 100k",
    detail: "เบี้ยประกันสุขภาพของตนเอง ลดหย่อนตามจริง สูงสุด ฿25,000",
    notePlaceholder: "เลขกรมธรรม์",
  },
  {
    key: "parentsHealth",
    label: "ประกันสุขภาพบิดามารดา",
    cap: 15000,
    icon: HeartPulse,
    group: "insurance",
    short: "พ่อ-แม่ รายได้ <30k/ปี",
    detail: "เบี้ยประกันสุขภาพบิดามารดา ลดหย่อนตามจริง สูงสุด ฿15,000",
  },

  {
    key: "rmf",
    label: "RMF / SSF / กบข. / กอช.",
    cap: 500000,
    icon: Landmark,
    group: "investment",
    short: "≤ 30% รายได้, รวม ≤ 500k",
    multi: true,
    pctCap: 0.3,
    detail:
      "RMF/SSF/PVD/กบข./กอช. + ประกันบำนาญ — แต่ละประเภทเพดาน 30% ของเงินได้ รวมทุกประเภท ≤ ฿500,000",
    notePlaceholder: "ชื่อกองทุน / บลจ.",
  },
  {
    key: "thaiESG",
    label: "Thai ESG",
    cap: 300000,
    icon: Landmark,
    group: "investment",
    short: "ถือ 5 ปี, ≤ 30% รายได้",
    multi: true,
    pctCap: 0.3,
    detail: "Thai ESG ลดหย่อนตามที่ซื้อจริง ≤ 30% ของเงินได้ ไม่เกิน ฿300,000 ต้องถือ 5 ปี",
  },

  {
    key: "shopping",
    label: "Easy E-Receipt 2025",
    cap: 50000,
    icon: ShoppingBag,
    group: "economy",
    short: "ใบกำกับภาษี e-Tax",
    detail: "ค่าซื้อสินค้า/บริการ ที่ได้รับ e-Tax Invoice/e-Receipt ลดหย่อนตามจริงสูงสุด ฿50,000",
    notePlaceholder: "ร้านที่ซื้อ / สินค้า",
  },
  {
    key: "education",
    label: "เงินบริจาคเพื่อการศึกษา",
    cap: 0,
    icon: GraduationCap,
    group: "economy",
    short: "ลดหย่อนได้ 2 เท่า",
    detail:
      "เงินบริจาคสถานศึกษา/รพ.รัฐ ลดหย่อน 2 เท่า รวมกับลดหย่อนหมวดอื่นไม่เกิน 10% ของเงินได้หลังหักลดหย่อน",
  },
  {
    key: "donation",
    label: "เงินบริจาคทั่วไป",
    cap: 0,
    icon: HandCoins,
    group: "economy",
    short: "ตามจริง ≤ 10% เงินได้",
    detail: "เงินบริจาคองค์กรสาธารณกุศล ลดหย่อนตามจริง ≤ 10% ของเงินได้หลังหักค่าใช้จ่าย/ลดหย่อน",
  },
];

export function DeductionsPanel({ totalIncome = 0 }: { totalIncome?: number } = {}) {
  const {
    deductions,
    toggleDeduction,
    deductionAmounts,
    setDeductionAmount,
    deductionNotes,
    setDeductionNote,
  } = useFinance();

  const personalDeduction = 60000;
  const [tab, setTab] = React.useState<GroupKey>("personal");

  const totalActive = DEDUCTIONS.reduce((s, d) => {
    if (!deductions[d.key]) return s;
    const raw = deductionAmounts[d.key] ?? d.cap;
    const capped = d.cap > 0 ? Math.min(raw, d.cap) : raw;
    const fin = d.key === "education" ? capped * 2 : capped;
    return s + fin;
  }, 0);

  return (
    <Card className="animate-fade-up">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base">รายการลดหย่อนภาษี</CardTitle>
          <p className="text-xs text-muted-foreground">แบ่งเป็น 4 หมวด · กดเปิดเพื่อใส่จำนวนเงิน</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as GroupKey)}>
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 h-auto p-1 gap-1 w-full">
            {(Object.entries(GROUPS) as [GroupKey, (typeof GROUPS)[GroupKey]][]).map(([k, g]) => (
              <TabsTrigger
                key={k}
                value={k}
                className="text-xs h-auto py-1.5 gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <span>{g.emoji}</span>
                <span className="truncate">{g.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {(Object.keys(GROUPS) as GroupKey[]).map((g) => (
            <TabsContent key={g} value={g} className="mt-3 space-y-2">
              <div className="grid gap-2 sm:grid-cols-2">
                {DEDUCTIONS.filter((d) => d.group === g).map((d) => (
                  <DeductionItem
                    key={d.key}
                    d={d}
                    income={totalIncome}
                    checked={!!deductions[d.key]}
                    amount={deductionAmounts[d.key] ?? 0}
                    note={deductionNotes[d.key] ?? ""}
                    onToggle={() => toggleDeduction(d.key)}
                    onAmount={(v) => setDeductionAmount(d.key, v)}
                    onNote={(v) => setDeductionNote(d.key, v)}
                  />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <div className="grid gap-2 sm:grid-cols-2 pt-2 border-t border-border/60">
          <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3 border border-border/60">
            <div>
              <p className="text-xs text-muted-foreground">ลดหย่อนส่วนตัว (อัตโนมัติ)</p>
              <p className="text-sm font-medium">ผู้มีเงินได้</p>
            </div>
            <span className="num text-base font-semibold">฿{formatTHB(personalDeduction)}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-primary-soft p-3 border border-primary/30">
            <div>
              <p className="text-xs text-primary/80">รวมลดหย่อนทั้งหมด</p>
              <p className="text-sm font-medium text-primary">รวมส่วนตัว ฿60,000</p>
            </div>
            <span className="num text-lg font-bold text-primary">
              ฿{formatTHB(totalActive + personalDeduction)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DeductionItem({
  d,
  income,
  checked,
  amount,
  note,
  onToggle,
  onAmount,
  onNote,
}: {
  d: Deduction;
  income: number;
  checked: boolean;
  amount: number;
  note: string;
  onToggle: () => void;
  onAmount: (v: number) => void;
  onNote: (v: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const Icon = d.icon;
  const overCap = d.cap > 0 && amount > d.cap;
  const effective = d.cap > 0 ? Math.min(amount, d.cap) : amount;
  const fin = d.key === "education" ? effective * 2 : effective;

  // For multi-entry funds: parse items from note, recompute amount from sum
  const items = d.multi ? parseFundItems(note) : [];
  function handleItemsChange(next: FundItem[]) {
    onNote(serializeFundItems(next));
    const sum = next.reduce((s, x) => s + (x.amount || 0), 0);
    onAmount(sum);
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={`rounded-xl border transition-colors ${
        checked ? "border-primary/50 bg-primary-soft/40" : "border-border/60 bg-card"
      }`}
    >
      <div className="flex items-start gap-3 p-3">
        <div
          className={`rounded-lg p-2 shrink-0 ${checked ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{d.label}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {d.short}
            {d.cap > 0 && (
              <>
                {" "}
                · เพดาน <span className="num">฿{formatTHB(d.cap)}</span>
              </>
            )}
          </p>
        </div>
        <Switch checked={checked} onCheckedChange={onToggle} />
      </div>

      {checked && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-border/40">
          {d.multi ? (
            <FundEntryList
              items={items}
              cap={d.cap}
              income={income}
              pctCap={d.pctCap ?? 0.3}
              onChange={handleItemsChange}
              placeholder={d.notePlaceholder}
            />
          ) : (
            <>
              <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                <div>
                  <label className="text-[11px] text-muted-foreground">
                    จำนวนเงินที่ใช้สิทธิ (บาท)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={1e9}
                    value={amount || ""}
                    onChange={(e) => onAmount(Number(e.target.value))}
                    placeholder={d.cap > 0 ? `สูงสุด ${formatTHB(d.cap)}` : "ตามจริง"}
                    className="h-8 num text-sm"
                  />
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">ลดหย่อนได้</p>
                  <p className="num text-sm font-semibold text-success">
                    ฿{formatTHB(fin)}
                    {d.key === "education" && (
                      <span className="text-[9px] text-muted-foreground ml-1">×2</span>
                    )}
                  </p>
                </div>
              </div>
              {overCap && (
                <p className="text-[10px] text-warning flex items-center gap-1">
                  <Info className="h-3 w-3" /> เกินเพดาน — จะถูกหักเฉพาะ ฿{formatTHB(d.cap)}
                </p>
              )}
              {d.notePlaceholder !== undefined && (
                <Textarea
                  rows={1}
                  value={note}
                  onChange={(e) => onNote(e.target.value)}
                  placeholder={d.notePlaceholder ?? "หมายเหตุ"}
                  maxLength={200}
                  className="text-xs min-h-[32px]"
                />
              )}
            </>
          )}
        </div>
      )}

      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-center gap-1 text-[11px] text-muted-foreground hover:text-primary py-1.5 border-t border-border/30">
          <Info className="h-3 w-3" />
          {open ? "ซ่อนรายละเอียด" : "ดูรายละเอียด / เงื่อนไข"}
          <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-3 pb-3 text-[11px] text-muted-foreground leading-relaxed bg-muted/30">
          {d.detail}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Sum of all active deductions (capped + 2x for education) */
export function computeActiveDeductions(
  deductions: Record<string, boolean>,
  amounts: Record<string, number>,
): number {
  return DEDUCTIONS.reduce((s, d) => {
    if (!deductions[d.key]) return s;
    const raw = amounts[d.key] ?? d.cap;
    const capped = d.cap > 0 ? Math.min(raw, d.cap) : raw;
    const fin = d.key === "education" ? capped * 2 : capped;
    return s + fin;
  }, 0);
}
