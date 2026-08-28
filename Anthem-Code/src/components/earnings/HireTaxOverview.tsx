import { Link } from "react-router-dom";
import { estimatePersonalIncomeTax } from "@/lib/payments/taxEstimate";
import { satangToThb } from "@/lib/payments/fees";
import { formatMoneyLabel } from "@/lib/payments/fxDisplay";
import { hireIncomeYearSatang } from "@/lib/payments/hireIncomeChart";
import type { HireIncomeItem } from "@/lib/payments/hireWallet";
import { cn } from "@/lib/utils";

type Props = {
  income: HireIncomeItem[];
  year?: number;
  isPreview?: boolean;
};

function money(thb: number) {
  return formatMoneyLabel(thb, "THB");
}

/** Estimate PIT from hire income recorded on Aplus1 — not tax advice. */
export function HireTaxOverview({ income, year = new Date().getFullYear(), isPreview }: Props) {
  const sums = hireIncomeYearSatang(income, year);
  const estimate = estimatePersonalIncomeTax({
    grossIncomeThb: satangToThb(sums.revenueSatang),
    whtWithheldThb: satangToThb(sums.whtSatang),
  });
  const buddhistYear = year + 543;
  const towardTaxableGross = 120_000;
  const progress = Math.min(100, Math.round((estimate.grossIncomeThb / towardTaxableGross) * 100));
  const remainingToTaxable = Math.max(0, towardTaxableGross - estimate.grossIncomeThb);
  const zeroTax = estimate.estimatedTaxThb <= 0;

  return (
    <section className="space-y-4 rounded-2xl border border-border/70 bg-card/50 p-4 sm:p-5">
      <div>
        <h2 className="text-sm font-semibold">ประมาณการภาษี ปี {buddhistYear}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          คิดจากราคางานบน Aplus1 ปีนี้ — ค่าใช้จ่ายเหมา 50% (สูงสุด ฿100,000) และลดหย่อนส่วนตัว ฿60,000
        </p>
      </div>

      {sums.count === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          ยังไม่มีรายได้จากแพลตฟอร์มในปีนี้ — เมื่อมีงานจ้าง ระบบจะรวมยอดให้อัตโนมัติ
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="รายได้บนแพลตฟอร์ม" value={money(estimate.grossIncomeThb)} />
            <Stat label="หัก ณ ที่จ่ายแล้ว" value={money(estimate.whtWithheldThb)} />
            <Stat label="ภาษีประมาณการ" value={money(estimate.estimatedTaxThb)} />
            <Stat
              label={estimate.netTaxDueThb >= 0 ? "คงเหลือต้องชำระ" : "เครดิตประมาณการ"}
              value={money(Math.abs(estimate.netTaxDueThb))}
              accent
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span>
                {zeroTax
                  ? "ปีนี้ยังไม่ถึงเกณฑ์เสียภาษีเงินได้ (หลังค่าใช้จ่ายเหมาและลดหย่อน)"
                  : "มีเงินได้สุทธิที่ต้องคำนวณภาษี"}
              </span>
              <span className="tabular-nums">
                {money(estimate.grossIncomeThb)} / {money(towardTaxableGross)}
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="ความคืบหน้ารายได้เทียบเกณฑ์เริ่มมีเงินได้สุทธิ"
            >
              <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
            </div>
            {zeroTax && remainingToTaxable > 0 ? (
              <p className="text-[11px] text-muted-foreground">
                อีกประมาณ {money(remainingToTaxable)} จึงเริ่มมีเงินได้สุทธิหลังลดหย่อนพื้นฐาน
              </p>
            ) : null}
          </div>

          <dl className="space-y-1.5 text-sm">
            <Row label="ราคางานรวม" value={money(estimate.grossIncomeThb)} />
            <Row label="ค่าใช้จ่ายเหมา 50%" value={`−${money(estimate.expenseThb)}`} muted />
            <Row label="ลดหย่อนส่วนตัว" value={`−${money(estimate.personalAllowanceThb)}`} muted />
            <div className="border-t border-border/60 pt-1.5">
              <Row label="เงินได้สุทธิ" value={money(estimate.taxableThb)} />
            </div>
            <Row label="ภาษีขั้นบันได (ประมาณ)" value={money(estimate.estimatedTaxThb)} />
            <Row label="เครดิตหัก ณ ที่จ่าย (50 ทวิ)" value={`−${money(estimate.whtWithheldThb)}`} muted />
            <div className="border-t border-border/60 pt-1.5">
              <Row
                label={estimate.netTaxDueThb >= 0 ? "ประมาณการที่ต้องชำระเพิ่ม" : "ประมาณการเครดิต/ขอคืน"}
                value={money(Math.abs(estimate.netTaxDueThb))}
                strong
              />
            </div>
          </dl>
        </>
      )}

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        ตัวเลขจากรายได้บนแพลตฟอร์มเท่านั้น ไม่รวมงานนอก Aplus1 และไม่ใช่คำแนะนำทางภาษี —
        ควรตรวจกับนักบัญชีก่อนยื่นแบบ
        {isPreview ? " · ข้อมูลตัวอย่าง" : ""}{" "}
        <Link
          to={isPreview ? "/earnings?preview=wallet" : "/earnings"}
          className="font-medium text-primary hover:underline"
        >
          ดูธุรกรรม
        </Link>
      </p>
    </section>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={cn("rounded-lg border border-border/60 bg-background/50 px-2.5 py-2", accent && "border-primary/30 bg-primary/5")}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  strong,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className={muted ? "text-muted-foreground" : "text-foreground/80"}>{label}</dt>
      <dd className={`tabular-nums ${strong ? "font-semibold" : ""}`}>{value}</dd>
    </div>
  );
}
