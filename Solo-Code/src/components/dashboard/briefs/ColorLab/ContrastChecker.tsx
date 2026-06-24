import * as React from "react";
import { hexContrast, wcagStatus } from "@/lib/colorVariations";
import { Card } from "@/components/ui/card";
import { Check, X } from "lucide-react";

interface Props {
  hex: string;
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
        ok
          ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
          : "bg-rose-500/15 text-rose-600 border border-rose-500/30"
      }`}
    >
      {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      {label}
    </span>
  );
}

function Row({
  hex,
  bg,
  textColor,
  label,
}: {
  hex: string;
  bg: string;
  textColor: string;
  label: string;
}) {
  const ratio = hexContrast(hex, bg);
  const s = wcagStatus(ratio);
  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      <div
        className="p-3 flex items-center justify-between"
        style={{ backgroundColor: bg, color: textColor }}
      >
        <div className="space-y-0.5">
          <div className="text-base font-normal" style={{ color: textColor }}>
            Aa อักษรไทย (Normal)
          </div>
          <div className="text-2xl font-bold" style={{ color: textColor }}>
            Aa อักษรไทย (Large)
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs opacity-70">{label}</div>
          <div className="text-xl font-mono font-bold tabular-nums">{ratio.toFixed(2)}:1</div>
        </div>
      </div>
      <div className="bg-card p-2 flex flex-wrap gap-1.5">
        <StatusPill ok={s.aaNormal} label="AA Normal ≥4.5" />
        <StatusPill ok={s.aaLarge} label="AA Large ≥3" />
        <StatusPill ok={s.aaaNormal} label="AAA Normal ≥7" />
        <StatusPill ok={s.aaaLarge} label="AAA Large ≥4.5" />
      </div>
    </div>
  );
}

export function ContrastChecker({ hex }: Props) {
  return (
    <Card className="p-4 glass space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Contrast Checker (WCAG 2.1)</h4>
        <span className="text-[10px] text-muted-foreground font-mono">{hex}</span>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Row hex={hex} bg="#FFFFFF" textColor={hex} label="บนพื้นขาว" />
        <Row hex={hex} bg="#000000" textColor={hex} label="บนพื้นดำ" />
      </div>
    </Card>
  );
}
