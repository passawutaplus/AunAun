import type { ProductArt as Art } from "@/lib/support/catalog";
import { cn } from "@/lib/utils";

type Props = { art: Art; color?: string; className?: string };

/** Backdrop for every product drawing: the same light "paper" in light and dark mode. */
export const PRODUCT_TILE = "bg-white dark:bg-[#E9E9E6]";

const EDGE = "rgba(40, 41, 41, 0.18)";
const SOFT = "rgba(40, 41, 41, 0.08)";

/**
 * Concept drawings for shop items (no product photos exist yet). Decorative: the name sits next to it.
 * `color` is the chosen colour of the item. Like a photo, the drawing keeps its own light backdrop in
 * dark mode too (see PRODUCT_TILE), so its colours are fixed brand values, not theme tokens.
 */
export function ProductArt({ art, color = "#282929", className }: Props) {
  return (
    <svg viewBox="0 0 240 180" role="presentation" aria-hidden className={cn("h-full w-full", className)}>
      <ellipse cx="120" cy="150" rx="78" ry="7" fill={SOFT} />
      {art === "picker" ? (
        <g>
          <rect x="42" y="62" width="156" height="60" rx="30" fill={color} stroke={EDGE} />
          <circle cx="74" cy="92" r="17" fill="#F2F2F0" opacity="0.92" />
          <circle cx="74" cy="92" r="8" fill="#EE3D29" />
          <rect x="112" y="87" width="58" height="10" rx="5" fill="#F2F2F0" opacity="0.28" />
        </g>
      ) : null}
      {art === "twin" ? (
        <g fill="none" stroke="rgba(40, 41, 41, 0.45)" strokeWidth="2" strokeDasharray="6 6">
          <rect x="58" y="48" width="74" height="74" rx="18" />
          <rect x="108" y="66" width="74" height="74" rx="18" />
        </g>
      ) : null}
      {art === "tray" ? (
        <g>
          <rect x="34" y="70" width="172" height="62" rx="24" fill={color} stroke={EDGE} />
          <rect x="46" y="80" width="148" height="42" rx="16" fill="#F2F2F0" opacity="0.2" />
          <circle cx="80" cy="101" r="9" fill="#F2F2F0" opacity="0.75" />
          <rect x="104" y="95" width="46" height="12" rx="6" fill="#F2F2F0" opacity="0.5" />
        </g>
      ) : null}
      {art === "stand" ? (
        <g>
          <rect x="78" y="30" width="84" height="100" rx="6" fill="#FFFFFF" stroke={EDGE} />
          <rect x="90" y="44" width="60" height="46" rx="3" fill={SOFT} />
          <rect x="90" y="100" width="36" height="5" rx="2.5" fill={SOFT} />
          <path d="M52 146 L66 118 H174 L188 146 Z" fill={color} stroke={EDGE} strokeLinejoin="round" />
        </g>
      ) : null}
      {art === "clip" ? (
        <g>
          <path d="M20 96 C70 60 110 132 150 96 S210 76 226 100" fill="none" stroke="rgba(40, 41, 41, 0.35)" strokeWidth="4" strokeLinecap="round" />
          {[62, 120, 178].map((cx) => (
            <g key={cx}>
              <circle cx={cx} cy="100" r="22" fill={color} stroke={EDGE} />
              <circle cx={cx} cy="100" r="7" fill="#F2F2F0" opacity="0.85" />
            </g>
          ))}
        </g>
      ) : null}
    </svg>
  );
}

export default ProductArt;
