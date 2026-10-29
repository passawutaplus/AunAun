/**
 * Outline of a pill + a liquid "neck" + a round button, as one path. Same geometry as
 * glassOutline() in src/components/FloatingNav.tsx (both caps are circles; the neck leaves each
 * at 50° on its tangent so the joint stays smooth). Total width = pillW + gap + h.
 */
export function joinedPillPath(pillW: number, h: number, gap = 12): string {
  const R = h / 2;
  const r = h / 2;
  const cy = h / 2;
  const c1x = pillW - R;
  const c2x = pillW + gap + r;
  const t = (50 * Math.PI) / 180;
  const sin = Math.sin(t);
  const cos = Math.cos(t);
  const p1 = [c1x + R * cos, cy - R * sin];
  const p2 = [c1x + R * cos, cy + R * sin];
  const q1 = [c2x - r * cos, cy - r * sin];
  const q2 = [c2x - r * cos, cy + r * sin];
  const k = (q1[0] - p1[0]) / 2;
  const n = (v: number) => v.toFixed(2);
  return [
    `M ${n(R)} 0 L ${n(c1x)} 0`,
    `A ${n(R)} ${n(R)} 0 0 1 ${n(p1[0])} ${n(p1[1])}`,
    `C ${n(p1[0] + k * sin)} ${n(p1[1] + k * cos)} ${n(q1[0] - k * sin)} ${n(q1[1] + k * cos)} ${n(q1[0])} ${n(q1[1])}`,
    `A ${n(r)} ${n(r)} 0 1 1 ${n(q2[0])} ${n(q2[1])}`,
    `C ${n(q2[0] - k * sin)} ${n(q2[1] - k * cos)} ${n(p2[0] + k * sin)} ${n(p2[1] - k * cos)} ${n(p2[0])} ${n(p2[1])}`,
    `A ${n(R)} ${n(R)} 0 0 1 ${n(c1x)} ${n(h)} L ${n(R)} ${n(h)}`,
    `A ${n(R)} ${n(R)} 0 0 1 ${n(R)} 0 Z`,
  ].join(" ");
}
