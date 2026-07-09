import {
  mergeContentBlocks,
  type ProjectContentBlock,
} from "@/lib/projectContentBlocks";
import { cn } from "@/lib/utils";

type Props = {
  blocks?: ProjectContentBlock[] | null;
  legacyDescription?: string | null;
  className?: string;
};

export function ProjectContentBlocksView({ blocks, legacyDescription, className }: Props) {
  const items = mergeContentBlocks(blocks ?? [], legacyDescription);
  if (!items.length) return null;

  return (
    <div className={cn("space-y-6", className)}>
      {items.map((block) => {
        if (block.type === "heading") {
          return (
            <h2
              key={block.id}
              className="text-xl sm:text-2xl font-semibold text-foreground text-center leading-snug"
            >
              {block.heading}
            </h2>
          );
        }
        if (block.type === "heading_body") {
          return (
            <div key={block.id} className="space-y-2">
              {block.heading?.trim() ? (
                <h3 className="text-lg font-semibold text-foreground leading-snug">{block.heading}</h3>
              ) : null}
              {block.body?.trim() ? (
                <p className="text-base text-foreground/90 leading-relaxed whitespace-pre-wrap">
                  {block.body}
                </p>
              ) : null}
            </div>
          );
        }
        return (
          <p
            key={block.id}
            className="text-base text-foreground/90 leading-relaxed whitespace-pre-wrap"
          >
            {block.body}
          </p>
        );
      })}
    </div>
  );
}
