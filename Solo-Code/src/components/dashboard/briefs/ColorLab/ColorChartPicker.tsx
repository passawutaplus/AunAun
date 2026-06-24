import * as React from "react";
import { colord } from "colord";
import { normalizeHex } from "@/lib/colorUtils";

interface Props {
  value: string;
  onChange: (hex: string) => void;
  size?: number;
  className?: string;
}

/** 2D Saturation x Value chart + horizontal Hue slider. Controlled by hex string. */
export function ColorChartPicker({ value, onChange, size, className }: Props) {
  const safeHex = normalizeHex(value) ?? "#FF0000";
  const hsv = React.useMemo(() => colord(safeHex).toHsv(), [safeHex]);

  const [hue, setHue] = React.useState(hsv.h);
  const [sat, setSat] = React.useState(hsv.s);
  const [val, setVal] = React.useState(hsv.v);

  // Sync from external value when it changes meaningfully (avoid feedback loops while dragging)
  const draggingRef = React.useRef<null | "sv" | "hue">(null);
  React.useEffect(() => {
    if (draggingRef.current) return;
    setHue(hsv.h);
    setSat(hsv.s);
    setVal(hsv.v);
  }, [hsv.h, hsv.s, hsv.v]);

  const emit = (h: number, s: number, v: number) => {
    const hex = colord({ h, s, v }).toHex().toUpperCase();
    onChange(hex);
  };

  const svRef = React.useRef<HTMLDivElement>(null);
  const hueRef = React.useRef<HTMLDivElement>(null);

  const handleSV = (clientX: number, clientY: number) => {
    const el = svRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - r.left, 0), r.width);
    const y = Math.min(Math.max(clientY - r.top, 0), r.height);
    const s = (x / r.width) * 100;
    const v = 100 - (y / r.height) * 100;
    setSat(s);
    setVal(v);
    emit(hue, s, v);
  };

  const handleHue = (clientX: number) => {
    const el = hueRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - r.left, 0), r.width);
    const h = (x / r.width) * 360;
    setHue(h);
    emit(h, sat, val);
  };

  const onSVDown = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    draggingRef.current = "sv";
    handleSV(e.clientX, e.clientY);
  };
  const onSVMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current !== "sv") return;
    handleSV(e.clientX, e.clientY);
  };
  const onSVUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).hasPointerCapture?.(e.pointerId)) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
    draggingRef.current = null;
  };

  const onHueDown = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    draggingRef.current = "hue";
    handleHue(e.clientX);
  };
  const onHueMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current !== "hue") return;
    handleHue(e.clientX);
  };
  const onHueUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).hasPointerCapture?.(e.pointerId)) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
    draggingRef.current = null;
  };

  // Keyboard a11y on SV chart
  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 1;
    let s = sat,
      v = val;
    if (e.key === "ArrowLeft") s = Math.max(0, sat - step);
    else if (e.key === "ArrowRight") s = Math.min(100, sat + step);
    else if (e.key === "ArrowUp") v = Math.min(100, val + step);
    else if (e.key === "ArrowDown") v = Math.max(0, val - step);
    else return;
    e.preventDefault();
    setSat(s);
    setVal(v);
    emit(hue, s, v);
  };

  const hueColor = colord({ h: hue, s: 100, v: 100 }).toHex();

  return (
    <div className={className} style={size ? { width: size } : undefined}>
      {/* SV Chart */}
      <div
        ref={svRef}
        role="slider"
        tabIndex={0}
        aria-label="เลือกความอิ่มสีและความสว่าง"
        aria-valuetext={`S ${Math.round(sat)}%, V ${Math.round(val)}%`}
        onPointerDown={onSVDown}
        onPointerMove={onSVMove}
        onPointerUp={onSVUp}
        onPointerCancel={onSVUp}
        onKeyDown={onKey}
        className="relative w-full aspect-square rounded-lg overflow-hidden border border-border cursor-crosshair touch-none select-none focus:outline-none focus:ring-2 focus:ring-primary"
        style={{ backgroundColor: hueColor }}
      >
        {/* white -> transparent (saturation) */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to right, #fff, rgba(255,255,255,0))" }}
        />
        {/* transparent -> black (value) */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, #000, rgba(0,0,0,0))" }}
        />
        {/* marker */}
        <div
          className="absolute w-4 h-4 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.6)] pointer-events-none -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${sat}%`,
            top: `${100 - val}%`,
            backgroundColor: safeHex,
          }}
        />
      </div>

      {/* Hue Slider */}
      <div
        ref={hueRef}
        role="slider"
        aria-label="เลือกเฉดสี"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hue)}
        onPointerDown={onHueDown}
        onPointerMove={onHueMove}
        onPointerUp={onHueUp}
        onPointerCancel={onHueUp}
        className="relative mt-3 h-3 w-full rounded-full border border-border cursor-pointer touch-none select-none"
        style={{
          background:
            "linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)",
        }}
      >
        <div
          className="absolute top-1/2 w-4 h-4 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.6)] pointer-events-none -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${(hue / 360) * 100}%`,
            backgroundColor: hueColor,
          }}
        />
      </div>
    </div>
  );
}
