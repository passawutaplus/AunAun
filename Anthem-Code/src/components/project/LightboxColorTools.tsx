import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Copy, Pipette, Search, Contrast, Grid3x3 } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useImagePalette } from "@/hooks/useImagePalette";
import { toHexColor } from "@/lib/imagePalette";
import { cn } from "@/lib/utils";

type EyeDropperResult = { sRGBHex: string };
type EyeDropperCtor = new () => { open: () => Promise<EyeDropperResult> };

type Props = {
  src: string;
  grayscale: boolean;
  onGrayscaleChange: (on: boolean) => void;
  golden: boolean;
  onGoldenChange: (on: boolean) => void;
  /** Browsers without the EyeDropper API: the lightbox lets the user click the image instead. */
  pickMode: boolean;
  onPickModeChange: (on: boolean) => void;
  /** Colour picked by clicking the image (fallback eyedropper). */
  pickedHex: string | null;
};

async function copyHex(hex: string) {
  try {
    await navigator.clipboard.writeText(hex.toUpperCase());
    toast.success(`คัดลอก ${hex.toUpperCase()} แล้ว`);
  } catch {
    toast.error("คัดลอกไม่สำเร็จ");
  }
}

function Swatch({ hex, label }: { hex: string; label?: string }) {
  const navigate = useNavigate();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`สี ${hex.toUpperCase()}${label ? ` (${label})` : ""}`}
          title={hex.toUpperCase()}
          className="h-7 w-7 shrink-0 rounded-full border border-white/30 shadow-sm transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          style={{ backgroundColor: hex }}
        />
      </PopoverTrigger>
      <PopoverContent side="top" className="z-[120] w-48 space-y-1.5 p-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-1 pb-1">
          <span className="h-6 w-6 rounded-md border border-border" style={{ backgroundColor: hex }} aria-hidden />
          <span className="font-mono text-sm tabular-nums">{hex.toUpperCase()}</span>
        </div>
        <button
          type="button"
          onClick={() => void copyHex(hex)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
        >
          <Copy className="h-3.5 w-3.5" aria-hidden /> คัดลอกโค้ดสี
        </button>
        <button
          type="button"
          onClick={() => navigate(`/?mode=projects&color=${encodeURIComponent(hex)}`)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
        >
          <Search className="h-3.5 w-3.5" aria-hidden /> ค้นหาผลงานโทนนี้
        </button>
      </PopoverContent>
    </Popover>
  );
}

/** Palette (6 colours), eyedropper, black & white and golden-ratio overlay for the large image view. */
export default function LightboxColorTools({
  src,
  grayscale,
  onGrayscaleChange,
  golden,
  onGoldenChange,
  pickMode,
  onPickModeChange,
  pickedHex,
}: Props) {
  const raw = useImagePalette(src, 6);
  // The hook falls back to made-up hsl() colours when the image cannot be read; do not show those as "from the image".
  const readable = raw.length > 0 && raw.every((c) => !c.startsWith("hsl("));
  const palette = readable ? [...new Set(raw.map(toHexColor))] : [];
  const [dropped, setDropped] = useState<string | null>(null);

  useEffect(() => setDropped(null), [src]);
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

  const toggle = "flex h-8 w-8 items-center justify-center rounded-full border text-white transition-colors";

  return (
    <div
      className="flex max-w-[95vw] flex-wrap items-center justify-center gap-2 rounded-full border border-white/15 bg-black/45 px-3 py-2 backdrop-blur-md"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {palette.length ? (
        <div className="flex items-center gap-1.5" aria-label="พาเลตต์สีของภาพ">
          {palette.map((hex) => (
            <Swatch key={hex} hex={hex} />
          ))}
        </div>
      ) : (
        <span className="px-1 text-xs text-white/60">อ่านสีจากภาพนี้ไม่ได้</span>
      )}

      {dropped ? (
        <>
          <span aria-hidden className="mx-0.5 h-5 w-px bg-white/25" />
          <Swatch hex={dropped} label="สีที่เลือก" />
        </>
      ) : null}

      <span aria-hidden className="mx-0.5 h-5 w-px bg-white/25" />

      <button
        type="button"
        onClick={() => void startEyedropper()}
        aria-pressed={pickMode}
        aria-label="ดูดสีจากภาพ"
        title="ดูดสีจากภาพ"
        className={cn(toggle, pickMode ? "border-white bg-white/25" : "border-white/20 hover:bg-white/15")}
      >
        {pickMode ? <Check className="h-4 w-4" aria-hidden /> : <Pipette className="h-4 w-4" aria-hidden />}
      </button>
      <button
        type="button"
        onClick={() => onGrayscaleChange(!grayscale)}
        aria-pressed={grayscale}
        aria-label="ดูภาพขาวดำ"
        title="ขาวดำ"
        className={cn(toggle, grayscale ? "border-white bg-white/25" : "border-white/20 hover:bg-white/15")}
      >
        <Contrast className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => onGoldenChange(!golden)}
        aria-pressed={golden}
        aria-label="เส้น golden ratio"
        title="Golden ratio"
        className={cn(toggle, golden ? "border-white bg-white/25" : "border-white/20 hover:bg-white/15")}
      >
        <Grid3x3 className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
