import { PlusOneMark } from "@/components/brand/PlusOneMark";

type Props = {
  x: number;
  y: number;
};

/** Double-tap appreciation burst overlay. */
export function PlusOneBurst({ x, y }: Props) {
  return (
    <span
      className="pointer-events-none absolute z-30 animate-plus-one-burst"
      style={{ left: x, top: y }}
      aria-hidden
    >
      <PlusOneMark className="text-4xl text-primary drop-shadow-md -translate-x-1/2 -translate-y-1/2" />
    </span>
  );
}
