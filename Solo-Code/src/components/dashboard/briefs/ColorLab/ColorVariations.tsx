import * as React from "react";
import { tints, shades, tones } from "@/lib/colorVariations";
import { preferWhiteText } from "@/lib/colorUtils";
import { toast } from "sonner";

interface RowProps {
  title: string;
  subtitle: string;
  swatches: string[];
  selected: string;
  onPick: (hex: string) => void;
}

function Row({ title, subtitle, swatches, selected, onPick }: RowProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2 px-0.5">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <span className="text-[10px] text-muted-foreground">{subtitle}</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
        {swatches.map((hex, i) => {
          const useWhite = preferWhiteText(hex);
          const active = hex.toUpperCase() === selected.toUpperCase();
          return (
            <button
              key={`${hex}-${i}`}
              type="button"
              onClick={() => {
                onPick(hex);
                navigator.clipboard?.writeText(hex).then(
                  () => toast.success(`เลือก & คัดลอก ${hex}`),
                  () => toast.success(`เลือก ${hex}`),
                );
              }}
              title={hex}
              className={`relative shrink-0 h-14 w-14 sm:h-16 sm:w-16 rounded-[14px] border transition-transform hover:scale-105 active:scale-95 ${
                active
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background border-primary/60"
                  : "border-white/40"
              }`}
              style={{
                backgroundColor: hex,
                color: useWhite ? "#fff" : "#000",
                boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              <span
                className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-mono opacity-0 hover:opacity-100 transition-opacity px-1 rounded"
                style={{ backgroundColor: useWhite ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.6)" }}
              >
                {hex.replace("#", "")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface Props {
  hex: string;
  onPick: (hex: string) => void;
}

const STEP_PRESETS = [5, 10, 15, 20] as const;
const INTENSITY_PRESETS = [
  { id: "soft", label: "Soft", value: 0.7 },
  { id: "normal", label: "Normal", value: 0.9 },
  { id: "strong", label: "Strong", value: 1 },
] as const;

export function ColorVariations({ hex, onPick }: Props) {
  const [steps, setSteps] = React.useState<number>(10);
  const [intensityId, setIntensityId] = React.useState<string>("normal");
  const intensity = INTENSITY_PRESETS.find((p) => p.id === intensityId)?.value ?? 0.9;

  const tintList = React.useMemo(() => tints(hex, steps, intensity), [hex, steps, intensity]);
  const shadeList = React.useMemo(() => shades(hex, steps, intensity), [hex, steps, intensity]);
  const toneList = React.useMemo(() => tones(hex, steps, intensity), [hex, steps, intensity]);

  return (
    <section className="rounded-2xl border border-white/40 bg-white/60 backdrop-blur-md p-4 space-y-4 shadow-soft">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        <h3 className="text-sm font-bold tracking-tight">Color Variations</h3>
        <span className="text-[10px] text-muted-foreground">คลิกเพื่อเลือก & คัดลอก</span>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-muted-foreground">จำนวน</span>
          {STEP_PRESETS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setSteps(n)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition ${
                steps === n
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card hover:bg-muted border-border"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-muted-foreground">ความเข้ม</span>
          {INTENSITY_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setIntensityId(p.id)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition ${
                intensityId === p.id
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card hover:bg-muted border-border"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <Row
        title="Tints"
        subtitle="บวกสีขาว — สว่างขึ้น"
        swatches={tintList}
        selected={hex}
        onPick={onPick}
      />
      <Row
        title="Shades"
        subtitle="บวกสีดำ — มืดลง"
        swatches={shadeList}
        selected={hex}
        onPick={onPick}
      />
      <Row
        title="Tones"
        subtitle="บวกสีเทา — นุ่มลง"
        swatches={toneList}
        selected={hex}
        onPick={onPick}
      />
    </section>
  );
}
