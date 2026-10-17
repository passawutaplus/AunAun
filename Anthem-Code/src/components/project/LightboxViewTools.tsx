import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { Check, Eye, FlipHorizontal2, FlipVertical2, Grid3x3, RotateCw, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

/** One "look" at a time — mixing blur with a colour-blind filter only confuses. */
export type LightboxViewMode =
  | "normal"
  | "blur"
  | "pixelate"
  | "invert"
  | "protan"
  | "deutan"
  | "tritan";
export type LightboxGuide = "none" | "thirds" | "golden";

type ViewModeItem = { id: LightboxViewMode; label: string; hint?: string };
/** Grouped so the menu reads as three short lists instead of one long one. */
const VIEW_MODE_GROUPS: { title: string; items: ViewModeItem[] }[] = [
  {
    title: "ภาพรวม",
    items: [
      { id: "normal", label: "ปกติ" },
      { id: "blur", label: "เบลอ (Squint test)", hint: "ดูว่าอะไรเด่นก่อน" },
      { id: "pixelate", label: "พิกเซล", hint: "ดูภาพรวมและลำดับความสำคัญ" },
      { id: "invert", label: "กลับสี (Negative)", hint: "เช็กองค์ประกอบและคอนทราสต์" },
    ],
  },
  {
    title: "การมองเห็นสี",
    items: [
      { id: "protan", label: "ตาบอดสีแดง (Protan)" },
      { id: "deutan", label: "ตาบอดสีเขียว (Deutan)" },
      { id: "tritan", label: "ตาบอดสีน้ำเงิน (Tritan)" },
    ],
  },
];

const GUIDES: { id: LightboxGuide; label: string }[] = [
  { id: "none", label: "ไม่แสดง" },
  { id: "thirds", label: "กฎสามส่วน" },
  { id: "golden", label: "Golden ratio" },
];

const FILTER_IDS: Partial<Record<LightboxViewMode, string>> = {
  pixelate: "lb-pixelate",
  protan: "lb-protan",
  deutan: "lb-deutan",
  tritan: "lb-tritan",
};

/** CSS `filter` for the image (and the loupe, so both show the same thing). */
export function lightboxFilter(mode: LightboxViewMode, blurPx: number, grayscale: boolean): string | undefined {
  const parts: string[] = [];
  if (grayscale) parts.push("grayscale(1)");
  if (mode === "blur") parts.push(`blur(${blurPx}px)`);
  if (mode === "invert") parts.push("invert(1)");
  const id = FILTER_IDS[mode];
  if (id) parts.push(`url(#${id})`);
  return parts.length ? parts.join(" ") : undefined;
}

// Colour-blindness simulation matrices (Viénot / Machado approximations, full severity).
const CVD: Record<"protan" | "deutan" | "tritan", string> = {
  protan: "0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0",
  deutan: "0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0",
  tritan: "0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0",
};

/** SVG filters referenced by `lightboxFilter` — render once inside the lightbox. */
export function LightboxFilterDefs() {
  return (
    <svg aria-hidden width="0" height="0" style={{ position: "absolute" }}>
      <defs>
        {/* Pixelate: sample one pixel per 12px cell, then grow it to fill the cell. */}
        <filter id="lb-pixelate" x="0" y="0" width="100%" height="100%">
          <feFlood x="5" y="5" width="2" height="2" />
          <feComposite width="12" height="12" />
          <feTile result="grid" />
          <feComposite in="SourceGraphic" in2="grid" operator="in" />
          <feMorphology operator="dilate" radius="6" />
        </filter>
        {(Object.keys(CVD) as (keyof typeof CVD)[]).map((k) => (
          <filter key={k} id={`lb-${k}`} colorInterpolationFilters="linearRGB">
            <feColorMatrix type="matrix" values={CVD[k]} />
          </filter>
        ))}
      </defs>
    </svg>
  );
}

/** Flips and quarter turns applied to the image (and mirrored by the loupe / eyedropper). */
export type ImageOrientation = { flipX: boolean; flipY: boolean; rotate: 0 | 90 | 180 | 270 };
export const UPRIGHT: ImageOrientation = { flipX: false, flipY: false, rotate: 0 };

export function orientationTransform(o: ImageOrientation): string | undefined {
  if (!o.flipX && !o.flipY && !o.rotate) return undefined;
  return `rotate(${o.rotate}deg) scale(${o.flipX ? -1 : 1}, ${o.flipY ? -1 : 1})`;
}

/**
 * Screen point → point on the un-rotated image (px in its layout box), or null when outside.
 * Undoes `orientationTransform` around the image centre.
 */
export function toImagePoint(img: HTMLElement, clientX: number, clientY: number, o: ImageOrientation) {
  const r = img.getBoundingClientRect();
  const w = img.offsetWidth;
  const h = img.offsetHeight;
  if (!w || !h) return null;
  const dx = clientX - (r.left + r.width / 2);
  const dy = clientY - (r.top + r.height / 2);
  const t = (o.rotate * Math.PI) / 180;
  let lx = dx * Math.cos(t) + dy * Math.sin(t);
  let ly = -dx * Math.sin(t) + dy * Math.cos(t);
  if (o.flipX) lx = -lx;
  if (o.flipY) ly = -ly;
  const x = w / 2 + lx;
  const y = h / 2 + ly;
  if (x < 0 || y < 0 || x > w || y > h) return null;
  return { x, y, w, h };
}

const PHI = (1 + Math.sqrt(5)) / 2;

/** Golden spiral in a φ×1 box, built from shrinking squares (each arc = quarter circle). */
function goldenSpiralPath(): string {
  // Rectangle left to carve: x, y, w, h. Squares are cut from left, top, right, bottom in turn.
  let [x, y, w, h] = [0, 0, PHI, 1];
  let d = `M 0 1`;
  for (let i = 0; i < 10; i++) {
    const s = Math.min(w, h);
    const side = i % 4;
    if (side === 0) {
      d += ` A ${s} ${s} 0 0 1 ${x + s} ${y}`;
      x += s;
      w -= s;
    } else if (side === 1) {
      d += ` A ${s} ${s} 0 0 1 ${x + w} ${y + s}`;
      y += s;
      h -= s;
    } else if (side === 2) {
      d += ` A ${s} ${s} 0 0 1 ${x + w - s} ${y + h}`;
      w -= s;
    } else {
      d += ` A ${s} ${s} 0 0 1 ${x} ${y + h - s}`;
      h -= s;
    }
  }
  return d;
}
const SPIRAL = goldenSpiralPath();
const SPIRAL_FLIPS = ["", `translate(${PHI} 0) scale(-1 1)`, `translate(${PHI} 1) scale(-1 -1)`, `translate(0 1) scale(1 -1)`];

/** Dark halo under a light line so guides read on any image. */
function GuideLine(props: { x1: string | number; x2: string | number; y1: string | number; y2: string | number }) {
  return (
    <>
      <line {...props} stroke="rgba(0,0,0,.45)" strokeWidth="3" vectorEffect="non-scaling-stroke" />
      <line {...props} stroke="rgba(255,255,255,.85)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </>
  );
}

export function LightboxGuidesOverlay({ guide, spiralTurn }: { guide: LightboxGuide; spiralTurn: number }) {
  if (guide === "none") return null;
  const svgClass = "pointer-events-none absolute inset-0 z-10 h-full w-full";
  if (guide === "golden") {
    const phi = 1 / PHI ** 2;
    const pos = [phi, 1 - phi];
    return (
      <svg aria-hidden className={svgClass} viewBox={`0 0 ${PHI} 1`} preserveAspectRatio="none">
        {pos.map((p) => (
          <GuideLine key={`v${p}`} x1={p * PHI} x2={p * PHI} y1={0} y2={1} />
        ))}
        {pos.map((p) => (
          <GuideLine key={`h${p}`} x1={0} x2={PHI} y1={p} y2={p} />
        ))}
        <g transform={SPIRAL_FLIPS[spiralTurn % 4]}>
          <path d={SPIRAL} fill="none" stroke="rgba(0,0,0,.45)" strokeWidth="3" vectorEffect="non-scaling-stroke" />
          <path d={SPIRAL} fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
        </g>
      </svg>
    );
  }
  const steps = [100 / 3, 200 / 3];
  return (
    <svg aria-hidden className={svgClass} viewBox="0 0 100 100" preserveAspectRatio="none">
      {steps.map((p) => (
        <GuideLine key={`v${p}`} x1={p} x2={p} y1={0} y2={100} />
      ))}
      {steps.map((p) => (
        <GuideLine key={`h${p}`} x1={0} x2={100} y1={p} y2={p} />
      ))}
    </svg>
  );
}

const LOUPE_PX = 168;
const LOUPE_ZOOMS = [2, 4, 8] as const;
const TOUCH_HOLD_MS = 300;

/**
 * Magnifier that follows the pointer. Desktop: move the mouse, wheel changes 2× / 4× / 8×.
 * Touch: press and hold, then drag — the lens floats above the finger so it isn't hidden.
 * Covers the whole lightbox so it still works when the image is turned 90°.
 */
export function LightboxLoupe({
  src,
  imgRef,
  filter,
  orientation,
  zoom,
  onZoomChange,
}: {
  src: string;
  imgRef: RefObject<HTMLElement>;
  filter?: string;
  orientation: ImageOrientation;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const holdTimer = useRef<number | null>(null);
  const [lens, setLens] = useState<{
    sx: number;
    sy: number;
    x: number;
    y: number;
    w: number;
    h: number;
    touch: boolean;
  } | null>(null);

  useEffect(() => () => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
  }, []);

  // React's onWheel is passive — attach natively so the page doesn't scroll while changing zoom.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const i = LOUPE_ZOOMS.indexOf(zoom as (typeof LOUPE_ZOOMS)[number]);
      const next = LOUPE_ZOOMS[Math.max(0, Math.min(LOUPE_ZOOMS.length - 1, i + (e.deltaY < 0 ? 1 : -1)))];
      if (next !== zoom) onZoomChange(next);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoom, onZoomChange]);

  const place = (clientX: number, clientY: number, touch: boolean) => {
    const box = boxRef.current?.getBoundingClientRect();
    const img = imgRef.current;
    const pt = img ? toImagePoint(img, clientX, clientY, orientation) : null;
    if (!box || !pt) {
      setLens(null);
      return;
    }
    setLens({ sx: clientX - box.left, sy: clientY - box.top, ...pt, touch });
  };

  const onDown = (e: ReactPointerEvent) => {
    e.stopPropagation();
    if (e.pointerType !== "touch") return;
    const { clientX, clientY } = e;
    holdTimer.current = window.setTimeout(() => place(clientX, clientY, true), TOUCH_HOLD_MS);
  };
  const onMove = (e: ReactPointerEvent) => {
    if (e.pointerType === "touch") {
      if (lens) place(e.clientX, e.clientY, true);
      return;
    }
    place(e.clientX, e.clientY, false);
  };
  const end = () => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
    setLens(null);
  };

  const lift = lens?.touch ? LOUPE_PX * 0.75 : 0;

  return (
    <div
      ref={boxRef}
      role="presentation"
      className={cn("absolute inset-0 z-20", lens ? "cursor-none" : "cursor-default", lens?.touch ? "touch-none" : "touch-pan-y")}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={end}
      onPointerCancel={end}
      onPointerLeave={end}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {lens ? (
        <div
          aria-hidden
          className="pointer-events-none absolute overflow-hidden rounded-full border-2 border-white/90 shadow-[0_8px_30px_rgba(0,0,0,.55)]"
          style={{
            width: LOUPE_PX,
            height: LOUPE_PX,
            left: lens.sx - LOUPE_PX / 2,
            top: lens.sy - LOUPE_PX / 2 - lift,
          }}
        >
          <div
            className="h-full w-full"
            style={{
              backgroundImage: `url("${src}")`,
              backgroundRepeat: "no-repeat",
              backgroundSize: `${lens.w * zoom}px ${lens.h * zoom}px`,
              backgroundPosition: `${LOUPE_PX / 2 - lens.x * zoom}px ${LOUPE_PX / 2 - lens.y * zoom}px`,
              filter,
              transform: orientationTransform(orientation),
            }}
          />
          <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-1.5 text-[10px] font-medium text-white">
            {zoom}×
          </span>
        </div>
      ) : null}
    </div>
  );
}

const toolBtn = "flex h-8 w-8 items-center justify-center rounded-full border text-white transition-colors";
export const toolBtnClass = (active: boolean) =>
  cn(toolBtn, active ? "border-white bg-white/25" : "border-white/20 hover:bg-white/15");

const menuItem = "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent";

export function LoupeButton({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      aria-label="แว่นขยาย (Z)"
      title="แว่นขยาย (Z)"
      className={toolBtnClass(on)}
    >
      <Search className="h-4 w-4" aria-hidden />
    </button>
  );
}

export function OrientationButtons({
  value,
  onChange,
}: {
  value: ImageOrientation;
  onChange: (next: ImageOrientation) => void;
}) {
  const flips = [
    { key: "flipX" as const, label: "กลับด้านซ้าย-ขวา", kbd: "M", Icon: FlipHorizontal2 },
    { key: "flipY" as const, label: "กลับด้านบน-ล่าง", kbd: null, Icon: FlipVertical2 },
  ];
  const flipped = value.flipX || value.flipY;
  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" aria-label="กลับด้านภาพ" title="กลับด้านภาพ" className={toolBtnClass(flipped)}>
            {value.flipY && !value.flipX ? (
              <FlipVertical2 className="h-4 w-4" aria-hidden />
            ) : (
              <FlipHorizontal2 className="h-4 w-4" aria-hidden />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" className="z-[120] w-52 space-y-1 p-2" onClick={(e) => e.stopPropagation()}>
          {flips.map(({ key, label, kbd, Icon }) => (
            <button
              key={key}
              type="button"
              className={menuItem}
              onClick={() => onChange({ ...value, [key]: !value[key] })}
              aria-pressed={value[key]}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              <span className="flex-1">{label}</span>
              {kbd ? <kbd className="text-[10px] text-muted-foreground">{kbd}</kbd> : null}
              {value[key] ? <Check className="h-3.5 w-3.5 text-primary" aria-hidden /> : null}
            </button>
          ))}
        </PopoverContent>
      </Popover>
      <button
        type="button"
        onClick={() => onChange({ ...value, rotate: ((value.rotate + 90) % 360) as ImageOrientation["rotate"] })}
        aria-label="หมุนภาพ 90° (R)"
        title={value.rotate ? `หมุนภาพ 90° (R) — ตอนนี้ ${value.rotate}°` : "หมุนภาพ 90° (R)"}
        className={toolBtnClass(value.rotate !== 0)}
      >
        <RotateCw className="h-4 w-4" aria-hidden />
      </button>
    </>
  );
}

export function ViewModeMenu({
  mode,
  onModeChange,
  blurPx,
  onBlurChange,
}: {
  mode: LightboxViewMode;
  onModeChange: (mode: LightboxViewMode) => void;
  blurPx: number;
  onBlurChange: (px: number) => void;
}) {
  const active = mode !== "normal";
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label="มุมมอง" title="มุมมอง" className={toolBtnClass(active)}>
          <Eye className="h-4 w-4" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className="z-[120] w-60 space-y-1 p-2" onClick={(e) => e.stopPropagation()}>
        {VIEW_MODE_GROUPS.map((group, gi) => (
          <div key={group.title} className={cn("space-y-0.5", gi > 0 && "border-t border-border pt-1")}>
            <p className="px-2 pt-0.5 text-[11px] font-medium text-muted-foreground">{group.title}</p>
            {group.items.map((m) => (
              <button
                key={m.id}
                type="button"
                className={menuItem}
                onClick={() => onModeChange(m.id)}
                aria-pressed={mode === m.id}
              >
                <span className="flex-1">
                  {m.label}
                  {m.hint ? <span className="block text-[11px] text-muted-foreground">{m.hint}</span> : null}
                </span>
                {mode === m.id ? <Check className="h-3.5 w-3.5 text-primary" aria-hidden /> : null}
              </button>
            ))}
          </div>
        ))}
        {mode === "blur" ? (
          <div className="px-2 pb-1 pt-2">
            <Slider
              min={2}
              max={16}
              step={1}
              value={[blurPx]}
              onValueChange={([v]) => onBlurChange(v)}
              aria-label="ความเบลอ"
            />
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

export function GuidesMenu({
  guide,
  onGuideChange,
  spiralTurn,
  onSpiralTurn,
}: {
  guide: LightboxGuide;
  onGuideChange: (guide: LightboxGuide) => void;
  spiralTurn: number;
  onSpiralTurn: () => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label="เส้นช่วย" title="เส้นช่วย" className={toolBtnClass(guide !== "none")}>
          <Grid3x3 className="h-4 w-4" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className="z-[120] w-52 space-y-1 p-2" onClick={(e) => e.stopPropagation()}>
        {GUIDES.map((g) => (
          <button
            key={g.id}
            type="button"
            className={menuItem}
            onClick={() => onGuideChange(g.id)}
            aria-pressed={guide === g.id}
          >
            <span className="flex-1">{g.label}</span>
            {guide === g.id ? <Check className="h-3.5 w-3.5 text-primary" aria-hidden /> : null}
          </button>
        ))}
        {guide === "golden" ? (
          <button type="button" className={menuItem} onClick={onSpiralTurn}>
            <RotateCw className="h-3.5 w-3.5" aria-hidden />
            <span className="flex-1">หมุนเกลียว</span>
            <span className="text-[11px] text-muted-foreground">{(spiralTurn % 4) + 1}/4</span>
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
