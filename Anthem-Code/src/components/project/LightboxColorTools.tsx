import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Contrast, Copy, Crosshair, Pipette, Search } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toolBtnClass } from "@/components/project/LightboxViewTools";
import { useImagePalette } from "@/hooks/useImagePalette";
import { toHexColor } from "@/lib/imagePalette";
import { palettePercentages } from "@/lib/imageColorTools";
import { cn } from "@/lib/utils";

type EyeDropperResult = { sRGBHex: string };
type EyeDropperCtor = new () => { open: () => Promise<EyeDropperResult> };

type Props = {
  src: string;
  grayscale: boolean;
  onGrayscaleChange: (on: boolean) => void;
  /** Browsers without the EyeDropper API: the lightbox lets the user click the image instead. */
  pickMode: boolean;
  onPickModeChange: (on: boolean) => void;
  /** Colour picked by clicking the image (fallback eyedropper). */
  pickedHex: string | null;
  /** "Colour isolate": the swatch whose colour is kept while the rest of the image turns grey. */
  isolateHex: string | null;
  onIsolateChange: (hex: string | null) => void;
  /** Viewing tools (mirror, loupe, view mode, guides) shown after the colour tools. */
  children?: ReactNode;
};

async function copyText(text: string, done: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(done);
  } catch {
    toast.error("คัดลอกไม่สำเร็จ");
  }
}

/** Naive RGB → CMYK (no ICC profile) — a starting point for print, not a proof. */
export function hexToCmyk(hex: string): string {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const k = 1 - Math.max(r, g, b);
  if (k >= 1) return "C0 M0 Y0 K100";
  const [c, m, y] = [r, g, b].map((v) => Math.round(((1 - v - k) / (1 - k)) * 100));
  return `C${c} M${m} Y${y} K${Math.round(k * 100)}`;
}

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  return `rgb(${[0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(", ")})`;
}

const menuItem = "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent";

/** Tap a swatch → its codes (HEX / RGB / CMYK / Figma token), each copied on its own. */
function Swatch({
  hex,
  label,
  share,
  shares,
  isolated,
  onIsolate,
}: {
  hex: string;
  label?: string;
  /** Percent of the image this colour covers. */
  share?: number;
  /** Every swatch's share — drawn as the image's colour "DNA" bar. */
  shares: [string, number][];
  isolated: boolean;
  onIsolate: (on: boolean) => void;
}) {
  const navigate = useNavigate();
  const up = hex.toUpperCase();
  const codes: [string, string][] = [
    ["HEX", up],
    ["RGB", hexToRgb(hex)],
    ["CMYK", hexToCmyk(hex)],
    ["Figma", JSON.stringify({ $type: "color", $value: up })],
  ];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`สี ${up}${label ? ` (${label})` : ""}${share != null ? ` ${share}%` : ""}`}
          title={share != null ? `${up} — ${share}%` : up}
          className={cn(
            "h-6 w-6 shrink-0 rounded-full border border-white/30 shadow-sm transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:h-7 sm:w-7",
            isolated && "ring-2 ring-white ring-offset-2 ring-offset-black/60",
          )}
          style={{ backgroundColor: hex }}
        />
      </PopoverTrigger>
      <PopoverContent side="top" className="z-[120] w-60 space-y-1 p-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-1 pb-1">
          <span className="h-8 w-8 shrink-0 rounded-md border border-border" style={{ backgroundColor: hex }} aria-hidden />
          <span className="font-mono text-sm tabular-nums">{up}</span>
          {share != null ? (
            <span className="ml-auto text-xs tabular-nums text-muted-foreground">{share}% ของภาพ</span>
          ) : null}
        </div>
        {shares.length > 1 ? (
          <div className="flex h-2 overflow-hidden rounded-full px-1" aria-label="สัดส่วนสีในภาพ">
            {shares.map(([c, pct]) => (
              <span
                key={c}
                title={`${c.toUpperCase()} — ${pct}%`}
                className={cn("h-full", c === hex && "outline outline-2 -outline-offset-2 outline-foreground")}
                style={{ backgroundColor: c, width: `${pct}%` }}
              />
            ))}
          </div>
        ) : null}
        {codes.map(([name, value]) => (
          <button
            key={name}
            type="button"
            className={menuItem}
            onClick={() => void copyText(value, `คัดลอก ${name} แล้ว`)}
            title={`คัดลอก ${name}`}
          >
            <span className="w-11 shrink-0 text-xs text-muted-foreground">{name}</span>
            <span className="min-w-0 flex-1 truncate font-mono text-xs tabular-nums">
              {name === "Figma" ? "Variable (JSON)" : value}
            </span>
            <Copy className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          </button>
        ))}
        <div className="h-px bg-border" />
        <button type="button" className={menuItem} onClick={() => onIsolate(!isolated)} aria-pressed={isolated}>
          <Crosshair className="h-3.5 w-3.5" aria-hidden />
          <span className="flex-1">{isolated ? "เลิกแยกสี" : "แยกเฉพาะสีนี้"}</span>
          {isolated ? <Check className="h-3.5 w-3.5 text-primary" aria-hidden /> : null}
        </button>
        <button
          type="button"
          className={menuItem}
          onClick={() => navigate(`/?mode=projects&color=${encodeURIComponent(hex)}`)}
        >
          <Search className="h-3.5 w-3.5" aria-hidden /> ค้นหาผลงานโทนนี้
        </button>
      </PopoverContent>
    </Popover>
  );
}

/** Palette swatches → eyedropper → black & white, then the viewing tools. */
export default function LightboxColorTools({
  src,
  grayscale,
  onGrayscaleChange,
  pickMode,
  onPickModeChange,
  pickedHex,
  isolateHex,
  onIsolateChange,
  children,
}: Props) {
  const raw = useImagePalette(src, 6);
  // The hook falls back to made-up hsl() colours when the image cannot be read; do not show those as "from the image".
  const readable = raw.length > 0 && raw.every((c) => !c.startsWith("hsl("));
  const palette = readable ? [...new Set(raw.map(toHexColor))] : [];
  const [dropped, setDropped] = useState<string | null>(null);

  useEffect(() => setDropped(null), [src]);

  const colorsKey = [...palette, dropped ?? ""].join(",");
  const [shareMap, setShareMap] = useState<Record<string, number>>({});
  useEffect(() => {
    let alive = true;
    const colors = colorsKey.split(",").filter(Boolean);
    void palettePercentages(src, colors).then((m) => alive && setShareMap(m));
    return () => {
      alive = false;
    };
  }, [src, colorsKey]);
  const shares = Object.entries(shareMap)
    .filter(([, pct]) => pct > 0)
    .sort((a, b) => b[1] - a[1]);
  const swatchProps = (hex: string) => ({
    share: shareMap[hex],
    shares,
    isolated: isolateHex === hex,
    onIsolate: (on: boolean) => onIsolateChange(on ? hex : null),
  });
  useEffect(() => {
    if (pickedHex) setDropped(pickedHex);
  }, [pickedHex]);

  const startEyedropper = async () => {
    const Ctor = (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper;
    if (Ctor) {
      try {
        const res = await new Ctor().open();
        setDropped(res.sRGBHex.toLowerCase());
      } catch {
        /* user cancelled */
      }
      return;
    }
    onPickModeChange(!pickMode);
    if (!pickMode) toast.message("แตะบนภาพเพื่อเลือกสี");
  };

  return (
    <div
      className="flex max-w-[95vw] flex-wrap items-center justify-center gap-1.5 rounded-full border border-white/15 bg-black/45 px-3 py-2 backdrop-blur-md sm:gap-2"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {palette.length ? (
        <div className="flex items-center gap-1.5" aria-label="พาเลตต์สีของภาพ">
          {palette.map((hex) => (
            <Swatch key={hex} hex={hex} {...swatchProps(hex)} />
          ))}
        </div>
      ) : (
        <span className="px-1 text-xs text-white/60">อ่านสีจากภาพนี้ไม่ได้</span>
      )}

      {/* Picked colour and the eyedropper share one pill — they belong together. */}
      <div className="flex items-center gap-1 rounded-full border border-white/20 bg-white/5 p-0.5">
        {dropped && !palette.includes(dropped) ? <Swatch hex={dropped} label="สีที่เลือก" {...swatchProps(dropped)} /> : null}
        <button
          type="button"
          onClick={() => void startEyedropper()}
          aria-pressed={pickMode}
          aria-label="ดูดสีจากภาพ"
          title="ดูดสีจากภาพ"
          className={cn(toolBtnClass(pickMode), "h-7 w-7 border-transparent")}
        >
          {pickMode ? <Check className="h-4 w-4" aria-hidden /> : <Pipette className="h-4 w-4" aria-hidden />}
        </button>
      </div>
      <button
        type="button"
        onClick={() => onGrayscaleChange(!grayscale)}
        aria-pressed={grayscale}
        aria-label="ดูภาพขาวดำ"
        title="ขาวดำ"
        className={toolBtnClass(grayscale)}
      >
        <Contrast className="h-4 w-4" aria-hidden />
      </button>

      <span aria-hidden className="mx-0.5 h-5 w-px bg-white/25" />

      {children}
    </div>
  );
}
