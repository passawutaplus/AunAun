import BriefcaseIcon from "../icons/BriefcaseIcon";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, MessageCircle, Handshake, Bell, Inbox, UserPlus } from "lucide-react";
import { InlineLoader } from "@/components/ui/BanterLoader";
import { PlusOneMark } from "@/components/brand/PlusOneMark";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useActivityNotifications, useHireNotifications, useCollabNotifications, type HireNotif, type CollabNotif } from "@/hooks/useNotifications";
import { useFollowNotifications } from "@/hooks/useFollowLists";
import { useAuth } from "@/hooks/useAuth";
import { useUpdateCollabStatus } from "@/hooks/useCollabRequests";
import { useAcceptRequest, useFindConversationByRequest, useOpenHireCollabChat } from "@/hooks/useChat";
import { useNotifications as useInbox } from "@/core/notifications";
import InboxList from "@/components/notifications/InboxList";
import FollowNotificationsList from "@/components/notifications/FollowNotificationsList";
import UserAvatar from "@/components/UserAvatar";
import { useCreateEscrowFromHire } from "@/hooks/useEscrow";
import { isSoloEcosystemEnabled } from "@/lib/aplus1Launch";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

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

const ActorAvatar = ({ name, avatar }: { name: string; avatar: string }) => (
  <UserAvatar src={avatar} name={name} className="w-11 h-11 shrink-0" />
);

const Empty = ({ icon: Icon, text }: { icon: typeof Bell; text: string }) => (
  <div className="text-center py-16 text-muted-foreground">
    <Icon className="w-10 h-10 mx-auto mb-2 opacity-50" />
    <p className="text-sm">{text}</p>
  </div>
);

interface NotificationsPanelProps {
  onBeforeNavigate?: () => void;
  /** Sheet / dialog — tabs stay fixed, list scrolls inside. */
  embedded?: boolean;
}

type TabDef = {
  value: string;
  label: string;
  icon: LucideIcon;
  count?: number;
};

const NotificationTabTrigger = ({ tab }: { tab: TabDef }) => {
  const Icon = tab.icon;
  const count = tab.count ?? 0;
  return (
    <TabsTrigger
      value={tab.value}
      className={cn(
        "relative col-span-1 inline-flex items-center justify-center gap-1.5",
        "h-10 rounded-full px-2 text-xs font-medium shrink-0",
        "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        "text-muted-foreground hover:text-foreground",
        "md:px-3",
      )}
    >
      <Icon className="w-4 h-4 shrink-0" aria-hidden />
      <span className="hidden md:inline whitespace-nowrap">{tab.label}</span>
      {count > 0 && (
        <>
          <span className="md:hidden absolute top-1 right-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-semibold flex items-center justify-center leading-none">
            {count > 9 ? "9+" : count}
          </span>
          <span className="hidden md:inline text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full leading-none">
            {count > 99 ? "99+" : count}
          </span>
        </>
      )}
    </TabsTrigger>
  );
};

const NotificationsPanel = ({ onBeforeNavigate, embedded = false }: NotificationsPanelProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState("inbox");
  const inbox = useInbox(user?.id);
  const { data: activity = [], isLoading: la } = useActivityNotifications();
  const { data: hires = [], isLoading: lh } = useHireNotifications();
  const { data: collabs = [], isLoading: lc } = useCollabNotifications();
  const { data: followNotifs = [] } = useFollowNotifications();
  const updateCollab = useUpdateCollabStatus();
  const createHireEscrow = useCreateEscrowFromHire();
  const accept = useAcceptRequest();
  const openHireCollabChat = useOpenHireCollabChat();
  const findConv = useFindConversationByRequest();

  const go = (path: string) => {
    onBeforeNavigate?.();
    navigate(path);
  };

  const openHireChat = async (h: HireNotif) => {
    try {
      let convId = h.conversationId ?? (await findConv("hire", h.id));
      if (!convId && h.clientId && h.freelancerId) {
        const pending = h.status === "ใหม่" || h.status === "ที่ต้องตอบ";
        if (pending) {
          convId = await openHireCollabChat.mutateAsync({
            kind: "hire",
            requestId: h.id,
            clientId: h.clientId,
            freelancerId: h.freelancerId,
            projectId: h.projectId,
            projectTitle: h.projectTitle,
            contextMessage: h.forwardedFromRequestId
              ? "สวัสดีครับ/ค่ะ — สนใจคุยต่อจากงานที่ถูกส่งต่อมา"
              : "เริ่มสนทนางานจ้าง — คุยรายละเอียดได้เลย",
            skipStatusUpdate: true,
          });
        } else {
          convId = await accept.mutateAsync({
            kind: "hire",
            requestId: h.id,
            clientId: h.clientId,
            freelancerId: h.freelancerId,
            projectId: h.projectId,
            projectTitle: h.projectTitle,
          });
        }
      }
      if (convId) go(`/chat/${convId}`);
      else toast.error("ไม่พบห้องสนทนา");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "เปิดแชทไม่สำเร็จ");
    }
  };

  const openCollabChat = async (c: CollabNotif) => {
    try {
      let convId = c.conversationId ?? (await findConv("collab", c.id));
      if (!convId) {
        convId = await accept.mutateAsync({
          kind: "collab",
          requestId: c.id,
          clientId: c.senderId,
          freelancerId: c.recipientId,
          projectId: c.projectId,
          projectTitle: "คอลแลปไอเดียใหม่",
        });
      }
      go(`/chat/${convId}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "เปิดแชทไม่สำเร็จ");
    }
  };

  const tabs: TabDef[] = [
    { value: "inbox", label: "ทั้งหมด", icon: Inbox, count: inbox.unreadCount },
    { value: "follows", label: "ติดตาม", icon: UserPlus, count: followNotifs.length },
    { value: "activity", label: "กิจกรรม", icon: Bell, count: activity.length },
    { value: "hire", label: "จ้างงาน", icon: BriefcaseIcon, count: hires.length },
    { value: "collab", label: "Collab", icon: Handshake, count: collabs.length },
  ];

  const tabBar = (
    <TabsList
      className={cn(
        "w-full h-auto min-h-0 p-1.5 gap-1.5",
        "grid grid-cols-5 auto-rows-fr",
        "bg-secondary rounded-2xl border border-border",
        "justify-items-stretch",
      )}
    >
      {tabs.map((t) => (
        <NotificationTabTrigger key={t.value} tab={t} />
      ))}
    </TabsList>
  );

  const contentMt = embedded ? "mt-0" : "mt-4";

  return (
    <Tabs
      value={tab}
      onValueChange={setTab}
      className={cn("w-full", embedded && "flex flex-col min-h-0 flex-1")}
    >
      <div className={cn("shrink-0", embedded && "pb-3 border-b border-border/40")}>{tabBar}</div>

      <div className={cn(embedded && "flex-1 min-h-0 overflow-y-auto overscroll-contain pt-3 -mx-1 px-1")}>
      <TabsContent value="inbox" className={contentMt}>
        <InboxList
          items={inbox.items}
          loading={inbox.loading}
          onOpen={(n) => {
            if (!n.is_read) inbox.markRead(n.id);
          }}
          onDismiss={inbox.dismiss}
          onBeforeNavigate={onBeforeNavigate}
        />
      </TabsContent>

      <TabsContent value="follows" className={contentMt}>
        <FollowNotificationsList onBeforeNavigate={onBeforeNavigate} />
      </TabsContent>

      <TabsContent value="activity" className={cn(contentMt, "space-y-2")}>
        {la ? (
          <InlineLoader />
        ) : activity.length === 0 ? (
          <Empty icon={Bookmark} text="ยังไม่มีกิจกรรมบนผลงานของคุณ" />
        ) : (
          activity.map((n) => {
            const verb = n.kind === "like" ? "+1 ผลงาน" : n.kind === "bookmark" ? "บันทึกผลงาน" : "คอมเมนต์ผลงาน";
            const color = n.kind === "like" ? "text-primary" : n.kind === "bookmark" ? "text-primary" : "text-foreground";
            return (
              <button
                key={n.id}
                onClick={() => go(`/project/${n.projectId}`)}
                className="w-full flex items-start gap-3 p-3 rounded-2xl hover:bg-secondary/50 transition-colors text-left"
              >
                <div className="relative shrink-0">
                  <ActorAvatar name={n.actorName} avatar={n.actorAvatar} />
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background border-2 border-background flex items-center justify-center ${color}`}>
                    {n.kind === "like" ? (
                      <PlusOneMark className="text-[8px]" />
                    ) : n.kind === "bookmark" ? (
                      <Bookmark className="w-3 h-3" />
                    ) : (
                      <MessageCircle className="w-3 h-3" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">{n.actorName}</span>{" "}
                    <span className="text-muted-foreground">{verb}</span>{" "}
                    <span className="font-medium">"{n.projectTitle}"</span>
                  </p>
                  {n.content && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">"{n.content}"</p>}
                  <p className="text-[11px] text-muted-foreground mt-1">{timeAgo(n.createdAt)}</p>
                </div>
                {n.projectCover && (
                  <img src={n.projectCover} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                )}
              </button>
            );
          })
        )}
      </TabsContent>

      <TabsContent value="hire" className={cn(contentMt, "space-y-2")}>
        {lh ? (
          <InlineLoader />
        ) : hires.length === 0 ? (
          <Empty icon={BriefcaseIcon} text="ยังไม่มีคำขอจ้างงาน" />
        ) : (
          hires.map((h) => (
            <div key={h.id} className="p-4 rounded-2xl glass-panel hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-gradient-brand text-white flex items-center justify-center">
                    <BriefcaseIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">{h.clientName}</p>
                    <p className="text-[11px] text-muted-foreground">{h.email}</p>
                  </div>
                </div>
                <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-secondary text-foreground/80">{h.status}</span>
              </div>
              {h.forwardedFromRequestId ? (
                <p className="text-xs font-medium text-[hsl(var(--chat-hire))] mb-1">
                  เพื่อนส่งต่องานมาให้คุณ
                </p>
              ) : null}
              <p className="text-sm text-foreground mb-1">สนใจจ้าง <span className="font-medium">"{h.projectTitle}"</span></p>
              {h.forwardNote?.trim() ? (
                <p className="text-xs text-muted-foreground line-clamp-3 mb-1">โน้ตจากเพื่อน: {h.forwardNote.trim()}</p>
              ) : null}
              {h.message && <p className="text-xs text-muted-foreground line-clamp-3">{h.message}</p>}
              <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
                <span>{timeAgo(h.createdAt)}</span>
                {h.budgetAmount && <span className="text-primary font-medium">฿{h.budgetAmount.toLocaleString("th-TH")}</span>}
              </div>
              {h.budgetAmount ? (
                <div className="mt-3 space-y-2">
                  <Button
                    type="button"
                    size="sm"
                    className="w-full bg-[hsl(var(--chat-hire))] text-white hover:opacity-90"
                    disabled={accept.isPending || openHireCollabChat.isPending}
                    onClick={() => void openHireChat(h)}
                  >
                    <MessageCircle className="w-3.5 h-3.5 mr-1" />
                    เปิดแชท
                  </Button>
                  {isSoloEcosystemEnabled() && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full"
                      disabled={createHireEscrow.isPending}
                      onClick={() => createHireEscrow.mutate(h.id)}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                      สร้าง Escrow (ทางเลือก)
                    </Button>
                  )}
                  <p className="text-[10px] text-muted-foreground text-center">
                    หรือโอนตรง/Job Tracker — ไม่ผ่านแพลตฟอร์ม
                  </p>
                </div>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  className="w-full mt-3 bg-[hsl(var(--chat-hire))] text-white hover:opacity-90"
                  disabled={accept.isPending || openHireCollabChat.isPending}
                  onClick={() => void openHireChat(h)}
                >
                  <MessageCircle className="w-3.5 h-3.5 mr-1" />
                  เปิดแชท
                </Button>
              )}
            </div>
          ))
        )}
      </TabsContent>

      <TabsContent value="collab" className={cn(contentMt, "space-y-2")}>
        {lc ? (
          <InlineLoader />
        ) : collabs.length === 0 ? (
          <Empty icon={Handshake} text="ยังไม่มีคำขอร่วมงาน" />
        ) : (
          collabs.map((c) => (
            <div key={c.id} className="p-4 rounded-2xl glass-panel hover:border-primary/30 transition-colors">
              <div className="flex items-start gap-3 mb-2">
                <ActorAvatar name={c.senderName} avatar={c.senderAvatar} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <button onClick={() => go(`/u/${c.senderId}`)} className="font-semibold text-sm text-foreground hover:text-primary">
                      {c.senderName}
                    </button>
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-secondary text-foreground/80">{c.status}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{timeAgo(c.createdAt)}</p>
                </div>
              </div>
              {c.collabTypes.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {c.collabTypes.map((t) => (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{t}</span>
                  ))}
                </div>
              )}
              <p className="text-base text-foreground whitespace-pre-wrap line-clamp-4">{c.message}</p>
              {c.timeline && <p className="text-xs text-muted-foreground mt-1">ช่วงเวลา: {c.timeline}</p>}
              {c.status !== "passed" && c.status !== "declined" && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => void openCollabChat(c)}
                    disabled={accept.isPending}
                    className="flex-1 py-2 rounded-full bg-gradient-brand text-white text-xs font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    <MessageCircle className="w-3.5 h-3.5 inline mr-1" />
                    เปิดแชท
                  </button>
                  <button
                    onClick={() => updateCollab.mutate({ id: c.id, status: "passed" })}
                    className="flex-1 py-2 rounded-full bg-secondary text-foreground text-xs font-medium hover:bg-accent"
                  >
                    ผ่านไปก่อน
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </TabsContent>
      </div>
    </Tabs>
  );
};

export default NotificationsPanel;
