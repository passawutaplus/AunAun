import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  Calendar,
  CircleDot,
  Clock,
  FileText,
  Handshake,
  Image as ImageIcon,
  LayoutGrid,
  Link2,
  ListOrdered,
  MessageCircle,
  MessageSquare,
  Star,
  Trash2,
  UserCircle2,
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
import {
  WorkReviewDialog,
  type WorkReviewDialogTarget,
} from "@/components/reviews/WorkReviewDialog";
import { supabase } from "@/integrations/supabase/client";
import { useReceivedCollabRequests } from "@/hooks/useCollabRequests";
import { useCollabInboxPlanConversations } from "@/hooks/useCollabInboxPlans";
import {
  useFindConversationByRequest,
  useOpenHireCollabChat,
} from "@/hooks/useChat";
import { timeAgoTH } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useSetInboxPriority } from "@/hooks/useInboxPriority";
import type { InboxPriority } from "@/lib/inboxPriority";
import { DEFAULT_COLLAB_INBOX_SORT, COLLAB_INBOX_SORT_OPTIONS, sortInboxRows, type InboxSortKey } from "@/lib/inboxSort";
import { collectCollabReferenceLinks, collabInviteDisplay, collabRejectReasonLabel, formatCollabTimelineLabel } from "@/lib/collabBrief";
import {
  ExpandAttachments,
  ExpandField,
  ExpandLinkList,
  InboxExpandDetail,
} from "@/components/inbox/InboxExpandDetail";
import { InboxPersonCard } from "@/components/inbox/InboxPersonCard";
import { InboxDocCell } from "@/components/inbox/InboxDocCell";
import { InboxExpandTable, InboxPersonCell } from "@/components/inbox/InboxExpandTable";
import { InboxPrioritySelect } from "@/components/inbox/InboxPrioritySelect";
import { InboxSortMenu } from "@/components/inbox/InboxSortMenu";
import ProjectReferencePreview from "@/components/opportunity/ProjectReferencePreview";
import ImageLightbox from "@/components/project/ImageLightbox";
import { inboxStatusPillClass } from "@/lib/inboxStatusTone";
import { profilePublicPath } from "@/lib/profileRoutes";
import { isUuidLike } from "@/lib/uuid";
import {
  collabInboxMockProjects,
  collabInboxMockSenders,
  isCollabInboxMockId,
  mergeCollabInboxMocks,
} from "@/lib/collabInboxMock";
import { cn } from "@/lib/utils";
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

const CollabPlanSheet = lazy(() =>
  import("@/components/chat/CollabPlanSheet").then((m) => ({ default: m.CollabPlanSheet })),
);

const COLLAB_TYPE_LABELS: Record<string, string> = {
  chat: "พูดคุย",
  "joint-project": "ร่วมโปรเจกต์",
  "skill-swap": "แลกเปลี่ยนสกิล",
  studio: "Studio/ทีม",
  experiment: "งานทดลอง",
  content: "คอนเทนต์",
  other: "อื่นๆ",
};

type CollabRequestsSectionProps = {
  embed?: boolean;
};

const COLLAB_INBOX_COLUMNS = [
  { key: "person", label: "ผู้ส่ง", width: "minmax(10rem,16rem)", align: "start" as const },
  { key: "timeline", label: "ช่วงเวลา", width: "minmax(7rem,1fr)", mdOnly: true, align: "center" as const },
  { key: "status", label: "สถานะ", width: "minmax(5.75rem,1fr)", mdOnly: true, align: "center" as const },
  { key: "docs", label: "เอกสาร", width: "minmax(3.25rem,0.6fr)", mdOnly: true, align: "center" as const },
  { key: "priority", label: "ความสำคัญ", width: "minmax(7.75rem,1fr)", mdOnly: true, align: "center" as const },
] as const;

const CollabRequestsSection = ({
  embed = false,
}: CollabRequestsSectionProps = {}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: liveRequests = [] } = useReceivedCollabRequests();
  const requests = useMemo(
    () => mergeCollabInboxMocks(liveRequests, user?.id),
    [liveRequests, user?.id],
  );
  const findConv = useFindConversationByRequest();
  const openChatMut = useOpenHireCollabChat();
  const setInboxPriority = useSetInboxPriority();

  const [tab, setTab] = useState<CollabInboxTab>(COLLAB_TAB_CONTACTED_NEW);
  const [hideTarget, setHideTarget] = useState<(typeof requests)[number] | null>(null);
  const [reviewTarget, setReviewTarget] = useState<WorkReviewDialogTarget | null>(null);
  const [tick, setTick] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [inboxSort, setInboxSort] = useState<InboxSortKey>(DEFAULT_COLLAB_INBOX_SORT);
  const [mockPriorityById, setMockPriorityById] = useState<Record<string, InboxPriority>>({});
  const [lightbox, setLightbox] = useState<{
    images: string[];
    index: number;
    title?: string;
    projectId?: string;
  } | null>(null);
  const [planOpen, setPlanOpen] = useState<{
    conversationId: string;
    requestId: string;
    ended: boolean;
  } | null>(null);

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
    () => Array.from(new Set(visibleRequests.map((r) => r.sender_id).filter((id) => isUuidLike(id)))),
    [visibleRequests],
  );
  const projectIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of visibleRequests) {
      if (r.project_id && isUuidLike(r.project_id)) ids.add(r.project_id);
      for (const id of r.attached_project_ids ?? []) {
        if (isUuidLike(id)) ids.add(id);
      }
    }
    return [...ids];
  }, [visibleRequests]);

  const { data: fetchedSenders = {} } = useQuery({
    queryKey: ["collab-senders", senderIds],
    enabled: senderIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles_public")
        .select("user_id, display_name, username, avatar_url, role")
        .in("user_id", senderIds);
      const map: Record<string, { name: string; avatar: string; role: string; username: string | null }> = {};
      (data ?? []).forEach((p) => {
        map[p.user_id] = {
          name: p.display_name || "ฟรีแลนซ์",
          avatar: p.avatar_url || "",
          role: p.role || "",
          username: (p as { username?: string | null }).username ?? null,
        };
      });
      return map;
    },
  });
  const sendersMap = useMemo(
    () => ({ ...collabInboxMockSenders(), ...fetchedSenders }),
    [fetchedSenders],
  );

  const { data: fetchedProjects = {} } = useQuery({
    queryKey: ["collab-inbox-projects", projectIds.join(",")],
    enabled: projectIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, title, cover_url")
        .in("id", projectIds);
      const map: Record<string, { title: string; cover: string }> = {};
      (data ?? []).forEach((p) => {
        map[p.id] = { title: p.title, cover: p.cover_url || "" };
      });
      return map;
    },
  });
  const projectMap = useMemo(
    () => ({ ...collabInboxMockProjects(), ...fetchedProjects }),
    [fetchedProjects],
  );

  const planLookupIds = useMemo(
    () => visibleRequests.map((r) => r.id),
    [visibleRequests],
  );
  const { data: planConversationByRequestId = {} } = useCollabInboxPlanConversations(planLookupIds);

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
    const rows =
      tab === COLLAB_TAB_ALL
        ? visibleRequests
        : visibleRequests.filter((r) => {
            if (tab === COLLAB_TAB_CONTACTED_NEW) return isCollabContactedNewStatus(r.status);
            if (tab === COLLAB_TAB_ACCEPTED) return isCollabAcceptedStatus(r.status);
            if (tab === COLLAB_TAB_DECLINED) return isCollabDeclinedStatus(r.status);
            if (tab === COLLAB_TAB_CANCELLED) return isCollabCancelledStatus(r.status);
            if (tab === COLLAB_TAB_COMPLETED) return isCollabCompletedStatus(r.status);
            return false;
          });
    return sortInboxRows(rows, inboxSort, (r) => {
      const statusLabel = labelCollabStatus(r.status as string);
      const statusRank = COLLAB_TAB_ORDER.indexOf(statusLabel as CollabInboxTab);
      return {
        deadlineRaw: r.timeline,
        priority: mockPriorityById[r.id] ?? (r as { inbox_priority?: string | null }).inbox_priority,
        statusRank: statusRank < 0 ? 99 : statusRank,
        createdAt: r.created_at,
      };
    });
  }, [tab, visibleRequests, inboxSort, mockPriorityById]);

  useEffect(() => {
    setExpandedId(null);
  }, [tab]);

  const pendingCount = counts[COLLAB_TAB_CONTACTED_NEW] ?? 0;
  const busy = openChatMut.isPending;

  const openChat = async (req: (typeof requests)[number]) => {
    if (!user) return;
    if (isCollabInboxMockId(req.id)) {
      toast.message("นี่เป็นตัวอย่างสำหรับดูเลย์เอาต์ — ยังไม่มีห้องแชทจริง");
      return;
    }
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
    <div className="space-y-3 scroll-mt-24 rounded-3xl glass-panel p-4 md:p-5" id="collab-section">
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

      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {COLLAB_TAB_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setTab(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              tab === s
                ? "bg-primary-bright text-white"
                : "bg-card text-secondary-foreground border border-border hover:bg-secondary"
            }`}
          >
            {s} {s !== COLLAB_TAB_ALL ? `(${counts[s] ?? 0})` : ""}
          </button>
        ))}
        </div>
        <InboxSortMenu
          value={inboxSort}
          onChange={setInboxSort}
          options={COLLAB_INBOX_SORT_OPTIONS}
        />
      </div>

      <InboxExpandTable
        columns={[...COLLAB_INBOX_COLUMNS]}
        expandedId={expandedId}
        onExpandedIdChange={setExpandedId}
        empty="ยังไม่มีคำขอร่วมงานในสถานะนี้"
        rows={filtered.map((req) => {
          const sender = sendersMap[req.sender_id];
          const label = labelCollabStatus(req.status as string);
          const isDeclined = isCollabDeclinedStatus(req.status);
          const isAccepted = isCollabAcceptedStatus(req.status);
          const isCancelled = isCollabCancelledStatus(req.status);
          const isContactedNew = isCollabContactedNewStatus(req.status);
          const isCompleted = isCollabCompletedStatus(req.status);
          const canHide = canHideCollabFromInbox(req.status);
          const cancelLabel = requestCancelReasonLabel(
            (req as { cancel_reason?: string | null }).cancel_reason,
          );
          const timelineLabel = formatCollabTimelineLabel(req.timeline);
          const typeLabel = (req.collab_types ?? [])
            .map((t) => {
              const name = COLLAB_TYPE_LABELS[t] ?? t;
              const note = (req as { other_type_note?: string | null }).other_type_note;
              return t === "other" && note ? `${name}: ${note}` : name;
            })
            .filter(Boolean)
            .join(" · ");
          const links = collectCollabReferenceLinks({
            external_drive_url: (req as { external_drive_url?: string | null }).external_drive_url,
            website_url: (req as { website_url?: string | null }).website_url,
          });
          const origin = req.project_id ? projectMap[req.project_id] : null;
          const extraThumbs = (req.attached_project_ids ?? [])
            .filter((id) => id !== req.project_id)
            .map((id) => {
              const proj = projectMap[id];
              if (!proj) return null;
              return { id, title: proj.title, cover: proj.cover, href: `/project/${id}` };
            })
            .filter((t): t is { id: string; title: string; cover: string; href: string } => !!t);
          const brief = collabInviteDisplay({
            message: req.message,
            collab_types: req.collab_types,
            other_type_note: (req as { other_type_note?: string | null }).other_type_note,
            external_drive_url: (req as { external_drive_url?: string | null }).external_drive_url,
            website_url: (req as { website_url?: string | null }).website_url,
            attachment_urls: (req as { attachment_urls?: string[] | null }).attachment_urls,
          });
          const planConversationId = planConversationByRequestId[req.id];
          const hasPlan = !!planConversationId;
          const priorityValue =
            mockPriorityById[req.id] ??
            ((req as { inbox_priority?: string | null }).inbox_priority);
          const setPriority = (priority: InboxPriority) => {
            if (isCollabInboxMockId(req.id)) {
              setMockPriorityById((prev) => ({ ...prev, [req.id]: priority }));
              return;
            }
            setInboxPriority.mutate({ kind: "collab", id: req.id, priority });
          };
          const senderProfileTo = sender?.username
            ? profilePublicPath({
                user_id: isUuidLike(req.sender_id)
                  ? req.sender_id
                  : "00000000-0000-4000-8000-000000000000",
                username: sender.username,
              })
            : isUuidLike(req.sender_id)
              ? profilePublicPath({ user_id: req.sender_id, username: null })
              : null;
          const name = sender?.name ?? "ฟรีแลนซ์";
          const statusBadge = (
            <Badge variant="outline" className={cn("text-[11px] font-normal", inboxStatusPillClass(label))}>
              {label}
            </Badge>
          );

          return {
            id: req.id,
            cells: {
              person: (
                <InboxPersonCell
                  name={name}
                  avatarUrl={sender?.avatar || null}
                  initialClassName="bg-[hsl(var(--chat-collab))]"
                  subtitle={
                    <div className="flex flex-wrap items-center gap-1.5">
                      {statusBadge}
                      <span className="text-[11px] text-muted-foreground">
                        {timelineLabel || "—"}
                      </span>
                      <InboxPrioritySelect
                        value={priorityValue}
                        disabled={setInboxPriority.isPending}
                        onChange={setPriority}
                      />
                    </div>
                  }
                />
              ),
              timeline: (
                <p className="text-sm text-muted-foreground">{timelineLabel || "—"}</p>
              ),
              status: statusBadge,
              docs: (
                <InboxDocCell
                  hasDocs={hasPlan}
                  openLabel="ดูแผนงาน"
                  onOpen={
                    planConversationId
                      ? () =>
                          setPlanOpen({
                            conversationId: planConversationId,
                            requestId: req.id,
                            ended: isCancelled,
                          })
                      : undefined
                  }
                />
              ),
              priority: (
                <InboxPrioritySelect
                  value={priorityValue}
                  disabled={setInboxPriority.isPending}
                  onChange={setPriority}
                />
              ),
            },
            actions: (
              <>
                {isContactedNew || isAccepted ? (
                  <Button
                    size="sm"
                    onClick={() => void openChat(req)}
                    disabled={busy}
                    className="h-8 rounded-full px-3 text-xs bg-[hsl(var(--chat-collab))] text-white hover:opacity-90"
                  >
                    <MessageCircle className="mr-1 h-3.5 w-3.5" />
                    แชท
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => senderProfileTo && navigate(senderProfileTo)}
                    className="h-8 rounded-full text-xs"
                  >
                    <UserCircle2 className="mr-1 h-3.5 w-3.5" />
                    <span className="hidden sm:inline">ดูโปรไฟล์</span>
                    <span className="sm:hidden">โปรไฟล์</span>
                  </Button>
                )}
              </>
            ),
            detail: (
              <InboxExpandDetail
                lead={
                  <InboxPersonCard
                    label="ผู้ส่ง"
                    name={name}
                    avatarUrl={sender?.avatar}
                    to={senderProfileTo}
                    initialClassName="bg-[hsl(var(--chat-collab))]"
                  />
                }
                reference={
                  origin ? (
                    <ProjectReferencePreview
                      title={origin.title}
                      coverUrl={origin.cover || null}
                      label="อ้างอิงผลงาน"
                      to={req.project_id && isUuidLike(req.project_id) ? `/project/${req.project_id}` : null}
                    />
                  ) : null
                }
                brief={
                  <>
                    <ExpandField label="อยากร่วมงานแบบไหน" icon={Handshake}>{typeLabel}</ExpandField>
                    <ExpandField label="ข้อความ" icon={MessageSquare}>
                      {brief.personalMessage ? (
                        <span className="whitespace-pre-wrap break-words">{brief.personalMessage}</span>
                      ) : null}
                    </ExpandField>
                    <ExpandField label="ลิงก์ (ไดรฟ์ / เว็บ / พอร์ต)" icon={Link2}>
                      <ExpandLinkList urls={links} />
                    </ExpandField>
                    <ExpandField label="แนบภาพ" icon={ImageIcon}>
                      <ExpandAttachments
                        urls={brief.attachments}
                        onPreview={(index, urls) => setLightbox({ images: urls, index })}
                      />
                    </ExpandField>
                    <ExpandField label="ผลงานที่แนบ" icon={LayoutGrid}>
                      {extraThumbs.length ? (
                        <div className="flex flex-wrap gap-2">
                          {extraThumbs.map((thumb) => {
                            const body = thumb.cover ? (
                              <img loading="lazy" decoding="async"
                                src={thumb.cover}
                                alt={thumb.title}
                                className="h-16 w-16 rounded-lg border border-border/70 object-cover"
                              />
                            ) : (
                              <span className="flex h-16 w-16 items-center justify-center rounded-lg border border-border/70 bg-muted p-1 text-center text-[9px] text-muted-foreground">
                                {thumb.title}
                              </span>
                            );
                            const className =
                              "shrink-0 rounded-lg ring-offset-background hover:ring-2 hover:ring-primary/40";
                            if (isUuidLike(thumb.id)) {
                              return (
                                <Link
                                  key={thumb.id}
                                  to={`/project/${thumb.id}`}
                                  title={`ดู ${thumb.title}`}
                                  className={className}
                                >
                                  {body}
                                </Link>
                              );
                            }
                            return (
                              <button
                                key={thumb.id}
                                type="button"
                                title={`ดู ${thumb.title}`}
                                onClick={() =>
                                  toast.message("นี่เป็นตัวอย่างสำหรับดูเลย์เอาต์ — ยังไม่มีหน้าผลงานจริง")
                                }
                                className={className}
                              >
                                {body}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </ExpandField>
                  </>
                }
                meta={
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <ExpandField label="ช่วงเวลา" icon={Calendar}>{timelineLabel}</ExpandField>
                      <ExpandField label="ความสำคัญ" icon={ListOrdered}>
                        <InboxPrioritySelect
                          value={priorityValue}
                          disabled={setInboxPriority.isPending}
                          onChange={setPriority}
                        />
                      </ExpandField>
                    </div>
                    <ExpandField label="สถานะ" icon={CircleDot}>{statusBadge}</ExpandField>
                    <ExpandField label="ส่งคำขอ" icon={Clock}>{timeAgoTH(req.created_at)}</ExpandField>
                  </>
                }
                notes={
                  isCancelled && cancelLabel ? (
                    <p className="text-xs text-muted-foreground">เหตุผลยกเลิก: {cancelLabel}</p>
                  ) : isDeclined ? (
                    <p className="text-xs text-muted-foreground">
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
                  ) : null
                }
                actions={
                  isAccepted || (isCompleted && !!user?.id) || canHide ? (
                  <>
                    {isAccepted ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          navigate(
                            `/portfolio/new?collab_request_id=${encodeURIComponent(req.id)}`,
                          )
                        }
                        disabled={busy}
                        className="h-8 rounded-full text-xs"
                      >
                        <FileText className="mr-1 h-3.5 w-3.5" /> ลงผลงานร่วมกัน
                      </Button>
                    ) : null}
                    {isCompleted && user?.id ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const subjectUserId =
                            user.id === req.recipient_id ? req.sender_id : req.recipient_id;
                          const subjectName =
                            user.id === req.recipient_id
                              ? (sendersMap[req.sender_id]?.name ?? "คู่คอลแลป")
                              : "คู่คอลแลป";
                          setReviewTarget({
                            kind: "collab",
                            subjectUserId,
                            subjectName,
                            collabRequestId: req.id,
                            projectId:
                              req.project_id ??
                              (req as { linked_project_id?: string | null }).linked_project_id ??
                              null,
                            contextLabel: "คอลแลป",
                          });
                        }}
                        className="h-8 rounded-full text-xs gap-1"
                      >
                        <Star className="h-3.5 w-3.5" /> เขียนรีวิว
                      </Button>
                    ) : null}
                    {canHide ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setHideTarget(req)}
                        className="h-8 rounded-full text-xs text-muted-foreground hover:text-destructive"
                        title="นำออกจากรายการ"
                        aria-label="ลบออกจากรายการ"
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        ลบ
                      </Button>
                    ) : null}
                  </>
                  ) : undefined
                }
              />
            ),
          };
        })}
      />

      <ImageLightbox
        open={!!lightbox?.images.length}
        images={lightbox?.images}
        index={lightbox?.index ?? 0}
        onIndexChange={(index) =>
          setLightbox((cur) => (cur ? { ...cur, index } : cur))
        }
        onClose={() => setLightbox(null)}
        projectId={lightbox?.projectId}
        projectTitle={lightbox?.title}
      />

      {planOpen ? (
        <Suspense fallback={null}>
          <CollabPlanSheet
            open
            onOpenChange={(open) => {
              if (!open) setPlanOpen(null);
            }}
            conversationId={planOpen.conversationId}
            collabEnded={planOpen.ended}
            publishPath={`/portfolio/new?collab_request_id=${encodeURIComponent(planOpen.requestId)}`}
          />
        </Suspense>
      ) : null}

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

      <WorkReviewDialog
        open={!!reviewTarget}
        onOpenChange={(open) => {
          if (!open) setReviewTarget(null);
        }}
        target={reviewTarget}
      />
    </div>
  );
};

export default CollabRequestsSection;
