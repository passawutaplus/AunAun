import {
  FEED_MOBILE_COLUMNS_META,
  FEED_MOBILE_COLUMNS_ORDER,
  type FeedMobileColumns,
} from "@/lib/feedMobileColumns";
import { PreferenceSegmentRow, type SegmentOption } from "@/components/ui/IconSegmentPill";
import { AlignJustify } from "lucide-react";
function ColumnCountIcon({ cols }: { cols: number }) {
  return (
    <span
      className="inline-grid gap-px items-end justify-center"
      style={{ gridTemplateColumns: `repeat(${cols}, 2px)` }}
      aria-hidden
    >
      {Array.from({ length: cols }).map((_, i) => (
        <span key={i} className="w-[2px] h-2.5 rounded-[1px] bg-current opacity-90" />
      ))}
    </span>
  );
}

const OPTIONS: SegmentOption<FeedMobileColumns>[] = FEED_MOBILE_COLUMNS_ORDER.map((value) => {
  const meta = FEED_MOBILE_COLUMNS_META[value];
  return {
    value,
    label: meta.ariaLabel,
    icon:
      value === "one" ? (
        <AlignJustify className="w-3.5 h-3.5" />
      ) : (
        <ColumnCountIcon cols={meta.cols} />
      ),
  };
});

type Props = {
  label: string;
  value: FeedMobileColumns;
  onChange: (value: FeedMobileColumns) => void;
  className?: string;
};

export function FeedMobileColumnsPicker({ label, value, onChange, className }: Props) {
  return (
    <PreferenceSegmentRow
      label={label}
      value={value}
      options={OPTIONS}
      onChange={onChange}
      className={className}
    />
  );
}
