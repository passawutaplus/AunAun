import CommunityFeedTabs from "@/components/community/CommunityFeedTabs";

type StudioFeedSource = "all" | "following";

type Props = {
  feedSource: StudioFeedSource;
  onFeedSourceChange: (source: StudioFeedSource) => void;
};

/** Following / For you — mobile filter popover on Studios tab. */
const StudioFilterPanel = ({ feedSource, onFeedSourceChange }: Props) => (
  <div>
    <p className="text-xs font-medium text-muted-foreground mb-2">ฟีด</p>
    <CommunityFeedTabs
      feedSource={feedSource}
      onChange={onFeedSourceChange}
      className="justify-start gap-6"
    />
  </div>
);

export default StudioFilterPanel;
export type { StudioFeedSource };
