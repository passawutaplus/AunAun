import * as React from "react";
import { Slider } from "@/components/ui/slider";
import { formatTHB } from "@/data/mockData";

type Props = {
  label: string;
  hint?: string;
  value: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  icon?: React.ReactNode;
};

export function SimSlider({ label, hint, value, max, step = 1000, onChange, icon }: Props) {
  const safeMax = Math.max(0, Math.round(max));
  const clamped = Math.min(value, safeMax);
  const pct = safeMax > 0 ? (clamped / safeMax) * 100 : 0;
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium">
          {icon}
          <span>{label}</span>
        </div>
        <span className="num text-sm font-bold text-primary">฿{formatTHB(clamped)}</span>
      </div>
      <Slider
        value={[clamped]}
        max={safeMax || 1}
        step={step}
        onValueChange={(v) => onChange(v[0] ?? 0)}
        disabled={safeMax === 0}
      />
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{pct.toFixed(0)}% ของเพดาน</span>
        <span>สูงสุดไม่เกิน ฿{formatTHB(safeMax)}</span>
      </div>
      {hint && <p className="text-[10px] text-muted-foreground italic">{hint}</p>}
    </div>
  );
}
