import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Grid3x3 } from "lucide-react";
import { toast } from "sonner";

const PRESETS = [
  { id: "ig-1", label: "IG Post 1:1", w: 1080, h: 1080 },
  { id: "ig-story", label: "IG Story 9:16", w: 1080, h: 1920 },
  { id: "a4", label: "A4 Print", w: 2480, h: 3508 },
  { id: "slide", label: "Slide 16:9", w: 1920, h: 1080 },
];

export function LayoutGridLab() {
  const [presetId, setPresetId] = React.useState(PRESETS[0].id);
  const preset = PRESETS.find((p) => p.id === presetId) ?? PRESETS[0];

  const specText = [
    `Layout spec — ${preset.label}`,
    `ขนาด: ${preset.w} × ${preset.h} px`,
    "Grid: 8pt baseline · margin 48px · gutter 16px",
    "Rule of thirds overlay สำหรับจัดองค์ประกอบ",
    "",
    "คัดลอกข้อความนี้ใส่ Smart Brief → หมายเหตุ",
  ].join("\n");

  async function copySpec() {
    try {
      await navigator.clipboard.writeText(specText);
      toast.success("คัดลอก spec แล้ว");
    } catch {
      toast.error("คัดลอกไม่สำเร็จ");
    }
  }

  function downloadOverlay() {
    const canvas = document.createElement("canvas");
    canvas.width = Math.min(preset.w, 800);
    const scale = canvas.width / preset.w;
    canvas.height = Math.round(preset.h * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "rgba(99,102,241,0.35)";
    ctx.lineWidth = 1;
    const w = canvas.width;
    const h = canvas.height;
    for (let x = 0; x <= w; x += 8 * scale) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += 8 * scale) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255,99,71,0.5)";
    ctx.lineWidth = 2;
    for (let i = 1; i < 3; i++) {
      const x = (w / 3) * i;
      const y = (h / 3) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `grid-${preset.id}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("ดาวน์โหลด overlay แล้ว");
    });
  }

  return (
    <Card className="p-5 glass space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 text-primary p-2.5">
          <Grid3x3 className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold">Layout Grid</h3>
          <p className="text-xs text-muted-foreground mt-1">สเปกและ overlay สำหรับ brief — ไม่ใช่ editor</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">ขนาดงาน</Label>
        <Select value={presetId} onValueChange={setPresetId}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <pre className="text-[10px] bg-muted/40 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{specText}</pre>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => void copySpec()}>
          <Copy className="h-3.5 w-3.5" /> คัดลอก spec
        </Button>
        <Button type="button" size="sm" onClick={downloadOverlay}>
          ดาวน์โหลด overlay PNG
        </Button>
      </div>
    </Card>
  );
}
