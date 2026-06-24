import * as React from "react";
import { colord } from "colord";
import { Monitor, Printer, AlertTriangle } from "lucide-react";

interface Props {
  hex: string;
}

/** Toggle to compare RGB (digital) vs CMYK (print) appearance. */
export function PrintDigitalToggle({ hex }: Props) {
  const [mode, setMode] = React.useState<"digital" | "print">("digital");
  const c = colord(hex);
  const cmyk = c.toCmyk();
  // Reverse CMYK → RGB to simulate ink mix; colord round-trips keep it close
  const printSim = colord({ c: cmyk.c, m: cmyk.m, y: cmyk.y, k: cmyk.k } as never)
    .toHex()
    .toUpperCase();

  const drift = Math.round(
    Math.abs(c.toRgb().r - colord(printSim).toRgb().r) +
      Math.abs(c.toRgb().g - colord(printSim).toRgb().g) +
      Math.abs(c.toRgb().b - colord(printSim).toRgb().b),
  );
  const driftWarn = drift > 20;

  return (
    <div className="rounded-xl border border-border p-3 space-y-3 bg-card">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-muted-foreground">เปรียบเทียบจอ vs งานพิมพ์</p>
        <div className="flex rounded-lg border border-border overflow-hidden text-[11px]">
          <button
            onClick={() => setMode("digital")}
            className={`px-2.5 py-1 flex items-center gap-1 ${
              mode === "digital" ? "bg-primary text-primary-foreground" : "bg-card"
            }`}
          >
            <Monitor className="h-3 w-3" /> Digital
          </button>
          <button
            onClick={() => setMode("print")}
            className={`px-2.5 py-1 flex items-center gap-1 ${
              mode === "print" ? "bg-primary text-primary-foreground" : "bg-card"
            }`}
          >
            <Printer className="h-3 w-3" /> Print
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg overflow-hidden border border-border">
          <div className="h-16" style={{ backgroundColor: hex }} />
          <div className="p-2 text-[10px]">
            <div className="font-bold flex items-center gap-1">
              <Monitor className="h-3 w-3" /> RGB (Digital)
            </div>
            <div className="font-mono text-muted-foreground">{hex}</div>
          </div>
        </div>
        <div className="rounded-lg overflow-hidden border border-border">
          <div className="h-16" style={{ backgroundColor: printSim }} />
          <div className="p-2 text-[10px]">
            <div className="font-bold flex items-center gap-1">
              <Printer className="h-3 w-3" /> CMYK (Print sim)
            </div>
            <div className="font-mono text-muted-foreground">
              C{cmyk.c} M{cmyk.m} Y{cmyk.y} K{cmyk.k}
            </div>
          </div>
        </div>
      </div>

      {driftWarn && (
        <div className="flex items-start gap-1.5 text-[10px] text-amber-600 bg-amber-500/10 rounded-md p-2">
          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
          <span>
            สีอาจเพี้ยนเมื่อพิมพ์จริง — ค่าต่างจากจอ ~{drift} หน่วย ควรขอ proof จากโรงพิมพ์ก่อน
          </span>
        </div>
      )}
    </div>
  );
}
