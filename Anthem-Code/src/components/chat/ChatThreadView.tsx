import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  FileText,
  Handshake,
  Info,
  Users,
} from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { so1oQuotationUrl, trackCrossLink } from "@/lib/crossLink";
import { useStudioForConversation, useStudioMembers } from "@/hooks/useStudios";
import { useSubscription } from "@/core/subscription/useSubscription";
import { canOpenStudioCombinedQuote, canShowStudioQuoteUpsell, openStudioQuotation } from "@/lib/studioQuotationHandoff";
import { StudioQuoteUpsellDialog } from "@/components/studio/StudioQuoteUpsellDialog";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import {
  isGroupConversation,
  isStudioConversation,
  otherParticipantId,
  useUnsendMessage,
  type Conversation,
  type Message,
} from "@/hooks/useChat";
import MessageBubble, { DateSeparator } from "@/components/chat/MessageBubble";
import ChatComposer from "@/components/chat/ChatComposer";
import ReportTrigger from "@/components/report/ReportTrigger";
import { tierLabel } from "@/lib/tierMembership";
import type { PlanId } from "@/data/plans";
import { isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import BriefcaseIcon from "../icons/BriefcaseIcon";

const HIRE_QUICK_BASE = [
  "ขอรายละเอียดเพิ่มเติม",
  "ขอ timeline ของงาน",
  "ขอส่งใบเสนอราคาให้พิจารณา",
  "ขอบคุณสำหรับการติดต่อครับ",
];
const COLLAB_QUICK_BASE = [
  "เริ่มจาก mood board ไหม?",
  "ส่งร่างไอเดียให้ดูได้ไหม",
  "พร้อมเริ่มเลย!",
  "ส่งพอร์ตเพิ่มให้ดูได้ไหม",
];

const CHAT_PANEL_HINT_KEY = "aplus1-chat-panel-hint-dismissed";

interface Props {
  conv: Conversation;
  messages: Message[];
  showBack?: boolean;
  onBack?: () => void;
  onOpenPartnerPanel?: () => void;
  showPartnerToggle?: boolean;
}

const TIER_BADGE_TIERS = new Set<PlanId>(["pro", "pro_plus", "inhouse"]);

const ChatThreadView = ({
  conv,
  messages,
  showBack,
  onBack,
  onOpenPartnerPanel,
  showPartnerToggle,
}: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const endRef = useRef<HTMLDivElement>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const unsend = useUnsendMessage();
  const { tier } = useSubscription();

  const isGroup = isGroupConversation(conv);
  const isStudio = isStudioConversation(conv);
  const isHire = conv.kind === "hire";
  const isStudioHire = isHire && !!conv.studio_id;
  const hasStudioQuoteContext = isStudio || isStudioHire;

  const { data: studioForQuote = null } = useStudioForConversation(
    hasStudioQuoteContext ? conv.id : undefined,
    conv.title || conv.project_title,
  );

  const { data: studioMembers = [] } = useStudioMembers(studioForQuote?.id);
  const myStudioRole = studioMembers.find((m) => m.user_id === user?.id)?.role;
  const canStudioCombinedQuote =
    hasStudioQuoteContext &&
    !!studioForQuote &&
    canOpenStudioCombinedQuote(tier, myStudioRole);
  const showStudioQuoteUpsell =
    hasStudioQuoteContext &&
    !!studioForQuote &&
    canShowStudioQuoteUpsell(tier, myStudioRole);
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [showPanelHint, setShowPanelHint] = useState(false);
  const otherId = otherParticipantId(conv, user?.id ?? "");
  const kind = (isStudio ? "studio" : isGroup ? "group" : conv.kind) as "hire" | "collab" | "group" | "studio";

  const { data: other } = useQuery({
    queryKey: ["chat-other", otherId],
    enabled: !!otherId && !isGroup,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, role, username, subscription_tier")
        .eq("user_id", otherId!)
        .maybeSingle();
      return data;
    },
  });

  const { data: hireMeta } = useQuery({
    queryKey: ["chat-hire-meta", conv.request_id],
    enabled: !!conv.request_id && isHire,
    queryFn: async () => {
      const { data } = await supabase
        .from("hiring_requests")
        .select("id, client_name, email, phone, message, deadline, project_title, budget_amount")
        .eq("id", conv.request_id!)
        .maybeSingle();
      return data;
    },
  });

  const visibleMessages = messages;

  useEffect(() => {
    if (!user || !conv.id || messages.length === 0) return;
    const unread = messages
      .filter((m) => m.sender_id !== user.id && !m.read_at && !m.deleted_at)
      .map((m) => m.id);
    if (unread.length === 0) return;
    supabase
      .rpc("mark_conversation_read" as never, {
        p_conversation_id: conv.id,
      } as never)
      .then(() => {
        qc.invalidateQueries({ queryKey: ["chat-unread-counts"] });
        qc.invalidateQueries({ queryKey: ["chat-inbox-badge"] });
      });
  }, [messages, user, conv.id, qc]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMessages.length]);

  useEffect(() => {
    setReplyTo(null);
  }, [conv.id]);

  useEffect(() => {
    if (typeof window === "undefined" || isGroup) return;
    setShowPanelHint(localStorage.getItem(CHAT_PANEL_HINT_KEY) !== "1");
  }, [conv.id, isGroup]);

  const quickReplies = useMemo(() => {
    if (isGroup) return [] as string[];
    const title = conv.project_title?.trim();
    if (isHire) {
      const extra = title ? [`ชอบผลงาน "${title}" มาก`] : [];
      return [...extra, ...HIRE_QUICK_BASE];
    }
    const extra = title ? [`ชอบผลงาน "${title}" — อยากคุยต่อ`] : [];
    return [...extra, ...COLLAB_QUICK_BASE];
  }, [isGroup, isHire, conv.project_title]);

  const grouped = useMemo(() => {
    const items: Array<{ type: "date"; date: string } | { type: "msg"; m: Message }> = [];
    let lastDate: Date | null = null;
    visibleMessages.forEach((m) => {
      const d = new Date(m.created_at);
      if (!lastDate || !isSameDay(lastDate, d)) {
        items.push({ type: "date", date: m.created_at });
        lastDate = d;
      }
      items.push({ type: "msg", m });
    });
    return items;
  }, [visibleMessages]);

  const accent = isHire ? "text-[hsl(var(--chat-hire))]" : kind === "collab" ? "text-[hsl(var(--chat-collab))]" : "text-primary";
  const badgeBg = isHire ? "bg-[hsl(var(--chat-hire-soft))]" : kind === "collab" ? "bg-[hsl(var(--chat-collab-soft))]" : "bg-primary/10";

  const displayName = isGroup ? conv.title || conv.project_title || "กลุ่มแชท" : other?.display_name ?? "ผู้ใช้";
  const partnerTier = (other?.subscription_tier as PlanId | undefined) ?? "free";
  const showTierBadge = !isGroup && TIER_BADGE_TIERS.has(partnerTier);

  const openQuote = async () => {
    const linkId = await trackCrossLink({
      source: "chat_header",
      refId: conv.id,
      meta: {
        client_id: otherId ?? undefined,
        request_id: conv.request_id ?? undefined,
      },
    });
    const url = so1oQuotationUrl({
      conversationId: conv.id,
      requestId: conv.request_id ?? undefined,
      clientName: hireMeta?.client_name ?? other?.display_name ?? undefined,
      projectTitle: hireMeta?.project_title ?? conv.project_title ?? undefined,
      clientEmail: hireMeta?.email ?? undefined,
      clientPhone: hireMeta?.phone ?? undefined,
      message: hireMeta?.message ?? undefined,
      deadline: hireMeta?.deadline ?? undefined,
      linkId,
    });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const openStudioQuote = async () => {
    if (!studioForQuote) {
      toast.error("ไม่พบข้อมูล Studio");
      return;
    }
    try {
      await openStudioQuotation({
        tier,
        studio: studioForQuote,
        members: studioMembers,
        source: "studio_chat",
        conversationId: conv.id,
        requestId: conv.request_id ?? undefined,
        projectTitle: conv.project_title ?? studioForQuote.name,
        clientName: hireMeta?.client_name ?? "ลูกค้า",
        clientEmail: hireMeta?.email,
        clientPhone: hireMeta?.phone,
        message: hireMeta?.message,
        deadline: hireMeta?.deadline,
        onRequireInHouse: () => setUpsellOpen(true),
      });
    } catch {
      toast.error("เปิด So1o ไม่สำเร็จ");
    }
  };

  const handleUnsend = async (msg: Message) => {
    try {
      await unsend.mutateAsync({
        messageId: msg.id,
        conversationId: conv.id,
        createdAt: msg.created_at,
      });
      if (replyTo?.id === msg.id) setReplyTo(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "ยกเลิกไม่สำเร็จ");
    }
  };

  return (
    <div className="flex flex-col h-full min-w-0 bg-background">
      <header className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-background/90 backdrop-blur-md shrink-0">
        {showBack && (
          <BackButton
            onClick={onBack ?? (() => navigate("/chat"))}
            label="ย้อนกลับ"
            className="md:hidden"
          />
        )}
        <button
          type="button"
          onClick={() => !isGroup && other?.user_id && onOpenPartnerPanel?.()}
          className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
        >
          {isGroup ? (
            <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-primary" />
            </div>
          ) : other?.avatar_url ? (
            <img src={other.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center font-medium text-muted-foreground">
              {displayName[0]}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-foreground truncate text-sm">{displayName}</span>
              {!isGroup && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0",
                    badgeBg,
                    accent,
                  )}
                >
                  {isHire ? <BriefcaseIcon className="w-3 h-3" /> : <Handshake className="w-3 h-3" />}
                  {isHire ? "งานจ้าง" : "คอลแลป"}
                </span>
              )}
              {showTierBadge && (
                <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5 shrink-0">
                  {tierLabel(partnerTier)}
                </Badge>
              )}
              {isStudio && (
                <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5 shrink-0">
                  สตูดิโอ
                </Badge>
              )}
              {isGroup && !isStudio && (
                <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5 shrink-0">
                  กลุ่ม
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              {isStudio
                ? "แชททีมสตูดิโอ"
                : isGroup
                ? "แชทกลุ่ม"
                : conv.project_title || (isHire ? "พูดคุยรายละเอียดงาน" : "พูดคุยแนวทางคอลแลป")}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          {!isGroup && otherId && (
            <ReportTrigger targetType="user" targetId={otherId} targetOwnerId={otherId} />
          )}
          {canStudioCombinedQuote ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={openStudioQuote}
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 h-8 rounded-full"
              aria-label="สร้างใบเสนอราคารวม Studio ใน So1o"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ใบเสนอราคารวม Studio</span>
            </Button>
          ) : showStudioQuoteUpsell ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setUpsellOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 h-8 rounded-full"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ใบเสนอราคารวม Studio</span>
            </Button>
          ) : (
            !isGroup &&
            otherId &&
            isHire && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={openQuote}
                className="inline-flex items-center gap-1 text-xs font-medium px-2.5 h-8 rounded-full"
                aria-label="สร้างใบเสนอราคาใน So1o"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ใบเสนอราคา</span>
              </Button>
            )
          )}
          {!isGroup && otherId && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-full h-8 w-8 hidden sm:inline-flex"
              aria-label="ชวนสร้างสตูดิโอ"
              onClick={() => navigate(`/studio/new?invite=${otherId}`)}
            >
              <Building2 className="w-4 h-4" />
            </Button>
          )}
          {showPartnerToggle && !isGroup && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden rounded-full h-8 w-8"
              onClick={onOpenPartnerPanel}
              aria-label="ข้อมูลโปรไฟล์"
            >
              <Info className="w-5 h-5" />
            </Button>
          )}
        </div>
      </header>

      {showPanelHint && showPartnerToggle && (
        <div className="md:hidden px-3 py-2 bg-primary/5 border-b border-border flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            แตะ <Info className="w-3.5 h-3.5 inline -mt-0.5" /> เพื่อดูโปรไฟล์และส่งผลงาน
          </p>
          <button
            type="button"
            className="text-xs text-primary shrink-0"
            onClick={() => {
              localStorage.setItem(CHAT_PANEL_HINT_KEY, "1");
              setShowPanelHint(false);
            }}
          >
            ปิด
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2 min-h-0">
        {grouped.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-12">
            {isGroup ? "เริ่มแชทกลุ่มได้เลย 👥" : isHire ? "เริ่มบทสนทนากับลูกค้าได้เลย ✨" : "ทักทายเพื่อนคอลแลปได้เลย 👋"}
          </div>
        )}
        {grouped.map((it, idx) =>
          it.type === "date" ? (
            <DateSeparator key={`d-${idx}`} date={it.date} />
          ) : (
            <MessageBubble
              key={it.m.id}
              message={it.m}
              mine={it.m.sender_id === user?.id}
              kind={kind}
              onReply={setReplyTo}
              onUnsend={handleUnsend}
            />
          ),
        )}
        <div ref={endRef} />
      </div>

      <ChatComposer
        conversationId={conv.id}
        kind={kind}
        userId={user?.id}
        quickReplies={quickReplies}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
      />

      <StudioQuoteUpsellDialog
        open={upsellOpen}
        onOpenChange={setUpsellOpen}
        onUpgrade={() => navigate("/upgrade#tier-details")}
      />
    </div>
  );
};

export default ChatThreadView;
