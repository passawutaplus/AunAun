import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlignLeft,
  Banknote,
  Briefcase,
  Calendar,
  Check,
  CircleDot,
  Clock,
  Copy,
  FileText,
  Hash,
  Image as ImageIcon,
  Link2,
  ListOrdered,
  Mail,
  MessageCircle,
  Phone,
  Search,
  Share2,
  Star,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useAuth } from "@/hooks/useAuth";
import { useSetInboxPriority } from "@/hooks/useInboxPriority";
import {
  useCompleteHireRequest,
  useForwardHireRequest,
  useHiringRequests,
  useUpdateHirePhone,
  type HiringRow,
} from "@/hooks/useHiringRequests";
import {
  useFindConversationByRequest,
  useOpenHireCollabChat,
  useRejectRequest,
  useSendMessage,
} from "@/hooks/useChat";
import { timeAgoTH } from "@/lib/format";
import {
  formatHireBudgetLabel,
  formatHireDeadlineLabel,
  hireForwardClientNotice,
  hireInviteDisplay,
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
import HireRequestMasterDialog from "@/components/hiring/HireRequestMasterDialog";
import ProjectReferencePreview from "@/components/opportunity/ProjectReferencePreview";
import { InboxDocCell } from "@/components/inbox/InboxDocCell";
import {
  ExpandAttachments,
  ExpandDocChips,
  ExpandField,
  ExpandLinkList,
  InboxExpandDetail,
} from "@/components/inbox/InboxExpandDetail";
import { InboxPersonCard } from "@/components/inbox/InboxPersonCard";
import { InboxPhoneField } from "@/components/inbox/InboxPhoneField";
import { InboxExpandTable, InboxPersonCell } from "@/components/inbox/InboxExpandTable";
import { InboxPrioritySelect } from "@/components/inbox/InboxPrioritySelect";
import { InboxSortMenu } from "@/components/inbox/InboxSortMenu";
import { buildInboxDocChips } from "@/lib/inboxDocChips";
import type { InboxPriority } from "@/lib/inboxPriority";
import { DEFAULT_INBOX_SORT, sortInboxRows, type InboxSortKey } from "@/lib/inboxSort";
import { inboxStatusPillClass } from "@/lib/inboxStatusTone";
import {
  countHiresByOrigin,
  filterHiresByOrigin,
  hireRequestServiceId,
  type HireOriginFilter,
} from "@/lib/hireOrigin";
import { asCreatorServiceRows, fromCreatorServices } from "@/lib/creatorServicesDb";
import { profilePublicPath } from "@/lib/profileRoutes";
import { matchesHireInboxSearch } from "@/lib/hireInboxSearch";
import { displayOrderCode, orderCodeFromMetadata } from "@/lib/documents/numbering";
import {
  useHireDocumentsByOrderIds,
  useLatestHireOrdersByRequests,
  useLatestHireQuotesByRequests,
} from "@/hooks/useHireOrderFlow";
import { cn } from "@/lib/utils";
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

const HIRE_INBOX_COLUMNS = [
  { key: "person", label: "ลูกค้า", width: "minmax(10rem,16rem)", align: "start" as const },
  { key: "deadline", label: "กำหนดส่ง", width: "minmax(6.5rem,1fr)", mdOnly: true, align: "center" as const },
  { key: "budget", label: "งบ", width: "minmax(4.5rem,0.8fr)", mdOnly: true, align: "center" as const },
  { key: "status", label: "สถานะ", width: "minmax(5.75rem,1fr)", mdOnly: true, align: "center" as const },
  { key: "order", label: "เลขคำสั่งซื้อ", width: "minmax(7rem,1fr)", mdOnly: true, align: "center" as const },
  { key: "docs", label: "เอกสาร", width: "minmax(3.25rem,0.6fr)", mdOnly: true, align: "center" as const },
  { key: "priority", label: "ความสำคัญ", width: "minmax(7.75rem,1fr)", mdOnly: true, align: "center" as const },
] as const;

export function ProfileHiringRequestsSection({
  embed = false,
  renderCardExtras,
}: ProfileHiringRequestsSectionProps = {}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: requests = [] } = useHiringRequests(user?.id);
  const openHireChat = useOpenHireCollabChat();
  const reject = useRejectRequest();
  const forwardHire = useForwardHireRequest();
  const sendMessage = useSendMessage();
  const findConv = useFindConversationByRequest();
  const completeHire = useCompleteHireRequest();
  const updateHirePhone = useUpdateHirePhone();
  const setInboxPriority = useSetInboxPriority();
  const [hiringTab, setHiringTab] = useState<HireInboxTab>(HIRE_TAB_CONTACTED_NEW);
  const [originFilter, setOriginFilter] = useState<HireOriginFilter>("all");
  const [rejectTarget, setRejectTarget] = useState<HiringRow | null>(null);
  const [hideTarget, setHideTarget] = useState<HiringRow | null>(null);
  const [completeTarget, setCompleteTarget] = useState<HiringRow | null>(null);
  const [reviewTarget, setReviewTarget] = useState<WorkReviewDialogTarget | null>(null);
  const [detailTarget, setDetailTarget] = useState<HiringRow | null>(null);
  const [hiddenTick, setHiddenTick] = useState(0);
  const [inboxSearch, setInboxSearch] = useState("");
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [expandedHireId, setExpandedHireId] = useState<string | null>(null);
  const [inboxSort, setInboxSort] = useState<InboxSortKey>(DEFAULT_INBOX_SORT);

  const hiddenIds = useMemo(() => {
    if (!user?.id) return new Set<string>();
    void hiddenTick;
    return getHiddenHireRequestIds(user.id);
  }, [user?.id, hiddenTick]);

  const visibleRequests = useMemo(
    () => requests.filter((r) => !hiddenIds.has(r.id)),
    [requests, hiddenIds],
  );

  const quoteRequestIds = useMemo(() => visibleRequests.map((r) => r.id), [visibleRequests]);
  const { data: quoteByRequestId = {} } = useLatestHireQuotesByRequests(quoteRequestIds);
  const { data: orderByRequestId = {} } = useLatestHireOrdersByRequests(quoteRequestIds);
  const hireOrderIds = useMemo(() => {
    const ids: string[] = [];
    for (const req of visibleRequests) {
      const orderId = orderByRequestId[req.id]?.id;
      if (orderId) ids.push(orderId);
    }
    return ids;
  }, [visibleRequests, orderByRequestId]);
  const { data: docsByOrderId = {} } = useHireDocumentsByOrderIds(hireOrderIds);

  const originFiltered = useMemo((): HiringRow[] => {
    return filterHiresByOrigin(
      visibleRequests as Array<HiringRow & { service_id?: string | null }>,
      originFilter,
    );
  }, [visibleRequests, originFilter]);
  const originCounts = useMemo(() => countHiresByOrigin(visibleRequests), [visibleRequests]);
  const forwardedOut = useMemo(() => originFiltered.filter(isForwardedOut), [originFiltered]);

  const packageIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of visibleRequests) {
      const id = hireRequestServiceId(r as { service_id?: string | null });
      if (id) ids.add(id);
    }
    return [...ids];
  }, [visibleRequests]);

  const projectIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of visibleRequests) {
      if (r.project_id) ids.add(r.project_id);
    }
    return [...ids];
  }, [visibleRequests]);

  const clientIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of visibleRequests) {
      if (r.client_id) ids.add(r.client_id);
    }
    return [...ids];
  }, [visibleRequests]);

  const { data: clientProfileById = {} } = useQuery({
    queryKey: ["hire-inbox-client-profiles", clientIds.join(",")],
    enabled: clientIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles_public")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", clientIds);
      if (error) throw error;
      const map: Record<string, { name: string; username: string | null; avatarUrl: string | null }> =
        {};
      for (const p of data ?? []) {
        const id = (p as { user_id?: string }).user_id;
        if (!id) continue;
        map[id] = {
          name:
            (p as { display_name?: string | null }).display_name?.trim() ||
            (p as { username?: string | null }).username?.trim() ||
            "",
          username: (p as { username?: string | null }).username ?? null,
          avatarUrl: (p as { avatar_url?: string | null }).avatar_url ?? null,
        };
      }
      return map;
    },
  });

  const { data: projectRefById = {} } = useQuery({
    queryKey: ["hire-origin-project-covers", projectIds.join(",")],
    enabled: projectIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, title, cover_url, gallery_urls")
        .in("id", projectIds);
      if (error) throw error;
      const map: Record<string, { title: string; coverUrl: string | null }> = {};
      for (const row of data ?? []) {
        const cover =
          (row.cover_url as string | null)?.trim() ||
          ((row.gallery_urls as string[] | null)?.[0] ?? "").trim() ||
          null;
        map[row.id as string] = {
          title: (row.title as string) || "ผลงาน",
          coverUrl: cover,
        };
      }
      return map;
    },
  });

  const { data: packageRefById = {} } = useQuery({
    queryKey: ["hire-origin-package-covers", packageIds.join(",")],
    enabled: packageIds.length > 0,
    queryFn: async () => {
      const { data, error } = await fromCreatorServices()
        .select("id, title, cover_url, gallery_urls")
        .in("id", packageIds);
      if (error) throw error;
      const map: Record<string, { title: string; coverUrl: string | null }> = {};
      for (const row of asCreatorServiceRows(data)) {
        const cover = row.cover_url?.trim() || row.gallery_urls?.[0]?.trim() || null;
        map[row.id] = { title: row.title, coverUrl: cover };
      }
      return map;
    },
  });
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
    const contactedNew = originFiltered.filter(
      (r) => isContactedNewStatus(r.status) && !isForwardedOut(r),
    ).length;
    const accepted = originFiltered.filter((r) => r.status === HIRE_TAB_ACCEPTED).length;
    const declined = originFiltered.filter(
      (r) => r.status === HIRE_TAB_DECLINED && !isForwardedOut(r),
    ).length;
    const cancelled = originFiltered.filter((r) => isHireCancelledStatus(r.status)).length;
    const completed = originFiltered.filter((r) => isHireCompletedStatus(r.status)).length;
    return {
      [HIRE_TAB_CONTACTED_NEW]: contactedNew,
      [HIRE_TAB_ACCEPTED]: accepted,
      [HIRE_TAB_DECLINED]: declined,
      [HIRE_TAB_FORWARDED]: forwardedOut.length,
      [HIRE_TAB_CANCELLED]: cancelled,
      [HIRE_TAB_COMPLETED]: completed,
    } as Record<Exclude<HireInboxTab, typeof HIRE_TAB_ALL>, number>;
  }, [originFiltered, forwardedOut.length]);

  const filteredHiring = useMemo(() => {
    let rows = originFiltered;
    if (hiringTab === HIRE_TAB_FORWARDED) rows = forwardedOut;
    else if (hiringTab === HIRE_TAB_DECLINED) {
      rows = originFiltered.filter((r) => r.status === HIRE_TAB_DECLINED && !isForwardedOut(r));
    } else if (hiringTab === HIRE_TAB_CONTACTED_NEW) {
      rows = originFiltered.filter((r) => isContactedNewStatus(r.status) && !isForwardedOut(r));
    } else if (hiringTab === HIRE_TAB_CANCELLED) {
      rows = originFiltered.filter((r) => isHireCancelledStatus(r.status));
    } else if (hiringTab === HIRE_TAB_COMPLETED) {
      rows = originFiltered.filter((r) => isHireCompletedStatus(r.status));
    } else if (hiringTab !== HIRE_TAB_ALL) {
      rows = originFiltered.filter((r) => r.status === hiringTab);
    }
    return sortInboxRows(rows.filter((r) => {
      const order = orderByRequestId[r.id];
      return matchesHireInboxSearch({
        query: inboxSearch,
        clientName: r.client_name,
        email: r.email,
        orderCode: displayOrderCode(order?.id || r.id, orderCodeFromMetadata(order?.metadata)),
        orderId: order?.id ?? null,
        requestId: r.id,
      });
    }), inboxSort, (r) => {
      const forwarded = isForwardedOut(r);
      const statusLabel = forwarded ? HIRE_TAB_FORWARDED : labelHireStatus(r.status);
      const statusRank = HIRE_TAB_ORDER.indexOf(statusLabel as HireInboxTab);
      return {
        deadlineRaw: r.deadline,
        priority: (r as { inbox_priority?: string | null }).inbox_priority,
        statusRank: statusRank < 0 ? 99 : statusRank,
        createdAt: r.created_at,
      };
    });
  }, [hiringTab, originFiltered, forwardedOut, inboxSearch, orderByRequestId, inboxSort]);

  useEffect(() => {
    setExpandedHireId(null);
  }, [hiringTab, originFilter, inboxSearch]);

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

  const copyOrderCode = async (requestId: string, code: string) => {
    if (!code || code === "—") return;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedOrderId(requestId);
      toast.success("คัดลอกเลขคำสั่งซื้อแล้ว");
      window.setTimeout(() => {
        setCopiedOrderId((cur) => (cur === requestId ? null : cur));
      }, 1500);
    } catch {
      toast.error("คัดลอกไม่สำเร็จ");
    }
  };

  const pendingCount = counts[HIRE_TAB_CONTACTED_NEW] ?? 0;
  const rejectBusy =
    reject.isPending ||
    forwardHire.isPending ||
    openHireChat.isPending ||
    sendMessage.isPending ||
    completeHire.isPending;

  const openHireReview = (req: HiringRow) => {
    if (!user?.id || !req.client_id) return;
    const subjectIsClient = user.id === req.freelancer_id;
    const subjectUserId = subjectIsClient ? req.client_id : req.freelancer_id;
    if (!subjectUserId) return;
    const linkedId =
      (req as { linked_project_id?: string | null }).linked_project_id ?? null;
    setReviewTarget({
      kind: "hire",
      subjectUserId,
      subjectName: subjectIsClient
        ? (req.client_name ?? "ลูกค้า")
        : "ครีเอเตอร์",
      hireRequestId: req.id,
      projectId: req.project_id ?? linkedId ?? null,
      serviceId: (req as { service_id?: string | null }).service_id ?? null,
      contextLabel: req.project_title ?? null,
    });
  };

  const confirmCompleteHire = async () => {
    if (!completeTarget) return;
    const done = completeTarget;
    try {
      await completeHire.mutateAsync(done.id);
      toast.success("บันทึกจบงานแล้ว");
      setCompleteTarget(null);
      setHiringTab(HIRE_TAB_COMPLETED);
      openHireReview(done);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "บันทึกจบงานไม่สำเร็จ");
    }
  };

  const openChatFor = async (req: HiringRow, systemNote?: string) => {
    let id = await findConv("hire", req.id);
    if (!id && req.client_id && req.freelancer_id) {
      id = await openHireChat.mutateAsync({
        kind: "hire",
        requestId: req.id,
        clientId: req.client_id,
        freelancerId: req.freelancer_id,
        projectId: req.project_id ?? null,
        projectTitle: req.project_title ?? undefined,
        serviceId: hireRequestServiceId(req as { service_id?: string | null }),
        contextMessage: "เริ่มสนทนางานจ้าง — คุยรายละเอียดได้เลย",
        skipStatusUpdate: !isContactedNewStatus(req.status),
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

  const refInfoFor = (req: HiringRow) => {
    const serviceId = hireRequestServiceId(req as { service_id?: string | null });
    const packageRef = serviceId ? packageRefById[serviceId] : null;
    const projectRef = req.project_id ? projectRefById[req.project_id] : null;
    const title = packageRef?.title || projectRef?.title || req.project_title?.trim() || "";
    return {
      title,
      coverUrl: packageRef?.coverUrl || projectRef?.coverUrl || null,
      label: serviceId ? "อ้างอิง Packages" : "อ้างอิงผลงาน",
      to: serviceId ? `/service/${serviceId}` : req.project_id ? `/project/${req.project_id}` : null,
    };
  };

  return (
    <div className="space-y-3 scroll-mt-24 overflow-visible rounded-3xl glass-panel p-4 md:p-5" id="hiring-section">
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

      <div className="flex flex-wrap gap-1 rounded-2xl border border-border/60 p-0.5 text-xs w-fit max-w-full">
        {(
          [
            { id: "all", label: `ทั้งหมด (${originCounts.all})` },
            { id: "project", label: `จากผลงาน (${originCounts.project})` },
            { id: "package", label: `จาก Packages (${originCounts.package})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setOriginFilter(tab.id)}
            className={cn(
              "rounded-full px-2.5 py-1.5 font-medium whitespace-nowrap transition-colors",
              originFilter === tab.id
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <label htmlFor="hire-inbox-search" className="sr-only">
          ค้นหาชื่อ หรือเลขคำสั่งซื้อ
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="hire-inbox-search"
          value={inboxSearch}
          onChange={(e) => setInboxSearch(e.target.value)}
          placeholder="ค้นหาชื่อ หรือเลขคำสั่งซื้อ"
          aria-label="ค้นหาชื่อ หรือเลขคำสั่งซื้อ"
          className="h-9 rounded-full bg-muted/60 pl-8 text-sm"
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {HIRE_TAB_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setHiringTab(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              hiringTab === s
                ? "bg-primary-bright text-white"
                : "bg-card text-secondary-foreground border border-border hover:bg-secondary"
            }`}
          >
            {s}{" "}
            {s !== HIRE_TAB_ALL ? `(${counts[s] ?? 0})` : ""}
          </button>
        ))}
        </div>
        <InboxSortMenu value={inboxSort} onChange={setInboxSort} />
      </div>

      <InboxExpandTable
        columns={[...HIRE_INBOX_COLUMNS]}
        expandedId={expandedHireId}
        onExpandedIdChange={setExpandedHireId}
        empty={
          inboxSearch.trim()
            ? "ไม่พบชื่อหรือเลขคำสั่งซื้อที่ค้นหา"
            : originFilter === "package"
              ? "ยังไม่มีคำขอจ้างจาก Packages ในสถานะนี้"
              : originFilter === "project"
                ? "ยังไม่มีคำขอจ้างจากผลงานในสถานะนี้"
                : hiringTab === HIRE_TAB_FORWARDED
                  ? "ยังไม่มีงานที่ส่งต่อให้เพื่อน"
                  : "ยังไม่มีคำขอจ้างงานในสถานะนี้"
        }
        rows={filteredHiring.map((req) => {
          const forwarded = isForwardedOut(req);
          const isDeclined = req.status === HIRE_TAB_DECLINED;
          const isCancelled = isHireCancelledStatus(req.status);
          const canHide = canHideHireFromInbox(req.status);
          const completed = !forwarded && isHireCompletedStatus(req.status);
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
          const ref = refInfoFor(req);
          const client = req.client_id ? clientProfileById[req.client_id] : undefined;
          const clientName = req.client_name || client?.name || "ลูกค้า";
          const clientTo = req.client_id
            ? profilePublicPath({ user_id: req.client_id, username: client?.username })
            : null;
          const brief = hireInviteDisplay({
            message: req.message,
            job_type: (req as { job_type?: string | null }).job_type,
            attachment_urls: (req as { attachment_urls?: string[] | null }).attachment_urls,
          });
          const order = orderByRequestId[req.id];
          const quote = quoteByRequestId[req.id];
          const orderCode = displayOrderCode(
            order?.id || req.id,
            orderCodeFromMetadata(order?.metadata),
          );
          const docChips = buildInboxDocChips({
            quote,
            docs: order?.id ? docsByOrderId[order.id] : undefined,
          });
          const statusLabel = forwarded ? "ส่งต่อ" : labelHireStatus(req.status);
          const hasDocs = docChips.length > 0 || brief.attachments.length > 0;
          const priorityValue = (req as { inbox_priority?: string | null }).inbox_priority;
          const setPriority = (priority: InboxPriority) => {
            setInboxPriority.mutate({ kind: "hire", id: req.id, priority });
          };

          const openChat = () => {
            void openChatFor(req).catch((e: unknown) => {
              toast.error(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ");
            });
          };

          const statusBadge = (
            <Badge variant="outline" className={cn("text-[11px] font-normal", inboxStatusPillClass(statusLabel))}>
              {forwarded ? (
                <span className="inline-flex items-center gap-1">
                  <Share2 className="h-3 w-3" />
                  ส่งต่อ
                </span>
              ) : (
                statusLabel
              )}
            </Badge>
          );

          return {
            id: req.id,
            cells: {
              person: (
                <InboxPersonCell
                  name={clientName}
                  initialClassName="bg-[hsl(var(--chat-hire))]"
                  subtitle={
                    <div className="flex flex-wrap items-center gap-1.5">
                      {statusBadge}
                      <span className="text-[11px] text-muted-foreground">
                        {deadlineLabel || "—"}
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
              deadline: (
                <p className="text-sm tabular-nums text-muted-foreground">{deadlineLabel || "—"}</p>
              ),
              budget: (
                <p className="text-sm tabular-nums text-foreground">{budgetLabel || "—"}</p>
              ),
              status: statusBadge,
              order: (
                <button
                  type="button"
                  onClick={() => void copyOrderCode(req.id, orderCode)}
                  disabled={!orderCode || orderCode === "—"}
                  title="คัดลอกเลขคำสั่งซื้อ"
                  aria-label={`คัดลอกเลขคำสั่งซื้อ ${orderCode}`}
                  className="inline-flex max-w-full items-center justify-center gap-1 text-xs tabular-nums text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  <span className="truncate">{orderCode}</span>
                  {copiedOrderId === req.id ? (
                    <Check className="h-3 w-3 shrink-0 text-emerald-500" />
                  ) : (
                    <Copy className="h-3 w-3 shrink-0 opacity-70" />
                  )}
                </button>
              ),
              docs: (
                <InboxDocCell hasDocs={hasDocs} onOpen={() => setDetailTarget(req)} />
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
                {!isHireTerminalStatus(req.status) && !forwarded ? (
                  <Button
                    size="sm"
                    onClick={openChat}
                    disabled={rejectBusy}
                    className="h-8 rounded-full px-3 text-xs bg-[hsl(var(--chat-hire))] text-white hover:opacity-90"
                  >
                    <MessageCircle className="mr-1 h-3.5 w-3.5" />
                    แชท
                  </Button>
                ) : forwarded ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={openChat}
                    className="h-8 rounded-full px-3 text-xs"
                  >
                    <MessageCircle className="mr-1 h-3.5 w-3.5" /> แชท
                  </Button>
                ) : null}
              </>
            ),
            detail: (
              <InboxExpandDetail
                lead={
                  <InboxPersonCard
                    label="ลูกค้า"
                    name={clientName}
                    avatarUrl={client?.avatarUrl}
                    to={clientTo}
                    initialClassName="bg-[hsl(var(--chat-hire))]"
                  />
                }
                reference={
                  ref.title ? (
                    <ProjectReferencePreview
                      title={ref.title}
                      coverUrl={ref.coverUrl}
                      label={ref.label}
                      to={ref.to}
                    />
                  ) : null
                }
                brief={
                  <>
                    <ExpandField label="ประเภทงาน" icon={Briefcase}>{brief.jobTypesLabel}</ExpandField>
                    <ExpandField label="รายละเอียดงาน" icon={AlignLeft}>
                      {brief.details ? (
                        <span className="whitespace-pre-wrap break-words">{brief.details}</span>
                      ) : null}
                    </ExpandField>
                    <ExpandField label="ลิงก์อ้างอิง (ไฟล์ / brief)" icon={Link2}>
                      <ExpandLinkList urls={brief.links} />
                    </ExpandField>
                    <ExpandField label="แนบภาพอ้างอิง" icon={ImageIcon}>
                      <ExpandAttachments urls={brief.attachments} />
                    </ExpandField>
                  </>
                }
                meta={
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <ExpandField label="งบประมาณ (บาท)" icon={Banknote}>{budgetLabel}</ExpandField>
                      <ExpandField label="กำหนดส่งงาน" icon={Calendar}>{deadlineLabel}</ExpandField>
                      <ExpandField label="เลขคำสั่งซื้อ" icon={Hash}>
                        {orderCode && orderCode !== "—" ? (
                          <button
                            type="button"
                            onClick={() => void copyOrderCode(req.id, orderCode)}
                            className="inline-flex items-center gap-1 tabular-nums hover:text-foreground"
                          >
                            {orderCode}
                            <Copy className="h-3 w-3 opacity-70" />
                          </button>
                        ) : null}
                      </ExpandField>
                      <ExpandField label="ความสำคัญ" icon={ListOrdered}>
                        <InboxPrioritySelect
                          value={priorityValue}
                          disabled={setInboxPriority.isPending}
                          onChange={setPriority}
                        />
                      </ExpandField>
                    </div>
                    <ExpandField label="สถานะ" icon={CircleDot}>{statusBadge}</ExpandField>
                    <ExpandField label="เอกสาร" icon={FileText}>
                      <ExpandDocChips chips={docChips} onOpen={() => setDetailTarget(req)} />
                    </ExpandField>
                    <ExpandField label="อีเมล" icon={Mail}>
                      {req.email ? (
                        <a
                          href={`mailto:${req.email}`}
                          className="break-all hover:text-[hsl(var(--chat-hire))]"
                        >
                          {req.email}
                        </a>
                      ) : null}
                    </ExpandField>
                    <ExpandField label="โทร" icon={Phone}>
                      <InboxPhoneField
                        phone={req.phone}
                        disabled={updateHirePhone.isPending}
                        onSave={(phone) => updateHirePhone.mutateAsync({ id: req.id, phone })}
                      />
                    </ExpandField>
                    <ExpandField label="ส่งคำขอ" icon={Clock}>{timeAgoTH(req.created_at)}</ExpandField>
                  </>
                }
                notes={
                  forwarded ? (
                    <div className="rounded-lg border border-border/60 bg-background px-3 py-2 space-y-1">
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
                    <p className="text-xs text-muted-foreground">เหตุผล: {rejectLabel}</p>
                  ) : isCancelled && cancelLabel ? (
                    <p className="text-xs text-muted-foreground">เหตุผลยกเลิก: {cancelLabel}</p>
                  ) : null
                }
                extras={renderCardExtras?.(req)}
                actions={
                  <>
                    {completed ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openHireReview(req)}
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
                }
              />
            ),
          };
        })}
      />

      <HireRequestMasterDialog
        request={
          detailTarget ? requests.find((r) => r.id === detailTarget.id) ?? detailTarget : null
        }
        open={!!detailTarget}
        onOpenChange={(open) => {
          if (!open) setDetailTarget(null);
        }}
        refInfo={detailTarget ? refInfoFor(detailTarget) : null}
        extras={detailTarget ? renderCardExtras?.(detailTarget) : null}
        busy={rejectBusy}
        onOpenChat={() => {
          if (!detailTarget) return;
          void openChatFor(detailTarget).catch((e: unknown) => {
            toast.error(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ");
          });
        }}
        onDecline={() => {
          if (!detailTarget) return;
          setRejectTarget(detailTarget);
        }}
        onComplete={() => {
          if (!detailTarget) return;
          setCompleteTarget(detailTarget);
        }}
        onReview={() => {
          if (!detailTarget) return;
          openHireReview(detailTarget);
        }}
      />

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
              จะย้ายไปแท็บจบงาน แล้วให้รีวิวได้
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

      <WorkReviewDialog
        open={!!reviewTarget}
        onOpenChange={(open) => {
          if (!open) setReviewTarget(null);
        }}
        target={reviewTarget}
      />

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
