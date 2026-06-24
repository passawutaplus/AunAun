import * as React from "react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Copy,
  Plus,
  Trash2,
  Sparkles,
  RotateCw,
  Shuffle,
  CheckCircle2,
  XCircle,
  ArrowUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  sortStops,
  colorAt,
  toCss,
  toTailwind,
  harmonyMidStop,
  newStopId,
  type GradientType,
  type Stop,
} from "@/lib/gradient";
import { ColorMixer } from "./ColorMixer";
import { randomizePalette, type RandomMode } from "@/lib/colorMix";
import { hexToRgb, contrastRatio, wcagStatus } from "@/lib/colorVariations";

interface Props {
  baseHex: string;
  onActiveColorChange?: (hex: string) => void;
}

export function GradientBuilder({ baseHex, onActiveColorChange }: Props) {
  const [type, setType] = React.useState<GradientType>("linear");
  const [angle, setAngle] = React.useState(90);
  const [stepped, setStepped] = React.useState(false);
  const [stops, setStops] = React.useState<Stop[]>(() => [
    { id: newStopId(), pos: 0, hex: baseHex },
    { id: newStopId(), pos: 100, hex: "#FF6B00" },
  ]);
  const [activeId, setActiveId] = React.useState<string>("");

  React.useEffect(() => {
    if (!activeId && stops[0]) setActiveId(stops[0].id);
  }, [stops, activeId]);

  const sorted = React.useMemo(() => sortStops(stops), [stops]);
  const css = toCss(type, angle, sorted, stepped);
  const tailwind = toTailwind(type, angle, sorted);
  const active = stops.find((s) => s.id === activeId) ?? stops[0];
  const midHex = colorAt(sorted, 50);

  // Contrast vs midpoint
  const midRgb = hexToRgb(midHex);
  const whiteRgb = { r: 255, g: 255, b: 255 };
  const blackRgb = { r: 0, g: 0, b: 0 };
  const cw = midRgb ? contrastRatio(whiteRgb, midRgb) : 1;
  const cb = midRgb ? contrastRatio(blackRgb, midRgb) : 1;
  const wcw = wcagStatus(cw);
  const wcb = wcagStatus(cb);

  const updateStop = (id: string, patch: Partial<Stop>) => {
    setStops((arr) => arr.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const addStopAt = (pos: number) => {
    const hex = colorAt(stops, pos);
    const ns: Stop = { id: newStopId(), pos: Math.round(pos), hex };
    setStops((arr) => [...arr, ns]);
    setActiveId(ns.id);
  };

  const removeStop = (id: string) => {
    if (stops.length <= 2) {
      toast.error("ต้องมีอย่างน้อย 2 stop");
      return;
    }
    setStops((arr) => arr.filter((s) => s.id !== id));
    if (id === activeId) {
      const remaining = stops.filter((s) => s.id !== id);
      setActiveId(remaining[0]?.id ?? "");
    }
  };

  const trackRef = React.useRef<HTMLDivElement>(null);
  const dragId = React.useRef<string | null>(null);

  const onTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    if ((e.target as HTMLElement).dataset.stop) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    addStopAt(pos);
  };

  const onPointerDown = (id: string) => (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setActiveId(id);
    dragId.current = id;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragId.current || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    updateStop(dragId.current, { pos: Math.round(pos) });
  };

  const onPointerUp = () => {
    dragId.current = null;
  };

  // Angle dial
  const dialRef = React.useRef<HTMLDivElement>(null);
  const dialDragging = React.useRef(false);
  const updateAngle = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    let deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (deg < 0) deg += 360;
    setAngle(Math.round(deg));
  };

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`คัดลอก ${label} แล้ว`);
    } catch {
      toast.error("ก๊อปปี้ไม่สำเร็จ");
    }
  };

  const harmonyMix = () => {
    const ns = harmonyMidStop(stops);
    if (!ns) return;
    setStops((arr) => [...arr, ns]);
    setActiveId(ns.id);
    toast.success("เพิ่ม Harmony Stop เนียนขึ้นแล้ว");
  };

  const randomize = (mode: RandomMode) => {
    const colors = randomizePalette(mode, 3);
    const ns: Stop[] = colors.map((hex, i) => ({
      id: newStopId(),
      pos: Math.round((i / (colors.length - 1)) * 100),
      hex,
    }));
    setStops(ns);
    setActiveId(ns[0].id);
    toast.success(`สุ่ม Gradient (${mode})`);
  };

  const addStopMiddle = () => {
    const s = sortStops(stops);
    let bestI = 0,
      bestGap = -1;
    for (let i = 0; i < s.length - 1; i++) {
      const gap = s[i + 1].pos - s[i].pos;
      if (gap > bestGap) {
        bestGap = gap;
        bestI = i;
      }
    }
    addStopAt((s[bestI].pos + s[bestI + 1].pos) / 2);
  };

  const ContrastBadge = ({
    ratio,
    label,
    status,
  }: {
    ratio: number;
    label: string;
    status: { aaNormal: boolean; aaLarge: boolean };
  }) => (
    <div className="flex items-center justify-between gap-2 text-[11px] px-2 py-1.5 rounded-lg bg-white/5 border border-white/10">
      <span className="font-medium">{label}</span>
      <span className="font-mono">{ratio.toFixed(2)}:1</span>
      <span className="flex items-center gap-1">
        {status.aaNormal ? (
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
        ) : (
          <XCircle className="h-3 w-3 text-rose-500" />
        )}
        AA
        {status.aaLarge && !status.aaNormal && <span className="text-amber-500">(Large)</span>}
      </span>
    </div>
  );

  return (
    <section
      className="rounded-2xl p-4 sm:p-5 backdrop-blur-xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] shadow-[0_8px_30px_rgba(0,0,0,0.08)] space-y-4"
      style={{ borderRadius: 14 }}
    >
      <header className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm sm:text-base font-semibold flex items-center gap-2">
          <span className="text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          Gradient Builder
          <span className="text-xs text-muted-foreground font-normal">(ตัวสร้างสีไล่เฉด)</span>
        </h3>
        <div className="flex items-center gap-1.5">
          <ToggleGroup
            type="single"
            value={type}
            onValueChange={(v) => v && setType(v as GradientType)}
            className="bg-white/5 rounded-xl p-0.5"
          >
            <ToggleGroupItem value="linear" className="text-xs h-7 px-2.5">
              Linear
            </ToggleGroupItem>
            <ToggleGroupItem value="radial" className="text-xs h-7 px-2.5">
              Radial
            </ToggleGroupItem>
            <ToggleGroupItem value="conic" className="text-xs h-7 px-2.5">
              Conic
            </ToggleGroupItem>
          </ToggleGroup>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 gap-1 text-xs rounded-xl"
              >
                <Shuffle className="h-3.5 w-3.5" /> Randomize
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => randomize("pastel")}>
                Pastel — สีหวาน
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => randomize("vibrant")}>
                Vibrant — สีสด
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => randomize("dark")}>
                Dark Mode — โทนเข้ม
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => randomize("surprise")}>
                Surprise — สุ่มอิสระ
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Live preview canvas */}
      <div
        className="h-40 w-full rounded-2xl border border-white/15 shadow-inner"
        style={{ background: css, borderRadius: 14 }}
      />

      <div className="grid lg:grid-cols-[1fr_280px] gap-4 items-start">
        {/* LEFT: stop bar + mixer */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Plus className="h-3 w-3" /> คลิกแถบเพื่อเพิ่ม stop · ลากจุดเพื่อเลื่อน ·
              ดับเบิลคลิกเพื่อลบ
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 gap-1 text-xs"
                onClick={addStopMiddle}
              >
                <Plus className="h-3.5 w-3.5" /> Stop
              </Button>
              {active && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 text-xs text-destructive"
                  onClick={() => removeStop(active.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> ลบ
                </Button>
              )}
            </div>
          </div>

          <div
            ref={trackRef}
            onClick={onTrackClick}
            className="relative h-12 rounded-2xl cursor-crosshair border border-white/15"
            style={{ background: toCss("linear", 90, sorted, stepped), borderRadius: 14 }}
          >
            {sorted.map((s) => (
              <button
                key={s.id}
                type="button"
                data-stop="1"
                onPointerDown={onPointerDown(s.id)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  removeStop(s.id);
                }}
                className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-7 w-7 rounded-full border-2 shadow-md transition ${
                  activeId === s.id
                    ? "border-primary ring-2 ring-primary/40 scale-110"
                    : "border-white"
                }`}
                style={{ left: `${s.pos}%`, background: s.hex }}
                title={`${s.hex} @ ${s.pos}%`}
              />
            ))}
          </div>

          {active && (
            <ColorMixer
              key={active.id}
              hex={active.hex}
              onChange={(hex) => updateStop(active.id, { hex })}
            />
          )}

          {onActiveColorChange && active && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl gap-1.5 w-full sm:w-auto"
              onClick={() => {
                onActiveColorChange(active.hex);
                toast.success(`ตั้ง ${active.hex} เป็นสีหลัก`);
              }}
            >
              <ArrowUp className="h-3.5 w-3.5 text-primary" /> ใช้สีนี้เป็นสีหลัก
            </Button>
          )}
        </div>

        {/* RIGHT: sidebar */}
        <div className="space-y-3">
          {type !== "radial" && (
            <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/5 border border-white/10">
              <Label className="text-xs text-muted-foreground">Angle</Label>
              <div
                ref={dialRef}
                onPointerDown={(e) => {
                  dialDragging.current = true;
                  (e.target as HTMLElement).setPointerCapture(e.pointerId);
                  updateAngle(e);
                }}
                onPointerMove={(e) => {
                  if (dialDragging.current) updateAngle(e);
                }}
                onPointerUp={() => {
                  dialDragging.current = false;
                }}
                className="relative h-20 w-20 rounded-full border-2 border-white/20 bg-white/5 cursor-grab active:cursor-grabbing select-none"
              >
                <div
                  className="absolute left-1/2 top-1/2 h-1 w-8 origin-left bg-primary rounded-full"
                  style={{ transform: `translate(0, -50%) rotate(${angle - 90}deg)` }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-xs font-mono font-semibold pointer-events-none">
                  {angle}°
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 gap-1 text-xs"
                onClick={() => setAngle((a) => (a + 45) % 360)}
              >
                <RotateCw className="h-3 w-3" /> +45°
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10">
            <Label htmlFor="stepped" className="text-xs">
              Stepped (สีตัด)
            </Label>
            <Switch id="stepped" checked={stepped} onCheckedChange={setStepped} />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-1.5 rounded-xl"
            onClick={harmonyMix}
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" /> AI Harmony Mix
          </Button>

          {/* Contrast Auto-Check */}
          <div className="space-y-1.5 p-2.5 rounded-xl bg-white/5 border border-white/10">
            <div className="text-[11px] text-muted-foreground font-medium">
              Contrast vs Midpoint
            </div>
            <ContrastBadge ratio={cw} label="White text" status={wcw} />
            <ContrastBadge ratio={cb} label="Black text" status={wcb} />
          </div>
        </div>
      </div>

      {/* Real-world Object Previews */}
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Preview on Objects</div>
        <div className="flex flex-wrap items-end gap-4">
          {/* Mobile screen */}
          <div className="relative h-44 w-24 rounded-3xl border-4 border-zinc-800 shadow-xl overflow-hidden bg-zinc-900">
            <div className="absolute inset-0" style={{ background: css }} />
            <div className="absolute top-1 left-1/2 -translate-x-1/2 h-1.5 w-10 rounded-full bg-zinc-800" />
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-10 rounded-full bg-white/60" />
          </div>
          {/* Credit card */}
          <div
            className="relative rounded-2xl shadow-xl overflow-hidden text-white p-3 flex flex-col justify-between"
            style={{ background: css, width: 224, aspectRatio: "1.586 / 1" }}
          >
            <div className="flex items-center justify-between">
              <div className="h-5 w-7 rounded bg-white/40" />
              <span className="text-[10px] font-semibold opacity-90">SO1O</span>
            </div>
            <div className="font-mono text-sm tracking-widest drop-shadow">•••• 6B00</div>
          </div>
          {/* Button */}
          <button
            type="button"
            className="px-5 py-2.5 rounded-xl text-white font-medium shadow-md text-sm"
            style={{ background: css }}
          >
            ปุ่มตัวอย่าง
          </button>
        </div>
      </div>

      {/* Export */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <code className="flex-1 text-[11px] font-mono px-2.5 py-2 rounded-lg bg-white/5 border border-white/10 truncate">
            background: {css};
          </code>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-lg gap-1"
            onClick={() => copy("CSS", `background: ${css};`)}
          >
            <Copy className="h-3.5 w-3.5" /> CSS
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-[11px] font-mono px-2.5 py-2 rounded-lg bg-white/5 border border-white/10 truncate">
            {tailwind}
          </code>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-lg gap-1"
            onClick={() => copy("Tailwind", tailwind)}
          >
            <Copy className="h-3.5 w-3.5" /> TW
          </Button>
        </div>
      </div>
    </section>
  );
}
