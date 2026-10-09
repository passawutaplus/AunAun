import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { hexToHsv, hsvToHex, normalizeColorQuery } from "@/lib/colorSearch";
import { cn } from "@/lib/utils";

type Hsv = { h: number; s: number; v: number };

type Props = {
  value: string | null;
  onChange: (hex: string | null) => void;
  className?: string;
};

const WHEEL =
  "conic-gradient(#ff3b30, #ffcc00, #34c759, #32ade6, #5856d6, #ff2d55, #ff3b30)";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

const ColorSearchButton = ({ value, onChange, className }: Props) => {
  const [open, setOpen] = useState(false);
  const [hsv, setHsv] = useState<Hsv>({ h: 0, s: 0, v: 0 });
  const [hexInput, setHexInput] = useState("#000000");
  const [hexFocused, setHexFocused] = useState(false);

  useEffect(() => {
    if (!open) return;
    const next = hexToHsv(value ?? "") ?? { h: 0, s: 0, v: 0 };
    setHsv(next);
    setHexInput(hsvToHex(next.h, next.s, next.v));
  }, [open, value]);

  useEffect(() => {
    if (hexFocused) return;
    setHexInput(hsvToHex(hsv.h, hsv.s, hsv.v));
  }, [hsv, hexFocused]);

  const preview = hsvToHex(hsv.h, hsv.s, hsv.v);

  const paintSv = (clientX: number, clientY: number, rect: DOMRect) => {
    const s = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const v = clamp((1 - (clientY - rect.top) / rect.height) * 100, 0, 100);
    setHsv((prev) => ({ ...prev, s, v }));
  };

  const apply = () => {
    const next = normalizeColorQuery(hexInput) ?? preview;
    onChange(next);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={value ? `ค้นหาจากสี ${value}` : "ค้นหาจากสี"}
          aria-pressed={Boolean(value)}
          data-color-search
          onMouseDown={(e) => e.preventDefault()}
          className={cn(
            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-secondary hover:bg-secondary/80",
            value && "ring-2 ring-foreground/25",
            className,
          )}
        >
          <span
            aria-hidden
            className="block h-4 w-4 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.18)]"
            style={{ background: value ?? WHEEL }}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(20.5rem,calc(100vw-1.5rem))] rounded-2xl p-3"
        data-color-search-panel
      >
        <div
          role="slider"
          aria-label="ความอิ่มตัวและความสว่าง"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(hsv.s)}
          tabIndex={0}
          className="relative h-40 w-full cursor-crosshair touch-none rounded-xl"
          style={{
            backgroundColor: `hsl(${hsv.h} 100% 50%)`,
            backgroundImage:
              "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)",
          }}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            paintSv(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
          }}
          onPointerMove={(event) => {
            if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
            paintSv(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
          }}
          onKeyDown={(event) => {
            const step = event.shiftKey ? 10 : 4;
            if (event.key === "ArrowLeft") setHsv((prev) => ({ ...prev, s: clamp(prev.s - step, 0, 100) }));
            if (event.key === "ArrowRight") setHsv((prev) => ({ ...prev, s: clamp(prev.s + step, 0, 100) }));
            if (event.key === "ArrowUp") setHsv((prev) => ({ ...prev, v: clamp(prev.v + step, 0, 100) }));
            if (event.key === "ArrowDown") setHsv((prev) => ({ ...prev, v: clamp(prev.v - step, 0, 100) }));
          }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.45)]"
            style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%`, backgroundColor: preview }}
          />
        </div>
        <label className="mt-3 block">
          <span className="sr-only">โทนสี</span>
          <input
            type="range"
            min={0}
            max={360}
            value={Math.round(hsv.h)}
            aria-label="โทนสี"
            onChange={(event) => setHsv((prev) => ({ ...prev, h: Number(event.target.value) }))}
            className="h-3 w-full cursor-pointer appearance-none rounded-full [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
            style={{
              background:
                "linear-gradient(90deg, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
            }}
          />
        </label>
        <div className="mt-3 flex items-center gap-2">
          <span
            aria-hidden
            className="h-9 w-9 shrink-0 rounded-full border border-border"
            style={{ backgroundColor: preview }}
          />
          <input
            value={hexInput}
            onChange={(event) => {
              const text = event.target.value;
              setHexInput(text);
              const next = normalizeColorQuery(text);
              const parsed = next ? hexToHsv(next) : null;
              if (parsed) setHsv(parsed);
            }}
            onFocus={() => setHexFocused(true)}
            onBlur={() => {
              setHexFocused(false);
              const next = normalizeColorQuery(hexInput);
              setHexInput(next ?? hsvToHex(hsv.h, hsv.s, hsv.v));
            }}
            aria-label="รหัสสี"
            spellCheck={false}
            className="h-9 min-w-0 flex-1 rounded-full border border-border bg-secondary px-3 font-mono text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="button"
            onClick={apply}
            className="h-9 shrink-0 rounded-full bg-foreground px-4 text-sm font-medium text-background hover:opacity-90"
          >
            ค้นหา
          </button>
        </div>
        {value ? (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className="mt-2 text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            ล้างสี
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
};

export default ColorSearchButton;
