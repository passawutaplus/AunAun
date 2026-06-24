import * as React from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { colord } from "colord";
import { InteractiveWheel } from "./InteractiveWheel";
import { HARMONY_MODES, computeHarmony, buildPalette5, type HarmonyMode } from "./harmonyMath";
import { MOODS, applyMood, applyMoodToPalette, type MoodId } from "./moodFilters";
import { Mockup603010 } from "../PaletteStrip/Mockup603010";
import { PrintDigitalToggle } from "../PrintDigitalToggle";

interface Props {
  hex: string;
  onHexChange: (hex: string) => void;
}

async function copyText(label: string, value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`คัดลอก ${label}: ${value}`);
  } catch {
    toast.error("ก๊อปปี้ไม่สำเร็จ");
  }
}

export function HarmonyWheelSection({ hex, onHexChange }: Props) {
  const [mode, setMode] = React.useState<HarmonyMode>("triadic");
  const [mood, setMood] = React.useState<MoodId>("default");

  const tunedHex = React.useMemo(() => applyMood(hex, mood), [hex, mood]);
  const harmony = React.useMemo(() => computeHarmony(tunedHex, mode), [tunedHex, mode]);
  const palette5 = React.useMemo(
    () => applyMoodToPalette(buildPalette5(hex, mode), mood),
    [hex, mode, mood],
  );

  return (
    <div className="space-y-5">
      {/* Mode selector */}
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground mb-2">
          โหมดคู่สี (Harmony Mode)
        </p>
        <div className="flex flex-wrap gap-1.5">
          {HARMONY_MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition ${
                mode === m.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card hover:bg-muted border-border"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mood filter */}
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground mb-2">อารมณ์ (Mood Filter)</p>
        <div className="flex flex-wrap gap-1.5">
          {MOODS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMood(m.id)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition flex items-center gap-1 ${
                mood === m.id
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card hover:bg-muted border-border"
              }`}
            >
              <span>{m.emoji}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Wheel */}
      <div className="rounded-xl border border-border bg-gradient-to-br from-muted/30 to-card p-4">
        <InteractiveWheel hex={tunedHex} mode={mode} onChange={onHexChange} />
        <p className="text-center text-[10px] text-muted-foreground mt-2">
          ลากบนวงล้อเพื่อเปลี่ยนสีหลัก · จุดอื่นจะวิ่งตามตามโหมดที่เลือก
        </p>
      </div>

      {/* Palette strip */}
      <div>
        <p className="text-[11px] font-semibold text-muted-foreground mb-2">
          พาเลตต์ที่ได้ ({palette5.length} สี) — คลิกเพื่อก๊อปปี้
        </p>
        <div className="flex rounded-xl overflow-hidden border border-border h-20">
          {palette5.map((c, i) => {
            const useWhite = colord(c).isDark();
            const onWhite = colord(c).contrast("#fff");
            const onBlack = colord(c).contrast("#000");
            const tier = Math.max(onWhite, onBlack);
            const wcag = tier >= 7 ? "AAA" : tier >= 4.5 ? "AA" : tier >= 3 ? "AA-L" : "FAIL";
            return (
              <button
                key={i}
                onClick={() => copyText("HEX", c)}
                className="flex-1 flex flex-col items-center justify-center gap-1 transition hover:scale-[1.03] relative group"
                style={{ backgroundColor: c, color: useWhite ? "#fff" : "#000" }}
                title={`คัดลอก ${c}`}
              >
                <span className="text-base font-bold">Aa</span>
                <span className="text-[9px] font-mono opacity-90">{c}</span>
                <span
                  className={`absolute top-1 right-1 text-[8px] font-mono px-1 rounded ${
                    wcag === "FAIL" ? "bg-red-500/80 text-white" : "bg-black/40 text-white"
                  }`}
                >
                  {wcag}
                </span>
                <Copy className="absolute bottom-1 right-1 h-3 w-3 opacity-0 group-hover:opacity-70 transition" />
                {i === 0 && (
                  <span className="absolute top-1 left-1 text-[8px] font-bold bg-foreground text-background px-1 rounded">
                    PRIMARY
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 mt-3">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 h-8 text-xs"
            onClick={() => copyText("Palette", palette5.join(", "))}
          >
            <Copy className="h-3 w-3" /> คัดลอกทั้งชุด
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 h-8 text-xs"
            onClick={() => {
              const css = palette5
                .map(
                  (c, i) =>
                    `--brand-${i === 0 ? "primary" : i === 1 ? "secondary" : `accent-${i - 1}`}: ${c};`,
                )
                .join("\n");
              copyText("CSS Variables", css);
            }}
          >
            <Check className="h-3 w-3" /> คัดลอก CSS Variables
          </Button>
        </div>
      </div>

      {/* 60-30-10 Mockup + Print/Digital */}
      <div className="pt-4 border-t border-border space-y-4">
        <Mockup603010 hex={hex} palette={palette5} />
        <PrintDigitalToggle hex={hex} />
      </div>
    </div>
  );
}

export { applyMoodToPalette, buildPalette5 };
