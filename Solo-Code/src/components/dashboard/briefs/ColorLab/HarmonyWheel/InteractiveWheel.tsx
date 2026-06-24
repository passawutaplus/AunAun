import * as React from "react";
import { colord } from "colord";
import { computeHarmony, type HarmonyMode } from "./harmonyMath";

interface Props {
  hex: string;
  mode: HarmonyMode;
  onChange: (hex: string) => void;
  size?: number;
}

const SEGMENTS = 12;
const RING_OUTER = 100;
const RING_INNER = 70;
const HANDLE_R = 9;

/** Convert polar to cartesian on the wheel center (0,0 = center). */
function polar(angleDeg: number, radius: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: Math.cos(rad) * radius, y: Math.sin(rad) * radius };
}

/** SVG arc path for a segment of the wheel. */
function segmentPath(start: number, end: number, rOuter: number, rInner: number) {
  const a1 = polar(start, rOuter);
  const a2 = polar(end, rOuter);
  const b2 = polar(end, rInner);
  const b1 = polar(start, rInner);
  const large = end - start > 180 ? 1 : 0;
  return `M ${a1.x} ${a1.y} A ${rOuter} ${rOuter} 0 ${large} 1 ${a2.x} ${a2.y} L ${b2.x} ${b2.y} A ${rInner} ${rInner} 0 ${large} 0 ${b1.x} ${b1.y} Z`;
}

export function InteractiveWheel({ hex, mode, onChange, size = 280 }: Props) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = React.useState(false);

  const baseHsv = React.useMemo(() => colord(hex).toHsv(), [hex]);
  const harmony = React.useMemo(() => computeHarmony(hex, mode), [hex, mode]);

  const segments = React.useMemo(() => {
    const arr = [];
    for (let i = 0; i < SEGMENTS; i++) {
      const start = i * (360 / SEGMENTS);
      const end = start + 360 / SEGMENTS;
      const mid = (start + end) / 2;
      const fill = colord({ h: mid, s: 100, v: 100 }).toHex();
      arr.push({ start, end, fill });
    }
    return arr;
  }, []);

  const updateFromPointer = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    angle = ((angle % 360) + 360) % 360;
    const next = colord({ h: angle, s: baseHsv.s || 80, v: baseHsv.v || 90 })
      .toHex()
      .toUpperCase();
    onChange(next);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDragging(true);
    updateFromPointer(e.clientX, e.clientY);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    updateFromPointer(e.clientX, e.clientY);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    setDragging(false);
  };

  // Handle positions on outer ring (just outside RING_OUTER)
  const handles = harmony.map((h) => {
    const hsv = colord(h).toHsv();
    return { hex: h, angle: hsv.h };
  });

  // Connection lines between handles
  const lineCoords = handles.map((h) => polar(h.angle, RING_OUTER + 6));

  return (
    <div className="flex justify-center select-none">
      <svg
        ref={svgRef}
        viewBox="-120 -120 240 240"
        width={size}
        height={size}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="touch-none cursor-pointer"
        style={{ maxWidth: "100%" }}
      >
        {/* Wheel segments */}
        {segments.map((s, i) => (
          <path
            key={i}
            d={segmentPath(s.start, s.end, RING_OUTER, RING_INNER)}
            fill={s.fill}
            stroke="hsl(var(--background))"
            strokeWidth={0.5}
          />
        ))}

        {/* Inner circle bg */}
        <circle cx={0} cy={0} r={RING_INNER - 2} fill="hsl(var(--card))" />

        {/* Connection polygon between handles */}
        {handles.length >= 2 && (
          <polygon
            points={lineCoords.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="hsl(var(--foreground) / 0.4)"
            strokeWidth={1.2}
            strokeDasharray="3 3"
          />
        )}

        {/* Inner preview swatches showing harmony */}
        {handles.map((h, i) => {
          const r = RING_INNER * 0.55;
          const angle = (i / handles.length) * 360;
          const p = polar(angle, r * 0.55);
          return (
            <circle
              key={`prev-${i}`}
              cx={p.x}
              cy={p.y}
              r={handles.length <= 2 ? 14 : handles.length <= 3 ? 12 : 10}
              fill={h.hex}
              stroke="hsl(var(--background))"
              strokeWidth={1.5}
            />
          );
        })}

        {/* Outer handles */}
        {handles.map((h, i) => {
          const p = polar(h.angle, RING_OUTER + 6);
          return (
            <g key={`handle-${i}`}>
              <circle
                cx={p.x}
                cy={p.y}
                r={HANDLE_R + 2}
                fill="hsl(var(--background))"
                stroke="hsl(var(--foreground) / 0.6)"
                strokeWidth={1}
              />
              <circle
                cx={p.x}
                cy={p.y}
                r={HANDLE_R}
                fill={h.hex}
                stroke={i === 0 ? "hsl(var(--foreground))" : "hsl(var(--background))"}
                strokeWidth={i === 0 ? 2 : 1.5}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
