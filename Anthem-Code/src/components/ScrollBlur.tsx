import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type Direction = "top" | "bottom";

type Props = {
  /** top = strongest at the top edge, fading downward. Matches a top bar. */
  direction?: Direction;
  /** Strongest layer, in px. Default matches Scroll Blur by Aki. */
  blur?: number;
  layers?: number;
  className?: string;
};

function maskDirection(direction: Direction) {
  return direction === "top" ? "to bottom" : "to top";
}

/** Progressive mask: each layer covers less of the strip so blur steps down. */
function layerMask(direction: Direction, index: number, total: number) {
  const segment = 100 / total;
  const edge = 100 - index * segment;
  const softStart = Math.max(0, edge - segment);
  return `linear-gradient(${maskDirection(direction)}, rgba(255,255,255,1) 0%, rgba(255,255,255,1) ${softStart}%, rgba(255,255,255,0) ${edge}%)`;
}

/**
 * Layered backdrop blur. Same construction as Scroll Blur by Aki:
 * several masks, each a bit stronger, so the edge dissolves instead of a hard glass bar.
 */
export function ScrollBlur({ direction = "top", blur = 12, layers = 4, className }: Props) {
  const reduced = useReducedMotion();
  const count = Math.min(8, Math.max(1, Math.round(layers)));
  if (reduced || blur <= 0) return null;

  return (
    <div className={cn("pointer-events-none relative h-full w-full overflow-hidden", className)} aria-hidden>
      {Array.from({ length: count }, (_, index) => {
        const filter = `blur(${(blur * (index + 1)) / count}px)`;
        const mask = layerMask(direction, index, count);
        return (
          <div
            key={index}
            className="absolute inset-0"
            style={{
              backdropFilter: filter,
              WebkitBackdropFilter: filter,
              maskImage: mask,
              WebkitMaskImage: mask,
            }}
          />
        );
      })}
    </div>
  );
}
