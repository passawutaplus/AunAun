import { Link } from "react-router-dom";
import { MessageSquare, Orbit } from "lucide-react";
import type { LinkedPostSummary } from "@/lib/portfolioLinkedPosts";
import { cn } from "@/lib/utils";

type Props = {
  posts: LinkedPostSummary[];
  className?: string;
};

function PostThumb({ post }: { post: LinkedPostSummary }) {
  const src = post.gallery_urls?.[0];
  if (src) {
    return <img src={src} alt="" className="w-7 h-7 rounded-md object-cover shrink-0" />;
  }
  return (
    <div className="w-7 h-7 rounded-md bg-muted shrink-0 grid place-items-center">
      <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
    </div>
  );
}

export function ProjectLinkedPostsBlock({ posts, className }: Props) {
  if (!posts.length) return null;

  return (
    <div className={cn("rounded-2xl border border-border/70 bg-card/60 p-4 space-y-2", className)}>
      <div className="flex items-center gap-1.5">
        <Orbit className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden />
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">โพสต์ที่เกี่ยวข้อง</p>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {posts.map((p) => (
          <Link
            key={p.id}
            to={`/community/${p.id}`}
            className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-background px-2.5 py-1.5 shrink-0 hover:border-primary/40 transition-colors"
          >
            <PostThumb post={p} />
            <span className="min-w-0">
              <span className="block text-xs font-medium truncate max-w-[140px]">{p.title}</span>
              {p.author_name && (
                <span className="block text-[10px] text-muted-foreground truncate max-w-[140px]">
                  {p.author_name}
                </span>
              )}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
