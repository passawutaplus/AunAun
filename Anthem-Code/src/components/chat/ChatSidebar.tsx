import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LayoutGrid, MessageCircle, Handshake, Orbit, Pin, PinOff, Plus, Search, Users } from "lucide-react";
import BriefcaseIcon from "../icons/BriefcaseIcon";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import UserAvatar from "@/components/UserAvatar";
import { useSubscription } from "@/core/subscription/useSubscription";
import {
  useConversations,
  useConversationPins,
  useConversationUnreadCounts,
  isGroupConversation,
  otherParticipantId,
  type ChatKind,
  type Conversation,
} from "@/hooks/useChat";
import CreateGroupDialog from "@/components/chat/CreateGroupDialog";
import { timeAgoTH } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DEMO_RESEARCH_ACCOUNTS, isDemoMode } from "@/lib/demoMode";
import { toast } from "sonner";

const TABS: { key: "all" | ChatKind; label: string; icon: typeof BriefcaseIcon }[] = [
  { key: "all", label: "ทั้งหมด", icon: MessageCircle },
  { key: "hire", label: "งานจ้าง", icon: BriefcaseIcon },
  { key: "collab", label: "คอลแลป", icon: Handshake },
  { key: "group", label: "กลุ่ม", icon: Users },
];

interface Props {
  selectedId?: string;
  tab: "all" | ChatKind;
  onTabChange: (tab: "all" | ChatKind) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onSelectConversation?: (conversationId: string) => void;
  className?: string;
}

const ChatSidebar = ({
  selectedId,
  tab,
  onTabChange,
  search,
  onSearchChange,
  onSelectConversation,
  className,
}: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: myProfile } = useProfile(user?.id);
  const { tier } = useSubscription();
  const [groupOpen, setGroupOpen] = useState(false);
  const { data: conversations = [], isLoading, isError, error } = useConversations(
    tab === "all" ? undefined : tab,
  );
  const { data: pins = [], togglePin } = useConversationPins();
  const pinnedSet = useMemo(() => new Set(pins.map((p) => p.conversation_id)), [pins]);

  const otherIds = useMemo(
    () =>
      Array.from(
        new Set(
          conversations
            .filter((c) => !isGroupConversation(c))
            .map((c) => otherParticipantId(c, user?.id ?? ""))
            .filter(Boolean) as string[],
        ),
      ),
    [conversations, user?.id],
  );

  const { data: profilesMap = {} } = useQuery({
    queryKey: ["chat-list-profiles", otherIds],
    enabled: otherIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", otherIds);
      const map: Record<string, { name: string; avatar: string }> = {};
      (data ?? []).forEach((p) => {
        const uid = p.user_id ?? (p as { id?: string }).id;
        if (uid) map[uid] = { name: p.display_name || "ผู้ใช้", avatar: p.avatar_url || "" };
      });
      return map;
    },
  });

  const convIds = conversations.map((c) => c.id);
  const { data: lastMessages = {} } = useQuery({
    queryKey: ["chat-last-msgs", convIds],
    enabled: convIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("conversation_id, content, attachment_url, sender_id, created_at, message_type, deleted_at")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false });
      const map: Record<string, { preview: string; mine: boolean; created_at: string }> = {};
      (data ?? []).forEach((m: {
        conversation_id: string;
        content: string | null;
        attachment_url: string | null;
        sender_id: string;
        created_at: string;
        message_type?: string | null;
        deleted_at?: string | null;
      }) => {
        if (map[m.conversation_id]) return;
        if (m.deleted_at) {
          map[m.conversation_id] = {
            preview: "ข้อความถูกยกเลิก",
            mine: m.sender_id === user?.id,
            created_at: m.created_at,
          };
          return;
        }
        const preview =
          m.message_type === "project"
            ? "📁 ผลงาน"
            : m.content || (m.attachment_url ? "📷 รูปภาพ" : "");
        map[m.conversation_id] = {
          preview,
          mine: m.sender_id === user?.id,
          created_at: m.created_at,
        };
      });
      return map;
    },
  });

  const { data: unreadCounts = {} } = useConversationUnreadCounts(convIds);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = conversations;
    if (q) {
      list = conversations.filter((c) => {
        if (isGroupConversation(c)) {
          const title = (c.title ?? c.project_title ?? "").toLowerCase();
          return title.includes(q);
        }
        const otherId = otherParticipantId(c, user?.id ?? "");
        const p = otherId ? profilesMap[otherId] : undefined;
        const name = (p?.name ?? "").toLowerCase();
        const title = (c.project_title ?? "").toLowerCase();
        return name.includes(q) || title.includes(q);
      });
    }
    return [...list].sort((a, b) => {
      const aPin = pinnedSet.has(a.id) ? 1 : 0;
      const bPin = pinnedSet.has(b.id) ? 1 : 0;
      if (aPin !== bPin) return bPin - aPin;
      const aTime = lastMessages[a.id]?.created_at ?? a.last_message_at;
      const bTime = lastMessages[b.id]?.created_at ?? b.last_message_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  }, [conversations, search, profilesMap, user?.id, pinnedSet, lastMessages]);

  const selectConversation = (c: Conversation) => {
    if (onSelectConversation) {
      onSelectConversation(c.id);
      return;
    }
    navigate(`/chat/${c.id}`);
  };

  const handleCreateGroup = () => {
    const canCreate = tier === "pro" || tier === "pro_plus" || tier === "inhouse";
    if (!canCreate) {
      toast.error("สร้างกลุ่มแชทได้เฉพาะสมาชิก Pro ขึ้นไป", {
        action: { label: "อัปเกรด", onClick: () => navigate("/upgrade") },
      });
      return;
    }
    setGroupOpen(true);
  };

  const handleTogglePin = (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    togglePin.mutate({ conversationId: convId, pinned: pinnedSet.has(convId) });
  };

  const goProjectsHome = () => {
    localStorage.setItem("feed-mode", "projects");
    navigate("/", { state: { feedHomeReset: Date.now() } });
  };

  const goArea = () => {
    localStorage.setItem("feed-mode", "community");
    navigate("/?mode=community");
  };

  return (
    <aside className={cn("flex flex-col h-full border-r border-border bg-background", className)}>
      <div className="shrink-0 p-3 border-b border-border space-y-3">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-lg font-semibold text-foreground shrink-0">ข้อความ</h1>
            {user && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="hidden md:inline-flex h-9 w-9 rounded-full shrink-0 p-0"
                aria-label="โปรไฟล์ของฉัน"
                title="โปรไฟล์ของฉัน"
                onClick={() => navigate("/portfolio")}
              >
                <UserAvatar
                  src={myProfile?.avatar_url}
                  name={myProfile?.display_name ?? user.email ?? "P"}
                  className="w-8 h-8"
                  fallbackClassName="text-xs"
                />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <div className="flex items-center gap-0.5 rounded-full border border-border/60 bg-muted/40 p-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                aria-label="หน้าแรก Projects"
                title="หน้าแรก Projects"
                onClick={goProjectsHome}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                aria-label="Area"
                title="Area"
                onClick={goArea}
              >
                <Orbit className="w-4 h-4" />
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              aria-label="สร้างกลุ่มแชท"
              onClick={handleCreateGroup}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ค้นหาชื่อหรืองาน…"
            className="pl-9 rounded-full bg-muted border-0 h-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            const accent =
              key === "hire"
                ? active
                  ? "bg-[hsl(var(--chat-hire))] text-white border-transparent"
                  : "border-border text-foreground"
                : key === "collab"
                  ? active
                    ? "bg-[hsl(var(--chat-collab))] text-white border-transparent"
                    : "border-border text-foreground"
                  : key === "group"
                    ? active
                      ? "bg-primary text-primary-foreground border-transparent"
                      : "border-border text-foreground"
                    : active
                      ? "bg-foreground text-background border-transparent"
                      : "border-border text-foreground";
            return (
              <button
                key={key}
                type="button"
                onClick={() => onTabChange(key)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors shrink-0",
                  accent,
                )}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading && <p className="text-sm text-muted-foreground text-center py-8">กำลังโหลด…</p>}
        {isError && (
          <div className="text-center py-12 text-destructive px-4 text-sm">
            โหลดรายการแชทไม่สำเร็จ — {(error as Error)?.message ?? "ลองรีเฟรชหน้า"}
          </div>
        )}
        {!isLoading && !isError && filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground px-4">
            <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="font-medium text-foreground">ยังไม่มีบทสนทนา</p>
            <p className="text-sm mt-1">เมื่อคุณตอบรับคำขอจ้างหรือคอลแลป ห้องแชทจะอยู่ที่นี่</p>
            {isDemoMode() && (
              <p className="text-xs mt-3 text-primary/90 leading-relaxed">
                ข้อมูล demo 5 แชทอยู่ที่บัญชี{" "}
                <span className="font-medium">{DEMO_RESEARCH_ACCOUNTS[0].email}</span>
                <br />
                ออกจากระบบแล้วล็อกอินใหม่ด้วยรหัสที่ส่งให้ผู้รีวิวเป็นการส่วนตัว
              </p>
            )}
          </div>
        )}

        <ul className="space-y-0.5">
          {filtered.map((c) => {
            const isGroup = isGroupConversation(c);
            const otherId = otherParticipantId(c, user?.id ?? "");
            const p = otherId ? profilesMap[otherId] : undefined;
            const last = lastMessages[c.id];
            const isHire = c.kind === "hire";
            const selected = selectedId === c.id;
            const unread = unreadCounts[c.id] ?? 0;
            const isPinned = pinnedSet.has(c.id);
            const accentBorder = isGroup
              ? "border-primary"
              : isHire
                ? "border-[hsl(var(--chat-hire))]"
                : "border-[hsl(var(--chat-collab))]";
            const badgeBg = isGroup
              ? "bg-primary/10 text-primary"
              : isHire
                ? "bg-[hsl(var(--chat-hire-soft))] text-[hsl(var(--chat-hire))]"
                : "bg-[hsl(var(--chat-collab-soft))] text-[hsl(var(--chat-collab))]";
            const listName = isGroup ? c.title || c.project_title || "กลุ่มแชท" : p?.name ?? "ผู้ใช้";

            return (
              <li key={c.id} className="relative">
                <button
                  type="button"
                  onClick={() => selectConversation(c)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 pr-10 rounded-xl transition-colors text-left border-l-4",
                    selected ? cn("bg-accent/80", accentBorder) : "border-transparent hover:bg-accent/50",
                    isPinned && !selected && "bg-muted/40",
                  )}
                >
                  <div className="relative shrink-0">
                    {isGroup ? (
                      <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                    ) : p?.avatar ? (
                      <img src={p.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center font-medium text-muted-foreground">
                        {(p?.name ?? "?")[0]}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-semibold text-foreground truncate text-sm">{listName}</span>
                        <span
                          className={cn(
                            "shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                            badgeBg,
                          )}
                        >
                          {isGroup ? "กลุ่ม" : isHire ? "จ้าง" : "คอลแลป"}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {timeAgoTH(last?.created_at ?? c.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground truncate flex-1">
                        {last
                          ? (last.mine ? "คุณ: " : "") + last.preview
                          : isGroup
                            ? "เริ่มแชทกลุ่มได้เลย"
                            : isHire
                              ? "เริ่มพูดคุยเรื่องงานได้เลย"
                              : "เริ่มคุยคอลแลปได้เลย"}
                      </p>
                      {unread > 0 && (
                        <span className="shrink-0 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-semibold rounded-full bg-destructive text-destructive-foreground">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      )}
                    </div>
                    {!isGroup && c.project_title && (
                      <p className="text-[11px] text-muted-foreground/80 truncate mt-0.5">
                        {c.project_title}
                      </p>
                    )}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleTogglePin(e, c.id)}
                  className="absolute top-3 right-2 p-1 rounded-full hover:bg-background/80 text-muted-foreground hover:text-foreground z-10"
                  aria-label={isPinned ? "เลิกปักหมุด" : "ปักหมุด"}
                >
                  {isPinned ? <Pin className="w-3.5 h-3.5 text-primary" /> : <PinOff className="w-3.5 h-3.5 opacity-40" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <CreateGroupDialog
        open={groupOpen}
        onOpenChange={setGroupOpen}
        onCreated={(convId) => {
          setGroupOpen(false);
          if (onSelectConversation) onSelectConversation(convId);
          else navigate(`/chat/${convId}`);
        }}
      />
    </aside>
  );
};

export default ChatSidebar;
