import { Heart } from "lucide-react";

type Props = {
  x: number;
  y: number;
};

/** Double-tap like burst overlay. */
export function PlusOneBurst({ x, y }: Props) {
  return (
    <span
      className="pointer-events-none absolute z-30 animate-plus-one-burst"
      style={{ left: x, top: y }}
      aria-hidden
    >
      <Heart
        className="w-10 h-10 fill-primary text-primary drop-shadow-md -translate-x-1/2 -translate-y-1/2"
        strokeWidth={0}
      />
    </span>
  );
}
