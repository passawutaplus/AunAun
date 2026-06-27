import { ExternalLink } from "lucide-react";
import { communityLinkPreviews } from "@/lib/communityLinkUrls";
import { cn } from "@/lib/utils";

type Props = {
  urls: string[];
  className?: string;
};

export function CommunityLinkPreviewBar({ urls, className }: Props) {
  if (!urls.length) return null;
  const previews = communityLinkPreviews(urls);

  return (
    <div className={cn("space-y-2", className)}>
      {previews.map((p) => (
        <a
          key={p.url}
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5 hover:bg-muted/40 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground">{p.label}</p>
            <p className="text-[11px] text-muted-foreground truncate">{p.site}</p>
          </div>
          <ExternalLink className="w-4 h-4 shrink-0 text-muted-foreground" />
        </a>
      ))}
    </div>
  );
}
