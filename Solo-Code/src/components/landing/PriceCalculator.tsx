import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const USAGE_SESSION_KEY = "so1o.calcUsageLogged";

function getOrCreateSessionId(): string {
  try {
    const k = "so1o.calcSessionId";
    let v = sessionStorage.getItem(k);
    if (!v) {
      v =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(k, v);
    }
    return v;
  } catch {
    return `s_${Date.now()}`;
  }
}

async function logCalculatorUsageOnce() {
  try {
    if (sessionStorage.getItem(USAGE_SESSION_KEY) === "1") return;
    sessionStorage.setItem(USAGE_SESSION_KEY, "1");
    const session_id = getOrCreateSessionId();
    await supabase.from("calculator_usage_events").insert({ session_id });
  } catch {
    /* silent */
  }
}

const MULTIPLIERS = [1, 1.25, 1.5, 1.75, 2] as const;
const FREE_REVISIONS = [0, 1, 2, 3, 5] as const;
const CLIENT_LEVELS = [
  { key: "easy", label: "คุยง่าย", mult: 1, desc: "สื่อสารง่าย ตัดสินใจเร็ว" },
  { key: "normal", label: "มืออาชีพ", mult: 1.1, desc: "ทั่วไป มีแก้บ้าง" },
  { key: "hard", label: "ปวดหัว", mult: 1.25, desc: "แก้เยอะ จู้จี้" },
] as const;
const PAYMENT_TERMS = [
  { key: "deposit50", label: "มัดจำ 50%" },
  { key: "full", label: "จ่ายเต็มก่อนเริ่ม" },
] as const;

function useAnimatedNumber(target: number, duration = 350) {
  const [val, setVal] = React.useState(target);
  const fromRef = React.useRef(target);
  const startRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    fromRef.current = val;
    startRef.current = null;
    let raf = 0;
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const p = Math.min(1, (ts - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(fromRef.current + (target - fromRef.current) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return val;
}

function ChipRow<T extends string | number>({
  options,
  value,
  onChange,
  format,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  format?: (v: T) => string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = o === value;
        return (
          <button
            key={String(o)}
            type="button"
            onClick={() => onChange(o)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all border ${
              active
                ? "bg-primary text-primary-foreground border-primary shadow-soft"
                : "bg-card border-border text-foreground hover:border-primary/50"
            }`}
          >
            {format ? format(o) : String(o)}
          </button>
        );
      })}
    </div>
  );
}

function diffDays(a: string, b: string): number {
  if (!a || !b) return 0;
  const d1 = new Date(a).getTime();
  const d2 = new Date(b).getTime();
  if (isNaN(d1) || isNaN(d2) || d2 < d1) return 0;
  return Math.round((d2 - d1) / 86400000);
}

export function PriceCalculator({ remaining }: { remaining: number }) {
  const [jobName, setJobName] = React.useState("");
  const [startPrice, setStartPrice] = React.useState(5000);
  const [estDays, setEstDays] = React.useState(10);
  const [hoursPerDay, setHoursPerDay] = React.useState(8);
  const [difficulty, setDifficulty] = React.useState<(typeof MULTIPLIERS)[number]>(1);
  const [freeRevisions, setFreeRevisions] = React.useState<(typeof FREE_REVISIONS)[number]>(2);
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [clientLevel, setClientLevel] =
    React.useState<(typeof CLIENT_LEVELS)[number]["key"]>("easy");
  const [paymentTerm, setPaymentTerm] =
    React.useState<(typeof PAYMENT_TERMS)[number]["key"]>("deposit50");
  const [discount, setDiscount] = React.useState(0);
  const [withholdTax, setWithholdTax] = React.useState(false);

  const afterDifficulty = Math.round(startPrice * difficulty);
  const clientMult = CLIENT_LEVELS.find((c) => c.key === clientLevel)!.mult;
  const afterClient = Math.round(afterDifficulty * clientMult);
  const discountAmount = Math.min(afterClient, Math.max(0, Math.round(discount)));
  const afterDiscount = Math.max(0, afterClient - discountAmount);
  const whtAmount = withholdTax ? Math.round(afterDiscount * 0.03) : 0;
  const total = Math.max(0, afterDiscount - whtAmount);
  // Display the pre-WHT price as the main "ราคาที่ควรเสนอ" — freelancer should quote this gross amount.
  const animated = useAnimatedNumber(afterDiscount);
  const deposit = paymentTerm === "deposit50" ? Math.round(afterDiscount / 2) : afterDiscount;

  // Log usage on first real interaction (1 ครั้งต่อ session)
  const interactedRef = React.useRef(false);
  React.useEffect(() => {
    if (interactedRef.current) return;
    const changed =
      jobName.length > 0 ||
      startPrice !== 5000 ||
      estDays !== 10 ||
      hoursPerDay !== 8 ||
      difficulty !== 1 ||
      freeRevisions !== 2 ||
      clientLevel !== "easy" ||
      paymentTerm !== "deposit50" ||
      discount !== 0 ||
      withholdTax ||
      startDate !== "" ||
      endDate !== "";
    if (changed) {
      interactedRef.current = true;
      void logCalculatorUsageOnce();
    }
  }, [
    jobName,
    startPrice,
    estDays,
    hoursPerDay,
    difficulty,
    freeRevisions,
    clientLevel,
    paymentTerm,
    discount,
    withholdTax,
    startDate,
    endDate,
  ]);

  const totalDays = diffDays(startDate, endDate);
  const segments = freeRevisions + 1;
  const reviseDays =
    freeRevisions > 0 && totalDays > 0 ? Math.max(1, Math.round(totalDays / segments)) : 0;
  const revisionMarkers =
    freeRevisions > 0 && totalDays > 0
      ? Array.from({ length: freeRevisions }, (_, i) => ({
          pct: ((i + 1) / segments) * 100,
          day: Math.round(((i + 1) / segments) * totalDays),
          label: `แก้ครั้งที่ ${i + 1}`,
        }))
      : [];

  const safeHours = Math.max(1, hoursPerDay);
  const totalHours = estDays * safeHours;
  const hourlyRate = totalHours > 0 ? Math.round(total / totalHours) : 0;

  return (
    <div className="grid lg:grid-cols-[1fr,1.05fr] gap-4">
      {/* LEFT: Inputs */}
      <div className="rounded-3xl border border-border bg-card p-5 shadow-soft space-y-3.5">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Calculator className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-bold tracking-tight">ตั้งค่าการคำนวณ</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr,140px] gap-3">
          <div className="space-y-1">
            <Label htmlFor="pc-job-name" className="text-[11px] font-semibold">
              ชื่องาน
            </Label>
            <Input
              id="pc-job-name"
              placeholder="เช่น ออกแบบโลโก้ร้านกาแฟ"
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pc-start-price" className="text-[11px] font-semibold">
              ราคาเริ่มต้น
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                ฿
              </span>
              <Input
                id="pc-start-price"
                type="number"
                min={0}
                value={startPrice}
                onChange={(e) => setStartPrice(Math.max(0, Number(e.target.value) || 0))}
                className="h-9 pl-7"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-[11px] font-semibold">ความยากงาน</Label>
            <ChipRow
              options={MULTIPLIERS}
              value={difficulty}
              onChange={setDifficulty}
              format={(v) => `x${v.toFixed(2)}`}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="pc-est-days" className="text-[11px] font-semibold">
                วันทำงาน
              </Label>
              <Input
                id="pc-est-days"
                type="number"
                min={1}
                value={estDays}
                onChange={(e) => setEstDays(Math.max(1, Number(e.target.value) || 1))}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pc-hours-per-day" className="text-[11px] font-semibold">
                ชม./วัน
              </Label>
              <Input
                id="pc-hours-per-day"
                type="number"
                min={1}
                max={24}
                value={hoursPerDay}
                onChange={(e) =>
                  setHoursPerDay(Math.min(24, Math.max(1, Number(e.target.value) || 1)))
                }
                className="h-9"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] font-semibold">จำนวนแก้ฟรี (ครั้ง)</Label>
          <ChipRow
            options={FREE_REVISIONS}
            value={freeRevisions}
            onChange={setFreeRevisions}
            format={(v) => `${v} ครั้ง`}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] font-semibold">ไทม์ไลน์</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label
                htmlFor="pc-start-date"
                className="text-[10px] text-muted-foreground font-normal"
              >
                เริ่มงาน
              </Label>
              <Input
                id="pc-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 mt-0.5"
              />
            </div>
            <div>
              <Label
                htmlFor="pc-end-date"
                className="text-[10px] text-muted-foreground font-normal"
              >
                ส่งงานสุดท้าย
              </Label>
              <Input
                id="pc-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 mt-0.5"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-[11px] font-semibold">
            ความยากของลูกค้า{" "}
            <span className="text-[10px] font-normal text-muted-foreground">
              (เปลี่ยนใจบ่อย ยากต่อการสื่อสาร)
            </span>
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {CLIENT_LEVELS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setClientLevel(c.key)}
                className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold border transition-all ${
                  clientLevel === c.key
                    ? "bg-primary text-primary-foreground border-primary shadow-soft"
                    : "bg-card border-border text-foreground hover:border-primary/50"
                }`}
                title={c.desc}
              >
                {c.label} <span className="opacity-70">×{c.mult}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-[11px] font-semibold">เงื่อนไขชำระ</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {PAYMENT_TERMS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPaymentTerm(p.key)}
                  className={`rounded-lg px-1.5 py-1.5 text-[10px] font-semibold border transition-all ${
                    paymentTerm === p.key
                      ? "bg-primary text-primary-foreground border-primary shadow-soft"
                      : "bg-card border-border text-foreground hover:border-primary/50"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="pc-discount" className="text-[11px] font-semibold">
              ส่วนลด (บาท)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                ฿
              </span>
              <Input
                id="pc-discount"
                type="number"
                min={0}
                value={discount}
                onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                className="h-9 pl-7"
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setWithholdTax((v) => !v)}
          className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 transition-all ${
            withholdTax
              ? "border-primary bg-primary/5"
              : "border-border bg-card hover:border-primary/50"
          }`}
        >
          <div className="text-left">
            <div className="text-[11px] font-semibold">หัก ณ ที่จ่าย 3%</div>
            <div className="text-[10px] text-muted-foreground">นำไปคำนวณยอดสุทธิให้อัตโนมัติ</div>
          </div>
          <div
            className={`h-5 w-9 rounded-full p-0.5 transition-colors ${
              withholdTax ? "bg-primary" : "bg-muted"
            }`}
          >
            <div
              className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                withholdTax ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </div>
        </button>
      </div>

      {/* RIGHT: Result + Breakdown */}
      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-primary text-primary-foreground p-5 sm:p-6 shadow-elevated">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute -right-20 -bottom-20 h-52 w-52 rounded-full bg-white/5" />
          <div className="relative">
            <div className="text-[11px] font-semibold uppercase tracking-wider opacity-90">
              ราคาที่ควรเสนอ (ก่อนหัก ณ ที่จ่าย 3%)
            </div>
            <div className="mt-1.5 flex items-baseline gap-1">
              <span className="text-4xl sm:text-5xl font-bold tabular-nums tracking-tight">
                ฿{animated.toLocaleString("th-TH")}
              </span>
            </div>
            {withholdTax && (
              <div className="mt-1 text-[11px] opacity-90">
                หลังหัก 3% ลูกค้าโอนจริง{" "}
                <span className="font-bold">฿{total.toLocaleString("th-TH")}</span>
              </div>
            )}
            {jobName && <div className="mt-1.5 text-xs opacity-90 truncate">งาน: {jobName}</div>}
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <div className="rounded-xl bg-white/15 backdrop-blur px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wider opacity-80">
                  เฉลี่ย/ชั่วโมง
                </div>
                <div className="mt-0.5 text-sm font-bold tabular-nums">
                  ฿{hourlyRate.toLocaleString("th-TH")}
                </div>
                <div className="text-[9px] opacity-75 mt-0.5">
                  {estDays}วัน × {safeHours}ชม. = {totalHours}ชม.
                </div>
              </div>
              <div className="rounded-xl bg-white/15 backdrop-blur px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wider opacity-80">แก้ฟรี</div>
                <div className="mt-0.5 text-sm font-bold tabular-nums">{freeRevisions} ครั้ง</div>
              </div>
              <div className="rounded-xl bg-white/15 backdrop-blur px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wider opacity-80">
                  {paymentTerm === "deposit50" ? "มัดจำ 50%" : "ชำระเต็ม"}
                </div>
                <div className="mt-0.5 text-sm font-bold tabular-nums">
                  ฿{deposit.toLocaleString("th-TH")}
                </div>
              </div>
              {withholdTax && (
                <div className="rounded-xl bg-white/15 backdrop-blur px-3 py-2.5">
                  <div className="text-[10px] uppercase tracking-wider opacity-80">
                    หัก ณ ที่จ่าย 3%
                  </div>
                  <div className="mt-0.5 text-sm font-bold tabular-nums">
                    -฿{whtAmount.toLocaleString("th-TH")}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <h4 className="text-xs font-bold tracking-tight uppercase text-muted-foreground">
            รายละเอียด
          </h4>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">ราคาเริ่มต้น</span>
              <span className="font-semibold tabular-nums">
                ฿{startPrice.toLocaleString("th-TH")}
              </span>
            </div>
            {difficulty !== 1 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  × ความยากงาน (×{difficulty.toFixed(2)})
                </span>
                <span className="font-semibold tabular-nums text-primary">
                  ฿{afterDifficulty.toLocaleString("th-TH")}
                </span>
              </div>
            )}
            {clientMult !== 1 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">× ความยากลูกค้า (×{clientMult})</span>
                <span className="font-semibold tabular-nums">
                  ฿{afterClient.toLocaleString("th-TH")}
                </span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">ส่วนลด</span>
                <span className="font-semibold tabular-nums">
                  -฿{discountAmount.toLocaleString("th-TH")}
                </span>
              </div>
            )}
            {withholdTax && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  หัก ณ ที่จ่าย 3% (จาก ฿{afterDiscount.toLocaleString("th-TH")})
                </span>
                <span className="font-semibold tabular-nums">
                  -฿{whtAmount.toLocaleString("th-TH")}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-2 mt-1 border-t border-border">
              <span className="font-bold">รวมสุทธิ</span>
              <span className="font-bold tabular-nums">฿{total.toLocaleString("th-TH")}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">เฉลี่ย/ชั่วโมง ({totalHours} ชม.)</span>
              <span className="font-semibold tabular-nums text-primary">
                ฿{hourlyRate.toLocaleString("th-TH")}/ชม.
              </span>
            </div>
          </div>

          {(startDate || endDate) && (
            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-3 py-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-wider text-primary font-bold">
                  ไทม์ไลน์ + รอบส่งแก้
                </div>
                {totalDays > 0 && (
                  <div className="text-[10px] font-semibold text-muted-foreground">
                    รวม {totalDays} วัน
                  </div>
                )}
              </div>
              <div className="relative mt-3 h-8">
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 rounded-full bg-gradient-primary" />
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-primary border-2 border-card shadow" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-4 w-4 rounded-full bg-primary border-2 border-card shadow" />
                {revisionMarkers.map((m, idx) => (
                  <div
                    key={idx}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
                    style={{ left: `${m.pct}%` }}
                    title={`${m.label} • วันที่ ${m.day}`}
                  >
                    <div className="h-3.5 w-3.5 rounded-full bg-amber-400 border-2 border-card shadow ring-1 ring-amber-500/30" />
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                <span className="font-semibold">{startDate || "เริ่ม"}</span>
                <span className="font-semibold">{endDate || "ส่งงาน"}</span>
              </div>
              {totalDays > 0 && freeRevisions > 0 && reviseDays > 0 && (
                <div className="mt-2.5 rounded-lg bg-card border border-amber-200/60 dark:border-amber-500/30 px-2.5 py-1.5 text-[11px] leading-relaxed text-foreground">
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-400 mr-1.5 align-middle" />
                  เฉลี่ยส่งแก้ทุก <b>{reviseDays} วัน</b> รวม <b>{freeRevisions} ครั้ง</b> —
                  จุดสีเหลืองคือกำหนดส่งแก้แต่ละรอบ
                </div>
              )}
              {totalDays > 0 && freeRevisions === 0 && (
                <div className="mt-2.5 text-[11px] text-muted-foreground">
                  ไม่มีรอบส่งแก้ฟรี — ส่งงานครบใน {totalDays} วัน
                </div>
              )}
            </div>
          )}

          <Link
            to="/apply"
            className="mt-4 block w-full text-center rounded-xl bg-gradient-primary text-primary-foreground px-5 py-3 text-sm font-bold shadow-soft hover:opacity-90 transition-opacity"
          >
            สนใจเป็นผู้ทดลอง 100 คนแรก
            {remaining > 0 && <span className="ml-1 opacity-90">(เหลืออีก {remaining} ที่)</span>}
          </Link>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
            จำกัดจำนวนสิทธิ์ เพื่อการดูแลอย่างทั่วถึง
          </p>
        </div>
      </div>
    </div>
  );
}

export default PriceCalculator;
