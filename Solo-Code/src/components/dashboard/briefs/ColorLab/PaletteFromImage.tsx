import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, ImagePlus, Save, Loader2 } from "lucide-react";
import { extractPaletteFromImage } from "@/lib/extractPalette";
import { useColorPalettes } from "@/hooks/useColorPalettes";
import { preferWhiteText } from "@/lib/colorUtils";
import { toast } from "sonner";

interface Props {
  onPick: (hex: string) => void;
}

export function PaletteFromImage({ onPick }: Props) {
  const [busy, setBusy] = React.useState(false);
  const [colors, setColors] = React.useState<string[]>([]);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { createPalette, addColor } = useColorPalettes();

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("รับเฉพาะไฟล์รูปภาพ");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("ไฟล์ใหญ่เกิน 5MB");
      return;
    }
    setBusy(true);
    try {
      if (preview) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(file));
      const result = await extractPaletteFromImage(file, 6);
      setColors(result);
      if (!name) setName(file.name.replace(/\.[^.]+$/, "").slice(0, 40));
      toast.success(`ดึงสีออกมาได้ ${result.length} สี`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ดึงสีไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const saveAsPalette = async () => {
    if (colors.length === 0) return;
    const id = await createPalette(name.trim() || "พาเลทจากรูปภาพ");
    if (!id) return;
    for (const hex of colors) {
      await addColor(id, hex);
    }
    toast.success("บันทึกพาเลทใหม่แล้ว");
  };

  return (
    <Card className="p-4 glass space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <ImagePlus className="h-4 w-4 text-primary" /> ดึงสีจากรูปภาพ
        </h4>
        {busy && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-colors p-6 text-center ${
          dragOver ? "border-primary bg-primary/5" : "border-border/60 hover:border-primary/60"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        {preview ? (
          <img src={preview} alt="ภาพต้นฉบับสำหรับดึงสี" className="mx-auto max-h-32 rounded-lg" />
        ) : (
          <>
            <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
            <p className="text-xs text-muted-foreground mt-2">
              ลากรูปมาวาง หรือคลิกเพื่อเลือกไฟล์ (≤ 5MB)
            </p>
          </>
        )}
      </div>

      {colors.length > 0 && (
        <div className="space-y-2">
          <div className="flex h-14 rounded-xl overflow-hidden border border-border/40">
            {colors.map((c, i) => (
              <button
                key={`${c}-${i}`}
                type="button"
                onClick={() => onPick(c)}
                className="flex-1 flex items-end justify-center pb-1 text-[10px] font-mono font-semibold transition hover:flex-[1.5]"
                style={{ backgroundColor: c, color: preferWhiteText(c) ? "#fff" : "#000" }}
                title={`เลือก ${c}`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ตั้งชื่อพาเลท"
              className="h-9 text-sm"
            />
            <Button onClick={saveAsPalette} className="gap-1.5 rounded-xl h-9">
              <Save className="h-4 w-4" /> บันทึก
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
