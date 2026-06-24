import { colord, extend } from "colord";
import a11yPlugin from "colord/plugins/a11y";
import { normalizeHex } from "@/lib/colorUtils";

extend([a11yPlugin]);

export function deriveSoft(hex: string, alpha = 0.08): string {
  const n = normalizeHex(hex);
  if (!n) return "#FFF3EB";
  return colord(n).alpha(alpha).toHex();
}

export function deriveBorder(hex: string, alpha = 0.25): string {
  const n = normalizeHex(hex);
  if (!n) return "#FFD9BF";
  return colord(n).alpha(alpha).toHex();
}

export function headerTextOn(hex: string): string {
  const n = normalizeHex(hex);
  if (!n) return "#FFFFFF";
  return colord(n).isDark() ? "#FFFFFF" : "#111827";
}
