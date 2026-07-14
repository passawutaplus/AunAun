import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, ChevronDown, ChevronRight, ExternalLink, ImageIcon } from "lucide-react";
import { InlineLoader } from "@/components/ui/BanterLoader";
import { useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  isGroupConversation,
  otherParticipantId,
  type Conversation,
  type Message,
} from "@/hooks/useChat";
import { useFollowState } from "@/hooks/useFollow";
import { PUBLIC_PROFILE_SELECT } from "@/lib/dbSelects";
import { profilePublicPath } from "@/lib/profileRoutes";
import ChatMetaPanel from "@/components/chat/ChatMetaPanel";
import ChatPortfolioSection from "@/components/chat/ChatPortfolioSection";
import {
  HIRE_CHAT_LOCKED_HINT,
  hireChatLockedByMessages,
  isHireChatComposerLocked,
} from "@/lib/hireRejectChat";
import { cn } from "@/lib/utils";
import { WORK_DISCIPLINE_LABELS, type WorkDisciplineId } from "@/data/workDisciplineOptions";
import { labelOpportunityType } from "@/lib/opportunity";

interface Props {
  conversation: Conversation;
  messages: Message[];
  className?: string;
  onClose?: () => void;
  /** Desktop collapse aria/title; defaults to closing the slide-over on mobile. */
  collapseLabel?: string;
}

type MemberOption = {
  userId: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
};

const RESIZE_HANDLE_H = 16;
const WORKS_MIN_H = 140;
const META_BAR_H = 40;

const ChatPartnerPanel = ({ conversation, messages, className, onClose, collapseLabel }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isGroup = isGroupConversation(conversation);
  const isHire = conversation.kind === "hire";
  const otherId = otherParticipantId(conversation, user?.id ?? "");

  const { data: hirePostRejectChat = null } = useQuery({
    queryKey: ["chat-hire-forward-src", conversation.request_id],
    enabled: isHire && !!conversation.request_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hiring_requests")
        .select("post_reject_chat")
        .eq("id", conversation.request_id!)
        .maybeSingle();
      if (error) throw error;
      return (data as { post_reject_chat?: string | null } | null)?.post_reject_chat ?? null;
    },
  });

  const chatLocked =
    isHire &&
    (isHireChatComposerLocked(hirePostRejectChat) || hireChatLockedByMessages(messages));

  const { data: groupMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ["group-panel-members", conversation.id],
    enabled: isGroup && !!conversation.id,
    queryFn: async (): Promise<MemberOption[]> => {
      const { data: rows, error } = await supabase
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", conversation.id);
      if (error) throw error;
      const ids = Array.from(new Set((rows ?? []).map((r) => r.user_id as string).filter(Boolean)));
      if (ids.length === 0) return [];

      const { data: profiles, error: pErr } = await supabase
        .from("profiles_public")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", ids);
      if (pErr) throw pErr;

      const byId = new Map((profiles ?? []).map((p) => [p.user_id as string, p]));
      return ids.map((id) => {
        const p = byId.get(id);
        const isSelf = id === user?.id;
        return {
          userId: id,
          displayName: isSelf
            ? "คุณ"
            : p?.display_name || p?.username || "ผู้ใช้",
          username: p?.username ?? null,
          avatarUrl: p?.avatar_url ?? null,
        };
      });
    },
  });

  const defaultViewId = useMemo(() => {
    if (!isGroup) return otherId ?? null;
    const others = groupMembers.filter((m) => m.userId !== user?.id);
    return others[0]?.userId ?? groupMembers[0]?.userId ?? null;
  }, [isGroup, otherId, groupMembers, user?.id]);

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const viewUserId = isGroup ? selectedMemberId ?? defaultViewId : otherId;

  useEffect(() => {
    setSelectedMemberId(null);
  }, [conversation.id]);

  useEffect(() => {
    if (!isGroup || !defaultViewId) return;
    if (selectedMemberId && groupMembers.some((m) => m.userId === selectedMemberId)) return;
    setSelectedMemberId(defaultViewId);
  }, [isGroup, defaultViewId, selectedMemberId, groupMembers]);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["chat-partner-profile", viewUserId],
    enabled: !!viewUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles_public")
        .select(PUBLIC_PROFILE_SELECT)
        .eq("user_id", viewUserId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const isLoading = isGroup ? membersLoading || profileLoading : profileLoading;
  const { followers, following } = useFollowState(viewUserId ?? undefined);
  const [metaOpen, setMetaOpen] = useState(false);
  const reducedMotion = useReducedMotion();

  const rootRef = useRef<HTMLElement>(null);
  const profileInnerRef = useRef<HTMLDivElement>(null);
  const profileStatsRef = useRef<HTMLDivElement>(null);
  const profileEndRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);
  const [profileH, setProfileH] = useState<number | null>(null);
  const [minProfileH, setMinProfileH] = useState(180);
  const [maxProfileH, setMaxProfileH] = useState(420);

  const attachments = useMemo(
    () =>
      messages
        .filter((m) => m.attachment_url && m.message_type !== "project")
        .map((m) => ({ url: m.attachment_url!, createdAt: m.created_at }))
        .reverse(),
    [messages],
  );

  const skills = (profile?.skills as string[] | null) ?? [];
  const disciplines = (profile?.preferred_categories as string[] | null) ?? [];
  const lookingFor = (profile?.opportunity_types as string[] | null) ?? [];
  const displayName =
    viewUserId === user?.id
      ? "คุณ"
      : profile?.display_name || profile?.username || "ผู้ใช้";
  const partnerLabel =
    viewUserId === user?.id
      ? "ผลงานของคุณ"
      : displayName !== "ผู้ใช้"
        ? `ผลงานของ ${displayName}`
        : "ผลงานของคู่แชท";
  const showPartnerWorks = !!viewUserId && viewUserId !== user?.id;
  const showHireMeta = !isGroup && (conversation.kind === "hire" || conversation.kind === "collab");

  const measureProfileLimits = useCallback(() => {
    const inner = profileInnerRef.current;
    if (!inner) return;
    const stats = profileStatsRef.current;
    const end = profileEndRef.current;
    const minH = stats
      ? stats.offsetTop + stats.offsetHeight
      : Math.min(200, inner.scrollHeight);
    const maxH = end ? end.offsetTop + end.offsetHeight : inner.scrollHeight;
    const minClamped = Math.max(140, Math.ceil(minH));
    const maxClamped = Math.max(minClamped, Math.ceil(maxH));
    setMinProfileH(minClamped);
    setMaxProfileH(maxClamped);
  }, []);

  useLayoutEffect(() => {
    measureProfileLimits();
  }, [
    measureProfileLimits,
    isLoading,
    profile,
    lookingFor.length,
    disciplines.length,
    skills.length,
    profile?.bio,
    followers,
    following,
    isGroup,
    groupMembers.length,
  ]);

  const clampProfileH = useCallback(
    (h: number) => {
      const root = rootRef.current;
      const panelCap = root
        ? root.clientHeight - RESIZE_HANDLE_H - WORKS_MIN_H - META_BAR_H
        : maxProfileH;
      const maxH = Math.min(maxProfileH, Math.max(minProfileH, panelCap));
      return Math.round(Math.min(maxH, Math.max(minProfileH, h)));
    },
    [maxProfileH, minProfileH],
  );

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || isLoading) return;
    setProfileH((prev) => clampProfileH(prev ?? maxProfileH));
  }, [clampProfileH, isLoading, maxProfileH, minProfileH, viewUserId]);

  const onResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startY: e.clientY, startH: profileH ?? maxProfileH };
  };

  const onResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dy = e.clientY - dragRef.current.startY;
    setProfileH(clampProfileH(dragRef.current.startH + dy));
  };

  const onResizePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  return (
    <aside
      ref={rootRef}
      className={cn(
        "relative flex flex-col h-full border-l border-border bg-background overflow-hidden",
        className,
      )}
    >
      {chatLocked && (
        <div className="shrink-0 border-b border-border bg-muted/40 px-3 py-2.5 text-left">
          <p className="text-[11px] leading-snug text-muted-foreground">{HIRE_CHAT_LOCKED_HINT}</p>
        </div>
      )}
      {onClose && (
        <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-border">
          <p className="text-[11px] font-medium text-muted-foreground truncate">ข้อมูลคู่แชท</p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg shrink-0"
            onClick={onClose}
            aria-label={collapseLabel ?? "ปิดแผง"}
            title={collapseLabel ?? "ปิดแผง"}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
      <div
        className="shrink-0 overflow-y-auto bg-background"
        style={{ height: profileH ?? undefined, maxHeight: profileH ? undefined : "42%" }}
      >
        <div ref={profileInnerRef} className="relative p-4 pt-3 text-center">
          {isGroup && (
            <div className="mb-3 text-left space-y-1.5">
              <p className="text-[11px] font-medium text-muted-foreground">ดูโปรไฟล์สมาชิก</p>
              {membersLoading ? (
                <div className="h-10 flex items-center text-muted-foreground">
                  <InlineLoader className="py-0" />
                </div>
              ) : groupMembers.length === 0 ? (
                <p className="text-xs text-muted-foreground">ยังไม่มีสมาชิกในกลุ่ม</p>
              ) : (
                <Select
                  value={viewUserId ?? undefined}
                  onValueChange={(id) => setSelectedMemberId(id)}
                >
                  <SelectTrigger className="h-10 rounded-xl text-left">
                    <SelectValue placeholder="เลือกสมาชิก" />
                  </SelectTrigger>
                  <SelectContent>
                    {groupMembers.map((m) => (
                      <SelectItem key={m.userId} value={m.userId}>
                        <span className="inline-flex items-center gap-2 min-w-0">
                          <Avatar className="h-6 w-6 shrink-0">
                            <AvatarImage src={m.avatarUrl ?? undefined} />
                            <AvatarFallback className="text-[10px]">
                              {m.displayName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">
                            {m.displayName}
                            {m.username && m.userId !== user?.id ? (
                              <span className="text-muted-foreground"> @{m.username}</span>
                            ) : null}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {isLoading ? (
            <InlineLoader />
          ) : !viewUserId ? (
            <p className="text-sm text-muted-foreground py-6">เลือกสมาชิกเพื่อดูโปรไฟล์</p>
          ) : (
            <>
              {profile && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 h-7 rounded-full px-2.5 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                  onClick={() => {
                    onClose?.();
                    navigate(profilePublicPath(profile));
                  }}
                >
                  <ExternalLink className="w-3 h-3" />
                  ดูโปรไฟล์
                </Button>
              )}
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="w-20 h-20 rounded-full object-cover mx-auto border-2 border-border"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-2xl font-medium text-muted-foreground mx-auto">
                  {displayName[0]}
                </div>
              )}
              <div className="mt-3 flex items-center justify-center gap-1.5">
                <h2 className="font-semibold text-foreground">{displayName}</h2>
                {profile?.is_verified && (
                  <BadgeCheck className="w-4 h-4 text-primary shrink-0" aria-label="ยืนยันแล้ว" />
                )}
              </div>
              {profile?.username && (
                <p className="text-sm text-muted-foreground mt-0.5">@{profile.username}</p>
              )}
              {profile?.role && <p className="text-xs text-muted-foreground mt-1">{profile.role}</p>}
              {profile?.location && (
                <p className="text-xs text-muted-foreground mt-0.5">{profile.location}</p>
              )}
              <div ref={profileStatsRef} className="flex justify-center gap-4 mt-3 text-sm">
                <span>
                  <span className="font-semibold text-foreground">{followers}</span>{" "}
                  <span className="text-muted-foreground">ผู้ติดตาม</span>
                </span>
                <span>
                  <span className="font-semibold text-foreground">{following}</span>{" "}
                  <span className="text-muted-foreground">กำลังติดตาม</span>
                </span>
              </div>
              <div ref={profileEndRef}>
                {profile?.bio && (
                  <p className="text-base text-foreground mt-3 line-clamp-4 text-left leading-relaxed">
                    {profile.bio}
                  </p>
                )}
                {lookingFor.length > 0 && (
                  <div className="mt-3 text-left">
                    <p className="text-[11px] font-medium text-muted-foreground mb-1.5">กำลังมองหา</p>
                    <div className="flex flex-wrap gap-1.5 justify-start">
                      {lookingFor.slice(0, 4).map((t) => (
                        <Badge key={t} className="text-xs font-normal bg-primary/10 text-primary border-0">
                          {labelOpportunityType(t)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {disciplines.length > 0 && (
                  <div className="mt-3 text-left">
                    <p className="text-[11px] font-medium text-muted-foreground mb-1.5">สายงาน</p>
                    <div className="flex flex-wrap gap-1.5 justify-start">
                      {disciplines.slice(0, 6).map((d) => (
                        <Badge key={d} variant="secondary" className="text-xs font-normal">
                          {WORK_DISCIPLINE_LABELS[d as WorkDisciplineId] ?? d}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {skills.length > 0 && (
                  <div className="mt-3 text-left">
                    <p className="text-[11px] font-medium text-muted-foreground mb-1.5">ความชำนาญ</p>
                    <div className="flex flex-wrap gap-1.5 justify-start">
                      {skills.slice(0, 8).map((s) => (
                        <Badge key={s} variant="outline" className="text-xs font-normal">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div
        role="separator"
        aria-orientation="horizontal"
        aria-valuenow={profileH ?? undefined}
        aria-label="ปรับขนาดโปรไฟล์"
        tabIndex={0}
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerUp}
        onPointerCancel={onResizePointerUp}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setProfileH((h) => clampProfileH((h ?? minProfileH) - 16));
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setProfileH((h) => clampProfileH((h ?? minProfileH) + 16));
          }
        }}
        className={cn(
          "group shrink-0 flex items-center justify-center cursor-row-resize select-none touch-none",
          "bg-transparent hover:bg-muted/40 active:bg-muted/60",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        )}
        style={{ height: RESIZE_HANDLE_H }}
      >
        <span className="relative flex w-full items-center px-3" aria-hidden>
          <span className="h-px w-full bg-border group-hover:bg-foreground/25 transition-colors" />
          <span className="absolute left-1/2 top-1/2 h-1 w-10 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-border group-hover:bg-foreground/30 transition-colors" />
        </span>
      </div>

      <div className="relative flex-1 min-h-0 flex flex-col">
        <div className={cn("flex-1 min-h-0 overflow-y-auto bg-background", metaOpen && "overflow-hidden")}>
          <Tabs key={viewUserId ?? "none"} defaultValue="mine" className="bg-background">
            <TabsList className="sticky top-0 z-10 w-full rounded-none border-b border-border bg-background h-auto p-0 shadow-[0_1px_0_0_hsl(var(--border))]">
              <TabsTrigger
                value="mine"
                className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-background data-[state=active]:shadow-none py-2.5 text-xs"
              >
                ผลงานของฉัน
              </TabsTrigger>
              {showPartnerWorks && (
                <TabsTrigger
                  value="partner"
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-background data-[state=active]:shadow-none py-2.5 text-xs"
                >
                  ผลงานคู่แชท
                </TabsTrigger>
              )}
            </TabsList>
            <TabsContent value="mine" className="mt-0 p-3">
              {user?.id && (
                <ChatPortfolioSection
                  userId={user.id}
                  label="ส่งผลงานของคุณในแชท"
                  dialogTitle="ผลงานทั้งหมดของฉัน"
                  conversationId={conversation.id}
                />
              )}
            </TabsContent>
            {showPartnerWorks && viewUserId && (
              <TabsContent value="partner" className="mt-0 p-3">
                <ChatPortfolioSection
                  userId={viewUserId}
                  label={partnerLabel}
                  dialogTitle={`ผลงานทั้งหมด — ${displayName}`}
                  conversationId={conversation.id}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>

        <div
          className={cn(
            "absolute inset-0 z-20 flex flex-col bg-background shadow-[0_-10px_30px_rgba(0,0,0,0.08)]",
            !reducedMotion && "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            metaOpen ? "translate-y-0" : "translate-y-full pointer-events-none",
          )}
        >
          <button
            type="button"
            aria-expanded={metaOpen}
            onClick={() => setMetaOpen(false)}
            className="flex shrink-0 items-center justify-between w-full px-4 py-2.5 text-xs font-medium text-foreground bg-background border-b border-border hover:bg-muted/40 transition-colors"
          >
            {showHireMeta ? "ข้อมูลงาน / มีเดีย" : "มีเดียในแชท"}
            <ChevronDown
              className={cn(
                "w-4 h-4 text-muted-foreground rotate-180",
                !reducedMotion && "transition-transform duration-300",
              )}
            />
          </button>

          <div className="flex-1 min-h-0 overflow-y-auto bg-background">
            {showHireMeta && <ChatMetaPanel conversation={conversation} embedded />}
            <div className={cn("p-4 bg-background", showHireMeta && "border-t border-border")}>
              {attachments.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">ยังไม่มีรูปหรือไฟล์ในแชทนี้</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {attachments.map(({ url }) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aspect-square rounded-lg overflow-hidden bg-muted hover:opacity-90 transition-opacity"
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {!metaOpen && (
        <button
          type="button"
          aria-expanded={false}
          onClick={() => setMetaOpen(true)}
          className="flex shrink-0 items-center justify-between w-full px-4 py-2.5 text-xs font-medium text-foreground bg-background border-t border-border hover:bg-muted/40 transition-colors"
        >
          {showHireMeta ? "ข้อมูลงาน / มีเดีย" : "มีเดียในแชท"}
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
      )}
    </aside>
  );
};

export default ChatPartnerPanel;
