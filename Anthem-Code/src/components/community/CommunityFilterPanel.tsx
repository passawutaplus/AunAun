import CommunityFeedTabs from "@/components/community/CommunityFeedTabs";
import CommunityCategoryChips from "@/components/community/CommunityCategoryChips";
import type { CommunityFeedFilter } from "@/data/communityTopics";

type Props = {
  feedSource: CommunityFeedFilter["feedSource"];
  onFeedSourceChange: (source: CommunityFeedFilter["feedSource"]) => void;
  category: string;
  onCategoryChange: (category: string) => void;
};

/** Source + category filters for community (mobile filter popover). */
const CommunityFilterPanel = ({
  feedSource,
  onFeedSourceChange,
  category,
  onCategoryChange,
}: Props) => (
  <div className="space-y-4">
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-2">ฟีด</p>
      <CommunityFeedTabs
        feedSource={feedSource}
        onChange={onFeedSourceChange}
        className="justify-start gap-6"
      />
    </div>
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-2">หมวดหมู่</p>
      <CommunityCategoryChips selected={category} onSelect={onCategoryChange} />
    </div>
  </div>
);

export default CommunityFilterPanel;
