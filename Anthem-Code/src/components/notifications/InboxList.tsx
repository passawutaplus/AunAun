import { useNavigate } from "react-router-dom";
import { Bell, Gift, UserPlus, Briefcase, Handshake, MessageCircle, Banknote, Megaphone, Users } from "lucide-react";
import type { Notification } from "@/core/notifications";
import { resolveNotificationLink } from "@/lib/notificationLinks";
import { notificationBodyPreview } from "@/lib/chatReply";
import { InlineLoader } from "@/components/ui/BanterLoader";
import UserAvatar from "@/components/UserAvatar";
import FollowButton from "@/components/FollowButton";
import { Button } from "@/components/ui/button";
import { CHAT_CARD_DECLINE_LABEL } from "@/components/chat/ChatCardShell";
import { useRespondProjectCollabInvite } from "@/hooks/useProjectCollabInvites";
import { useProfilesByIds } from "@/core/profiles";
import { useMemo } from "react";
import { profilePublicPath } from "@/lib/profileRoutes";
import EmptyState from "@/components/ui/EmptyState";
import { groupByNotificationDate } from "@/lib/notificationDateGroups";
import { timeAgo } from "@/lib/format";

const kindIcon = (kind: string) => {
  if (kind.includes("gift")) return Gift;
  if (kind.includes("follow")) return UserPlus;
  if (kind.includes("hire") || kind.includes("job")) return Briefcase;
  if (kind.includes("collab") || kind.includes("project_collab")) return Handshake;
  if (kind.includes("message") || kind.includes("chat")) return MessageCircle;
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
  const { data: followProfiles } = useProfilesByIds(followIds);
  const profileMap = followProfiles?.map ?? {};

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
        const followerId = isFollow ? extractFollowerId(n) : null;
        const followerProfile = followerId ? profileMap[followerId] : undefined;
        const followerName = followerProfile?.display_name || followerProfile?.username || n.title;
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
                {isFollow && followerId ? (
                  <UserAvatar
                    src={followerProfile?.avatar_url}
                    name={followerName}
                    className="w-10 h-10 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
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
              <button
                type="button"
                onClick={() => onDismiss(n.id)}
                className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 shrink-0"
                title={english ? "Hide" : "ซ่อน"}
              >
                {english ? "Hide" : "ซ่อน"}
              </button>
            </div>
            {collabInvite && inviteId && (
              <div className="flex gap-2 pl-[52px]">
                <Button
                  type="button"
                  size="sm"
                  className="h-7 rounded-full text-xs"
                  disabled={respondCollab.isPending}
                  onClick={() => {
                    respondCollab.mutate({ inviteId, accept: true });
                    onDismiss(n.id);
                  }}
                >
                  {english ? "Accept" : "ยอมรับ"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-full text-xs"
                  disabled={respondCollab.isPending}
                  onClick={() => {
                    respondCollab.mutate({ inviteId, accept: false });
                    onDismiss(n.id);
                  }}
                >
                  {english ? "Decline" : CHAT_CARD_DECLINE_LABEL}
                </Button>
              </div>
            )}
          </div>
        );
          })}
        </section>
      ))}
    </div>
  );
};

export default InboxList;
