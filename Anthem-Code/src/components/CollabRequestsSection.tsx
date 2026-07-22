import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Handshake,
  MessageCircle,
  Paperclip,
  X,
  UserCircle2,
  Link2,
  Trash2,
  Check,
  FileText,
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
import { supabase } from "@/integrations/supabase/client";
import { useReceivedCollabRequests } from "@/hooks/useCollabRequests";
import {
  useAcceptRequest,
  useRejectRequest,
  useFindConversationByRequest,
  useOpenHireCollabChat,
} from "@/hooks/useChat";
import { timeAgoTH } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { collectCollabReferenceLinks, collabRejectReasonLabel } from "@/lib/collabBrief";
import CollabRejectDialog from "@/components/collab/CollabRejectDialog";
import { requestCancelReasonLabel } from "@/lib/requestOutcome";
import {
  COLLAB_TAB_ACCEPTED,
  COLLAB_TAB_ALL,
  COLLAB_TAB_CANCELLED,
  COLLAB_TAB_COMPLETED,
  COLLAB_TAB_CONTACTED_NEW,
  COLLAB_TAB_DECLINED,
  COLLAB_TAB_ORDER,
  canHideCollabFromInbox,
  getHiddenCollabIds,
  hideCollabFromInbox,
  isCollabAcceptedStatus,
  isCollabCancelledStatus,
  isCollabCompletedStatus,
  isCollabContactedNewStatus,
  isCollabDeclinedStatus,
  labelCollabStatus,
  unhideCollabFromInbox,
  type CollabInboxTab,
} from "@/lib/collabInbox";

const COLLAB_TYPE_LABELS: Record<string, string> = {
  chat: "พูดคุย",
  "joint-project": "ร่วมโปรเจกต์",
  "skill-swap": "แลกเปลี่ยนสกิล",
  studio: "Studio/ทีม",
  experiment: "งานทดลอง",
  content: "คอนเทนต์",
  other: "อื่นๆ",
};

const statusTone = (label: string) => {
  switch (label) {
    case COLLAB_TAB_ACCEPTED:
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case COLLAB_TAB_CONTACTED_NEW:
      return "bg-primary/10 text-primary border-primary/20";
    case COLLAB_TAB_DECLINED:
      return "bg-destructive/10 text-destructive border-destructive/20";
    case COLLAB_TAB_CANCELLED:
    case COLLAB_TAB_COMPLETED:
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

type CollabRequestsSectionProps = {
  embed?: boolean;
  renderCardExtras?: (req: {
    id: string;
    status: string | null;
    linked_project_id?: string | null;
  }) => ReactNode;
};

const CollabRequestsSection = ({
  embed = false,
  renderCardExtras,
}: CollabRequestsSectionProps = {}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: requests = [] } = useReceivedCollabRequests();
  const accept = useAcceptRequest();
  const reject = useRejectRequest();
  const findConv = useFindConversationByRequest();
  const openChatMut = useOpenHireCollabChat();

  const [tab, setTab] = useState<CollabInboxTab>(COLLAB_TAB_CONTACTED_NEW);
  const [hideTarget, setHideTarget] = useState<(typeof requests)[number] | null>(null);
  const [rejectTarget, setRejectTarget] = useState<(typeof requests)[number] | null>(null);
  const [tick, setTick] = useState(0);

  const hiddenIds = useMemo(() => {
    if (!user?.id) return new Set<string>();
    void tick;
    return getHiddenCollabIds(user.id);
  }, [user?.id, tick]);

  const visibleRequests = useMemo(
    () => requests.filter((r) => !hiddenIds.has(r.id)),
    [requests, hiddenIds],
  );

  const senderIds = useMemo(
    () => Array.from(new Set(visibleRequests.map((r) => r.sender_id))),
    [visibleRequests],
  );
  const attachedIds = useMemo(
    () => Array.from(new Set(visibleRequests.flatMap((r) => r.attached_project_ids ?? []))),
    [visibleRequests],
  );

  const { data: sendersMap = {} } = useQuery({
    queryKey: ["collab-senders", senderIds],
    enabled: senderIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles_public")
        .select("user_id, display_name, avatar_url, role")
        .in("user_id", senderIds);
      const map: Record<string, { name: string; avatar: string; role: string }> = {};
      (data ?? []).forEach((p) => {
        map[p.user_id] = {
          name: p.display_name || "ฟรีแลนซ์",
          avatar: p.avatar_url || "",
          role: p.role || "",
        };
      });
      return map;
    },
  });

  const { data: attachedMap = {} } = useQuery({
    queryKey: ["collab-attached", attachedIds],
    enabled: attachedIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, title, cover_url")
        .in("id", attachedIds);
      const map: Record<string, { title: string; cover: string }> = {};
      (data ?? []).forEach((p) => {
        map[p.id] = { title: p.title, cover: p.cover_url || "" };
      });
      return map;
    },
  });

  const counts = useMemo(() => {
    let contactedNew = 0;
    let accepted = 0;
    let declined = 0;
    let cancelled = 0;
    let completed = 0;
    for (const r of visibleRequests) {
      if (isCollabContactedNewStatus(r.status)) contactedNew += 1;
      else if (isCollabAcceptedStatus(r.status)) accepted += 1;
      else if (isCollabDeclinedStatus(r.status)) declined += 1;
      else if (isCollabCancelledStatus(r.status)) cancelled += 1;
      else if (isCollabCompletedStatus(r.status)) completed += 1;
    }
    return {
      [COLLAB_TAB_CONTACTED_NEW]: contactedNew,
      [COLLAB_TAB_ACCEPTED]: accepted,
      [COLLAB_TAB_DECLINED]: declined,
      [COLLAB_TAB_CANCELLED]: cancelled,
      [COLLAB_TAB_COMPLETED]: completed,
    };
  }, [visibleRequests]);

  const filtered = useMemo(() => {
    if (tab === COLLAB_TAB_ALL) return visibleRequests;
    return visibleRequests.filter((r) => {
      if (tab === COLLAB_TAB_CONTACTED_NEW) return isCollabContactedNewStatus(r.status);
      if (tab === COLLAB_TAB_ACCEPTED) return isCollabAcceptedStatus(r.status);
      if (tab === COLLAB_TAB_DECLINED) return isCollabDeclinedStatus(r.status);
      if (tab === COLLAB_TAB_CANCELLED) return isCollabCancelledStatus(r.status);
      if (tab === COLLAB_TAB_COMPLETED) return isCollabCompletedStatus(r.status);
      return false;
    });
  }, [tab, visibleRequests]);

  const pendingCount = counts[COLLAB_TAB_CONTACTED_NEW] ?? 0;
  const busy = accept.isPending || reject.isPending || openChatMut.isPending;

  const handleAccept = async (req: (typeof requests)[number]) => {
    if (!user) return;
    try {
      const convId = await accept.mutateAsync({
        kind: "collab",
        requestId: req.id,
        clientId: req.sender_id,
        freelancerId: req.recipient_id,
        projectId: req.project_id ?? null,
        projectTitle: "คอลแลปไอเดียใหม่",
      });
      toast.success("ตอบรับร่วมงานแล้ว — คุยไอเดียต่อได้เลย");
      setTab(COLLAB_TAB_ACCEPTED);
      navigate(`/chat/${convId}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ");
    }
  };

  const openChat = async (req: (typeof requests)[number]) => {
    if (!user) return;
    try {
      let convId = await findConv("collab", req.id);
      if (!convId) {
        convId = await openChatMut.mutateAsync({
          kind: "collab",
          requestId: req.id,
          clientId: req.sender_id,
          freelancerId: req.recipient_id,
          projectId: req.project_id ?? null,
          projectTitle: "คอลแลปไอเดียใหม่",
          // keep pending (= ติดต่อใหม่); accept button marks accepted
          skipStatusUpdate: true,
        });
      }
      navigate(`/chat/${convId}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ");
    }
  };

  const confirmHide = () => {
    if (!user?.id || !hideTarget) return;
    const id = hideTarget.id;
    hideCollabFromInbox(user.id, id);
    setTick((n) => n + 1);
    setHideTarget(null);
    toast.success("นำออกจากรายการแล้ว", {
      action: {
        label: "เลิกทำ",
        onClick: () => {
          unhideCollabFromInbox(user.id, id);
          setTick((n) => n + 1);
        },
      },
    });
  };

  return (
    <div className="space-y-3 scroll-mt-24 rounded-3xl glass-panel p-5 md:p-6" id="collab-section">
      {!embed ? (
        <div className="flex items-center gap-3">
          <div className="text-primary">
            <Handshake className="w-5 h-5" strokeWidth={2.25} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-medium text-foreground">คำขอร่วมงาน (Collab)</h2>
              {pendingCount > 0 && (
                <Badge className="bg-primary text-primary-foreground border-0 hover:bg-primary text-[10px] px-1.5">
                  {pendingCount} ติดต่อใหม่
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              ครีเอเตอร์ที่อยากร่วมงานกับคุณ — เปลี่ยนสถานะเพื่อติดตาม
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {COLLAB_TAB_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setTab(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              tab === s
                ? "bg-primary text-primary-foreground"
                : "bg-card text-secondary-foreground border border-border hover:bg-secondary"
            }`}
          >
            {s} {s !== COLLAB_TAB_ALL ? `(${counts[s] ?? 0})` : ""}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            ยังไม่มีคำขอร่วมงานในสถานะนี้
          </p>
        )}

        {filtered.map((req) => {
          const sender = sendersMap[req.sender_id];
          const label = labelCollabStatus(req.status as string);
          const isDeclined = isCollabDeclinedStatus(req.status);
          const isAccepted = isCollabAcceptedStatus(req.status);
          const isCancelled = isCollabCancelledStatus(req.status);
          const isContactedNew = isCollabContactedNewStatus(req.status);
          const canHide = canHideCollabFromInbox(req.status);
          const cancelLabel = requestCancelReasonLabel(
            (req as { cancel_reason?: string | null }).cancel_reason,
          );

          return (
            <div
              key={req.id}
              className="rounded-2xl glass-panel p-4 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => navigate(`/u/${req.sender_id}`)}
                  className="shrink-0"
                >
                  {sender?.avatar ? (
                    <img
                      src={sender.avatar}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center text-primary font-medium">
                      {(sender?.name ?? "?")[0]}
                    </div>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => navigate(`/u/${req.sender_id}`)}
                      className="font-semibold text-foreground text-sm hover:text-primary"
                    >
                      {sender?.name ?? "ฟรีแลนซ์"}
                    </button>
                    {sender?.role && (
                      <span className="text-xs text-muted-foreground">· {sender.role}</span>
                    )}
                    <Badge variant="outline" className={`text-[10px] ${statusTone(label)}`}>
                      {label}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-2">
                    {(req.collab_types ?? []).map((t) => {
                      const typeLabel = COLLAB_TYPE_LABELS[t] ?? t;
                      const isOther = t === "other";
                      const note = (req as { other_type_note?: string | null }).other_type_note;
                      return (
                        <span
                          key={t}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-[hsl(var(--chat-collab-soft))] text-[hsl(var(--chat-collab))]"
                        >
                          {isOther && note ? `${typeLabel}: ${note}` : typeLabel}
                        </span>
                      );
                    })}
                  </div>

                  <p className="text-base text-foreground mt-2 leading-6 whitespace-pre-wrap">
                    {req.message}
                  </p>
                  {isCancelled && cancelLabel ? (
                    <p className="text-xs text-muted-foreground mt-1">เหตุผลยกเลิก: {cancelLabel}</p>
                  ) : null}
                  {isDeclined ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      {(req as { keep_chat?: boolean | null }).keep_chat ||
                      (req as { reject_reason?: string | null }).reject_reason === "busy_but_chat"
                        ? "ยังไม่พร้อมร่วมงาน — คุยไอเดียต่อได้"
                        : `เหตุผล: ${
                            (req as { reject_note?: string | null }).reject_note?.trim() ||
                            collabRejectReasonLabel(
                              (req as { reject_reason?: string | null }).reject_reason,
                            ) ||
                            "ยังไม่พร้อมร่วมงาน"
                          }`}
                    </p>
                  ) : null}

                  {(() => {
                    const links = collectCollabReferenceLinks({
                      external_drive_url: (req as { external_drive_url?: string | null })
                        .external_drive_url,
                      website_url: (req as { website_url?: string | null }).website_url,
                    });
                    if (!links.length) return null;
                    return (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {links.map((url, i) => (
                          <a
                            key={`${url}-${i}`}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border border-border bg-card hover:border-primary/40 text-foreground max-w-full"
                          >
                            <Link2 className="w-3 h-3 text-primary shrink-0" />
                            <span className="truncate">{url.replace(/^https?:\/\//, "")}</span>
                          </a>
                        ))}
                      </div>
                    );
                  })()}

                  {req.timeline && (
                    <p className="text-xs text-muted-foreground mt-1.5">⏰ {req.timeline}</p>
                  )}

                  {req.attached_project_ids && req.attached_project_ids.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[11px] text-muted-foreground mb-1.5 flex items-center gap-1">
                        <Paperclip className="w-3 h-3" /> ผลงานที่แนบมา
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {req.attached_project_ids.map((pid) => {
                          const proj = attachedMap[pid];
                          if (!proj) return null;
                          return (
                            <button
                              key={pid}
                              type="button"
                              onClick={() => navigate(`/project/${pid}`)}
                              className="w-16 h-16 rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors"
                              title={proj.title}
                            >
                              {proj.cover ? (
                                <img
                                  src={proj.cover}
                                  alt={proj.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-muted text-[9px] flex items-center justify-center text-muted-foreground p-1 text-center">
                                  {proj.title}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {renderCardExtras?.(req)}

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50 gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      ⏱ {timeAgoTH(req.created_at)}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/u/${req.sender_id}`)}
                        className="rounded-full h-8 text-xs"
                      >
                        <UserCircle2 className="w-3.5 h-3.5 mr-1" /> ดูโปรไฟล์
                      </Button>

                      {isContactedNew && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setRejectTarget(req)}
                            disabled={busy}
                            className="rounded-full h-8 text-xs text-muted-foreground hover:text-destructive"
                          >
                            <X className="w-3.5 h-3.5 mr-1" /> ยังไม่พร้อม
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void openChat(req)}
                            disabled={busy}
                            className="rounded-full h-8 text-xs"
                          >
                            <MessageCircle className="w-3.5 h-3.5 mr-1" /> เปิดแชท
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => void handleAccept(req)}
                            disabled={busy}
                            className="rounded-full h-8 text-xs bg-gradient-to-br from-[hsl(var(--chat-collab))] to-[hsl(var(--chat-collab)/0.85)] text-white hover:opacity-90"
                          >
                            <Check className="w-3.5 h-3.5 mr-1" /> ตอบรับร่วมงาน
                          </Button>
                        </>
                      )}

                      {isAccepted && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              navigate(
                                `/portfolio/new?collab_request_id=${encodeURIComponent(req.id)}`,
                              )
                            }
                            disabled={busy}
                            className="rounded-full h-8 text-xs"
                          >
                            <FileText className="w-3.5 h-3.5 mr-1" /> ลงผลงานร่วมกัน
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => void openChat(req)}
                            disabled={busy}
                            className="rounded-full h-8 text-xs bg-gradient-to-br from-[hsl(var(--chat-collab))] to-[hsl(var(--chat-collab)/0.85)] text-white hover:opacity-90"
                          >
                            <MessageCircle className="w-3.5 h-3.5 mr-1" /> เปิดแชท
                          </Button>
                        </>
                      )}

                      {canHide && (
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
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <CollabRejectDialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open) setRejectTarget(null);
        }}
        busy={busy}
        request={
          rejectTarget
            ? {
                id: rejectTarget.id,
                sender_name: sendersMap[rejectTarget.sender_id]?.name ?? "ผู้ส่ง",
                message: rejectTarget.message,
                timeline: rejectTarget.timeline,
                collab_types: rejectTarget.collab_types,
                project_id: rejectTarget.project_id,
              }
            : null
        }
        onConfirm={async ({ action, reason, note }) => {
          if (!rejectTarget) return;
          try {
            await reject.mutateAsync({
              kind: "collab",
              requestId: rejectTarget.id,
              reason,
              note,
              keepChat: action === "busy_chat",
            });
            setRejectTarget(null);
            setTab(COLLAB_TAB_DECLINED);
            toast.success(
              action === "busy_chat"
                ? "แจ้งแล้ว — ยังคุยไอเดียต่อได้"
                : "แจ้งแล้วว่ายังไม่พร้อมร่วมงาน",
            );
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
              ซ่อนคำขอร่วมงานนี้ออกจากกล่องของคุณ — แชทและประวัติฝั่งอีกคนยังอยู่
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">กลับ</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmHide}
            >
              ลบออกจากรายการ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CollabRequestsSection;
