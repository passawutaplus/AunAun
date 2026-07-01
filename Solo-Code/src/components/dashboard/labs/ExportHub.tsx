import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  buildAseFile,
  buildCanvaHexList,
  buildCssVariables,
  buildDesignTokensJson,
  downloadBytes,
  parseAseColors,
  type ExportColor,
} from "@/lib/designExport";
import { normalizeHex } from "@/lib/colorUtils";
import { Copy, Download, Upload } from "lucide-react";
import { toast } from "sonner";

type Props = {
  hexes: string[];
  compact?: boolean;
};

export function ExportHub({ hexes, compact }: Props) {
  const colors: ExportColor[] = React.useMemo(() => {
    const unique = [...new Set(hexes.map((h) => normalizeHex(h)).filter(Boolean) as string[])];
    return unique.map((hex, i) => ({ name: `Color-${i + 1}`, hex }));
  }, [hexes]);

  async function copyText(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`คัดลอก ${label} แล้ว`);
    } catch {
      toast.error("คัดลอกไม่สำเร็จ");
    }
  }

  function exportAse() {
    if (!colors.length) return toast.error("ยังไม่มีสี");
    downloadBytes(buildAseFile(colors), "so1o-palette.ase", "application/octet-stream");
    toast.success("ดาวน์โหลด .ase สำหรับ Adobe แล้ว");
  }

  function importAse(file: File) {
    void file.arrayBuffer().then((buf) => {
      try {
        const parsed = parseAseColors(new Uint8Array(buf));
        if (!parsed.length) throw new Error("ไม่พบสี");
        void copyText("HEX จาก ASE", parsed.join("\n"));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "อ่าน ASE ไม่สำเร็จ");
      }
    });
  }

  if (!colors.length) return null;

  return (
    <Card className={`glass ${compact ? "p-3" : "p-5"} space-y-3`}>
      <div>
        <h3 className="text-sm font-bold">{compact ? "ส่งออกสี" : "ส่งไปโปรแกรมอื่น"}</h3>
        {!compact && (
          <p className="text-xs text-muted-foreground mt-1">
            Adobe · Figma Tokens · Canva · CSS — ประมวลผลบนเครื่องคุณ
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" className="text-xs h-8 gap-1" onClick={exportAse}>
          <Download className="h-3.5 w-3.5" /> Adobe (.ase)
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="text-xs h-8 gap-1"
          onClick={() => void copyText("Figma Tokens", buildDesignTokensJson(colors))}
        >
          <Copy className="h-3.5 w-3.5" /> Figma Tokens
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="text-xs h-8 gap-1"
          onClick={() => void copyText("Canva", buildCanvaHexList(colors))}
        >
          <Copy className="h-3.5 w-3.5" /> Canva
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="text-xs h-8 gap-1"
          onClick={() => void copyText("CSS", buildCssVariables(colors))}
        >
          <Copy className="h-3.5 w-3.5" /> CSS
        </Button>
      </div>
      {!compact && (
        <div className="flex items-center gap-2">
          <Input
            type="file"
            accept=".ase"
            className="text-xs h-8"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importAse(f);
              e.target.value = "";
            }}
          />
          <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-[10px] text-muted-foreground">นำเข้า .ase จาก Adobe</span>
        </div>
      )}
    </Card>
  );
}
