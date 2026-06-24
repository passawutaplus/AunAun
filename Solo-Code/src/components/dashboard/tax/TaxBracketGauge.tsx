import * as React from "react";
import { formatTHB } from "@/data/mockData";
import { TAX_BRACKETS } from "./whtUtils";
import { Sparkles, TrendingDown } from "lucide-react";

type Props = {
  netIncome: number;
  estimatedTax: number;
};

export function TaxBracketGauge({ netIncome, estimatedTax }: Props) {
  // Find current bracket: the highest bracket where netIncome > from
  let currentIdx = 0;
  for (let i = 0; i < TAX_BRACKETS.length; i++) {
    if (netIncome > TAX_BRACKETS[i].from) currentIdx = i;
  }
  const cur = TAX_BRACKETS[currentIdx];
  const remainToNext = isFinite(cur.to) ? Math.max(0, cur.to - netIncome) : 0;
  const fillPct = isFinite(cur.to) ? ((netIncome - cur.from) / (cur.to - cur.from)) * 100 : 100;

  // Visible brackets (skip 0% and 35% edge cases for compactness, but keep them)
  const visible = TAX_BRACKETS;

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-[10px] text-muted-foreground">ภาษีต้องชำระ (ขั้นบันได)</p>
          <p className="num text-2xl font-bold text-primary leading-tight">
            ฿{formatTHB(estimatedTax)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground">ฐานภาษีปัจจุบัน</p>
          <p className="num text-lg font-semibold">{(cur.rate * 100).toFixed(0)}%</p>
        </div>
      </div>

      <div className="flex gap-0.5 h-6 rounded-md overflow-hidden border border-border/60">
        {visible.map((b, i) => {
          const active = i === currentIdx;
          const passed = i < currentIdx;
          return (
            <div
              key={i}
              className={
                "relative flex-1 transition-colors " +
                (active ? "bg-primary" : passed ? "bg-primary/40" : "bg-muted")
              }
              title={`${(b.rate * 100).toFixed(0)}% · ${formatTHB(b.from)}-${isFinite(b.to) ? formatTHB(b.to) : "∞"}`}
            >
              {active && isFinite(b.to) && (
                <div
                  className="absolute inset-y-0 right-0 bg-primary/30"
                  style={{ width: `${Math.max(0, 100 - fillPct)}%` }}
                />
              )}
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold text-foreground/80">
                {(b.rate * 100).toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>

      {isFinite(cur.to) && remainToNext > 0 && currentIdx < TAX_BRACKETS.length - 1 && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <TrendingDown className="h-3 w-3 text-primary" />
          เหลือถึงฐาน {(TAX_BRACKETS[currentIdx + 1].rate * 100).toFixed(0)}% อีก{" "}
          <span className="num font-semibold text-foreground">฿{formatTHB(remainToNext)}</span>
        </p>
      )}
    </div>
  );
}

type InsightProps = {
  netIncome: number;
  estimatedTax: number;
  rmfSsfUsed: number;
  rmfSsfCap: number;
};

export function AiTaxInsight({ netIncome, estimatedTax, rmfSsfUsed, rmfSsfCap }: InsightProps) {
  // Find current bracket
  let currentIdx = 0;
  for (let i = 0; i < TAX_BRACKETS.length; i++) {
    if (netIncome > TAX_BRACKETS[i].from) currentIdx = i;
  }
  const cur = TAX_BRACKETS[currentIdx];

  // Suggestion: how much more deduction to drop one bracket?
  let suggestion: { add: number; saveTax: number; nextRate: number } | null = null;
  if (currentIdx > 0) {
    const dropTarget = cur.from; // need net income <= cur.from to drop into lower bracket
    const need = Math.max(0, netIncome - dropTarget);
    const headroom = Math.max(0, rmfSsfCap - rmfSsfUsed);
    if (need > 0 && need <= headroom + 50_000) {
      const lower = TAX_BRACKETS[currentIdx - 1];
      const saveTax = (cur.rate - lower.rate) * need;
      suggestion = { add: need, saveTax, nextRate: lower.rate };
    }
  }

  const overQuota = rmfSsfUsed > rmfSsfCap && rmfSsfCap > 0;

  if (!suggestion && !overQuota && estimatedTax === 0) {
    return (
      <div className="rounded-lg bg-success/10 border border-success/30 p-2.5 text-xs text-success-foreground">
        🎉 รายได้สุทธิอยู่ในเกณฑ์ยกเว้นภาษี — ไม่ต้องชำระเพิ่ม
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {suggestion && (
        <div className="rounded-lg bg-success/10 border border-success/30 p-2.5 text-xs leading-relaxed">
          <p className="flex items-start gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
            <span>
              💡 ลดหย่อนเพิ่ม{" "}
              <span className="num font-bold text-success">฿{formatTHB(suggestion.add)}</span> (เช่น
              SSF/RMF/ประกันบำนาญ) จะลดฐานเหลือ {(suggestion.nextRate * 100).toFixed(0)}% —
              ประหยัดภาษีประมาณ{" "}
              <span className="num font-bold text-success">
                ฿{formatTHB(Math.round(suggestion.saveTax))}
              </span>
            </span>
          </p>
        </div>
      )}
      {overQuota && (
        <div className="rounded-lg bg-warning/15 border border-warning/30 p-2.5 text-xs text-warning-foreground">
          ⚠ ใช้สิทธิ์กองทุน RMF/SSF เกินเพดาน — ส่วนเกิน ฿{formatTHB(rmfSsfUsed - rmfSsfCap)}{" "}
          จะถูกตัดออก
        </div>
      )}
      <p className="text-[10px] text-muted-foreground italic">
        * นี่เป็นเพียงการประมาณการเบื้องต้น โปรดตรวจสอบกับนักบัญชีก่อนยื่นจริง
      </p>
    </div>
  );
}
