import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CheckCircle2,
  FileText,
  Handshake,
  Info,
  Megaphone,
  PanelRightClose,
  PanelRightOpen,
  Settings2,
  Share2,
  Users,
  X,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { InlineLoader } from "@/components/ui/BanterLoader";
import { BackButton } from "@/components/ui/BackButton";
import { isAplus1ChatOffersEnabled, isAplus1LaunchMinimal, isAplus1SubscriptionsEnabled } from "@/lib/aplus1Launch";
import { useStudioForConversation, useStudioMembers } from "@/hooks/useStudios";
import { useSubscription } from "@/core/subscription/useSubscription";
import { canOpenStudioCombinedQuote, canShowStudioQuoteUpsell, openStudioQuotation } from "@/lib/studioQuotationHandoff";
import { StudioQuoteUpsellDialog } from "@/components/studio/StudioQuoteUpsellDialog";
import { ChatOfferDialog } from "@/components/chat/ChatOfferDialog";
import HireForwardInChatDialog from "@/components/chat/HireForwardInChatDialog";
import CreateGroupDialog from "@/components/chat/CreateGroupDialog";
import GroupSettingsDialog from "@/components/chat/GroupSettingsDialog";
import { groupTagLabel, normalizeGroupTag } from "@/lib/groupChatTag";
import { supabase } from "@/integrations/supabase/client";
import { profilesPublicFrom } from "@/lib/profileAccess";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import {
  isGroupConversation,
  isStudioConversation,
  otherParticipantId,
  useAcceptRequest,
  useRejectRequest,
  useSendMessage,
  useUnsendMessage,
  type Conversation,
  type Message,
} from "@/hooks/useChat";
import { useCancelCollabRequest } from "@/hooks/useCollabRequests";
import {
  useActiveHireCancelRequest,
  useEditHireCancelRequest,
  useSubmitHireCancelRequest,
  useWithdrawHireCancelRequest,
} from "@/hooks/useHireCancelRequest";
import {
  encodeHireCancelCardMessage,
  isHireCancelOpenStatus,
  type HireCancelInitiatedBy,
  type HireCancelRequestRow,
} from "@/lib/hireCancelRequest";
import HireCancelRequestDialog from "@/components/hiring/HireCancelRequestDialog";
import { encodeHireForwardMessage } from "@/lib/hireForwardChat";
import { hireForwardClientNotice, hireRejectReasonLabel } from "@/lib/hireBrief";
import {
  canCompleteHireStatus,
  isHireCancelledStatus,
  isHireCompletedStatus,
  labelHireStatus,
} from "@/lib/hiringStatus";
import {
  isCollabAcceptedStatus,
  isCollabCancelledStatus,
  isCollabCompletedStatus,
  isCollabContactedNewStatus,
  isCollabDeclinedStatus,
  labelCollabStatus,
} from "@/lib/collabInbox";
import { collabRejectReasonLabel } from "@/lib/collabBrief";
import { requestCancelReasonLabel } from "@/lib/requestOutcome";
import RequestCancelDialog from "@/components/requests/RequestCancelDialog";
import {
  useCompleteHireRequest,
  useForwardHireRequest,
  type HiringRow,
} from "@/hooks/useHiringRequests";
import {
  encodeHireContinueAskMessage,
  encodeHireRejectChoiceMessage,
  HIRE_CLIENT_ACCEPT_REJECT_TEXT,
  HIRE_FREELANCER_ACCEPT_CONTINUE_TEXT,
  HIRE_FREELANCER_DECLINE_CONTINUE_TEXT,
  hireChatLockHint,
  hireChatLockedByMessages,
  isHireChatComposerLocked,
  type HirePostRejectChat,
} from "@/lib/hireRejectChat";
import MessageBubble, { DateSeparator } from "@/components/chat/MessageBubble";
import ChatComposer from "@/components/chat/ChatComposer";
import HireRejectDialog from "@/components/hiring/HireRejectDialog";
import CollabRejectDialog from "@/components/collab/CollabRejectDialog";
import ReportTrigger from "@/components/report/ReportTrigger";
import { tierLabel } from "@/lib/tierMembership";
import type { PlanId } from "@/data/plans";
import { isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import BriefcaseIcon from "../icons/BriefcaseIcon";
import type { HireInviteActions } from "@/components/chat/HireInviteCard";
import type { CollabInviteActions } from "@/components/chat/CollabInviteCard";
import type { HireRejectChoiceActions } from "@/components/chat/HireRejectChoiceCard";
import type { HireContinueAskActions } from "@/components/chat/HireContinueAskCard";

const CHAT_PANEL_HINT_KEY = "aplus1-chat-panel-hint-dismissed";

interface Props {
  conv: Conversation;
  messages: Message[];
  messagesLoading?: boolean;
  messagesError?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  onOpenPartnerPanel?: () => void;
  showPartnerToggle?: boolean;
  /** Desktop: whether the right partner sidebar is currently open. */
  partnerPanelOpen?: boolean;
  /** Desktop: toggle partner sidebar open/closed. */
  onTogglePartnerPanel?: () => void;
}

const TIER_BADGE_TIERS = new Set<PlanId>(["pro", "pro_plus", "inhouse"]);

const ChatThreadView = ({
  conv,
  messages,
  messagesLoading = false,
  messagesError = false,
  showBack,
  onBack,
  onOpenPartnerPanel,
  showPartnerToggle,
  partnerPanelOpen,
  onTogglePartnerPanel,
}: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const endRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const unsend = useUnsendMessage();
  const sendMessage = useSendMessage();
  const acceptHire = useAcceptRequest();
  const rejectHire = useRejectRequest();
  const forwardHire = useForwardHireRequest();
  const completeHire = useCompleteHireRequest();
  const cancelCollab = useCancelCollabRequest();
  const submitHireCancel = useSubmitHireCancelRequest();
  const editHireCancel = useEditHireCancelRequest();
  const withdrawHireCancel = useWithdrawHireCancelRequest();
  const { tier } = useSubscription();

  const isGroup = isGroupConversation(conv);
  const isStudio = isStudioConversation(conv);
  const isHire = conv.kind === "hire";
  const isCollab = conv.kind === "collab";
  const groupTag = normalizeGroupTag(conv.group_tag);
  const isStudioHire = isHire && !!conv.studio_id;
  const hasStudioQuoteContext = isStudio || isStudioHire;
  const [forwardOpen, setForwardOpen] = useState(false);
  const [inviteGroupOpen, setInviteGroupOpen] = useState(false);
  const [groupSettingsOpen, setGroupSettingsOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [hireCancelDialogOpen, setHireCancelDialogOpen] = useState(false);
  const [hireCancelEditRow, setHireCancelEditRow] = useState<HireCancelRequestRow | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [collabRejectOpen, setCollabRejectOpen] = useState(false);
  const [announced, setAnnounced] = useState<{
    messageId: string | null;
    text: string | null;
  }>(() => ({
    messageId: (conv as { announced_message_id?: string | null }).announced_message_id ?? null,
    text: (conv as { announced_text?: string | null }).announced_text ?? null,
  }));
  const isFreelancer = !!user?.id && user.id === conv.freelancer_id;
  const isClient = !!user?.id && user.id === conv.client_id;

  const { data: hireRequestRow = null } = useQuery({
    queryKey: ["chat-hire-forward-src", conv.request_id],
    enabled: !!conv.request_id && isHire,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hiring_requests")
        .select("*")
        .eq("id", conv.request_id!)
        .maybeSingle();
      if (error) throw error;
      return data as HiringRow | null;
    },
  });
  const alreadyForwarded = !!(hireRequestRow as { forwarded_to_user_id?: string | null } | null)
    ?.forwarded_to_user_id;
  const hireStatus = hireRequestRow?.status ?? null;
  const offerAcceptedAt = (hireRequestRow as { offer_accepted_at?: string | null } | null)
    ?.offer_accepted_at;
  const hireOfferConfirmed = !!offerAcceptedAt || hireStatus === "ตอบรับ";
  const hireRejectReason = (hireRequestRow as { reject_reason?: string | null } | null)?.reject_reason;
  const postRejectChat = (hireRequestRow as { post_reject_chat?: HirePostRejectChat | null } | null)
    ?.post_reject_chat ?? null;
  const effectivePostRejectChat: HirePostRejectChat | null =
    postRejectChat === "locked" || hireChatLockedByMessages(messages)
      ? "locked"
      : postRejectChat;

  useEffect(() => {
    if (!conv.request_id || !isHire) return;
    const ch = supabase
      .channel(`hire-req-rt-${conv.request_id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "anthem",
          table: "hiring_requests",
          filter: `id=eq.${conv.request_id}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey: ["chat-hire-forward-src", conv.request_id] });
          void qc.invalidateQueries({ queryKey: ["chat-hire-meta", conv.request_id] });
          void qc.invalidateQueries({ queryKey: ["chat-list-hire-locked"] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [conv.request_id, isHire, qc]);

  const { data: collabRequestRow = null } = useQuery({
    queryKey: ["chat-collab-meta", conv.request_id],
    enabled: !!conv.request_id && isCollab,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collab_requests")
        .select("*")
        .eq("id", conv.request_id!)
        .maybeSingle();
      if (error) throw error;
      return data as {
        id: string;
        status: string;
        sender_id: string;
        recipient_id: string;
        message?: string | null;
        timeline?: string | null;
        collab_types?: string[] | null;
        project_id?: string | null;
        reject_reason?: string | null;
        reject_note?: string | null;
        keep_chat?: boolean | null;
        cancel_reason?: string | null;
        cancel_note?: string | null;
      } | null;
    },
  });
  const collabStatus = collabRequestRow?.status ?? null;
  const collabRejectReason = collabRequestRow?.reject_reason ?? null;

  useEffect(() => {
    if (!conv.request_id || !isCollab) return;
    const ch = supabase
      .channel(`collab-req-rt-${conv.request_id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "anthem",
          table: "collab_requests",
          filter: `id=eq.${conv.request_id}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey: ["chat-collab-meta", conv.request_id] });
          void qc.invalidateQueries({ queryKey: ["collab-requests"] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [conv.request_id, isCollab, qc]);

  useEffect(() => {
    setAnnounced({
      messageId: (conv as { announced_message_id?: string | null }).announced_message_id ?? null,
      text: (conv as { announced_text?: string | null }).announced_text ?? null,
    });
  }, [conv]);

  const announceMessage = async (message: Message, previewText: string) => {
    const text = previewText.trim().slice(0, 280) || "ข้อความที่ประกาศ";
    try {
      const { error } = await supabase
        .from("conversations")
        .update({
          announced_message_id: message.id,
          announced_text: text,
        } as never)
        .eq("id", conv.id);
      if (error) throw error;
      setAnnounced({ messageId: message.id, text });
      toast.success("ปักประกาศไว้ที่หัวแชทแล้ว");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "ประกาศไม่สำเร็จ");
    }
  };

  const clearAnnouncement = async () => {
    try {
      const { error } = await supabase
        .from("conversations")
        .update({
          announced_message_id: null,
          announced_text: null,
        } as never)
        .eq("id", conv.id);
      if (error) throw error;
      setAnnounced({ messageId: null, text: null });
      toast.success("เอาประกาศออกแล้ว");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "เอาประกาศออกไม่สำเร็จ");
    }
  };

  const hirePendingResponse =
    isHire &&
    isFreelancer &&
    !!hireRequestRow &&
    !alreadyForwarded &&
    !hireRejectReason &&
    hireStatus !== "ตอบรับ" &&
    hireStatus !== "ปฏิเสธ" &&
    hireStatus !== "ปิดแล้ว" &&
    hireStatus !== "ยกเลิก";
  const { data: activeHireCancel = null } = useActiveHireCancelRequest(
    isHire ? conv.request_id ?? undefined : undefined,
  );

  const outcomeBusy =
    completeHire.isPending ||
    cancelCollab.isPending ||
    submitHireCancel.isPending ||
    editHireCancel.isPending ||
    withdrawHireCancel.isPending ||
    sendMessage.isPending;
  const hireRespondBusy =
    acceptHire.isPending || rejectHire.isPending || forwardHire.isPending || outcomeBusy;
  const collabRespondBusy =
    acceptHire.isPending || rejectHire.isPending || sendMessage.isPending;

  const collabPendingResponse =
    isCollab &&
    isFreelancer &&
    !!collabRequestRow &&
    !collabRejectReason &&
    isCollabContactedNewStatus(collabStatus);
  const collabPendingForClient =
    isCollab &&
    isClient &&
    !!collabRequestRow &&
    !collabRejectReason &&
    isCollabContactedNewStatus(collabStatus);
  const composerLocked = isHire && isHireChatComposerLocked(effectivePostRejectChat);
  const composerLockedHint = composerLocked ? hireChatLockHint("locked") : null;

  const otherId = otherParticipantId(conv, user?.id ?? "");
  const { data: other } = useQuery({
    queryKey: ["chat-other", otherId],
    enabled: !!otherId && !isGroup,
    queryFn: async () => {
      const { data } = await profilesPublicFrom()
        .select("user_id, display_name, avatar_url, role, username, subscription_tier")
        .eq("user_id", otherId!)
        .maybeSingle();
      return data;
    },
  });

  const inviteLockedMembers = useMemo(() => {
    if (!otherId) return [];
    const name =
      (other?.username?.trim() && `@${other.username.trim()}`) ||
      other?.display_name?.trim() ||
      null;
    return [
      {
        id: otherId,
        display_name: name || "ผู้ใช้",
        avatar_url: other?.avatar_url ?? null,
      },
    ];
  }, [otherId, other?.display_name, other?.username, other?.avatar_url]);

  const hirePendingForClient =
    isHire &&
    isClient &&
    !!hireRequestRow &&
    !alreadyForwarded &&
    !hireRejectReason &&
    hireStatus !== "ตอบรับ" &&
    hireStatus !== "ปฏิเสธ" &&
    hireStatus !== "ปิดแล้ว" &&
    hireStatus !== "ยกเลิก";

  const canRequestHireCancel =
    isHire &&
    !!conv.request_id &&
    !!hireRequestRow &&
    !!user?.id &&
    hireOfferConfirmed &&
    !alreadyForwarded &&
    hireStatus === "ตอบรับ" &&
    !isHireCancelOpenStatus(activeHireCancel?.status) &&
    !isHireCancelledStatus(hireStatus) &&
    !isHireCompletedStatus(hireStatus);

  const canCancelCollabRequest =
    isCollab &&
    isClient &&
    !!conv.request_id &&
    !!collabRequestRow &&
    (collabStatus === "pending" || collabStatus === "accepted");

  const canCancelRequest = canRequestHireCancel || canCancelCollabRequest;

  const canCompleteRequest =
    !!conv.request_id &&
    isHire &&
    !!hireRequestRow &&
    !alreadyForwarded &&
    canCompleteHireStatus(hireStatus);

  const canCreateCollabProject =
    !!conv.request_id &&
    isCollab &&
    !!collabRequestRow &&
    isCollabAcceptedStatus(collabStatus);
  const canCreateGroupCollabProject =
    isGroup && !isStudio && groupTag === "collab";

  const hireCancelInitiatedBy: HireCancelInitiatedBy = isClient ? "client" : "freelancer";

  const requestStatusLabel = isHire
    ? labelHireStatus(hireStatus)
    : isCollab
      ? labelCollabStatus(collabStatus)
      : null;

  const hireInviteActions: HireInviteActions | null = useMemo(() => {
    if (!isHire || !hireRequestRow) return null;
    if (hirePendingResponse) {
      return {
        canRespond: true,
        busy: hireRespondBusy,
        onAccept: () => {
          void (async () => {
            if (!conv.request_id || !conv.client_id || !conv.freelancer_id) return;
            try {
              await acceptHire.mutateAsync({
                kind: "hire",
                requestId: conv.request_id,
                clientId: conv.client_id,
                freelancerId: conv.freelancer_id,
                projectId: conv.project_id ?? null,
                projectTitle: conv.project_title ?? hireRequestRow.project_title,
              });
              try {
                await sendMessage.mutateAsync({
                  conversationId: conv.id,
                  content: "ขอบคุณครับ/ค่ะ ยินดีรับงานและคุยรายละเอียดต่อได้เลย",
                });
              } catch {
                /* accept already succeeded */
              }
              void qc.invalidateQueries({ queryKey: ["chat-hire-forward-src", conv.request_id] });
              void qc.invalidateQueries({ queryKey: ["chat-hire-meta", conv.request_id] });
              toast.success("ตอบรับแล้ว — คุยต่อได้เลย");
            } catch (e: unknown) {
              toast.error(e instanceof Error ? e.message : "ตอบรับไม่สำเร็จ");
            }
          })();
        },
        onDecline: () => setRejectOpen(true),
      };
    }
    if (hirePendingForClient) {
      const waitingName =
        other?.username?.trim() ||
        other?.display_name?.trim() ||
        "ครีเอเตอร์";
      return {
        canRespond: false,
        statusHint: `รอ ${waitingName} ตอบกลับ / สามารถแชทพูดคุยต่อได้`,
        onAccept: () => {},
        onDecline: () => {},
      };
    }
    if (!isFreelancer) return null;
    if (hireStatus === "ตอบรับ") {
      return { canRespond: false, statusHint: "ตอบรับแล้ว — คุยรายละเอียดต่อได้", onAccept: () => {}, onDecline: () => {} };
    }
    if (hireRejectReason === "busy_but_chat" || effectivePostRejectChat === "open") {
      return {
        canRespond: false,
        statusHint: "ยังไม่พร้อมทำตอนนี้ — คุยรายละเอียดต่อได้",
        onAccept: () => {},
        onDecline: () => {},
      };
    }
    // Rejected / forwarded: keep invite card clean (reason lives on reject-choice card).
    return null;
  }, [
    alreadyForwarded,
    acceptHire,
    conv.client_id,
    conv.freelancer_id,
    conv.id,
    conv.project_id,
    conv.project_title,
    conv.request_id,
    hirePendingForClient,
    hirePendingResponse,
    hireRejectReason,
    hireRequestRow,
    hireRespondBusy,
    hireStatus,
    isFreelancer,
    isHire,
    other?.display_name,
    other?.username,
    effectivePostRejectChat,
    qc,
    sendMessage,
  ]);

  const collabInviteActions: CollabInviteActions | null = useMemo(() => {
    if (!isCollab || !collabRequestRow) return null;
    if (collabPendingResponse) {
      return {
        canRespond: true,
        busy: collabRespondBusy,
        onAccept: () => {
          void (async () => {
            if (!conv.request_id || !conv.client_id || !conv.freelancer_id) return;
            try {
              await acceptHire.mutateAsync({
                kind: "collab",
                requestId: conv.request_id,
                clientId: conv.client_id,
                freelancerId: conv.freelancer_id,
                projectId: conv.project_id ?? null,
                projectTitle: conv.project_title ?? "คอลแลปไอเดียใหม่",
              });
              try {
                await sendMessage.mutateAsync({
                  conversationId: conv.id,
                  content:
                    "ตอบรับร่วมงานแล้ว — คุยไอเดียต่อได้เลย เมื่อพร้อมกดสร้างผลงานร่วมได้",
                });
              } catch {
                /* accept already succeeded */
              }
              void qc.invalidateQueries({ queryKey: ["chat-collab-meta", conv.request_id] });
              toast.success("ตอบรับร่วมงานแล้ว");
            } catch (e: unknown) {
              toast.error(e instanceof Error ? e.message : "ตอบรับไม่สำเร็จ");
            }
          })();
        },
        onDecline: () => setCollabRejectOpen(true),
      };
    }
    if (collabPendingForClient) {
      const waitingName =
        other?.username?.trim() || other?.display_name?.trim() || "เพื่อน";
      return {
        canRespond: false,
        statusHint: `รอ ${waitingName} ตอบกลับ / สามารถแชทพูดคุยต่อได้`,
        onAccept: () => {},
        onDecline: () => {},
      };
    }
    if (!isFreelancer) return null;
    if (isCollabAcceptedStatus(collabStatus)) {
      return {
        canRespond: false,
        statusHint: "ตอบรับร่วมงานแล้ว — เมื่อพร้อมกดสร้างผลงานร่วมได้",
        onAccept: () => {},
        onDecline: () => {},
      };
    }
    if (
      collabRejectReason === "busy_but_chat" ||
      collabRequestRow.keep_chat
    ) {
      return {
        canRespond: false,
        statusHint: "ยังไม่พร้อมร่วมงานตอนนี้ — คุยไอเดียต่อได้",
        onAccept: () => {},
        onDecline: () => {},
      };
    }
    if (isCollabDeclinedStatus(collabStatus)) {
      return {
        canRespond: false,
        statusHint:
          collabRequestRow.reject_note?.trim() ||
          collabRejectReasonLabel(collabRejectReason) ||
          "ยังไม่พร้อมร่วมงาน",
        onAccept: () => {},
        onDecline: () => {},
      };
    }
    return null;
  }, [
    acceptHire,
    collabPendingForClient,
    collabPendingResponse,
    collabRejectReason,
    collabRequestRow,
    collabRespondBusy,
    collabStatus,
    conv.client_id,
    conv.freelancer_id,
    conv.id,
    conv.project_id,
    conv.project_title,
    conv.request_id,
    isCollab,
    isFreelancer,
    other?.display_name,
    other?.username,
    qc,
    sendMessage,
  ]);

  const hireRejectChoiceActions: HireRejectChoiceActions | null = useMemo(() => {
    if (!isHire || !hireRequestRow) return null;
    if (effectivePostRejectChat === "awaiting_client" && isClient) {
      return {
        canRespond: true,
        busy: hireRespondBusy,
        onAcceptClose: () => {
          void (async () => {
            try {
              await sendMessage.mutateAsync({
                conversationId: conv.id,
                content: HIRE_CLIENT_ACCEPT_REJECT_TEXT,
              });
              await rejectHire.mutateAsync({
                kind: "hire",
                requestId: hireRequestRow.id,
                reason: hireRejectReason,
                note: (hireRequestRow as { reject_note?: string | null }).reject_note ?? null,
                status: "ปฏิเสธ",
                postRejectChat: "locked",
              });
              toast.success("ปิดแชทแล้ว — ทั้งสองฝ่ายพิมพ์ต่อไม่ได้");
            } catch (e: unknown) {
              toast.error(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ");
            }
          })();
        },
        onAskContinue: () => {
          void (async () => {
            try {
              await rejectHire.mutateAsync({
                kind: "hire",
                requestId: hireRequestRow.id,
                reason: hireRejectReason,
                note: (hireRequestRow as { reject_note?: string | null }).reject_note ?? null,
                status: "ปฏิเสธ",
                postRejectChat: "awaiting_freelancer",
              });
              await sendMessage.mutateAsync({
                conversationId: conv.id,
                content: encodeHireContinueAskMessage({
                  v: 1,
                  kind: "continue_ask",
                  requestId: hireRequestRow.id,
                }),
              });
              toast.success("ส่งคำขอคุยต่อแล้ว");
            } catch (e: unknown) {
              toast.error(e instanceof Error ? e.message : "ส่งไม่สำเร็จ");
            }
          })();
        },
      };
    }
    if (effectivePostRejectChat === "awaiting_client") {
      // Freelancer already sent the reject card — no status footer on their bubble.
      return null;
    }
    if (effectivePostRejectChat === "awaiting_freelancer") {
      return { canRespond: false, statusHint: "รอครีเอเตอร์ตอบคำขอคุยต่อ", onAcceptClose: () => {}, onAskContinue: () => {} };
    }
    if (effectivePostRejectChat === "locked") {
      return { canRespond: false, statusHint: "แชทปิดแล้ว", onAcceptClose: () => {}, onAskContinue: () => {} };
    }
    if (effectivePostRejectChat === "open") {
      return { canRespond: false, statusHint: "คุยต่อได้แล้ว", onAcceptClose: () => {}, onAskContinue: () => {} };
    }
    return null;
  }, [
    conv.id,
    effectivePostRejectChat,
    hireRejectReason,
    hireRequestRow,
    hireRespondBusy,
    isClient,
    isHire,
    rejectHire,
    sendMessage,
  ]);

  const hireContinueAskActions: HireContinueAskActions | null = useMemo(() => {
    if (!isHire || !hireRequestRow) return null;
    if (effectivePostRejectChat === "awaiting_freelancer" && isFreelancer) {
      return {
        canRespond: true,
        busy: hireRespondBusy,
        onAccept: () => {
          void (async () => {
            try {
              await rejectHire.mutateAsync({
                kind: "hire",
                requestId: hireRequestRow.id,
                reason: "busy_but_chat",
                note: (hireRequestRow as { reject_note?: string | null }).reject_note ?? null,
                status: "ติดต่อแล้ว",
                postRejectChat: "open",
              });
              await sendMessage.mutateAsync({
                conversationId: conv.id,
                content: HIRE_FREELANCER_ACCEPT_CONTINUE_TEXT,
              });
              toast.success("เปิดแชทคุยต่อแล้ว — ยังไม่รับงาน");
            } catch (e: unknown) {
              toast.error(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ");
            }
          })();
        },
        onDecline: () => {
          void (async () => {
            try {
              await sendMessage.mutateAsync({
                conversationId: conv.id,
                content: HIRE_FREELANCER_DECLINE_CONTINUE_TEXT,
              });
              await rejectHire.mutateAsync({
                kind: "hire",
                requestId: hireRequestRow.id,
                reason: hireRejectReason,
                note: (hireRequestRow as { reject_note?: string | null }).reject_note ?? null,
                status: "ปฏิเสธ",
                postRejectChat: "locked",
              });
              toast.success("ปิดแชทแล้ว — ทั้งสองฝ่ายพิมพ์ต่อไม่ได้");
            } catch (e: unknown) {
              toast.error(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ");
            }
          })();
        },
      };
    }
    if (effectivePostRejectChat === "awaiting_freelancer") {
      return { canRespond: false, statusHint: "รอครีเอเตอร์ตอบคำขอคุยต่อ", onAccept: () => {}, onDecline: () => {} };
    }
    if (effectivePostRejectChat === "locked") {
      return { canRespond: false, statusHint: "ปฏิเสธการคุยต่อ · แชทปิดแล้ว", onAccept: () => {}, onDecline: () => {} };
    }
    if (effectivePostRejectChat === "open") {
      return { canRespond: false, statusHint: "ยอมรับแล้ว — คุยต่อได้", onAccept: () => {}, onDecline: () => {} };
    }
    return null;
  }, [
    conv.id,
    effectivePostRejectChat,
    hireRejectReason,
    hireRequestRow,
    hireRespondBusy,
    isFreelancer,
    isHire,
    rejectHire,
    sendMessage,
  ]);

  const { data: studioForQuote = null } = useStudioForConversation(
    hasStudioQuoteContext ? conv.id : undefined,
    conv.title || conv.project_title,
  );

  const { data: studioMembers = [] } = useStudioMembers(studioForQuote?.id);
  const myStudioRole = studioMembers.find((m) => m.user_id === user?.id)?.role;
  const chatOffersOn = isAplus1ChatOffersEnabled();
  const canStudioCombinedQuote =
    chatOffersOn &&
    hasStudioQuoteContext &&
    !!studioForQuote &&
    canOpenStudioCombinedQuote(tier, myStudioRole);
  const showStudioQuoteUpsell =
    chatOffersOn &&
    hasStudioQuoteContext &&
    !!studioForQuote &&
    canShowStudioQuoteUpsell(tier, myStudioRole);
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [showPanelHint, setShowPanelHint] = useState(false);
  const kind = (isStudio ? "studio" : isGroup ? "group" : conv.kind) as "hire" | "collab" | "group" | "studio";
  const canForwardHire =
    isHire && isFreelancer && !!conv.request_id && !!hireRequestRow && !isStudioHire;

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

  const senderIds = useMemo(
    () => [...new Set(visibleMessages.map((m) => m.sender_id).filter(Boolean))],
    [visibleMessages],
  );

  const { data: senderProfiles = [] } = useQuery({
    queryKey: ["chat-senders", conv.id, senderIds.join(",")],
    enabled: senderIds.length > 0,
    queryFn: async () => {
      const { data } = await profilesPublicFrom()
        .select("user_id, display_name, username")
        .in("user_id", senderIds);
      return data ?? [];
    },
  });

  const getSenderLabel = useMemo(() => {
    const map = new Map<string, string>();
    senderProfiles.forEach((p) => {
      map.set(p.user_id, p.display_name || p.username || "ผู้ใช้");
    });
    if (user?.id) map.set(user.id, "คุณ");
    return (senderId: string) => map.get(senderId) ?? (senderId === user?.id ? "คุณ" : "ผู้ใช้");
  }, [senderProfiles, user?.id]);

  const scrollToMessage = (messageId: string) => {
    const el = messageRefs.current.get(messageId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightId(messageId);
    window.setTimeout(() => setHighlightId((id) => (id === messageId ? null : id)), 1500);
  };

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
  const showTierBadge =
    isAplus1SubscriptionsEnabled() && !isGroup && TIER_BADGE_TIERS.has(partnerTier);

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
          onClick={() => {
            if (isGroup) {
              onOpenPartnerPanel?.();
              return;
            }
            if (other?.user_id) onOpenPartnerPanel?.();
          }}
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
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0",
                    groupTag === "hire"
                      ? "bg-[hsl(var(--chat-hire-soft))] text-[hsl(var(--chat-hire))]"
                      : groupTag === "collab"
                        ? "bg-[hsl(var(--chat-collab-soft))] text-[hsl(var(--chat-collab))]"
                        : "bg-primary/10 text-primary",
                  )}
                >
                  {groupTag === "hire" ? (
                    <BriefcaseIcon className="w-3 h-3" />
                  ) : groupTag === "collab" ? (
                    <Handshake className="w-3 h-3" />
                  ) : null}
                  {groupTagLabel(groupTag)}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              {isStudio
                ? "แชททีมสตูดิโอ"
                : isGroup
                ? groupTag
                  ? groupTag === "hire"
                    ? "กลุ่มพูดคุยงานจ้าง"
                    : "กลุ่มพูดคุยคอลแลป"
                  : "แชทกลุ่ม"
                : conv.project_title || (isHire ? "พูดคุยรายละเอียดงาน" : "พูดคุยแนวทางคอลแลป")}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          {!isGroup && otherId && (
            <ReportTrigger targetType="user" targetId={otherId} targetOwnerId={otherId} />
          )}
          {requestStatusLabel &&
            (isHireCompletedStatus(hireStatus) ||
              isHireCancelledStatus(hireStatus) ||
              isCollabCompletedStatus(collabStatus) ||
              isCollabCancelledStatus(collabStatus)) && (
              <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5 shrink-0">
                {requestStatusLabel}
              </Badge>
            )}
          {canCompleteRequest && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCompleteOpen(true)}
              disabled={outcomeBusy}
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 h-8 rounded-full"
              aria-label="จบงาน"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">จบงาน</span>
            </Button>
          )}
          {(canCreateCollabProject || canCreateGroupCollabProject) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                navigate(
                  canCreateGroupCollabProject
                    ? `/portfolio/new?collab_conversation_id=${encodeURIComponent(conv.id)}`
                    : `/portfolio/new?collab_request_id=${encodeURIComponent(conv.request_id!)}`,
                )
              }
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 h-8 rounded-full text-[hsl(var(--chat-collab))]"
              aria-label="สร้างผลงานร่วม"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">สร้างผลงานร่วม</span>
            </Button>
          )}
          {canCancelRequest && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (isHire) {
                  setHireCancelEditRow(null);
                  setHireCancelDialogOpen(true);
                } else {
                  setCancelOpen(true);
                }
              }}
              disabled={outcomeBusy}
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 h-8 rounded-full text-muted-foreground hover:text-destructive"
              aria-label="ขอยกเลิกงาน"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ขอยกเลิกงาน</span>
            </Button>
          )}
          {isHire && isHireCancelOpenStatus(activeHireCancel?.status) && (
            <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5 shrink-0">
              รอพิจารณายกเลิก
            </Badge>
          )}
          {canForwardHire && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setForwardOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 h-8 rounded-full text-[hsl(var(--chat-hire))]"
              aria-label="ส่งต่อ"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ส่งต่อ</span>
            </Button>
          )}
          {!isGroup && otherId && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setInviteGroupOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 h-8 rounded-full"
              aria-label="สร้างกลุ่ม"
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">สร้างกลุ่ม</span>
            </Button>
          )}
          {isGroup && !isStudio && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setGroupSettingsOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 h-8 rounded-full"
              aria-label="ตั้งค่ากลุ่ม"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ตั้งค่ากลุ่ม</span>
            </Button>
          )}
          {isHire && isFreelancer && alreadyForwarded && (
            <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5 shrink-0">
              ส่งต่อแล้ว
            </Badge>
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
            chatOffersOn &&
            !isGroup &&
            otherId &&
            isHire &&
            isFreelancer && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={hireStatus !== "ตอบรับ"}
                title={
                  hireStatus === "ตอบรับ"
                    ? "เสนอราคาในแชท"
                    : hireStatus === "ปฏิเสธ"
                      ? "ปฏิเสธงานแล้ว — เสนอราคาไม่ได้"
                      : "ตอบรับงานก่อน จึงจะเสนอราคาได้"
                }
                onClick={() => {
                  if (hireStatus !== "ตอบรับ") return;
                  setOfferOpen(true);
                }}
                className="inline-flex items-center gap-1 text-xs font-medium px-2.5 h-8 rounded-full disabled:opacity-40"
                aria-label={
                  hireStatus === "ตอบรับ"
                    ? "เสนอราคาในแชท"
                    : "เสนอราคา — ต้องตอบรับงานก่อน"
                }
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">เสนอราคา</span>
              </Button>
            )
          )}
          {!isAplus1LaunchMinimal() && !isGroup && otherId && (
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
          {showPartnerToggle && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden rounded-full h-8 w-8"
                onClick={onOpenPartnerPanel}
                aria-label="ข้อมูลโปรไฟล์คู่แชท"
                title="ข้อมูลคู่แชท"
              >
                <Info className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="hidden md:inline-flex rounded-full h-8 w-8"
                onClick={onTogglePartnerPanel}
                aria-label={partnerPanelOpen ? "หุบแผงคู่แชท" : "กางแผงคู่แชท"}
                title={partnerPanelOpen ? "หุบแผง" : "กางแผง"}
                aria-pressed={partnerPanelOpen}
              >
                {partnerPanelOpen ? (
                  <PanelRightClose className="w-5 h-5" />
                ) : (
                  <PanelRightOpen className="w-5 h-5" />
                )}
              </Button>
            </>
          )}
        </div>
      </header>

      {announced.text ? (
        <div className="px-3 py-2 border-b border-border bg-muted/40 flex items-start gap-2">
          <Megaphone className="w-4 h-4 mt-0.5 shrink-0 text-[hsl(var(--chat-hire))]" />
          <button
            type="button"
            className="flex-1 min-w-0 text-left"
            onClick={() => announced.messageId && scrollToMessage(announced.messageId)}
          >
            <p className="text-[11px] font-medium text-foreground">ประกาศในแชทนี้</p>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{announced.text}</p>
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 rounded-full"
            aria-label="เอาประกาศออก"
            onClick={() => void clearAnnouncement()}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) : null}

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
        {messagesLoading && (
          <InlineLoader label="กำลังโหลดข้อความ…" />
        )}
        {messagesError && !messagesLoading && (
          <div className="text-center text-sm text-muted-foreground py-12">
            โหลดข้อความไม่สำเร็จ — ลองรีเฟรชหน้า
          </div>
        )}
        {!messagesLoading && !messagesError && grouped.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-12">
            {isGroup ? "เริ่มแชทกลุ่มได้เลย 👥" : isHire ? "เริ่มบทสนทนากับลูกค้าได้เลย ✨" : "ทักทายเพื่อนคอลแลปได้เลย 👋"}
          </div>
        )}
        {grouped.map((it, idx) =>
          it.type === "date" ? (
            <DateSeparator key={`d-${idx}`} date={it.date} />
          ) : (
            <div
              key={it.m.id}
              ref={(el) => {
                if (el) messageRefs.current.set(it.m.id, el);
                else messageRefs.current.delete(it.m.id);
              }}
            >
              <MessageBubble
                message={it.m}
                mine={it.m.sender_id === user?.id}
                kind={kind === "studio" ? "hire" : kind}
                viewerIsClient={isClient}
                hireInviteActions={hireInviteActions}
                collabInviteActions={collabInviteActions}
                hireRejectChoiceActions={hireRejectChoiceActions}
                hireContinueAskActions={hireContinueAskActions}
                hiringRequestId={isHire ? conv.request_id : null}
                onHireCancelEdit={(row) => {
                  setHireCancelEditRow(row);
                  setHireCancelDialogOpen(true);
                }}
                onHireCancelWithdraw={(row) => {
                  if (!user?.id) return;
                  const otherUserId =
                    row.initiated_by === "client" ? conv.freelancer_id : conv.client_id;
                  void (async () => {
                    try {
                      await withdrawHireCancel.mutateAsync({
                        row,
                        userId: user.id,
                        otherUserId: otherUserId || "",
                        conversationId: conv.id,
                      });
                      await sendMessage.mutateAsync({
                        conversationId: conv.id,
                        content: "ถอนคำขอยกเลิกงานแล้ว — งานดำเนินต่อ",
                        messageType: "system",
                      });
                      toast.success("ถอนคำขอยกเลิกแล้ว");
                    } catch (e: unknown) {
                      toast.error(e instanceof Error ? e.message : "ถอนไม่สำเร็จ");
                    }
                  })();
                }}
                hireCancelWithdrawBusy={withdrawHireCancel.isPending}
                onReply={composerLockedHint ? undefined : setReplyTo}
                onUnsend={handleUnsend}
                onAnnounce={announceMessage}
                getSenderLabel={getSenderLabel}
                onScrollToMessage={scrollToMessage}
                highlight={highlightId === it.m.id}
              />
            </div>
          ),
        )}
        <div ref={endRef} />
      </div>

      <ChatComposer
        conversationId={conv.id}
        kind={kind}
        userId={user?.id}
        replyTo={composerLockedHint ? null : replyTo}
        replyToSenderName={replyTo ? getSenderLabel(replyTo.sender_id) : undefined}
        onClearReply={() => setReplyTo(null)}
        lockedHint={composerLockedHint}
      />

      <StudioQuoteUpsellDialog
        open={upsellOpen}
        onOpenChange={setUpsellOpen}
        onUpgrade={() => navigate("/upgrade#tier-details")}
      />
      <ChatOfferDialog
        open={chatOffersOn && hireStatus === "ตอบรับ" && offerOpen}
        onOpenChange={setOfferOpen}
        conversationId={conv.id}
        defaultTitle={hireMeta?.project_title ?? conv.project_title ?? ""}
        defaultClientName={hireMeta?.client_name ?? ""}
        defaultClientEmail={hireMeta?.email ?? ""}
        defaultClientPhone={hireMeta?.phone ?? ""}
      />
      <HireForwardInChatDialog
        open={forwardOpen}
        onOpenChange={setForwardOpen}
        busy={forwardHire.isPending || sendMessage.isPending}
        projectTitle={conv.project_title ?? hireRequestRow?.project_title}
        onConfirm={async (pick) => {
          if (!hireRequestRow || !user?.id) return;
          try {
            const result = await forwardHire.mutateAsync({
              request: hireRequestRow,
              toUserId: pick.userId,
              note: pick.note || null,
              rejectReason: pick.reason,
              rejectNote: pick.clientMessage || null,
            });
            if (pick.clientMessage.trim()) {
              await sendMessage.mutateAsync({
                conversationId: conv.id,
                content: pick.clientMessage.trim(),
              });
            }
            await sendMessage.mutateAsync({
              conversationId: conv.id,
              content: hireForwardClientNotice(pick.displayName),
            });
            await sendMessage.mutateAsync({
              conversationId: conv.id,
              content: encodeHireForwardMessage({
                v: 1,
                requestId: result.newRequestId,
                fromRequestId: result.fromRequestId,
                toUserId: pick.userId,
                toName: pick.displayName,
                toUsername: pick.username,
                toAvatarUrl: pick.avatarUrl,
              }),
            });
            void qc.invalidateQueries({ queryKey: ["chat-hire-forward-src", conv.request_id] });
            void qc.invalidateQueries({ queryKey: ["chat-hire-meta", conv.request_id] });
            toast.success("ส่งต่องานแล้ว — แจ้งเพื่อนแล้ว (ส่งต่อคนอื่นได้จากปุ่มส่งต่อ)");
            setForwardOpen(false);
          } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "ส่งต่องานไม่สำเร็จ");
          }
        }}
      />
      <CreateGroupDialog
        open={inviteGroupOpen}
        onOpenChange={setInviteGroupOpen}
        lockedMembers={inviteLockedMembers}
        followingOnly
        minTotalMembers={3}
        defaultGroupTag={isHire ? "hire" : conv.kind === "collab" ? "collab" : null}
        onCreated={(convId) => {
          setInviteGroupOpen(false);
          navigate(`/chat/${convId}`);
        }}
      />
      {isGroup && !isStudio && (
        <GroupSettingsDialog
          open={groupSettingsOpen}
          onOpenChange={setGroupSettingsOpen}
          conversationId={conv.id}
        />
      )}
      <CollabRejectDialog
        open={collabRejectOpen && !!collabRequestRow}
        onOpenChange={setCollabRejectOpen}
        busy={collabRespondBusy}
        request={
          collabRequestRow
            ? {
                id: collabRequestRow.id,
                sender_name: other?.display_name || other?.username || "ผู้ส่ง",
                message: collabRequestRow.message,
                timeline: collabRequestRow.timeline,
                collab_types: collabRequestRow.collab_types,
                project_id: collabRequestRow.project_id,
              }
            : null
        }
        onConfirm={async ({ action, reason, note }) => {
          if (!collabRequestRow || !conv.request_id) return;
          try {
            await rejectHire.mutateAsync({
              kind: "collab",
              requestId: conv.request_id,
              reason,
              note,
              keepChat: action === "busy_chat",
            });
            try {
              await sendMessage.mutateAsync({
                conversationId: conv.id,
                content:
                  action === "busy_chat"
                    ? `ยังไม่พร้อมร่วมงานตอนนี้ แต่คุยไอเดียได้ — ${note || collabRejectReasonLabel(reason)}`
                    : `ยังไม่พร้อมร่วมงาน — ${note || collabRejectReasonLabel(reason)}`,
              });
            } catch {
              /* status already saved */
            }
            void qc.invalidateQueries({ queryKey: ["chat-collab-meta", conv.request_id] });
            setCollabRejectOpen(false);
            toast.success(
              action === "busy_chat"
                ? "แจ้งแล้ว — ยังคุยไอเดียต่อได้"
                : "แจ้งแล้วว่ายังไม่พร้อมร่วมงาน",
            );
          } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
          }
        }}
      />
      <HireRejectDialog
        open={rejectOpen && !!hireRequestRow}
        onOpenChange={setRejectOpen}
        request={hireRequestRow}
        busy={hireRespondBusy}
        onConfirm={async ({ action, reason, note, friendNote, forwardToUserId, forwardToDisplayName }) => {
          if (!hireRequestRow) return;
          try {
            if (action === "forward" && forwardToUserId) {
              const result = await forwardHire.mutateAsync({
                request: hireRequestRow,
                toUserId: forwardToUserId,
                note: friendNote || null,
                rejectReason: reason,
                rejectNote: note || null,
              });
              const friendName = forwardToDisplayName?.trim() || "เพื่อนครีเอเตอร์";
              if (note.trim()) {
                await sendMessage.mutateAsync({ conversationId: conv.id, content: note.trim() });
              }
              await sendMessage.mutateAsync({
                conversationId: conv.id,
                content: hireForwardClientNotice(friendName),
              });
              await sendMessage.mutateAsync({
                conversationId: conv.id,
                content: encodeHireForwardMessage({
                  v: 1,
                  requestId: result.newRequestId,
                  fromRequestId: result.fromRequestId,
                  toUserId: forwardToUserId,
                  toName: friendName,
                  toUsername: null,
                  toAvatarUrl: null,
                }),
              });
              void qc.invalidateQueries({ queryKey: ["chat-hire-forward-src", conv.request_id] });
              void qc.invalidateQueries({ queryKey: ["chat-hire-meta", conv.request_id] });
              toast.success("ส่งต่องานแล้ว — แจ้งเพื่อนแล้ว");
              setRejectOpen(false);
              return;
            }

            if (action === "busy_chat") {
              await rejectHire.mutateAsync({
                kind: "hire",
                requestId: hireRequestRow.id,
                reason,
                note: note || null,
                status: "ติดต่อแล้ว",
                postRejectChat: "open",
              });
              await sendMessage.mutateAsync({
                conversationId: conv.id,
                content:
                  note ||
                  "สวัสดีครับ/ค่ะ — ตอนนี้ยังไม่พร้อมรับงานจากเวลาและงบที่แจ้งมา แต่อยากคุยรายละเอียดก่อนได้ครับ/ค่ะ",
              });
              void qc.invalidateQueries({ queryKey: ["chat-hire-forward-src", conv.request_id] });
              toast.success("บันทึกแล้ว — คุยต่อได้เลย");
              setRejectOpen(false);
              return;
            }

            const reasonText = note.trim() || hireRejectReasonLabel(reason);
            await rejectHire.mutateAsync({
              kind: "hire",
              requestId: hireRequestRow.id,
              reason,
              note: note || null,
              status: "ปฏิเสธ",
              postRejectChat: "awaiting_client",
            });
            await sendMessage.mutateAsync({
              conversationId: conv.id,
              content: encodeHireRejectChoiceMessage({
                v: 1,
                kind: "reject_choice",
                requestId: hireRequestRow.id,
                reasonId: reason,
                reasonLabel: reasonText || hireRejectReasonLabel(reason) || "ปฏิเสธคำขอจ้าง",
                note: null,
              }),
            });
            void qc.invalidateQueries({ queryKey: ["chat-hire-forward-src", conv.request_id] });
            void qc.invalidateQueries({ queryKey: ["chat-hire-meta", conv.request_id] });
            toast.success("ปฏิเสธคำขอแล้ว — รอผู้จ้างเลือก");
            setRejectOpen(false);
          } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ");
          }
        }}
      />
      <HireCancelRequestDialog
        open={hireCancelDialogOpen}
        onOpenChange={(open) => {
          setHireCancelDialogOpen(open);
          if (!open) setHireCancelEditRow(null);
        }}
        mode={hireCancelEditRow ? "edit" : "create"}
        initiatedBy={hireCancelEditRow?.initiated_by ?? hireCancelInitiatedBy}
        existing={hireCancelEditRow}
        busy={submitHireCancel.isPending || editHireCancel.isPending}
        onSubmit={async ({ reasonId, reasonNote, moneyTerms, evidenceUrls }) => {
          if (!conv.request_id || !user?.id) return;
          const otherUserId = isClient ? conv.freelancer_id : conv.client_id;
          try {
            if (hireCancelEditRow) {
              const updated = await editHireCancel.mutateAsync({
                row: hireCancelEditRow,
                userId: user.id,
                reasonId,
                reasonNote,
                moneyTerms,
                evidenceUrls,
                otherUserId: otherUserId || "",
                conversationId: conv.id,
              });
              await sendMessage.mutateAsync({
                conversationId: conv.id,
                content: `มีการแก้ไขคำขอยกเลิกงาน — เงื่อนไขเงิน: ${moneyTerms} (กำหนดพิจารณาเดิมไม่เปลี่ยน)`,
                messageType: "system",
              });
              void updated;
              toast.success("บันทึกการแก้ไขแล้ว");
            } else {
              const row = await submitHireCancel.mutateAsync({
                hiringRequestId: conv.request_id,
                conversationId: conv.id,
                initiatedBy: hireCancelInitiatedBy,
                initiatorId: user.id,
                otherUserId: otherUserId || "",
                reasonId,
                reasonNote,
                moneyTerms,
                evidenceUrls,
              });
              await sendMessage.mutateAsync({
                conversationId: conv.id,
                content: encodeHireCancelCardMessage({
                  v: 1,
                  kind: "hire_cancel",
                  cancelRequestId: row.id,
                  hiringRequestId: conv.request_id,
                }),
              });
              toast.success("ส่งคำขอยกเลิกแล้ว — รออีกฝ่ายตอบภายใน 48 ชม.");
            }
            setHireCancelDialogOpen(false);
            setHireCancelEditRow(null);
          } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "ส่งคำขอไม่สำเร็จ");
          }
        }}
      />
      <RequestCancelDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="ยกเลิกคำขอร่วมงาน?"
        description="แจ้งเหตุผลให้อีกฝ่ายทราบ — สถานะจะเป็นยกเลิก"
        busy={outcomeBusy}
        onConfirm={async ({ reason, note }) => {
          if (!conv.request_id || !isCollab) return;
          try {
            const reasonLabel = note || requestCancelReasonLabel(reason);
            await cancelCollab.mutateAsync({
              requestId: conv.request_id,
              reason,
              note: note || null,
            });
            try {
              await sendMessage.mutateAsync({
                conversationId: conv.id,
                content: `ยกเลิกคำขอแล้ว — เหตุผล: ${reasonLabel}`,
              });
            } catch {
              /* status already saved */
            }
            toast.success("ยกเลิกคำขอแล้ว");
            setCancelOpen(false);
          } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "ยกเลิกไม่สำเร็จ");
          }
        }}
      />
      <AlertDialog open={isHire && completeOpen} onOpenChange={setCompleteOpen}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันจบงาน?</AlertDialogTitle>
            <AlertDialogDescription>
              ใช้เมื่องานเสร็จและรับเงินแล้ว — คำขอจะย้ายไปแท็บจบงาน
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full" disabled={outcomeBusy}>
              กลับ
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full"
              disabled={outcomeBusy}
              onClick={(e) => {
                e.preventDefault();
                void (async () => {
                  if (!conv.request_id) return;
                  try {
                    await completeHire.mutateAsync(conv.request_id);
                    try {
                      await sendMessage.mutateAsync({
                        conversationId: conv.id,
                        content: "ยืนยันจบงานแล้ว",
                      });
                    } catch {
                      /* status already saved */
                    }
                    toast.success("บันทึกจบงานแล้ว");
                    setCompleteOpen(false);
                  } catch (err: unknown) {
                    toast.error(err instanceof Error ? err.message : "บันทึกจบงานไม่สำเร็จ");
                  }
                })();
              }}
            >
              ยืนยันจบงาน
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ChatThreadView;
