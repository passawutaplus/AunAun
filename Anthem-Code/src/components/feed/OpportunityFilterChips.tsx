import { HorizontalScrollRail } from "@/components/ui/HorizontalScrollRail";
import { SlidingChip, SlidingChipRail } from "@/components/ui/SlidingChip";
import { OPPORTUNITY_TYPE_KEYS, OPPORTUNITY_TYPES, type OpportunityTypeKey } from "@/lib/opportunity";

export type OpportunityFilter = "All" | OpportunityTypeKey;

type Props = {
  selected: OpportunityFilter;
  onSelect: (v: OpportunityFilter) => void;
  className?: string;
};

const GROUP_ID = "feed-opportunity-filter";

/** Filter discovery by creator opportunity type (หางานจ้าง / คอลแลบ / …). */
export default function OpportunityFilterChips({ selected, onSelect, className }: Props) {
  return (
    <SlidingChipRail layoutGroupId={GROUP_ID} className={className}>
      <HorizontalScrollRail className="flex items-center gap-4 sm:gap-5 pb-0.5">
        <SlidingChip
          layoutGroupId={GROUP_ID}
          label="ทุกโอกาส"
          active={selected === "All"}
          onClick={() => onSelect("All")}
        />
        {OPPORTUNITY_TYPE_KEYS.map((key) => (
          <SlidingChip
            key={key}
            layoutGroupId={GROUP_ID}
            label={OPPORTUNITY_TYPES[key]}
            active={selected === key}
            onClick={() => onSelect(key)}
          />
        ))}
      </HorizontalScrollRail>
    </SlidingChipRail>
  );
}
