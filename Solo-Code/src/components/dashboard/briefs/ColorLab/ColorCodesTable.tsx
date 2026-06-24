import * as React from "react";
import { Button } from "@/components/ui/button";
import { Copy, FileJson, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import type { ColorBreakdown } from "@/lib/colorUtils";

interface Props {
  breakdown: ColorBreakdown;
}

export function ColorCodesTable({ breakdown }: Props) {
  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`คัดลอก ${label} แล้ว`);
    } catch {
      toast.error("ก๊อปปี้ไม่สำเร็จ");
    }
  };

  const copyJson = async () => {
    const payload = {
      hex: breakdown.hex,
      rgb: breakdown.rgb.css,
      hsl: breakdown.hsl.css,
      cmyk: breakdown.cmyk.css,
      pantone: breakdown.pantone.code,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      toast.success("คัดลอกทั้งชุดเป็น JSON แล้ว");
    } catch {
      toast.error("ก๊อปปี้ไม่สำเร็จ");
    }
  };

  const exportCsv = () => {
    try {
      const rowsCsv: Array<[string, string, string]> = [
        ["Format", "Code", "Usage"],
        ["HEX", breakdown.hex, "งานเว็บ / UI / แอป"],
        ["RGB", breakdown.rgb.css, "หน้าจอ / วิดีโอ / Social"],
        ["HSL", breakdown.hsl.css, "CSS / Dev"],
        ["CMYK", breakdown.cmyk.css, "งานพิมพ์ Offset / Digital"],
        [
          "Pantone (~)",
          `${breakdown.pantone.code} (ΔE ${breakdown.pantone.deltaE})`,
          "สกรีน / Brand standard",
        ],
      ];
      const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
      const csv = rowsCsv.map((r) => r.map(escape).join(",")).join("\r\n");
      // BOM for Excel Thai support
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `color-${breakdown.hex.replace("#", "")}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("ดาวน์โหลด CSV แล้ว");
    } catch {
      toast.error("Export CSV ไม่สำเร็จ");
    }
  };

  const rows: Array<{ label: string; code: string; hint: string }> = [
    { label: "HEX", code: breakdown.hex, hint: "งานเว็บ / UI / แอป" },
    { label: "RGB", code: breakdown.rgb.css, hint: "หน้าจอ / วิดีโอ / Social" },
    { label: "HSL", code: breakdown.hsl.css, hint: "CSS / Dev" },
    { label: "CMYK", code: breakdown.cmyk.css, hint: "งานพิมพ์ Offset / Digital" },
    {
      label: "Pantone (~)",
      code: `${breakdown.pantone.code} (ΔE ${breakdown.pantone.deltaE})`,
      hint: "สกรีน / Brand standard",
    },
  ];

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b">
        <div className="text-xs font-medium">รหัสสีทั้งหมด</div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1"
            onClick={exportCsv}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> Export CSV
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1"
            onClick={copyJson}
          >
            <FileJson className="h-3.5 w-3.5" /> Copy JSON
          </Button>
        </div>
      </div>
      <table className="w-full text-xs">
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b last:border-b-0 hover:bg-muted/30">
              <td className="px-3 py-2 font-mono font-semibold w-[110px]">{r.label}</td>
              <td className="px-3 py-2 font-mono text-foreground">{r.code}</td>
              <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">{r.hint}</td>
              <td className="px-2 py-2 text-right">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => copy(r.label, r.code)}
                  aria-label={`คัดลอก ${r.label}`}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
