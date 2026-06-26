import { COMMUNITY_TAG_PRESETS } from "@/data/communityTopics";
import { communityDisplayTags } from "@/lib/communityQaTag";
import { Hash, Palette } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import TagPicker from "@/components/tags/TagPicker";
import ToolPicker from "@/components/tools/ToolPicker";
import { cn } from "@/lib/utils";

type Props = {
  userId: string;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  tagInput: string;
  setTagInput: (v: string) => void;
  tools: string[];
  onToolsChange: (tools: string[]) => void;
  toolInput: string;
  setToolInput: (v: string) => void;
};

export function CommunityComposerToolbar({
  userId,
  tags,
  onTagsChange,
  tagInput,
  setTagInput,
  tools,
  onToolsChange,
  toolInput,
  setToolInput,
}: Props) {
  const hashTagCount = communityDisplayTags(tags).length;

  return (
    <div className="px-4 py-2 flex flex-wrap gap-2 border-t border-border/60">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs",
              tags.length > 0 && hashTagCount > 0
                ? "border-primary/40 bg-primary/5 text-primary"
                : "border-border bg-muted/30 text-foreground",
            )}
          >
            <Hash className="w-3.5 h-3.5" />
            Tag{hashTagCount > 0 ? ` (${hashTagCount})` : ""}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(100vw-2rem,360px)] p-3">
          <TagPicker
            userId={userId}
            tags={communityDisplayTags(tags)}
            onChange={onTagsChange}
            input={tagInput}
            setInput={setTagInput}
            max={8}
            variant="compact"
            presets={COMMUNITY_TAG_PRESETS}
          />
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs",
              tools.length > 0
                ? "border-primary/40 bg-primary/5 text-primary"
                : "border-border bg-muted/30 text-foreground",
            )}
          >
            <Palette className="w-3.5 h-3.5" />
            Tools{tools.length > 0 ? ` (${tools.length})` : ""}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(100vw-2rem,360px)] p-3">
          <ToolPicker
            userId={userId}
            tools={tools}
            onChange={onToolsChange}
            input={toolInput}
            setInput={setToolInput}
            max={8}
            variant="compact"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
