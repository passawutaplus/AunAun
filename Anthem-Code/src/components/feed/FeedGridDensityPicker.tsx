import { FEED_GRID_DENSITY_META, FEED_GRID_DENSITY_ORDER } from "@/lib/feedGridDensity";
import { useFeedGridDensity } from "@/hooks/useFeedGridDensity";
import { FeedMobileColumnsPicker } from "@/components/feed/FeedMobileColumnsPicker";
import { PreferenceSegmentRow, type SegmentOption } from "@/components/ui/IconSegmentPill";
import type { FeedGridDensity } from "@/lib/feedGridDensity";

function GridDensityIcon({ cols }: { cols: number }) {
  const visible = cols >= 7 ? 5 : cols >= 5 ? 4 : 3;
  return (
    <span
      className="inline-grid gap-px items-end justify-center"
      style={{ gridTemplateColumns: `repeat(${visible}, 2px)` }}
      aria-hidden
    >
      {Array.from({ length: visible }).map((_, i) => (
        <span key={i} className="w-[2px] h-2.5 rounded-[1px] bg-current opacity-90" />
      ))}
    </span>
  );
}

const DESKTOP_OPTIONS: SegmentOption<FeedGridDensity>[] = FEED_GRID_DENSITY_ORDER.map((value) => {
  const meta = FEED_GRID_DENSITY_META[value];
  return {
    value,
    label: meta.ariaLabel,
    icon: <GridDensityIcon cols={meta.cols} />,
  };
});

type Props = {
  label?: string;
  className?: string;
};

export function FeedGridDensityPicker({ label = "ขนาดฟีด", className }: Props) {
  const { narrow, density, mobileColumns, setDensity, setMobileColumns } = useFeedGridDensity();

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
      value={density}
      options={DESKTOP_OPTIONS}
      onChange={setDensity}
      className={className}
    />
  );
}
