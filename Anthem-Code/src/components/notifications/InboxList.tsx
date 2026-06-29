import { useNavigate } from "react-router-dom";
import { Bell, Gift, UserPlus, Briefcase, Handshake, MessageCircle, Banknote, Megaphone, Users } from "lucide-react";
import type { Notification } from "@/core/notifications";
import { resolveNotificationLink } from "@/lib/notificationLinks";
import UserAvatar from "@/components/UserAvatar";
import FollowButton from "@/components/FollowButton";
import { Button } from "@/components/ui/button";
import { useRespondProjectCollabInvite } from "@/hooks/useProjectCollabInvites";
import { useProfilesByIds } from "@/core/profiles";
import { useMemo } from "react";
import { profilePublicPath } from "@/lib/profileRoutes";

const kindIcon = (kind: string) => {
  if (kind.includes("gift")) return Gift;
  if (kind.includes("follow")) return UserPlus;
  if (kind.includes("hire")) return Briefcase;
  if (kind.includes("collab")) return Handshake;
  if (kind.includes("message")) return MessageCircle;
  if (kind.includes("cashout")) return Banknote;
  if (kind.includes("ad")) return Megaphone;
  if (kind.includes("project_collab")) return Users;
  return Bell;
};

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "เมื่อสักครู่";
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชม.ที่แล้ว`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} วันที่แล้ว`;
  return new Date(iso).toLocaleDateString("th-TH");
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
}

const InboxList = ({ items, loading, onOpen, onDismiss, onBeforeNavigate }: Props) => {
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
    return <div className="text-center py-10 text-muted-foreground text-sm">กำลังโหลด...</div>;
  }
  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Bell className="w-10 h-10 mx-auto mb-2 opacity-50" />
        <p className="text-sm">ยังไม่มีการแจ้งเตือนในกล่องข้อความ</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((n) => {
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
                        <span className="font-normal text-muted-foreground">เริ่มติดตามคุณ</span>
                      </>
                    ) : (
                      n.title
                    )}
                  </p>
                  {!isFollow && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>}
                  <p className="text-[11px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                </div>
              </button>
              {isFollow && followerId ? (
                <FollowButton freelancerId={followerId} size="sm" variant="compact" />
              ) : null}
              <button
                type="button"
                onClick={() => onDismiss(n.id)}
                className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 shrink-0"
                title="ซ่อน"
              >
                ซ่อน
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
                  ยอมรับ
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
                  ปฏิเสธ
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default InboxList;
