import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  FileText,
  Briefcase,
  Mail,
  MessageCircle,
  Phone,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useAuth } from "@/hooks/useAuth";
import {
  useCompleteHireRequest,
  useForwardHireRequest,
  useHiringRequests,
  type HiringRow,
} from "@/hooks/useHiringRequests";
import {
  useAcceptRequest,
  useRejectRequest,
  useFindConversationByRequest,
  useSendMessage,
} from "@/hooks/useChat";
import { timeAgoTH } from "@/lib/format";
import { so1oQuotationUrl, trackCrossLink } from "@/lib/crossLink";
import { openSoloExternal } from "@/lib/soloEcosystemGate";
import { isAplus1ChatOffersEnabled } from "@/lib/aplus1Launch";
import {
  formatHireBudgetLabel,
  formatHireDeadlineLabel,
  hireForwardClientNotice,
  hireRejectReasonLabel,
} from "@/lib/hireBrief";
import {
  HIRE_TAB_ACCEPTED,
  HIRE_TAB_ALL,
  HIRE_TAB_CANCELLED,
  HIRE_TAB_COMPLETED,
  HIRE_TAB_CONTACTED_NEW,
  HIRE_TAB_DECLINED,
  HIRE_TAB_FORWARDED,
  HIRE_TAB_ORDER,
  canCompleteHireStatus,
  isContactedNewStatus,
  isHireCancelledStatus,
  isHireCompletedStatus,
  isHireTerminalStatus,
  labelHireStatus,
  type HireInboxTab,
} from "@/lib/hiringStatus";
import {
  canHideHireFromInbox,
  getHiddenHireRequestIds,
  hideHireRequestFromInbox,
  unhideHireRequestFromInbox,
} from "@/lib/hireInboxHidden";
import { requestCancelReasonLabel } from "@/lib/requestOutcome";
import { encodeHireForwardMessage } from "@/lib/hireForwardChat";
import { encodeHireRejectChoiceMessage } from "@/lib/hireRejectChat";
import HireRejectDialog from "@/components/hiring/HireRejectDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function isForwardedOut(req: HiringRow): boolean {
  return (
    !!(req as { forwarded_to_user_id?: string | null }).forwarded_to_user_id ||
    (req as { reject_reason?: string | null }).reject_reason === "forwarded"
  );
}

function friendStatusLabel(status: string | null | undefined): { label: string; tone: string } {
  switch (status) {
    case "ตอบรับ":
      return { label: "เพื่อนตอบรับแล้ว", tone: "bg-emerald-500/15 text-emerald-600 border-emerald-500/25" };
    case "ติดต่อแล้ว":
    case "ใหม่":
    case "ที่ต้องตอบ":
      return {
        label: "เพื่อนคุยกับลูกค้าแล้ว",
        tone: "bg-[hsl(var(--chat-hire-soft))] text-[hsl(var(--chat-hire))] border-[hsl(var(--chat-hire))/0.25]",
      };
    case "ปฏิเสธ":
      return { label: "เพื่อนปฏิเสธ", tone: "bg-destructive/10 text-destructive border-destructive/20" };
    case "ปิดแล้ว":
      return { label: "จบงาน", tone: "bg-muted text-muted-foreground border-border" };
    case "ยกเลิก":
      return { label: "ยกเลิก", tone: "bg-muted text-muted-foreground border-border" };
    default:
      return {
        label: "รอเพื่อนตอบ",
        tone: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25",
      };
  }
}

type ProfileHiringRequestsSectionProps = {
  /** Hide section title when embedded in /dashboard */
  embed?: boolean;
  renderCardExtras?: (req: HiringRow) => ReactNode;
};

export function ProfileHiringRequestsSection({
  embed = false,
  renderCardExtras,
}: ProfileHiringRequestsSectionProps = {}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: requests = [] } = useHiringRequests(user?.id);
  const accept = useAcceptRequest();
  const reject = useRejectRequest();
  const forwardHire = useForwardHireRequest();
  const sendMessage = useSendMessage();
  const findConv = useFindConversationByRequest();
  const completeHire = useCompleteHireRequest();
  const [hiringTab, setHiringTab] = useState<HireInboxTab>(HIRE_TAB_CONTACTED_NEW);
  const [rejectTarget, setRejectTarget] = useState<HiringRow | null>(null);
  const [hideTarget, setHideTarget] = useState<HiringRow | null>(null);
  const [completeTarget, setCompleteTarget] = useState<HiringRow | null>(null);
  const [hiddenTick, setHiddenTick] = useState(0);

  const hiddenIds = useMemo(() => {
    if (!user?.id) return new Set<string>();
    void hiddenTick;
    return getHiddenHireRequestIds(user.id);
  }, [user?.id, hiddenTick]);

  const visibleRequests = useMemo(
    () => requests.filter((r) => !hiddenIds.has(r.id)),
    [requests, hiddenIds],
  );

  const forwardedOut = useMemo(() => visibleRequests.filter(isForwardedOut), [visibleRequests]);
  const forwardedIds = useMemo(() => forwardedOut.map((r) => r.id), [forwardedOut]);

  const { data: childByFromId = {} } = useQuery({
    queryKey: ["hire-forward-children", user?.id, forwardedIds.join(",")],
    enabled: !!user?.id && forwardedIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hiring_requests")
        .select("id, status, freelancer_id, forwarded_from_request_id, updated_at")
        .in("forwarded_from_request_id", forwardedIds);
      if (error) throw error;
      const map: Record<
        string,
        { id: string; status: string; freelancer_id: string | null; updated_at: string }
      > = {};
      for (const row of data ?? []) {
        const fromId = (row as { forwarded_from_request_id?: string }).forwarded_from_request_id;
        if (!fromId) continue;
        map[fromId] = {
          id: row.id as string,
          status: row.status as string,
          freelancer_id: (row.freelancer_id as string | null) ?? null,
          updated_at: row.updated_at as string,
        };
      }
      return map;
    },
  });

  const friendIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of forwardedOut) {
      const to = (r as { forwarded_to_user_id?: string | null }).forwarded_to_user_id;
      if (to) ids.add(to);
    }
    for (const child of Object.values(childByFromId)) {
      if (child.freelancer_id) ids.add(child.freelancer_id);
    }
    return [...ids];
  }, [forwardedOut, childByFromId]);

  const { data: friendNameById = {} } = useQuery({
    queryKey: ["hire-forward-friend-names", friendIds.join(",")],
    enabled: friendIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles_public")
        .select("user_id, display_name, username")
        .in("user_id", friendIds);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const p of data ?? []) {
        const id = (p as { user_id?: string }).user_id;
        if (!id) continue;
        map[id] =
          (p as { display_name?: string | null }).display_name ||
          (p as { username?: string | null }).username ||
          "เพื่อน";
      }
      return map;
    },
  });

  const counts = useMemo(() => {
    const contactedNew = visibleRequests.filter(
      (r) => isContactedNewStatus(r.status) && !isForwardedOut(r),
    ).length;
    const accepted = visibleRequests.filter((r) => r.status === HIRE_TAB_ACCEPTED).length;
    const declined = visibleRequests.filter(
      (r) => r.status === HIRE_TAB_DECLINED && !isForwardedOut(r),
    ).length;
    const cancelled = visibleRequests.filter((r) => isHireCancelledStatus(r.status)).length;
    const completed = visibleRequests.filter((r) => isHireCompletedStatus(r.status)).length;
    return {
      [HIRE_TAB_CONTACTED_NEW]: contactedNew,
      [HIRE_TAB_ACCEPTED]: accepted,
      [HIRE_TAB_DECLINED]: declined,
      [HIRE_TAB_FORWARDED]: forwardedOut.length,
      [HIRE_TAB_CANCELLED]: cancelled,
      [HIRE_TAB_COMPLETED]: completed,
    } as Record<Exclude<HireInboxTab, typeof HIRE_TAB_ALL>, number>;
  }, [visibleRequests, forwardedOut.length]);

  const filteredHiring = useMemo(() => {
    if (hiringTab === HIRE_TAB_ALL) return visibleRequests;
    if (hiringTab === HIRE_TAB_FORWARDED) return forwardedOut;
    if (hiringTab === HIRE_TAB_DECLINED) {
      return visibleRequests.filter((r) => r.status === HIRE_TAB_DECLINED && !isForwardedOut(r));
    }
    if (hiringTab === HIRE_TAB_CONTACTED_NEW) {
      return visibleRequests.filter((r) => isContactedNewStatus(r.status) && !isForwardedOut(r));
    }
    if (hiringTab === HIRE_TAB_CANCELLED) {
      return visibleRequests.filter((r) => isHireCancelledStatus(r.status));
    }
    if (hiringTab === HIRE_TAB_COMPLETED) {
      return visibleRequests.filter((r) => isHireCompletedStatus(r.status));
    }
    return visibleRequests.filter((r) => r.status === hiringTab);
  }, [hiringTab, visibleRequests, forwardedOut]);

  const confirmHideFromInbox = () => {
    if (!user?.id || !hideTarget) return;
    const id = hideTarget.id;
    hideHireRequestFromInbox(user.id, id);
    setHiddenTick((n) => n + 1);
    setHideTarget(null);
    toast.success("นำออกจากรายการแล้ว", {
      action: {
        label: "เลิกทำ",
        onClick: () => {
          unhideHireRequestFromInbox(user.id, id);
          setHiddenTick((n) => n + 1);
        },
      },
    });
  };

  const pendingCount = counts[HIRE_TAB_CONTACTED_NEW] ?? 0;
  const rejectBusy =
    reject.isPending ||
    forwardHire.isPending ||
    accept.isPending ||
    sendMessage.isPending ||
    completeHire.isPending;

  const confirmCompleteHire = async () => {
    if (!completeTarget) return;
    try {
      await completeHire.mutateAsync(completeTarget.id);
      toast.success("บันทึกจบงานแล้ว");
      setCompleteTarget(null);
      setHiringTab(HIRE_TAB_COMPLETED);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "บันทึกจบงานไม่สำเร็จ");
    }
  };

  const openChatFor = async (req: HiringRow, systemNote?: string) => {
    let id = await findConv("hire", req.id);
    if (!id && req.client_id && req.freelancer_id) {
      id = await accept.mutateAsync({
        kind: "hire",
        requestId: req.id,
        clientId: req.client_id,
        freelancerId: req.freelancer_id!,
        projectId: req.project_id ?? null,
        projectTitle: req.project_title,
      });
    }
    if (!id) throw new Error("ไม่พบห้องสนทนา");
    if (systemNote) {
      try {
        await sendMessage.mutateAsync({ conversationId: id, content: systemNote });
      } catch {
        /* chat open is enough if message insert fails */
      }
    }
    navigate(`/chat/${id}`);
  };

  return (
    <div className="space-y-3 scroll-mt-24 rounded-3xl glass-panel p-5 md:p-6" id="hiring-section">
      {!embed ? (
        <div className="flex items-center gap-3">
          <div className="text-[hsl(var(--chat-hire))]">
            <Briefcase className="w-5 h-5" strokeWidth={2.25} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-medium text-foreground">คำขอจ้างงาน</h2>
              {pendingCount > 0 && (
                <Badge className="bg-[hsl(var(--chat-hire))] text-white border-0 text-[10px] px-1.5">
                  {pendingCount} รอตอบ
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              ลูกค้าที่ส่งคำขอจ้างงานมายังคุณ — เปลี่ยนสถานะเพื่อติดตาม
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {HIRE_TAB_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setHiringTab(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              hiringTab === s
                ? "bg-primary text-primary-foreground"
                : "bg-card text-secondary-foreground border border-border hover:bg-secondary"
            }`}
          >
            {s}{" "}
            {s !== HIRE_TAB_ALL ? `(${counts[s] ?? 0})` : ""}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredHiring.map((req) => {
          const forwarded = isForwardedOut(req);
          const isDeclined = req.status === HIRE_TAB_DECLINED;
          const isCancelled = isHireCancelledStatus(req.status);
          const canHide = canHideHireFromInbox(req.status);
          const canComplete = !forwarded && canCompleteHireStatus(req.status);
          const canQuote =
            isAplus1ChatOffersEnabled() &&
            !forwarded &&
            (req.status === "ตอบรับ" ||
              req.status === "ติดต่อแล้ว" ||
              req.status === "ใหม่" ||
              req.status === "ที่ต้องตอบ");
          const cancelLabel = requestCancelReasonLabel(
            (req as { cancel_reason?: string | null }).cancel_reason,
          );
          const budgetLabel = formatHireBudgetLabel({
            budget_min: (req as { budget_min?: number | null }).budget_min,
            budget_max: (req as { budget_max?: number | null }).budget_max,
            budget_amount: req.budget_amount,
            budget: req.budget as string | null,
          });
          const deadlineLabel = formatHireDeadlineLabel(req.deadline);
          const rejectLabel = hireRejectReasonLabel(
            (req as { reject_reason?: string | null }).reject_reason,
          );
          const child = childByFromId[req.id];
          const friendId =
            (req as { forwarded_to_user_id?: string | null }).forwarded_to_user_id ||
            child?.freelancer_id ||
            null;
          const friendName = friendId ? friendNameById[friendId] ?? "เพื่อน" : null;
          const friendTone = friendStatusLabel(child?.status);

          const openChat = async () => {
            try {
              await openChatFor(req);
            } catch (e: unknown) {
              toast.error(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ");
            }
          };

          const openQuote = async () => {
            const linkId = await trackCrossLink({
              source: "portfolio_hire",
              refId: req.id,
              meta: { request_id: req.id },
            });
            const url = so1oQuotationUrl({
              requestId: req.id,
              clientName: req.client_name ?? undefined,
              projectTitle: req.project_title ?? undefined,
              clientEmail: req.email ?? undefined,
              clientPhone: req.phone ?? undefined,
              message: req.message ?? undefined,
              deadline: req.deadline ?? undefined,
              linkId,
            });
            openSoloExternal(url);
          };

          return (
            <div key={req.id} className="rounded-xl glass-panel p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-[hsl(var(--chat-hire))] flex items-center justify-center shrink-0 text-white font-medium text-sm">
                  {req.client_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground text-sm">{req.client_name}</span>
                    {forwarded ? (
                      <Badge
                        variant="outline"
                        className="text-xs gap-1 bg-[hsl(var(--chat-hire-soft))] text-[hsl(var(--chat-hire))] border-[hsl(var(--chat-hire))/0.25]"
                      >
                        <Share2 className="w-3 h-3" />
                        ส่งต่อ
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        {labelHireStatus(req.status)}
                      </Badge>
                    )}
                    {budgetLabel ? (
                      <Badge
                        variant="outline"
                        className="text-xs bg-[hsl(var(--chat-hire-soft))] text-[hsl(var(--chat-hire))] border-[hsl(var(--chat-hire))/0.2]"
                      >
                        งบ {budgetLabel}
                      </Badge>
                    ) : null}
                    {deadlineLabel ? (
                      <Badge variant="outline" className="text-xs gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {deadlineLabel}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    อ้างอิง: <span className="text-foreground font-medium">{req.project_title}</span>
                  </p>
                  <p className="text-base text-foreground mt-2 line-clamp-2">{req.message}</p>
                  {forwarded ? (
                    <div className="mt-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 space-y-1">
                      <p className="text-xs text-foreground">
                        ส่งต่อให้ <span className="font-medium">{friendName ?? "เพื่อน"}</span>
                      </p>
                      <Badge variant="outline" className={`text-[10px] ${friendTone.tone}`}>
                        {friendTone.label}
                      </Badge>
                      {child?.status ? (
                        <p className="text-[11px] text-muted-foreground">
                          สถานะคำขอของเพื่อน: {labelHireStatus(child.status)}
                          {child.updated_at ? ` · อัปเดต ${timeAgoTH(child.updated_at)}` : ""}
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">ยังไม่พบคำขอฝั่งเพื่อน</p>
                      )}
                    </div>
                  ) : isDeclined && rejectLabel ? (
                    <p className="text-xs text-muted-foreground mt-1">เหตุผล: {rejectLabel}</p>
                  ) : isCancelled && cancelLabel ? (
                    <p className="text-xs text-muted-foreground mt-1">เหตุผลยกเลิก: {cancelLabel}</p>
                  ) : null}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                    <span>⏱ {timeAgoTH(req.created_at)}</span>
                    <a
                      href={`mailto:${req.email}`}
                      className="flex items-center gap-1 hover:text-[hsl(var(--chat-hire))]"
                    >
                      <Mail className="w-3 h-3" />
                      {req.email}
                    </a>
                    {req.phone && (
                      <a
                        href={`tel:${req.phone}`}
                        className="flex items-center gap-1 hover:text-[hsl(var(--chat-hire))]"
                      >
                        <Phone className="w-3 h-3" />
                        {req.phone}
                      </a>
                    )}
                  </div>
                  {renderCardExtras?.(req)}
                  <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-border/50 flex-wrap">
                    {!isHireTerminalStatus(req.status) && !forwarded && (
                      <>
                        {canQuote && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void openQuote()}
                            className="rounded-full h-8 text-xs gap-1"
                          >
                            <FileText className="w-3.5 h-3.5" /> ใบเสนอราคา
                          </Button>
                        )}
                        {canComplete && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setCompleteTarget(req)}
                            disabled={rejectBusy}
                            className="rounded-full h-8 text-xs gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> จบงาน
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setRejectTarget(req)}
                          disabled={rejectBusy}
                          className="rounded-full h-8 text-xs text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-3.5 h-3.5 mr-1" /> ปฏิเสธ
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => void openChat()}
                          disabled={accept.isPending}
                          className="rounded-full h-8 text-xs bg-[hsl(var(--chat-hire))] text-white hover:opacity-90"
                        >
                          <MessageCircle className="w-3.5 h-3.5 mr-1" /> เปิดแชท
                        </Button>
                      </>
                    )}
                    {forwarded ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void openChat()}
                        className="rounded-full h-8 text-xs"
                      >
                        <MessageCircle className="w-3.5 h-3.5 mr-1" /> ดูแชทเดิม
                      </Button>
                    ) : null}
                    {canHide ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setHideTarget(req)}
                        className="rounded-full h-8 text-xs text-muted-foreground hover:text-destructive"
                        title="นำออกจากรายการ"
                        aria-label="ลบออกจากรายการ"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        ลบ
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {filteredHiring.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            {hiringTab === HIRE_TAB_FORWARDED
              ? "ยังไม่มีงานที่ส่งต่อให้เพื่อน"
              : "ยังไม่มีคำขอจ้างงานในสถานะนี้"}
          </p>
        )}
      </div>

      <AlertDialog
        open={!!completeTarget}
        onOpenChange={(open) => {
          if (!open) setCompleteTarget(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันจบงาน?</AlertDialogTitle>
            <AlertDialogDescription>
              ใช้เมื่องานเสร็จและรับเงินแล้ว — คำขอของ{" "}
              <span className="font-medium text-foreground">
                {completeTarget?.client_name ?? "ลูกค้า"}
              </span>{" "}
              จะย้ายไปแท็บจบงาน
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full" disabled={completeHire.isPending}>
              กลับ
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full"
              disabled={completeHire.isPending}
              onClick={(e) => {
                e.preventDefault();
                void confirmCompleteHire();
              }}
            >
              ยืนยันจบงาน
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <HireRejectDialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
        request={rejectTarget}
        busy={rejectBusy}
        onConfirm={async ({ action, reason, note, friendNote, forwardToUserId, forwardToDisplayName }) => {
          if (!rejectTarget) return;
          try {
            if (action === "forward" && forwardToUserId) {
              const result = await forwardHire.mutateAsync({
                request: rejectTarget,
                toUserId: forwardToUserId,
                note: friendNote || null,
                rejectReason: reason,
                rejectNote: note || null,
              });
              const friendName = forwardToDisplayName?.trim() || "เพื่อนครีเอเตอร์";
              const convId = await findConv("hire", rejectTarget.id);
              if (convId) {
                try {
                  if (note.trim()) {
                    await sendMessage.mutateAsync({
                      conversationId: convId,
                      content: note.trim(),
                    });
                  }
                  await sendMessage.mutateAsync({
                    conversationId: convId,
                    content: hireForwardClientNotice(friendName),
                  });
                  await sendMessage.mutateAsync({
                    conversationId: convId,
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
                } catch {
                  /* forward already succeeded */
                }
              }
              toast.success(
                convId
                  ? "ส่งต่องานแล้ว — แจ้งเพื่อนแล้ว"
                  : "ส่งต่องานให้เพื่อนแล้ว",
              );
              setRejectTarget(null);
              setHiringTab("ส่งต่อ");
              return;
            }

            if (action === "busy_chat") {
              await reject.mutateAsync({
                kind: "hire",
                requestId: rejectTarget.id,
                reason,
                note: note || null,
                status: "ติดต่อแล้ว",
                postRejectChat: "open",
              });
              await openChatFor(
                rejectTarget,
                note ||
                  "สวัสดีครับ/ค่ะ — ตอนนี้ยังไม่พร้อมรับงานจากเวลาและงบที่แจ้งมา แต่อยากคุยรายละเอียดก่อนได้ครับ/ค่ะ",
              );
              toast.success("บันทึกแล้ว — เปิดแชทเพื่อคุยต่อ");
              setRejectTarget(null);
              return;
            }

            const reasonText = note.trim() || hireRejectReasonLabel(reason);
            await reject.mutateAsync({
              kind: "hire",
              requestId: rejectTarget.id,
              reason,
              note: note || null,
              status: "ปฏิเสธ",
              postRejectChat: "awaiting_client",
            });
            const convId = await findConv("hire", rejectTarget.id);
            if (convId) {
              try {
                await sendMessage.mutateAsync({
                  conversationId: convId,
                  content: encodeHireRejectChoiceMessage({
                    v: 1,
                    kind: "reject_choice",
                    requestId: rejectTarget.id,
                    reasonId: reason,
                    reasonLabel: reasonText || hireRejectReasonLabel(reason) || "ปฏิเสธคำขอจ้าง",
                    note: null,
                  }),
                });
              } catch {
                /* status already saved */
              }
              navigate(`/chat/${convId}`);
            }
            toast.success(
              convId ? "ปฏิเสธแล้ว — รอผู้จ้างเลือกในแชท" : "ปฏิเสธคำขอแล้ว",
            );
            setRejectTarget(null);
          } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ");
          }
        }}
      />

      <AlertDialog
        open={!!hideTarget}
        onOpenChange={(open) => {
          if (!open) setHideTarget(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>นำออกจากรายการ?</AlertDialogTitle>
            <AlertDialogDescription>
              ซ่อนคำขอของ{" "}
              <span className="font-medium text-foreground">
                {hideTarget?.client_name ?? "ลูกค้า"}
              </span>{" "}
              ออกจากกล่องคำขอจ้างงานของคุณ — แชทและประวัติฝั่งลูกค้ายังอยู่
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmHideFromInbox}
            >
              ลบออกจากรายการ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
