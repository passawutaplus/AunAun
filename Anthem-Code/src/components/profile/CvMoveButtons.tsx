import { ChevronDown, ChevronUp } from "lucide-react";
import { useAboutEditLocale } from "@/components/profile/AboutEditLocale";

const btn =
  "p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-30 disabled:pointer-events-none";

/** ↑ / ↓ beside a CV list item — the CV and its PDF follow this order. */
export default function CvMoveButtons({
  index,
  count,
  disabled,
  onMove,
}: {
  index: number;
  count: number;
  /** While an item is open for editing, indexes must not shift under it. */
  disabled?: boolean;
  onMove: (from: number, to: number) => void;
}) {
  const { lang } = useAboutEditLocale();
  if (count < 2) return null;
  return (
    <>
      <button
        type="button"
        disabled={disabled || index === 0}
        onClick={() => onMove(index, index - 1)}
        className={btn}
        aria-label={lang === "th" ? "เลื่อนขึ้น" : "Move up"}
      >
        <ChevronUp className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        disabled={disabled || index === count - 1}
        onClick={() => onMove(index, index + 1)}
        className={btn}
        aria-label={lang === "th" ? "เลื่อนลง" : "Move down"}
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
    </>
  );
}
