import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Heart, Copy, Palette, Wand2, Sparkles, Eye, Image as ImageIcon } from "lucide-react";
import { normalizeHex, getColorBreakdown, preferWhiteText } from "@/lib/colorUtils";
import { ColorCodesTable } from "./ColorCodesTable";
import { ContrastBadge } from "./ContrastBadge";
import { AiMentorSuggest } from "./AiMentorSuggest";
import { ColorChartPicker } from "./ColorChartPicker";
import { HarmonyWheelSection } from "./HarmonyWheel/HarmonyWheelSection";
import { ColorVariations } from "./ColorVariations";
import { GradientBuilder } from "./GradientBuilder";
import { ContrastChecker } from "./ContrastChecker";
import { ColorBlindnessSimulator } from "./ColorBlindnessSimulator";
import { PaletteFromImage } from "./PaletteFromImage";
import { MyPalettesQuickPick } from "./MyPalettesQuickPick";

import { TailwindExport } from "./TailwindExport";
import { SaveColorDialog } from "@/components/dashboard/labs/SaveColorDialog";
import { toast } from "sonner";

async function quickCopy(label: string, value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`คัดลอก ${label}: ${value}`);
  } catch {
    toast.error("ก๊อปปี้ไม่สำเร็จ");
  }
}

interface Props {
  hex: string;
  onHexChange: (hex: string) => void;
  onApply?: (hex: string) => void;
  applyLabel?: string;
  showPreview?: boolean;
}

export function ColorLabInline({
  hex,
  onHexChange,
  onApply,
  applyLabel = "+ เพิ่มเข้าบรีฟ",
  showPreview = true,
}: Props) {
  const [hexInput, setHexInput] = React.useState<string>(hex);
  const [saveOpen, setSaveOpen] = React.useState(false);
  React.useEffect(() => {
    setHexInput(hex);
  }, [hex]);

  const breakdown = React.useMemo(() => getColorBreakdown(hex), [hex]);
  const useWhite = preferWhiteText(hex);

  const commitHex = (v: string) => {
    const n = normalizeHex(v);
    if (!n) {
      toast.error("Hex code ไม่ถูกต้อง (เช่น #FF6B00)");
      return;
    }
    setHexInput(n);
    onHexChange(n);
  };

  const apply = () => {
    if (!onApply) return;
    onApply(hex);
    toast.success(`เพิ่มสี ${hex} แล้ว`);
  };

  if (!breakdown) return null;

  return (
    <div>
      {showPreview && (
        <div
          className="relative min-h-44 sm:min-h-56 flex flex-col items-center justify-center gap-3 p-4 transition-colors rounded-xl overflow-hidden"
          style={{ backgroundColor: hex, color: useWhite ? "#fff" : "#000" }}
        >
          <div className="text-center space-y-1">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight">Aa Bb อักษรไทย</div>
            <div className="text-[10px] sm:text-xs font-mono opacity-80">
              {hex} · {breakdown.rgb.css}
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-1.5 max-w-full">
            {[
              { label: "HEX", value: breakdown.hex },
              { label: "RGB", value: breakdown.rgb.css },
              { label: "HSL", value: breakdown.hsl.css },
              { label: "CMYK", value: breakdown.cmyk.css },
              { label: "Pantone", value: breakdown.pantone.code },
              { label: "Tailwind", value: `--brand-color: ${breakdown.hex};` },
            ].map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => quickCopy(c.label, c.value)}
                className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono backdrop-blur-md border transition hover:scale-105 active:scale-95"
                style={{
                  backgroundColor: useWhite ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)",
                  borderColor: useWhite ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.15)",
                }}
                title={`คัดลอก ${c.label}: ${c.value}`}
              >
                <span className="font-semibold opacity-80">{c.label}</span>
                <Copy className="h-3 w-3 opacity-70 group-hover:opacity-100" />
              </button>
            ))}
          </div>

          <div className="absolute top-2 right-2 flex gap-1.5">
            <ContrastBadge ratio={breakdown.contrastWhite} bg="white" />
            <ContrastBadge ratio={breakdown.contrastBlack} bg="black" />
          </div>
        </div>
      )}

      <div className="p-1 pt-4 space-y-4">
        <MyPalettesQuickPick onPick={commitHex} />

        {/* Hex input row — shared across tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={hexInput}
            onChange={(e) => setHexInput(e.target.value)}
            onBlur={() => commitHex(hexInput)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitHex(hexInput);
            }}
            className="font-mono uppercase max-w-[140px] h-10"
            placeholder="#FF6B00"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setSaveOpen(true)}
            className="gap-1.5 rounded-xl h-10"
          >
            <Heart className="h-4 w-4 text-primary" /> บันทึกสีนี้
          </Button>
          <TailwindExport hex={hex} />
          {onApply && (
            <Button onClick={apply} className="ml-auto gap-1.5 rounded-xl">
              <Plus className="h-4 w-4" /> {applyLabel}
            </Button>
          )}
        </div>

        <Tabs defaultValue="picker" className="w-full">
          <TabsList className="grid grid-cols-2 sm:grid-cols-5 w-full h-auto gap-1">
            <TabsTrigger value="picker" className="gap-1.5 text-xs">
              <Palette className="h-3.5 w-3.5" /> เลือกสี
            </TabsTrigger>
            <TabsTrigger value="harmony" className="gap-1.5 text-xs">
              <Wand2 className="h-3.5 w-3.5" /> ชุดสี
            </TabsTrigger>
            <TabsTrigger value="gradient" className="gap-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5" /> ไล่สี
            </TabsTrigger>
            <TabsTrigger value="blindness" className="gap-1.5 text-xs">
              <Eye className="h-3.5 w-3.5" /> ตาบอดสี
            </TabsTrigger>
            <TabsTrigger value="from-image" className="gap-1.5 text-xs">
              <ImageIcon className="h-3.5 w-3.5" /> จากรูป
            </TabsTrigger>
          </TabsList>

          <TabsContent value="picker" className="mt-4 space-y-4">
            <div className="grid sm:grid-cols-[260px_1fr] gap-4 items-start">
              <div className="space-y-3">
                <ColorChartPicker
                  value={hex}
                  onChange={commitHex}
                  className="w-full max-w-[260px] mx-auto sm:mx-0"
                />
                <ColorVariations hex={hex} onPick={commitHex} />
              </div>
              <ColorCodesTable breakdown={breakdown} />
            </div>
            <AiMentorSuggest hex={hex} onPick={commitHex} />
            <ContrastChecker hex={hex} />
          </TabsContent>

          <TabsContent value="harmony" className="mt-4">
            <HarmonyWheelSection hex={hex} onHexChange={commitHex} />
          </TabsContent>

          <TabsContent value="gradient" className="mt-4">
            <GradientBuilder baseHex={hex} onActiveColorChange={commitHex} />
          </TabsContent>

          <TabsContent value="blindness" className="mt-4">
            <ColorBlindnessSimulator hex={hex} />
          </TabsContent>

          <TabsContent value="from-image" className="mt-4">
            <PaletteFromImage onPick={commitHex} />
          </TabsContent>
        </Tabs>

        <p className="text-[10px] text-muted-foreground italic">
          * ค่า CMYK / Pantone เป็นการคำนวณเบื้องต้นจากหน้าจอ
          โปรดตรวจสอบกับโรงพิมพ์อีกครั้งก่อนสั่งผลิต
        </p>
      </div>

      {saveOpen && <SaveColorDialog open={saveOpen} onOpenChange={setSaveOpen} hex={hex} />}
    </div>
  );
}
