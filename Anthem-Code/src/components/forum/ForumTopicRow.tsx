import { Link } from "react-router-dom";
import { Heart, Loader2, Lock, Megaphone, MessageSquare, Pin } from "lucide-react";
import { ForumStatusBadge } from "@/components/forum/ForumStatusBadge";
import { ForumRankChip, ForumUserAvatar } from "@/components/forum/ForumUserAvatar";
import { useAdminSetForumTopic, type ForumTopic } from "@/hooks/useForum";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { forumCategoryTone, isAnnouncementsSlug } from "@/data/forumCategories";
import { formatForumDate, type ForumTopicStatus } from "@/lib/forum";
import { cn } from "@/lib/utils";

type Props = {
  topic: ForumTopic;
  className?: string;
};

export function ForumTopicRow({ topic, className }: Props) {
  const { data: isAdmin } = useIsAdmin();
  const setTopic = useAdminSetForumTopic();
  const name = topic.profile?.display_name || "สมาชิก";
  const catTone = forumCategoryTone(topic.category?.slug);
  const isAnnounce = !!topic.is_announcement || isAnnouncementsSlug(topic.category?.slug);
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

  const pinBusy = setTopic.isPending && setTopic.variables?.topicId === topic.id;
  const previewImages = topic.preview_images ?? [];
  const totalImages = topic.preview_image_count ?? previewImages.length;
  const extraCount = Math.max(0, totalImages - 5);

  return (
    <article
      className={cn(
        "grid grid-cols-[minmax(0,1fr)] sm:grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-border py-3.5 last:border-0 hover:bg-muted/30 px-2 -mx-2 rounded-lg transition-colors",
        topic.is_pinned && "bg-primary/[0.04]",
        isAnnounce && "bg-orange-50/40 dark:bg-orange-950/20",
        className,
      )}
    >
      <div className="min-w-0">
        <Link to={`/forum/t/${topic.id}`} className="block group min-w-0">
          <h3 className="text-[15px] font-semibold text-foreground group-hover:text-primary leading-snug inline-flex flex-wrap items-center gap-1.5">
            {isAnnounce ? (
              <Megaphone className="h-3.5 w-3.5 shrink-0 text-orange-600" aria-label="ประกาศจากทีม" />
            ) : topic.is_pinned ? (
              <Pin className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="ปักหมุด" />
            ) : null}
            {topic.is_locked ? (
              <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="ล็อก" />
            ) : null}
            {topic.title}
          </h3>
        </Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {isAdmin ? (
            <button
              type="button"
              disabled={pinBusy}
              title={topic.is_pinned ? "ถอนหมุด" : "ปักหมุดกระทู้"}
              aria-label={topic.is_pinned ? "ถอนหมุดกระทู้" : "ปักหมุดกระทู้"}
              aria-pressed={topic.is_pinned}
              onClick={() => setTopic.mutate({ topicId: topic.id, isPinned: !topic.is_pinned })}
              className={cn(
                "shrink-0 inline-flex items-center justify-center transition-colors",
                topic.is_pinned
                  ? "text-primary hover:text-primary/80"
                  : "text-muted-foreground hover:text-foreground",
                pinBusy && "opacity-70",
              )}
            >
              {pinBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Pin className={cn("h-3.5 w-3.5", topic.is_pinned && "fill-current")} />
              )}
            </button>
          ) : null}
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

        {previewImages.length > 0 ? (
          <Link
            to={`/forum/t/${topic.id}`}
            className="mt-2.5 flex flex-wrap gap-1.5"
            tabIndex={-1}
            aria-label={`${totalImages} รูปในกระทู้`}
          >
            {previewImages.map((url, i) => {
              const isLastSlot = i === 4 && extraCount > 0;
              return (
                <span
                  key={`${url}-${i}`}
                  className="relative block overflow-hidden rounded-md border border-border bg-muted/40 w-14 h-14 sm:w-16 sm:h-16"
                >
                  <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  {isLastSlot ? (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-white text-xs sm:text-sm font-semibold tabular-nums">
                      +{extraCount}
                    </span>
                  ) : null}
                </span>
              );
            })}
          </Link>
        ) : null}
      </div>

      <div className="flex items-center gap-4 sm:gap-5 shrink-0 self-start sm:self-center">
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

        <div className="hidden sm:flex items-center gap-3 text-xs tabular-nums text-muted-foreground justify-end">
          <span className="inline-flex flex-col items-center gap-0.5 w-8" title="คนตอบ">
            <span className="text-foreground">{topic.reply_count}</span>
            <MessageSquare className="h-3 w-3 text-muted-foreground" aria-hidden />
          </span>
          <span className="inline-flex flex-col items-center gap-0.5 w-8" title="คนถูกใจ">
            <span className={cn(topic.liked_by_me ? "text-rose-600" : "text-foreground")}>
              {topic.like_count}
            </span>
            <Heart
              className={cn("h-3 w-3", topic.liked_by_me ? "fill-current text-rose-500" : "text-muted-foreground")}
              aria-hidden
            />
          </span>
          <time
            className="inline-flex flex-col items-end justify-center min-w-[3.25rem] max-w-[4.5rem] text-right leading-tight font-normal text-[11px] text-muted-foreground"
            dateTime={topic.last_activity_at}
            title={new Date(topic.last_activity_at).toLocaleString("th-TH")}
          >
            {(() => {
              const full = formatForumDate(topic.last_activity_at);
              if (full.endsWith("ที่แล้ว")) {
                return (
                  <>
                    <span className="whitespace-nowrap">{full.slice(0, -"แล้ว".length)}</span>
                    <span>แล้ว</span>
                  </>
                );
              }
              if (full === "เมื่อสักครู่") {
                return (
                  <>
                    <span>เมื่อสัก</span>
                    <span>ครู่</span>
                  </>
                );
              }
              return <span className="whitespace-normal break-words">{full}</span>;
            })()}
          </time>
        </div>
      </div>
    </article>
  );
}
