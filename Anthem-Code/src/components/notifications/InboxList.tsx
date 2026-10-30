import { useNavigate } from "react-router-dom";
import { Bell, Gift, UserPlus, Briefcase, Handshake, MessageCircle, Banknote, Megaphone, MessageSquareHeart, Users, X, Heart } from "lucide-react";
import type { Notification } from "@/core/notifications";
import { resolveNotificationLink } from "@/lib/notificationLinks";
import { notificationBodyPreview } from "@/lib/chatReply";
import { InlineLoader } from "@/components/ui/BanterLoader";
import UserAvatar from "@/components/UserAvatar";
import FollowButton from "@/components/FollowButton";
import { Button } from "@/components/ui/button";
import { useRespondProjectCollabInvite } from "@/hooks/useProjectCollabInvites";
import { useProfilesByIds } from "@/core/profiles";
import { useProjectCovers } from "@/hooks/useProjectCovers";
import { useMemo } from "react";
import { profilePublicPath } from "@/lib/profileRoutes";
import EmptyState from "@/components/ui/EmptyState";
import { groupByNotificationDate } from "@/lib/notificationDateGroups";
import { timeAgo } from "@/lib/format";

const kindIcon = (kind: string) => {
  if (kind.includes("like")) return Heart;
  if (kind.includes("gift")) return Gift;
  if (kind.includes("follow")) return UserPlus;
  if (kind.includes("hire") || kind.includes("job")) return Briefcase;
  if (kind.includes("collab") || kind.includes("project_collab")) return Handshake;
  if (kind.includes("message") || kind.includes("chat")) return MessageCircle;
  if (kind.includes("feedback")) return MessageSquareHeart;
  if (kind.includes("cashout")) return Banknote;
  if (kind.includes("ad")) return Megaphone;
  if (kind.includes("project_collab")) return Users;
  return Bell;
};

function extractFollowerId(n: Notification): string | null {
  const md = n.metadata ?? {};
  if (typeof md.follower_id === "string") return md.follower_id;
  if (typeof md.actor_id === "string") return md.actor_id;
  const link = n.link?.trim() ?? "";
  const uMatch = link.match(/^\/u\/([^/?#]+)/);
  if (uMatch) return uMatch[1];
  return null;
}

/** Who the notification is about: the follower, the sender of a message, whoever liked / commented. */
function extractActorId(n: Notification): string | null {
  const md = n.metadata ?? {};
  for (const key of ["follower_id", "actor_id", "sender_id", "liker_id", "commenter_id", "from_user_id"]) {
    const v = md[key];
    if (typeof v === "string" && v) return v;
  }
  const uMatch = (n.link?.trim() ?? "").match(/^\/u\/([^/?#]+)/);
  return uMatch ? uMatch[1] : null;
}

const UUID_RE = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";

/** The work the notification is about (metadata.project_id, or a /project/<id> link). */
function extractProjectId(n: Notification): string | null {
  const md = n.metadata ?? {};
  if (typeof md.project_id === "string" && md.project_id) return md.project_id;
  const m = (n.link ?? "").match(new RegExp(`/project/(${UUID_RE})`));
  return m ? m[1] : null;
}

/** Likes / comments / work events show the work; messages and follows show the person. */
function prefersWorkCover(kind: string): boolean {
  return /like|comment|project|asset|scan/.test(kind) && !kind.includes("follow") && !kind.includes("chat");
}

function extractCollabInviteId(n: Notification): string | null {
  const md = n.metadata ?? {};
  if (typeof md.invite_id === "string") return md.invite_id;
  return null;
}

function isPendingCollabInvite(n: Notification): boolean {
  if (n.kind !== "project_collab_invite") return false;
  const md = n.metadata ?? {};
  return md.status === "pending" && typeof md.invite_id === "string";
}

/** How a tag ended once answered (the database updates the row): accepted, declined, or cancelled by the poster. */
function collabInviteAnswer(n: Notification): "accepted" | "declined" | "cancelled" | null {
  if (n.kind !== "project_collab_invite") return null;
  const status = (n.metadata ?? {}).status;
  return status === "accepted" || status === "declined" || status === "cancelled" ? status : null;
}

interface Props {
  items: Notification[];
  loading: boolean;
  onOpen: (n: Notification) => void;
  onDismiss: (id: string) => void;
  onBeforeNavigate?: () => void;
  /** Popup chrome uses English headings and buttons. */
  english?: boolean;
}

const GROUP_LABEL_EN: Record<string, string> = {
  today: "Today",
  yesterday: "Yesterday",
  week: "This week",
  older: "Earlier",
};

const InboxList = ({ items, loading, onOpen, onDismiss, onBeforeNavigate, english = false }: Props) => {
  const navigate = useNavigate();
  const respondCollab = useRespondProjectCollabInvite();

  const followIds = useMemo(
    () =>
      items
        .filter((n) => n.kind.includes("follow"))
        .map(extractFollowerId)
        .filter((id): id is string => !!id),
    [items],
  );
  const actorIds = useMemo(
    () => [...followIds, ...items.map(extractActorId).filter((id): id is string => !!id)],
    [items, followIds],
  );
  const { data: followProfiles } = useProfilesByIds(actorIds);
  const profileMap = followProfiles?.map ?? {};
  const projectIds = useMemo(
    () => items.map(extractProjectId).filter((id): id is string => !!id),
    [items],
  );
  const { data: coverMap = {} } = useProjectCovers(projectIds);

  if (loading) {
    return <InlineLoader />;
  }
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title={english ? "No notifications yet" : "ยังไม่มีการแจ้งเตือน"}
        description={
          english
            ? "Follows, hire requests, and messages will show up here"
            : "เมื่อมีคนติดตาม จ้างงาน หรือส่งข้อความ จะขึ้นที่นี่"
        }
        action={
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => {
              onBeforeNavigate?.();
              navigate("/");
            }}
          >
            {english ? "Explore work" : "ไปสำรวจผลงาน"}
          </Button>
        }
        className="border-0 shadow-none bg-transparent"
      />
    );
  }

  const groups = groupByNotificationDate(items);

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section key={group.key} className="space-y-2">
          <h3 className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {english ? GROUP_LABEL_EN[group.key] ?? group.label : group.label}
          </h3>
          {group.items.map((n) => {
        const Icon = kindIcon(n.kind);
        const isFollow = n.kind.includes("follow");
        const collabInvite = isPendingCollabInvite(n);
        const inviteId = collabInvite ? extractCollabInviteId(n) : null;
        const inviteAnswer = collabInviteAnswer(n);
        const answering = respondCollab.isPending && respondCollab.variables?.inviteId === inviteId;
        const followerId = isFollow ? extractFollowerId(n) : null;
        const followerProfile = followerId ? profileMap[followerId] : undefined;
        const followerName = followerProfile?.display_name || followerProfile?.username || n.title;
        const actorId = extractActorId(n);
        const actorProfile = actorId ? profileMap[actorId] : undefined;
        const projectId = extractProjectId(n);
        const coverUrl = projectId ? coverMap[projectId] : undefined;
        // Left thumbnail: the work for likes / comments / work events, otherwise the person.
        const thumb: { kind: "cover"; src: string } | { kind: "person"; src?: string | null; name: string } | null =
          prefersWorkCover(n.kind) && coverUrl
            ? { kind: "cover", src: coverUrl }
            : actorId
              ? { kind: "person", src: actorProfile?.avatar_url, name: actorProfile?.display_name || actorProfile?.username || n.title }
              : coverUrl
                ? { kind: "cover", src: coverUrl }
                : null;
        const followerPath = followerId
          ? profilePublicPath({ user_id: followerId, username: followerProfile?.username })
          : resolveNotificationLink(n.link);

        return (
          <div
            key={n.id}
            className={`flex flex-col gap-2 p-3 rounded-2xl border transition-colors ${
              n.is_read ? "border-transparent hover:bg-secondary/40" : "border-primary/20 bg-primary/5"
            }`}
          >
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => {
                  onOpen(n);
                  onBeforeNavigate?.();
                  navigate(isFollow && followerId ? followerPath : resolveNotificationLink(n.link));
                }}
                className="flex-1 flex items-start gap-3 text-left min-w-0"
              >
                {thumb?.kind === "cover" ? (
                  <img
                    src={thumb.src}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-12 w-12 shrink-0 rounded-xl bg-secondary object-cover"
                  />
                ) : thumb?.kind === "person" ? (
                  <UserAvatar src={thumb.src} name={thumb.name} className="h-12 w-12 shrink-0" />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {isFollow && followerId ? (
                      <>
                        <span>{followerName}</span>{" "}
                        <span className="font-normal text-muted-foreground">{english ? "started following you" : "เริ่มติดตามคุณ"}</span>
                      </>
                    ) : (
                      n.title
                    )}
                  </p>
                  {!isFollow && n.body ? (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {notificationBodyPreview(n.body)}
                    </p>
                  ) : null}
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[11px] text-muted-foreground">{timeAgo(n.created_at, { withTime: true, english })}</p>
                    {n.is_read ? (
                      <span className="text-[10px] text-muted-foreground/80">{english ? "Read" : "อ่านแล้ว"}</span>
                    ) : null}
                  </div>
                </div>
              </button>
              {isFollow && followerId ? (
                <FollowButton freelancerId={followerId} size="sm" variant="compact" />
              ) : null}
              <div className="flex shrink-0 flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => onDismiss(n.id)}
                  className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  title={english ? "Hide" : "ซ่อน"}
                  aria-label={english ? "Hide notification" : "ซ่อนการแจ้งเตือน"}
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
                {/* Type icon sits under the ✕; when there is no thumbnail the left tile already shows it. */}
                {thumb ? <Icon className="h-4 w-4 text-muted-foreground" aria-hidden /> : null}
              </div>
            </div>
            {/* Stays until the answer is saved, so a failed request can be retried. */}
            {collabInvite && inviteId && (
              <div className="flex gap-2 pl-[60px]">
                <Button
                  type="button"
                  size="sm"
                  className="h-8 rounded-full text-xs"
                  disabled={answering}
                  onClick={() => respondCollab.mutate({ inviteId, accept: true })}
                >
                  {english ? "Accept" : "ยอมรับ"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-full text-xs"
                  disabled={answering}
                  onClick={() => respondCollab.mutate({ inviteId, accept: false })}
                >
                  {english ? "Decline" : "ปฏิเสธ"}
                </Button>
              </div>
            )}
            {inviteAnswer ? (
              <p className="pl-[60px] text-xs text-muted-foreground">
                {inviteAnswer === "accepted"
                  ? english
                    ? "Accepted — your name is on this work"
                    : "ยอมรับแล้ว — ชื่อคุณขึ้นในผลงานนี้"
                  : inviteAnswer === "cancelled"
                    ? english
                      ? "The poster cancelled this tag"
                      : "เจ้าของผลงานยกเลิกการแท็กนี้แล้ว"
                    : english
                      ? "Declined — your name is not on this work"
                      : "ปฏิเสธแล้ว — ผลงานนี้จะไม่มีชื่อคุณ"}
              </p>
            ) : null}
          </div>
        );
          })}
        </section>
      ))}
    </div>
  );
};

export default InboxList;
