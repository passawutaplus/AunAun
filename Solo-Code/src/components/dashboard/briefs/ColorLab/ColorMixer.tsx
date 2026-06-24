import * as React from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Palette, Sun, Moon, Droplets, Copy, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { composeMix, deriveMixFromHex, type MixState } from "@/lib/colorMix";
import { hexToRgb } from "@/lib/colorVariations";

interface Props {
  hex: string;
  onChange: (hex: string) => void;
}

const HUE_GRADIENT =
  "linear-gradient(90deg, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)";

interface RowProps {
  icon: React.ReactNode;
  label: string;
  thaiLabel: string;
  value: number;
  max: number;
  unit: string;
  trackBg: string;
  thumbColor: string;
  startSwatch?: string;
  endSwatch?: string;
  onChange: (v: number) => void;
}

function MixerSlider({
  icon,
  label,
  thaiLabel,
  value,
  max,
  unit,
  trackBg,
  thumbColor,
  startSwatch,
  endSwatch,
  onChange,
}: RowProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="text-primary">{icon}</span>
          {thaiLabel} <span className="text-muted-foreground">({label})</span>
        </span>
        <span className="font-mono text-muted-foreground">
          {Math.round(value)}
          {unit}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {startSwatch && (
          <span
            className="h-3.5 w-3.5 rounded-full border border-white/30 shrink-0"
            style={{ background: startSwatch }}
          />
        )}
        <div className="flex-1 relative">
          <div
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-3.5 rounded-full pointer-events-none border border-white/15"
            style={{ background: trackBg, borderRadius: 14 }}
          />
          <Slider
            value={[value]}
            min={0}
            max={max}
            step={1}
            onValueChange={(v) => onChange(v[0] ?? 0)}
            className="relative z-10 [&_[data-slot=slider-track]]:bg-transparent [&_[data-slot=slider-track]]:h-3.5 [&_[data-slot=slider-range]]:bg-transparent [&_[data-slot=slider-thumb]]:h-5 [&_[data-slot=slider-thumb]]:w-5 [&_[data-slot=slider-thumb]]:border-[3px] [&_[data-slot=slider-thumb]]:border-white [&_[data-slot=slider-thumb]]:shadow-md"
            style={{ ["--mixer-thumb" as string]: thumbColor }}
          />
        </div>
        {endSwatch && (
          <span
            className="h-3.5 w-3.5 rounded-full border border-white/30 shrink-0"
            style={{ background: endSwatch }}
          />
        )}
      </div>
    </div>
  );
}

export function ColorMixer({ hex, onChange }: Props) {
  const [mix, setMix] = React.useState<MixState>(() => deriveMixFromHex(hex));
  const lastEmitted = React.useRef<string>(hex);

  // External hex change → re-derive (only when truly new)
  React.useEffect(() => {
    if (hex.toUpperCase() !== lastEmitted.current.toUpperCase()) {
      setMix(deriveMixFromHex(hex));
      lastEmitted.current = hex.toUpperCase();
    }
  }, [hex]);

  // Mix change → emit
  React.useEffect(() => {
    const next = composeMix(mix);
    if (next.toUpperCase() !== lastEmitted.current.toUpperCase()) {
      lastEmitted.current = next.toUpperCase();
      onChange(next);
    }
  }, [mix, onChange]);

  const current = composeMix(mix);
  const rgb = hexToRgb(current);

  const set = <K extends keyof MixState>(k: K, v: number) => setMix((m) => ({ ...m, [k]: v }));
  const reset = () => setMix({ hue: mix.hue, tint: 0, shade: 0, tone: 0 });

  return (
    <div
      className="space-y-3 rounded-2xl p-3 sm:p-4 bg-white/5 backdrop-blur-md border border-white/10"
      style={{ borderRadius: 14 }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="h-9 w-9 rounded-xl border border-white/20 shadow-sm shrink-0"
            style={{ background: current }}
          />
          <div className="text-xs font-mono leading-tight">
            <div className="font-semibold">{current}</div>
            {rgb && (
              <div className="text-[10px] text-muted-foreground">
                rgb({Math.round(rgb.r)}, {Math.round(rgb.g)}, {Math.round(rgb.b)})
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 gap-1 text-xs"
            onClick={() => {
              navigator.clipboard.writeText(current);
              toast.success(`คัดลอก ${current}`);
            }}
          >
            <Copy className="h-3.5 w-3.5" /> Copy
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 gap-1 text-xs"
            onClick={reset}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        </div>
      </div>

      <MixerSlider
        icon={<Palette className="h-3.5 w-3.5" />}
        label="Hue"
        thaiLabel="สี"
        value={mix.hue}
        max={360}
        unit="°"
        trackBg={HUE_GRADIENT}
        thumbColor={current}
        onChange={(v) => set("hue", v)}
      />
      <MixerSlider
        icon={<Sun className="h-3.5 w-3.5" />}
        label="Tint"
        thaiLabel="ทินท์"
        value={mix.tint}
        max={100}
        unit="%"
        trackBg={`linear-gradient(90deg, ${current} 0%, #FFFFFF 100%)`}
        thumbColor={current}
        startSwatch={current}
        endSwatch="#FFFFFF"
        onChange={(v) => set("tint", v)}
      />
      <MixerSlider
        icon={<Moon className="h-3.5 w-3.5" />}
        label="Shade"
        thaiLabel="เฉดสี"
        value={mix.shade}
        max={100}
        unit="%"
        trackBg={`linear-gradient(90deg, ${current} 0%, #000000 100%)`}
        thumbColor={current}
        startSwatch={current}
        endSwatch="#000000"
        onChange={(v) => set("shade", v)}
      />
      <MixerSlider
        icon={<Droplets className="h-3.5 w-3.5" />}
        label="Tone"
        thaiLabel="โทนสี"
        value={mix.tone}
        max={100}
        unit="%"
        trackBg={`linear-gradient(90deg, ${current} 0%, #808080 100%)`}
        thumbColor={current}
        startSwatch={current}
        endSwatch="#808080"
        onChange={(v) => set("tone", v)}
      />
    </div>
  );
}
