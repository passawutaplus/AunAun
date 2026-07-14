import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Bookmark, Heart, Megaphone } from "lucide-react";
import { ForumStatusBadge } from "@/components/forum/ForumStatusBadge";
import { ForumReplyList } from "@/components/forum/ForumReplyList";
import { ForumRankChip, ForumUserAvatar } from "@/components/forum/ForumUserAvatar";
import { Button } from "@/components/ui/button";
import ReportTrigger from "@/components/report/ReportTrigger";
import {
  useBumpForumView,
  useForumReplies,
  useForumTopic,
  useForumTopicAttachments,
  useToggleForumBookmark,
  useToggleForumLike,
} from "@/hooks/useForum";
import { useAuth } from "@/hooks/useAuth";
import { isAnnouncementsSlug } from "@/data/forumCategories";
import { formatRelativeTh, type ForumTopicStatus } from "@/lib/forum";
import { cn } from "@/lib/utils";
import { ForumAttachmentList } from "@/components/forum/ForumAttachmentList";

export default function ForumTopicPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: topic, isLoading, isError } = useForumTopic(id);
  const { data: replies = [] } = useForumReplies(id);
  const { data: topicAttachments = [] } = useForumTopicAttachments(id);
  const like = useToggleForumLike();
  const bookmark = useToggleForumBookmark();
  const bump = useBumpForumView(id);

  useEffect(() => {
    if (id) void bump.mutateAsync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-8">กำลังโหลด…</p>;
  }

  if (isError || !topic) {
    return (
      <div className="space-y-3 py-4">
        <p className="text-sm text-destructive">ไม่พบกระทู้</p>
        <Button asChild variant="outline">
          <Link to="/forum">กลับชุมชน</Link>
        </Button>
      </div>
    );
  }

  const name = topic.profile?.display_name || "สมาชิก";
  const isAnnounce = !!topic.is_announcement || isAnnouncementsSlug(topic.category?.slug);

  return (
    <>
      <nav className="mb-4 text-xs text-muted-foreground flex flex-wrap gap-1">
        <Link to="/forum" className="hover:text-primary">
          ชุมชน
        </Link>
        {topic.category ? (
          <>
            <span>/</span>
            <Link to={`/forum/c/${topic.category.slug}`} className="hover:text-primary">
              {topic.category.name_th}
            </Link>
          </>
        ) : null}
      </nav>

      <article className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-xl font-bold tracking-tight leading-snug inline-flex flex-wrap items-center gap-2">
            {isAnnounce ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-orange-300/60 bg-orange-50 text-orange-800 dark:bg-orange-950/40 dark:text-orange-200 px-2 py-0.5 text-xs font-medium">
                <Megaphone className="h-3.5 w-3.5" />
                ประกาศจากทีม
              </span>
            ) : topic.is_pinned ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                ปักหมุด
              </span>
            ) : null}
            {topic.title}
          </h1>
          <ForumStatusBadge status={topic.status as ForumTopicStatus} />
        </div>

        <div className="flex items-center gap-3">
          <ForumUserAvatar
            src={topic.profile?.avatar_url}
            name={name}
            isAdmin={topic.author_is_admin}
            rank={topic.author_rank}
            size="md"
          />
          <div className="text-sm">
            <p className="font-medium inline-flex flex-wrap items-center gap-2">
              {name}
              <ForumRankChip isAdmin={topic.author_is_admin} rank={topic.author_rank} />
            </p>
            <p className="text-xs text-muted-foreground">
              {formatRelativeTh(topic.created_at)}
              {topic.category ? ` · ${topic.category.name_th}` : ""}
              {` · ${topic.view_count} ครั้งที่ดู`}
            </p>
          </div>
        </div>

        {topic.tags?.length ? (
          <div className="flex flex-wrap gap-1.5">
            {topic.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-sky-50 text-sky-800 border border-sky-100 px-2 py-0.5 text-[11px]"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground leading-relaxed">
          {topic.body}
        </div>

        <ForumAttachmentList attachments={topicAttachments} />

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={like.isPending}
            onClick={() => like.mutate({ topicId: topic.id, liked: !!topic.liked_by_me })}
          >
            <Heart className={cn("h-4 w-4", topic.liked_by_me && "fill-current text-rose-500")} />
            {topic.like_count}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={bookmark.isPending}
            onClick={() =>
              bookmark.mutate({ topicId: topic.id, bookmarked: !!topic.bookmarked_by_me })
            }
          >
            <Bookmark
              className={cn("h-4 w-4", topic.bookmarked_by_me && "fill-current text-primary")}
            />
            บันทึก
          </Button>
          {user?.id !== topic.author_id ? (
            <ReportTrigger
              targetType="forum_topic"
              targetId={topic.id}
              targetOwnerId={topic.author_id}
              variant="text"
            />
          ) : null}
        </div>
      </article>

      <section className="mt-8">
        <h2 className="text-sm font-semibold mb-4">{topic.reply_count} ความเห็น</h2>
        <ForumReplyList topic={topic} replies={replies} />
      </section>
    </>
  );
}
