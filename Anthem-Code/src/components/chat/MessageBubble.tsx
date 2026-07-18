import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { th } from "date-fns/locale";
import {
  Copy,
  ExternalLink,
  FileText,
  Flag,
  Languages,
  Megaphone,
  MoreVertical,
  Reply,
  Undo2,
} from "lucide-react";
import ReportDialog from "@/components/report/ReportDialog";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { PROJECT_FEED_SELECT, PUBLIC_PROFILE_SELECT } from "@/lib/dbSelects";
import { profilesPublicFrom } from "@/lib/profileAccess";
import { profilePublicPath } from "@/lib/profileRoutes";
import { isSystemFallbackContent, stripSystemFallbackPrefix } from "@/lib/chatContext";
import { replyPreviewText } from "@/lib/chatReply";
import { parseChatOffer } from "@/lib/chatOffer";
import { ChatOfferCard } from "@/components/chat/ChatOfferCard";
import { parseHireForwardMessage } from "@/lib/hireForwardChat";
import HireForwardCard from "@/components/chat/HireForwardCard";
import HireInviteCard, { type HireInviteActions } from "@/components/chat/HireInviteCard";
import CollabInviteCard, { type CollabInviteActions } from "@/components/chat/CollabInviteCard";
import HireRejectChoiceCard, {
  type HireRejectChoiceActions,
} from "@/components/chat/HireRejectChoiceCard";
import HireContinueAskCard, {
  type HireContinueAskActions,
} from "@/components/chat/HireContinueAskCard";
import {
  isHireProtocolMessage,
  parseHireContinueAskMessage,
  parseHireRejectChoiceMessage,
} from "@/lib/hireRejectChat";
import { parseHireCancelCardMessage } from "@/lib/hireCancelRequest";
import HireCancelCard from "@/components/chat/HireCancelCard";
import { parseHireDeliveryMessage } from "@/lib/hireDeliveryChat";
import HireDeliveryCard from "@/components/hire/HireDeliveryCard";
import { parseHirePaidMessage, parseLegacyHirePaidText } from "@/lib/hirePaymentChat";
import HirePaidCard from "@/components/chat/HirePaidCard";
import {
  isPlainOfferAcceptMessage,
  parseHireWorkStartMessage,
} from "@/lib/hireWorkStartChat";
import HireWorkStartCard from "@/components/chat/HireWorkStartCard";
import { isHireBriefChatMessage } from "@/lib/hireBrief";
import { isCollabBriefChatMessage } from "@/lib/collabBrief";
import { UNSEND_WINDOW_MS, type Message } from "@/hooks/useChat";
import { useSignedStorageUrl } from "@/hooks/useSignedStorageUrl";
import { toast } from "sonner";
import type { HireCancelRequestRow } from "@/lib/hireCancelRequest";

function ChatAttachmentImage({ refUrl }: { refUrl: string }) {
  const src = useSignedStorageUrl(refUrl);
  if (!src) return <div className="rounded-2xl mb-1 h-32 bg-muted animate-pulse" />;
  return <img src={src} alt="" className="rounded-2xl mb-1 max-h-72 object-cover" />;
}

function isImageAttachmentPath(refUrl: string): boolean {
  return /\.(jpe?g|png|webp|gif)(?:$|\?)/i.test(refUrl);
}

function ChatAttachmentFile({ refUrl, fileName }: { refUrl: string; fileName: string }) {
  const src = useSignedStorageUrl(refUrl);
  const label = fileName.trim() || refUrl.split("/").pop() || "ไฟล์แนบ";
  return (
    <a
      href={src || undefined}
      target="_blank"
      rel="noopener noreferrer"
      download={label}
      className="mb-1 flex items-center gap-2.5 rounded-2xl border border-border/70 bg-card/80 px-3 py-2.5 text-left transition-colors hover:bg-accent/40"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <FileText className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{label}</span>
        <span className="block text-[11px] text-muted-foreground">แตะเพื่อเปิด / ดาวน์โหลด</span>
      </span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" />
    </a>
  );
}

/** Offer translate when message looks mostly non-Thai. */
export function looksForeignLanguage(text: string | null | undefined): boolean {
  if (!text?.trim()) return false;
  const letters = text.replace(/[^\p{L}]/gu, "");
  if (letters.length < 4) return false;
  const thai = (letters.match(/\p{Script=Thai}/gu) ?? []).length;
  return thai / letters.length < 0.45;
}

interface Props {
  message: Message;
  mine: boolean;
  kind: "hire" | "collab" | "group";
  /** Hire chat: client can open chat with forwarded creator. */
  viewerIsClient?: boolean;
  /** Freelancer respond actions on auto hire-invite card. */
  hireInviteActions?: HireInviteActions | null;
  /** Recipient respond actions on auto collab-invite card. */
  collabInviteActions?: CollabInviteActions | null;
  /** Client post-reject choice (close vs ask continue). */
  hireRejectChoiceActions?: HireRejectChoiceActions | null;
  /** Freelancer respond to client continue-ask. */
  hireContinueAskActions?: HireContinueAskActions | null;
  /** Hire cancel-request card actions. */
  hiringRequestId?: string | null;
  /** Hire quote already paid / accepted — lock offer CTA. */
  hireQuoteSettled?: boolean;
  hireProjectTitle?: string | null;
  /** Opens the hire order-detail popup from a card's document icon. Pass orderId when known. */
  onOpenHireOrderDetail?: (orderId?: string | null) => void;
  onHireCancelEdit?: (row: HireCancelRequestRow) => void;
  onHireCancelWithdraw?: (row: HireCancelRequestRow) => void;
  hireCancelWithdrawBusy?: boolean;
  onReply?: (message: Message) => void;
  onUnsend?: (message: Message) => void;
  /** Pin/announce message to conversation header (LINE-style). */
  onAnnounce?: (message: Message, previewText: string) => void;
  getSenderLabel?: (senderId: string) => string;
  onScrollToMessage?: (messageId: string) => void;
  highlight?: boolean;
}

const MessageBubble = ({
  message,
  mine,
  kind,
  viewerIsClient = false,
  hireInviteActions = null,
  collabInviteActions = null,
  hireRejectChoiceActions = null,
  hireContinueAskActions = null,
  hiringRequestId = null,
  hireQuoteSettled = false,
  hireProjectTitle = null,
  onOpenHireOrderDetail,
  onHireCancelEdit,
  onHireCancelWithdraw,
  hireCancelWithdrawBusy,
  onReply,
  onUnsend,
  onAnnounce,
  getSenderLabel,
  onScrollToMessage,
  highlight = false,
}: Props) => {
  const [reportOpen, setReportOpen] = useState(false);
  const time = format(new Date(message.created_at), "HH:mm");
  const deleted = !!message.deleted_at;
  const canUnsend =
    mine &&
    !deleted &&
    Date.now() - new Date(message.created_at).getTime() < UNSEND_WINDOW_MS;

  const isSystem =
    message.message_type === "system" ||
    (!!message.content && isSystemFallbackContent(message.content));

  const profileUserId =
    message.message_type === "profile"
      ? (message as Message & { profile_user_id?: string }).profile_user_id ?? message.sender_id
      : null;

  const projectFromProfileId =
    message.message_type === "project"
      ? (message.profile_user_id ?? null)
      : null;

  const { data: replyTo } = useQuery({
    queryKey: ["msg-reply", message.reply_to_id],
    enabled: !!message.reply_to_id && !deleted,
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, content, sender_id, deleted_at, message_type, project_id, attachment_url")
        .eq("id", message.reply_to_id!)
        .maybeSingle();
      return data;
    },
  });

  const { data: project } = useQuery({
    queryKey: ["msg-project", message.project_id],
    enabled: message.message_type === "project" && !!message.project_id && !deleted,
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select(PROJECT_FEED_SELECT)
        .eq("id", message.project_id!)
        .maybeSingle();
      return data;
    },
  });

  const projectOwnerId = projectFromProfileId || (project as { owner_id?: string } | null)?.owner_id || null;

  const { data: projectOwnerProfile } = useQuery({
    queryKey: ["msg-project-owner", projectOwnerId],
    enabled:
      kind === "group" &&
      message.message_type === "project" &&
      !!projectOwnerId &&
      !deleted,
    queryFn: async () => {
      const { data } = await profilesPublicFrom()
        .select("user_id, display_name, username, avatar_url")
        .eq("user_id", projectOwnerId!)
        .maybeSingle();
      return data;
    },
  });

  const projectFromLabel =
    kind === "group" && message.message_type === "project"
      ? projectOwnerProfile?.username ||
        projectOwnerProfile?.display_name ||
        (projectOwnerId ? getSenderLabel?.(projectOwnerId) : null) ||
        null
      : null;

  const { data: profileCard } = useQuery({
    queryKey: ["msg-profile", profileUserId],
    enabled: message.message_type === "profile" && !!profileUserId && !deleted,
    queryFn: async () => {
      const { data } = await profilesPublicFrom()
        .select(PUBLIC_PROFILE_SELECT)
        .eq("user_id", profileUserId!)
        .maybeSingle();
      return data;
    },
  });

  const mineBg =
    kind === "hire"
      ? "bg-[hsl(var(--chat-hire))] text-white"
      : kind === "collab"
        ? "bg-gradient-to-br from-[hsl(var(--chat-collab))] to-[hsl(var(--chat-collab)/0.8)] text-white"
        : "bg-primary text-primary-foreground";
  const theirBg =
    kind === "hire"
      ? "bg-[hsl(var(--chat-hire-soft))] text-foreground"
      : kind === "collab"
        ? "bg-card text-foreground border border-border"
        : "bg-muted text-foreground border border-border";

  const isFileAttachment =
    !!message.attachment_url &&
    (message.message_type === "file" ||
      (message.message_type !== "image" &&
        message.message_type !== "project" &&
        message.message_type !== "profile" &&
        !isImageAttachmentPath(message.attachment_url)));

  const offer = !deleted ? parseChatOffer(message.content) : null;
  const hireForward = !deleted ? parseHireForwardMessage(message.content) : null;
  const hireRejectChoice = !deleted ? parseHireRejectChoiceMessage(message.content) : null;
  const hireContinueAsk = !deleted ? parseHireContinueAskMessage(message.content) : null;
  const hireCancel = !deleted ? parseHireCancelCardMessage(message.content) : null;
  const hireDelivery = !deleted ? parseHireDeliveryMessage(message.content) : null;
  const hirePaid = !deleted
    ? parseHirePaidMessage(message.content) || parseLegacyHirePaidText(message.content)
    : null;
  const hireWorkStart = !deleted ? parseHireWorkStartMessage(message.content) : null;
  /** Work-start card belongs on the hiree (freelancer) side, even if buyer posted it. */
  const alignMine = hireWorkStart ? !viewerIsClient : mine;
  const rawForDisplay =
    message.content && isSystemFallbackContent(message.content)
      ? stripSystemFallbackPrefix(message.content)
      : message.content || "";
  // Never show internal protocol payloads / legacy accept text as plain chat bubbles.
  const displayContent =
    isFileAttachment ||
    !!hirePaid ||
    !!hireWorkStart ||
    isPlainOfferAcceptMessage(rawForDisplay) ||
    isHireProtocolMessage(message.content) ||
    isHireProtocolMessage(rawForDisplay)
      ? ""
      : rawForDisplay;

  const hireBrief =
    !deleted &&
    !offer &&
    !hireForward &&
    !hireRejectChoice &&
    !hireContinueAsk &&
    !hireCancel &&
    !hireDelivery &&
    !hirePaid &&
    !hireWorkStart &&
    isHireBriefChatMessage(rawForDisplay)
      ? rawForDisplay
      : null;

  const collabBrief =
    !deleted &&
    !offer &&
    !hireForward &&
    !hireRejectChoice &&
    !hireContinueAsk &&
    !hireCancel &&
    !hireDelivery &&
    !hirePaid &&
    !hireWorkStart &&
    !hireBrief &&
    isCollabBriefChatMessage(rawForDisplay)
      ? rawForDisplay
      : null;

  const isStructuredChatCard = !!(
    offer ||
    hireForward ||
    hireRejectChoice ||
    hireContinueAsk ||
    hireCancel ||
    hireDelivery ||
    hirePaid ||
    hireWorkStart ||
    hireBrief ||
    collabBrief ||
    (!deleted && isHireProtocolMessage(message.content)) ||
    (!deleted && isPlainOfferAcceptMessage(message.content))
  );
  const copyText = replyPreviewText(message);
  const isPortfolioOrProfileCard =
    message.message_type === "project" || message.message_type === "profile";
  // Portfolio / profile share cards — no translate (title/media only).
  const showTranslate =
    !isPortfolioOrProfileCard &&
    looksForeignLanguage(
      hireRejectChoice?.reasonLabel || hireBrief || displayContent || copyText,
    );

  const replyQuote =
    message.reply_to_id && replyTo ? (
      <button
        type="button"
        onClick={() => onScrollToMessage?.(replyTo.id)}
        className={cn(
          "mb-2 w-full text-left rounded-lg px-2 py-1.5 border-l-[3px] transition-opacity hover:opacity-90",
          mine ? "bg-black/15 border-white/70" : "bg-black/5 border-primary/50",
        )}
      >
        <span className={cn("block text-[10px] font-semibold truncate", mine ? "text-white/90" : "text-primary")}>
          {getSenderLabel?.(replyTo.sender_id) ?? "ข้อความเดิม"}
        </span>
        <span className={cn("block text-[11px] truncate mt-0.5", mine ? "text-white/75" : "text-muted-foreground")}>
          {replyPreviewText(replyTo)}
        </span>
      </button>
    ) : null;

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      toast.success("คัดลอกแล้ว");
    } catch {
      toast.error("คัดลอกไม่สำเร็จ");
    }
  };

  const translateMessage = () => {
    const q = encodeURIComponent(copyText.slice(0, 900));
    window.open(`https://translate.google.com/?sl=auto&tl=th&text=${q}`, "_blank", "noopener,noreferrer");
  };

  // Legacy plain "ยอมรับข้อเสนอ …" bubbles — hide; paid + work-start cards replace them.
  if (!deleted && isPlainOfferAcceptMessage(message.content) && !hirePaid && !hireWorkStart) {
    return null;
  }

  // Structured cards (hire reject / continue / forward / offer) win over system-pill rendering.
  if (isSystem && !deleted && !isStructuredChatCard) {
    return (
      <div className="flex justify-center my-2 px-4">
        <p className="text-xs text-center text-muted-foreground bg-muted/80 px-3 py-1.5 rounded-full max-w-[90%] leading-relaxed">
          {displayContent}
        </p>
      </div>
    );
  }

  // Hire/system structured cards — no ⋮ menu. Portfolio cards keep menu (without translate).
  const messageMenu =
    !deleted && !isStructuredChatCard ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="เมนูข้อความ"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={mine ? "end" : "start"} className="w-44">
          {onReply ? (
            <DropdownMenuItem onClick={() => onReply(message)}>
              <Reply className="w-4 h-4 mr-2" />
              ตอบกลับ
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onClick={() => void copyMessage()}>
            <Copy className="w-4 h-4 mr-2" />
            คัดลอก
          </DropdownMenuItem>
          {showTranslate ? (
            <DropdownMenuItem onClick={translateMessage}>
              <Languages className="w-4 h-4 mr-2" />
              แปลภาษา
            </DropdownMenuItem>
          ) : null}
          {onAnnounce ? (
            <DropdownMenuItem onClick={() => onAnnounce(message, copyText)}>
              <Megaphone className="w-4 h-4 mr-2" />
              ประกาศ
            </DropdownMenuItem>
          ) : null}
          {mine && onUnsend && canUnsend ? (
            <DropdownMenuItem onClick={() => onUnsend(message)} className="text-destructive">
              <Undo2 className="w-4 h-4 mr-2" />
              ยกเลิกการส่ง
            </DropdownMenuItem>
          ) : null}
          {!mine ? (
            <DropdownMenuItem onClick={() => setReportOpen(true)}>
              <Flag className="w-4 h-4 mr-2" />
              รายงาน
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    ) : null;

  const bubbleBody = (
    <div
      className={cn(
        "flex items-end gap-1 group/msg transition-colors duration-500 rounded-2xl",
        alignMine ? "justify-end" : "justify-start",
        highlight && "ring-2 ring-primary/40 ring-offset-2 ring-offset-background",
      )}
    >
      <div className={cn("max-w-[78%] md:max-w-[60%]")}>
        {deleted ? (
          <div className="px-3.5 py-2 rounded-2xl text-sm italic text-muted-foreground bg-muted/60">
            ข้อความถูกยกเลิก
          </div>
        ) : (
          <>
            {message.attachment_url &&
              message.message_type !== "project" &&
              message.message_type !== "profile" && (
                <div
                  className={cn(
                    "rounded-2xl overflow-hidden shadow-sm",
                    message.reply_to_id && replyTo ? cn("p-2", alignMine ? mineBg : theirBg) : "",
                  )}
                >
                  {replyQuote}
                  {isFileAttachment ? (
                    <ChatAttachmentFile
                      refUrl={message.attachment_url}
                      fileName={message.content?.trim() || ""}
                    />
                  ) : (
                    <ChatAttachmentImage refUrl={message.attachment_url} />
                  )}
                </div>
              )}
            {message.message_type === "project" && project && (
              <div
                className={cn(
                  "rounded-2xl overflow-hidden shadow-sm",
                  message.reply_to_id && replyTo ? cn("p-2", mine ? mineBg : theirBg) : "",
                )}
              >
                {replyQuote}
                <Link
                  to={`/project/${project.id}`}
                  className={cn(
                    "block overflow-hidden border hover:opacity-95 transition-opacity rounded-xl",
                    mine ? "border-white/20" : "border-border",
                  )}
                >
                  {project.cover_url ? (
                    <img src={project.cover_url} alt="" className="w-full max-h-40 object-cover" />
                  ) : (
                    <div className="h-24 bg-muted flex items-center justify-center text-xs text-muted-foreground">
                      ไม่มีรูปปก
                    </div>
                  )}
                  <div className={cn("px-3 py-2 space-y-0.5", mine ? "bg-black/10" : "bg-card")}>
                    {projectFromLabel && (
                      <p
                        className={cn(
                          "text-[10px] truncate",
                          mine ? "text-white/75" : "text-muted-foreground",
                        )}
                      >
                        #{projectFromLabel.replace(/^#/, "")}
                      </p>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{project.title}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70" />
                    </div>
                  </div>
                </Link>
              </div>
            )}
            {message.message_type === "profile" && profileCard && (
              <div
                className={cn(
                  "rounded-2xl overflow-hidden shadow-sm",
                  message.reply_to_id && replyTo ? cn("p-2", mine ? mineBg : theirBg) : "",
                )}
              >
                {replyQuote}
                <Link
                  to={profilePublicPath(profileCard)}
                  className={cn(
                    "block overflow-hidden border hover:opacity-95 transition-opacity rounded-xl",
                    mine ? "border-white/20" : "border-border",
                  )}
                >
                  <div className={cn("p-3 flex items-center gap-3", mine ? "bg-black/10" : "bg-card")}>
                    {profileCard.avatar_url ? (
                      <img src={profileCard.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">
                        {(profileCard.display_name ?? "?")[0]}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{profileCard.display_name ?? "ครีเอเตอร์"}</p>
                      {profileCard.role && (
                        <p className="text-xs text-muted-foreground truncate">{profileCard.role}</p>
                      )}
                      {profileCard.skills && profileCard.skills.length > 0 && (
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                          {profileCard.skills.slice(0, 3).join(" · ")}
                        </p>
                      )}
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70" />
                  </div>
                </Link>
              </div>
            )}
            {offer && (
              <div>
                {replyQuote}
                <ChatOfferCard
                  offer={offer}
                  conversationId={message.conversation_id}
                  mine={mine}
                  canRespond={!mine && !hireQuoteSettled}
                  settled={hireQuoteSettled}
                  hiringRequestId={hiringRequestId}
                  onOpenOrderDetail={onOpenHireOrderDetail}
                />
              </div>
            )}
            {hireForward && (
              <div>
                {replyQuote}
                <HireForwardCard
                  payload={hireForward}
                  mine={mine}
                  canOpenChat={viewerIsClient}
                />
              </div>
            )}
            {hireRejectChoice && (
              <div>
                {replyQuote}
                <HireRejectChoiceCard
                  payload={hireRejectChoice}
                  mine={mine}
                  actions={hireRejectChoiceActions}
                />
              </div>
            )}
            {hireContinueAsk && (
              <div>
                {replyQuote}
                <HireContinueAskCard
                  payload={hireContinueAsk}
                  mine={mine}
                  actions={hireContinueAskActions}
                />
              </div>
            )}
            {hireCancel && (
              <div>
                {replyQuote}
                <HireCancelCard
                  payload={hireCancel}
                  mine={mine}
                  onEdit={onHireCancelEdit}
                  onWithdraw={onHireCancelWithdraw}
                  withdrawBusy={hireCancelWithdrawBusy}
                />
              </div>
            )}
            {hireDelivery && (
              <div>
                {replyQuote}
                <HireDeliveryCard
                  payload={hireDelivery}
                  hiringRequestId={hiringRequestId}
                  projectTitle={hireProjectTitle}
                  mine={mine}
                  onOpenOrderDetail={onOpenHireOrderDetail}
                />
              </div>
            )}
            {hirePaid && (
              <div>
                {replyQuote}
                <HirePaidCard
                  payload={hirePaid}
                  mine={mine}
                  onOpenOrderDetail={onOpenHireOrderDetail}
                />
              </div>
            )}
            {hireWorkStart && (
              <div>
                {replyQuote}
                <HireWorkStartCard
                  payload={hireWorkStart}
                  mine={alignMine}
                  onOpenOrderDetail={onOpenHireOrderDetail}
                />
              </div>
            )}
            {hireBrief && (
              <div>
                {replyQuote}
                <HireInviteCard
                  content={hireBrief}
                  mine={mine}
                  actions={hireInviteActions}
                />
              </div>
            )}
            {collabBrief && (
              <div>
                {replyQuote}
                <CollabInviteCard
                  content={collabBrief}
                  mine={mine}
                  actions={collabInviteActions}
                />
              </div>
            )}
            {displayContent &&
              !offer &&
              !hireForward &&
              !hireRejectChoice &&
              !hireContinueAsk &&
              !hireCancel &&
              !hirePaid &&
              !hireWorkStart &&
              !hireBrief &&
              !collabBrief &&
              message.message_type !== "project" &&
              message.message_type !== "profile" && (
              <div
                className={cn(
                  "px-3.5 py-2 rounded-2xl text-base leading-relaxed whitespace-pre-wrap break-words shadow-sm",
                  mine ? `${mineBg} rounded-br-md` : `${theirBg} rounded-bl-md`,
                )}
              >
                {replyQuote}
                {displayContent}
              </div>
            )}
            {!displayContent &&
              !offer &&
              !hireForward &&
              !hireRejectChoice &&
              !hireContinueAsk &&
              !hireCancel &&
              !hireBrief &&
              !message.attachment_url &&
              message.message_type !== "project" &&
              message.message_type !== "profile" &&
              replyQuote && (
                <div
                  className={cn(
                    "px-3.5 py-2 rounded-2xl text-base shadow-sm",
                    mine ? `${mineBg} rounded-br-md` : `${theirBg} rounded-bl-md`,
                  )}
                >
                  {replyQuote}
                </div>
              )}
          </>
        )}
        <div
          className={cn(
            "flex items-center gap-1 mt-1 text-[10px] text-muted-foreground",
            alignMine ? "justify-end" : "justify-between",
          )}
        >
          {alignMine ? messageMenu : null}
          <span className="inline-flex items-center gap-1">
            <span>{time}</span>
            {alignMine && !deleted && !hireWorkStart && (
              <span>{message.read_at ? "อ่านแล้ว" : "ส่งแล้ว"}</span>
            )}
          </span>
          {!alignMine ? messageMenu : null}
        </div>
      </div>
    </div>
  );

  const withReport = (
    <>
      {bubbleBody}
      {!mine && !deleted ? (
        <ReportDialog
          targetType="message"
          targetId={message.id}
          targetOwnerId={message.sender_id}
          open={reportOpen}
          onOpenChange={setReportOpen}
          hideTrigger
        />
      ) : null}
    </>
  );

  if (!onReply && !onUnsend) return withReport;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild disabled={deleted}>
        <div>{withReport}</div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {onReply && !deleted && (
          <ContextMenuItem onClick={() => onReply(message)}>
            <Reply className="w-4 h-4 mr-2" />
            ตอบกลับ
          </ContextMenuItem>
        )}
        {onUnsend && canUnsend && (
          <ContextMenuItem onClick={() => onUnsend(message)} className="text-destructive">
            <Undo2 className="w-4 h-4 mr-2" />
            ยกเลิกการส่ง
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};

export const DateSeparator = ({ date }: { date: string }) => {
  const d = new Date(date);
  const label = isToday(d) ? "วันนี้" : isYesterday(d) ? "เมื่อวาน" : format(d, "d MMM yyyy", { locale: th });
  return (
    <div className="flex justify-center my-3">
      <span className="text-[10px] text-muted-foreground bg-muted px-3 py-1 rounded-full">{label}</span>
    </div>
  );
};

export default MessageBubble;
