import * as React from "react";
import { Button } from "@/components/ui/button";
import { Shuffle, Copy } from "lucide-react";
import { colord } from "colord";
import { toast } from "sonner";

interface Props {
  hex: string;
  /** A 3+ length palette (use harmony palette). First 3 are used for 60/30/10. */
  palette: string[];
}

const RATIO_PRESETS = [
  { id: "60-30-10", label: "60 / 30 / 10", values: [60, 30, 10] as const, name: "Classic" },
  { id: "70-20-10", label: "70 / 20 / 10", values: [70, 20, 10] as const, name: "Minimal" },
  { id: "50-30-20", label: "50 / 30 / 20", values: [50, 30, 20] as const, name: "Balanced" },
  { id: "40-40-20", label: "40 / 40 / 20", values: [40, 40, 20] as const, name: "Dual-tone" },
];

export function Mockup603010({ hex, palette }: Props) {
  const [order, setOrder] = React.useState([0, 1, 2]);
  const [ratioId, setRatioId] = React.useState<string>("60-30-10");
  const ratio = RATIO_PRESETS.find((r) => r.id === ratioId)?.values ?? [60, 30, 10];

  // Ensure we have 3 distinct colors; fallback by mixing
  const pool = React.useMemo(() => {
    const arr = [...palette];
    const c = colord(hex);
    while (arr.length < 3) {
      arr.push(
        c
          .rotate(arr.length * 60)
          .toHex()
          .toUpperCase(),
      );
    }
    return arr.slice(0, Math.max(3, palette.length));
  }, [palette, hex]);

  const [bg, fg, accent] = [pool[order[0]], pool[order[1]], pool[order[2]]];
  const bgText = colord(bg).isDark() ? "#fff" : "#0F172A";
  const fgText = colord(fg).isDark() ? "#fff" : "#0F172A";
  const accentText = colord(accent).isDark() ? "#fff" : "#0F172A";

  const shuffle = () => {
    const next = [...order];
    next.push(next.shift()!);
    setOrder(next);
  };

  const copyAll = () => {
    const out = `${ratio[0]}% (Background): ${bg}\n${ratio[1]}% (Surface): ${fg}\n${ratio[2]}% (Accent): ${accent}`;
    navigator.clipboard.writeText(out).then(
      () => toast.success(`คัดลอกพาเลต ${ratio.join("-")} แล้ว`),
      () => toast.error("ก๊อปปี้ไม่สำเร็จ"),
    );
  };

  // Map ratio[1] (surface %) → navbar height in px (clamp 40-110)
  const navHeight = Math.round(40 + (ratio[1] / 100) * 180);
  // Map ratio[2] (accent %) → bottom accent strip height (clamp 4-32)
  const accentStripHeight = Math.round(4 + (ratio[2] / 100) * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-[11px] font-semibold text-muted-foreground">
          จำลอง UI ตามสัดส่วน {ratio.join(" / ")}
        </p>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={shuffle}>
            <Shuffle className="h-3 w-3" /> สลับ
          </Button>
          <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={copyAll}>
            <Copy className="h-3 w-3" /> คัดลอก
          </Button>
        </div>
      </div>

      {/* Ratio presets */}
      <div className="flex flex-wrap gap-1.5">
        {RATIO_PRESETS.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRatioId(r.id)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition ${
              ratioId === r.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card hover:bg-muted border-border"
            }`}
            title={r.name}
          >
            {r.label}
            <span className="ml-1 opacity-70">· {r.name}</span>
          </button>
        ))}
      </div>

      {/* Mockup */}
      <div
        className="rounded-xl overflow-hidden border border-border shadow-sm"
        style={{ backgroundColor: bg, color: bgText }}
      >
        {/* Surface bar — height scales with ratio[1] */}
        <div
          className="px-4 flex items-center justify-between transition-all"
          style={{ backgroundColor: fg, color: fgText, height: `${navHeight}px` }}
        >
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md" style={{ backgroundColor: accent }} />
            <span className="font-bold text-sm">So1o Studio</span>
          </div>
          <div className="hidden sm:flex gap-3 text-[11px] opacity-80">
            <span>หน้าหลัก</span>
            <span>ผลงาน</span>
            <span>ติดต่อ</span>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-8 space-y-3">
          <h3 className="text-xl font-bold leading-tight">หัวข้อใหญ่ของหน้า</h3>
          <p className="text-xs opacity-85 max-w-md">
            เนื้อหาตัวอย่าง — ดูว่าสีหลักทำหน้าที่เป็นพื้นหลังแล้วอ่านสบายตาแค่ไหน ลองกดปุ่ม "สลับ"
            เพื่อเทียบสัดส่วนใหม่
          </p>
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              className="px-4 py-2 rounded-lg text-xs font-bold shadow-md"
              style={{ backgroundColor: accent, color: accentText }}
            >
              เริ่มใช้งาน
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-lg text-xs font-medium border"
              style={{ borderColor: bgText, color: bgText, opacity: 0.8 }}
            >
              อ่านเพิ่ม
            </button>
          </div>
        </div>

        {/* Accent strip — height scales with ratio[2] */}
        <div
          className="w-full transition-all"
          style={{ backgroundColor: accent, height: `${accentStripHeight}px` }}
        />
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-2 text-[10px]">
        {[
          { pct: `${ratio[0]}%`, label: "พื้นหลัง", color: bg },
          { pct: `${ratio[1]}%`, label: "พื้นรอง", color: fg },
          { pct: `${ratio[2]}%`, label: "เน้น (CTA)", color: accent },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-border p-2 flex items-center gap-2"
          >
            <div className="h-6 w-6 rounded" style={{ backgroundColor: s.color }} />
            <div className="leading-tight">
              <div className="font-bold text-[11px]">{s.pct}</div>
              <div className="text-muted-foreground">{s.label}</div>
              <div className="font-mono text-[9px]">{s.color}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
