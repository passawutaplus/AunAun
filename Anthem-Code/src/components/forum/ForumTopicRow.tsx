import { Link } from "react-router-dom";
import { Heart, Lock, MessageSquare, Pin } from "lucide-react";
import { ForumStatusBadge } from "@/components/forum/ForumStatusBadge";
import { ForumRankChip, ForumUserAvatar } from "@/components/forum/ForumUserAvatar";
import type { ForumTopic } from "@/hooks/useForum";
import { forumCategoryTone } from "@/data/forumCategories";
import { formatForumDate, type ForumTopicStatus } from "@/lib/forum";
import { cn } from "@/lib/utils";

type Props = {
  topic: ForumTopic;
  className?: string;
};

export function ForumTopicRow({ topic, className }: Props) {
  const name = topic.profile?.display_name || "สมาชิก";
  const catTone = forumCategoryTone(topic.category?.slug);
  const participants = topic.participants?.length
    ? topic.participants
    : [
        {
          user_id: topic.author_id,
          display_name: name,
          avatar_url: topic.profile?.avatar_url ?? null,
          username: topic.profile?.username ?? null,
          is_admin: topic.author_is_admin,
          rank: topic.author_rank,
        },
      ];

  return (
    <article
      className={cn(
        "grid grid-cols-[minmax(0,1fr)] sm:grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-border py-3.5 last:border-0 hover:bg-muted/30 px-2 -mx-2 rounded-lg transition-colors",
        topic.is_pinned && "bg-primary/[0.04]",
        className,
      )}
    >
      <div className="min-w-0">
        <Link to={`/forum/t/${topic.id}`} className="block group">
          <h3 className="text-[15px] font-semibold text-foreground group-hover:text-primary leading-snug inline-flex flex-wrap items-center gap-1.5">
            {topic.is_pinned ? (
              <Pin className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="ปักหมุด" />
            ) : null}
            {topic.is_locked ? (
              <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="ล็อก" />
            ) : null}
            {topic.title}
          </h3>
        </Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {topic.category ? (
            <Link
              to={`/forum/c/${topic.category.slug}`}
              className={cn("inline-flex items-center gap-1.5 font-medium hover:opacity-80", catTone.text)}
            >
              <span className={cn("h-2.5 w-2.5 rounded-sm", catTone.swatch)} aria-hidden />
              {topic.category.name_th}
            </Link>
          ) : null}
          <span className="text-muted-foreground/80">{name}</span>
          <ForumRankChip isAdmin={topic.author_is_admin} rank={topic.author_rank} />
          {topic.status !== "open" ? (
            <ForumStatusBadge status={topic.status as ForumTopicStatus} />
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-4 sm:gap-5 shrink-0 self-center">
        <div className="flex -space-x-1.5" aria-label="ผู้ร่วมคุย">
          {participants.slice(0, 5).map((p) => (
            <ForumUserAvatar
              key={p.user_id}
              src={p.avatar_url}
              name={p.display_name}
              isAdmin={p.is_admin}
              rank={p.rank}
              rankTitle={p.rank_title}
              className="ring-2 ring-background rounded-full"
            />
          ))}
        </div>

        <div className="hidden sm:flex items-center gap-4 text-xs tabular-nums text-muted-foreground min-w-[7.5rem] justify-end">
          <span className="inline-flex flex-col items-center w-10" title="คนตอบ">
            <span className="font-medium text-foreground">{topic.reply_count}</span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <MessageSquare className="h-2.5 w-2.5" />
              ตอบ
            </span>
          </span>
          <span className="inline-flex flex-col items-center w-10" title="คนถูกใจ">
            <span className={cn("font-medium", topic.liked_by_me ? "text-rose-600" : "text-foreground")}>
              {topic.like_count}
            </span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Heart className={cn("h-2.5 w-2.5", topic.liked_by_me && "fill-current text-rose-500")} />
              ถูกใจ
            </span>
          </span>
          <time
            className="inline-flex flex-col items-end w-14 text-right"
            dateTime={topic.last_activity_at}
            title={new Date(topic.last_activity_at).toLocaleString("th-TH")}
          >
            <span className="font-medium text-foreground">{formatForumDate(topic.last_activity_at)}</span>
            <span className="text-[10px] text-muted-foreground">วันที่</span>
          </time>
        </div>
      </div>
    </article>
  );
}
