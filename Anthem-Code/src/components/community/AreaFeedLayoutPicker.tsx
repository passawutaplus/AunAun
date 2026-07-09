import { FEED_AREA_LAYOUT_META, FEED_AREA_LAYOUT_ORDER } from "@/lib/feedAreaDensity";
import { useFeedAreaLayout } from "@/hooks/useFeedAreaLayout";
import { FeedMobileColumnsPicker } from "@/components/feed/FeedMobileColumnsPicker";
import { PreferenceSegmentRow, type SegmentOption } from "@/components/ui/IconSegmentPill";
import type { FeedAreaLayout } from "@/lib/feedAreaDensity";
import { AlignJustify } from "lucide-react";

function AreaGridIcon({ cols }: { cols: number }) {
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

const DESKTOP_OPTIONS: SegmentOption<FeedAreaLayout>[] = FEED_AREA_LAYOUT_ORDER.map((value) => {
  const meta = FEED_AREA_LAYOUT_META[value];
  return {
    value,
    label: meta.ariaLabel,
    icon:
      value === "feed" ? (
        <AlignJustify className="w-3.5 h-3.5" />
      ) : (
        <AreaGridIcon cols={meta.cols} />
      ),
  };
});

type Props = {
  label?: string;
  className?: string;
};

export function AreaFeedLayoutPicker({ label = "ฟีด Area", className }: Props) {
  const { narrow, layout, mobileColumns, setLayout, setMobileColumns } = useFeedAreaLayout();

  if (narrow) {
    return (
      <FeedMobileColumnsPicker
        label={label}
        value={mobileColumns}
        onChange={setMobileColumns}
        className={className}
      />
    );
  }

  return (
    <PreferenceSegmentRow
      label={label}
      value={layout}
      options={DESKTOP_OPTIONS}
      onChange={setLayout}
      className={className}
    />
  );
}
