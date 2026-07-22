import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Eye,
  Handshake,
  History,
  ImagePlus,
  Lightbulb,
  Link2,
  ListChecks,
  Loader2,
  Lock,
  MessageSquareText,
  Paperclip,
  Plus,
  Save,
  Scale,
  Send,
  Unlock,
  X,
  CalendarDays,
  Bookmark,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSendMessage } from "@/hooks/useChat";
import { useCollabPlan } from "@/hooks/useCollabPlan";
import { useSignedStorageUrl } from "@/hooks/useSignedStorageUrl";
import { supabase } from "@/integrations/supabase/client";
import { profilesPublicFrom } from "@/lib/profileAccess";
import {
  COLLAB_PIPELINE,
  buildAlignDiscussionTemplate,
  buildChangeDoneMessage,
  buildChangeRequestMessage,
  buildStepLockedMessage,
  canAdvanceStep,
  collabPlanDemoShortcutsEnabled,
  getAlignOverview,
  nextStepId,
  prevStepId,
  validateAlignRequired,
  type AlignRequiredField,
  type CollabAlignPayload,
  type CollabAttachment,
  type CollabPipelineStageId,
  type CollabPlanPayload,
  type CollabPortfolioRef,
  type CollabStepNotePayload,
  normalizeStepProgressEntries,
  summarizeProgressEntries,
  isProgressEntryConfirmed,
  countProgressComments,
  type CollabProgressEntry,
} from "@/lib/collabPlanDoc";
import { CollabProgressFeed } from "@/components/chat/CollabProgressFeed";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { sharedStorage, SHARED_MEDIA_BUCKET } from "@/integrations/supabase/sharedStorageClient";
import { storageMediaPublicUrl } from "@/lib/storageMediaUrl";
import { getSupabaseErrorMessage } from "@/lib/supabaseErrors";
import { safeHttpUrl } from "@/lib/safeUrl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { printCollabPlanPdf, createCollabPlanPreviewBlobUrl, createCollabPlanBlobUrl } from "@/lib/collabPlanPdf";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  publishPath?: string | null;
  /** Collab request ended/cancelled — plan read-only */
  collabEnded?: boolean;
};

type LogActionMeta = {
  label: string;
  tag: string;
  badgeClass: string;
};

const LOG_ACTION_META: Record<string, LogActionMeta> = {
  save: {
    label: "บันทึกแผน",
    tag: "บันทึก",
    badgeClass:
      "border-sky-500/35 bg-sky-500/12 text-sky-700 dark:text-sky-300",
  },
  ack: {
    label: "ติ๊กยืนยันขั้น",
    tag: "ยืนยัน",
    badgeClass:
      "border-[hsl(var(--chat-collab)/0.45)] bg-[hsl(var(--chat-collab-soft))] text-[hsl(var(--chat-collab))]",
  },
  unack: {
    label: "ยกเลิกติ๊กยืนยัน",
    tag: "ยกเลิกยืนยัน",
    badgeClass: "border-rose-500/35 bg-rose-500/12 text-rose-700 dark:text-rose-300",
  },
  advance: {
    label: "ไปขั้นถัดไป",
    tag: "ขั้นต่อไป",
    badgeClass:
      "border-violet-500/35 bg-violet-500/12 text-violet-700 dark:text-violet-300",
  },
  change_request: {
    label: "ขออนุญาตแก้ไข",
    tag: "ขอแก้ไข",
    badgeClass:
      "border-amber-500/40 bg-amber-500/12 text-amber-800 dark:text-amber-300",
  },
  change_approve: {
    label: "อนุมัติคำขอแก้ไข",
    tag: "อนุมัติ",
    badgeClass:
      "border-teal-500/35 bg-teal-500/12 text-teal-700 dark:text-teal-300",
  },
  change_approved: {
    label: "อนุมัติครบ — ปลดล็อก",
    tag: "ปลดล็อก",
    badgeClass:
      "border-emerald-500/35 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  },
  collab_ended: {
    label: "ยุติคอลแลป",
    tag: "ยกเลิก",
    badgeClass: "border-rose-500/35 bg-rose-500/12 text-rose-700 dark:text-rose-300",
  },
};

function logActionMeta(action: string): LogActionMeta {
  return (
    LOG_ACTION_META[action] ?? {
      label: action,
      tag: action,
      badgeClass: "border-border bg-muted/60 text-muted-foreground",
    }
  );
}

function formatLogActorName(
  actorId: string | null | undefined,
  memberNameMap: Map<string, string>,
  currentUserId?: string | null,
): string {
  if (!actorId) return "ระบบ";
  if (actorId === currentUserId) return "คุณ";
  return memberNameMap.get(actorId) || "สมาชิกในแชท";
}

/** Quick-fill examples for collab rights / credit (not hire IP transfer). */
const RIGHTS_EXAMPLES: { key: string; label: string; body: string }[] = [
  {
    key: "both-credit",
    label: "เครดิตทั้งคู่",
    body: [
      "• เครดิต: แสดงชื่อทั้งสองฝ่ายบนพอร์ต / แคปชัน / โพสต์",
      "• การใช้: ใช้โปรโมตผลงานคอลแลปร่วมกันได้",
      "• ห้าม: ขายต่อหรือโอนสิทธิ์ให้บุคคลที่สามโดยไม่ตกลงกันก่อน",
    ].join("\n"),
  },
  {
    key: "personal-use",
    label: "ใช้ส่วนตัวได้",
    body: [
      "• เครดิต: ระบุชื่อเจ้าของชิ้นงานเมื่อแชร์",
      "• การใช้: เก็บในพอร์ต / แชร์ส่วนตัวได้",
      "• ห้าม: ใช้เชิงพาณิชย์ โฆษณา หรือขายโดยไม่ขออนุญาต",
    ].join("\n"),
  },
  {
    key: "commercial",
    label: "ใช้เชิงพาณิชย์ได้",
    body: [
      "• เครดิต: ต้องใส่เครดิตทั้งคู่เมื่อเผยแพร่",
      "• การใช้: ใช้ในงานลูกค้า / โฆษณา / โซเชียลเชิงพาณิชย์ได้ตามที่ตกลง",
      "• ขอบเขต: จำกัดแพลตฟอร์มหรือระยะเวลา (ระบุเพิ่มถ้ามี)",
    ].join("\n"),
  },
  {
    key: "portfolio",
    label: "โชว์พอร์ตร่วม",
    body: [
      "• เครดิต: ลงพอร์ตร่วมกันได้ทั้งสองฝ่าย",
      "• การใช้: ใช้เป็นตัวอย่างผลงานเท่านั้น",
      "• ห้าม: ดาวน์โหลดไฟล์ต้นฉบับไปใช้ซ้ำนอกพอร์ตโดยไม่ขอ",
    ].join("\n"),
  },
  {
    key: "custom",
    label: "ตกลงเอง",
    body: [
      "• เครดิต:",
      "• ใครถือสิทธิ์ต้นฉบับ:",
      "• ใช้ซ้ำ / ดัดแปลง:",
      "• เชิงพาณิชย์:",
      "• อื่น ๆ:",
    ].join("\n"),
  },
];

/** Large centered collab plan document (quote-style). */
export function CollabPlanSheet({
  open,
  onOpenChange,
  conversationId,
  publishPath = null,
  collabEnded = false,
}: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const send = useSendMessage();
  const plan = useCollabPlan(conversationId, open);
  const {
    doc,
    payload,
    isLoading,
    saving,
    saveError,
    dirty,
    editable,
    myAcked,
    myChangeApproved,
    ackProgress,
    pendingChange,
    logs,
    versions,
    memberIds,
    updatePayload,
    save,
    saveQuiet,
    toggleAck,
    advanceStep,
    advanceStepDemo,
    retreatStepDemo,
    requestChange,
    approveChange,
    approveChangeDemo,
  } = plan;

  const [busy, setBusy] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [changeReason, setChangeReason] = useState("");
  const [changeOpen, setChangeOpen] = useState(false);
  const [changeTarget, setChangeTarget] = useState<CollabPipelineStageId | undefined>();
  const [uploading, setUploading] = useState(false);
  const [linkDraft, setLinkDraft] = useState("");
  const [reviewLinkDraft, setReviewLinkDraft] = useState("");
  const [portfolioMemberId, setPortfolioMemberId] = useState<string | null>(null);
  const [docPreviewOpen, setDocPreviewOpen] = useState(false);
  const [docPreviewUrl, setDocPreviewUrl] = useState<string | null>(null);
  const [viewVersion, setViewVersion] = useState<number | null>(null);
  const [agreeSummaryCollapsed, setAgreeSummaryCollapsed] = useState(true);
  const [reviewAgreedCollapsed, setReviewAgreedCollapsed] = useState(true);
  const [reviewProgressCollapsed, setReviewProgressCollapsed] = useState(true);
  const [alignValidationErrors, setAlignValidationErrors] = useState<Set<AlignRequiredField>>(
    new Set(),
  );
  const ideaFieldRef = useRef<HTMLTextAreaElement>(null);
  const dueAtFieldRef = useRef<HTMLInputElement>(null);
  const deliverablesFieldRef = useRef<HTMLDivElement>(null);
  const rightsFieldRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: memberProjects = [] } = useQuery({
    queryKey: ["collab-plan-member-projects", conversationId, memberIds.join(",")],
    enabled: open && memberIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, title, cover_url, owner_id")
        .in("owner_id", memberIds)
        .eq("status", "Published")
        .order("created_at", { ascending: false })
        .limit(48);
      if (error) throw error;
      return (data ?? []) as {
        id: string;
        title: string;
        cover_url: string | null;
        owner_id: string;
      }[];
    },
  });

  const projectsByOwner = useMemo(() => {
    const map = new Map<string, typeof memberProjects>();
    for (const p of memberProjects) {
      const list = map.get(p.owner_id) ?? [];
      list.push(p);
      map.set(p.owner_id, list);
    }
    return map;
  }, [memberProjects]);

  const { data: memberProfiles = [] } = useQuery({
    queryKey: ["collab-plan-member-names", conversationId, memberIds.join(",")],
    enabled: open && memberIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await profilesPublicFrom()
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", memberIds);
      if (error) throw error;
      return (data ?? []) as {
        user_id: string;
        display_name: string | null;
        username: string | null;
        avatar_url: string | null;
      }[];
    },
  });

  const memberUsernameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of memberProfiles) {
      map.set(
        p.user_id,
        p.username?.trim() || p.display_name?.trim() || "ผู้ใช้",
      );
    }
    return map;
  }, [memberProfiles]);

  const memberProfileMap = useMemo(() => {
    const map = new Map<
      string,
      { username: string; displayName: string; avatarUrl: string | null }
    >();
    for (const p of memberProfiles) {
      const username = p.username?.trim() || "";
      const displayName = p.display_name?.trim() || username || "ผู้ใช้";
      map.set(p.user_id, {
        username: username || displayName,
        displayName,
        avatarUrl: p.avatar_url,
      });
    }
    return map;
  }, [memberProfiles]);

  const memberNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of memberProfiles) {
      map.set(
        p.user_id,
        p.display_name?.trim() || p.username?.trim() || "ผู้ใช้",
      );
    }
    return map;
  }, [memberProfiles]);

  const ackedMembers = useMemo(() => {
    const map = doc.acks[doc.currentStep] ?? {};
    return memberIds
      .filter((id) => !!map[id])
      .map((id) => ({
        id,
        label: id === user?.id ? "คุณ" : memberNameMap.get(id) || `${id.slice(0, 6)}…`,
      }));
  }, [doc.acks, doc.currentStep, memberIds, memberNameMap, user?.id]);

  const pendingAckMembers = useMemo(() => {
    const map = doc.acks[doc.currentStep] ?? {};
    return memberIds
      .filter((id) => !map[id])
      .map((id) => ({
        id,
        label: id === user?.id ? "คุณ" : memberNameMap.get(id) || `${id.slice(0, 6)}…`,
      }));
  }, [doc.acks, doc.currentStep, memberIds, memberNameMap, user?.id]);

  const stepIndex = Math.max(
    0,
    COLLAB_PIPELINE.findIndex((s) => s.id === doc.currentStep),
  );
  const stage = COLLAB_PIPELINE[stepIndex] ?? COLLAB_PIPELINE[0]!;
  const isFinalSummary = stage.id === "publish";
  const locked =
    collabEnded || doc.status === "step_locked" || doc.status === "change_pending";
  const planReadOnly = collabEnded;
  const demoShortcuts = collabPlanDemoShortcutsEnabled();
  const canGoNext = canAdvanceStep(doc, memberIds) && !isFinalSummary;
  const hasNextStep = !!nextStepId(doc.currentStep);
  const awaitingAllAcks =
    hasNextStep && !canGoNext && !isFinalSummary && doc.status !== "change_pending";

  const historySnapshot = useMemo(() => {
    if (viewVersion == null) return null;
    return versions.find((v) => v.version === viewVersion) ?? null;
  }, [viewVersion, versions]);

  const isViewingHistory =
    viewVersion != null && viewVersion !== doc.version && !!historySnapshot;

  const formPayload = isViewingHistory ? historySnapshot!.payload : payload;
  const formStepId = isViewingHistory ? historySnapshot!.currentStep : doc.currentStep;
  const formStepIndex = Math.max(
    0,
    COLLAB_PIPELINE.findIndex((s) => s.id === formStepId),
  );
  const formStage = COLLAB_PIPELINE[formStepIndex] ?? COLLAB_PIPELINE[0]!;
  const formEditable = editable && !isViewingHistory && !planReadOnly;
  const formStatus = isViewingHistory ? historySnapshot!.status : doc.status;
  const formIsFinalSummary = formStage.id === "publish";

  const stepTimelineTrack = useMemo(() => {
    const stepCount = COLLAB_PIPELINE.length;
    const left = 100 / stepCount / 2;
    const width = 100 - left * 2;
    const progress =
      stepCount <= 1
        ? 0
        : (Math.min(Math.max(0, formStepIndex), stepCount - 1) / (stepCount - 1)) * width;
    return { left, width, progress };
  }, [formStepIndex]);

  const versionOptions = useMemo(() => {
    const nums = new Set<number>([doc.version, ...versions.map((v) => v.version)]);
    return Array.from(nums).sort((a, b) => b - a);
  }, [versions, doc.version]);

  useEffect(() => {
    if (viewVersion != null && viewVersion === doc.version) {
      setViewVersion(null);
    }
  }, [doc.version, viewVersion]);

  useEffect(() => {
    if (!open) {
      setChangeOpen(false);
      setLogOpen(false);
      setChangeReason("");
      setPortfolioMemberId(null);
      setReviewLinkDraft("");
      setDocPreviewOpen(false);
      setViewVersion(null);
    }
  }, [open]);

  const revokeDocPreviewUrl = (url = docPreviewUrl) => {
    if (url?.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  };

  useEffect(() => {
    if (docPreviewOpen) return;
    revokeDocPreviewUrl();
    setDocPreviewUrl(null);
  }, [docPreviewOpen]);

  useEffect(
    () => () => {
      revokeDocPreviewUrl();
    },
    [],
  );

  useEffect(() => {
    if (!open || !memberIds.length) return;
    setPortfolioMemberId((cur) => {
      if (cur && memberIds.includes(cur)) return cur;
      return user?.id && memberIds.includes(user.id) ? user.id : memberIds[0]!;
    });
  }, [open, memberIds, user?.id]);

  const onSave = async () => {
    setBusy(true);
    try {
      const result = await save();
      if (result?.postedEdit) {
        try {
          await send.mutateAsync({
            conversationId,
            content: buildChangeDoneMessage(stage.title),
          });
        } catch {
          /* non-blocking */
        }
      }
      toast.success("บันทึกแล้ว");
    } catch (e: unknown) {
      toast.error(getSupabaseErrorMessage(e, "บันทึกไม่สำเร็จ"));
    } finally {
      setBusy(false);
    }
  };

  const onToggleAck = async () => {
    if (
      doc.currentStep === "align" &&
      !myAcked
    ) {
      const validation = validateAlignRequired(payload.align);
      if (!validation.ok) {
        setAlignValidationErrors(new Set(validation.missing));
        const labels: Record<AlignRequiredField, string> = {
          idea: "ไอเดีย",
          dueAt: "กำหนดส่ง",
          deliverables: "ชิ้นงานที่ต้องทำ",
          rights: "สิทธิ์ / เครดิต",
        };
        toast.error(
          `กรอกข้อมูลที่จำเป็นให้ครบ: ${validation.missing.map((k) => labels[k]).join(", ")}`,
        );
        const scrollTarget =
          validation.missing.includes("idea")
            ? ideaFieldRef.current
            : validation.missing.includes("dueAt")
              ? dueAtFieldRef.current
              : validation.missing.includes("deliverables")
                ? deliverablesFieldRef.current
                : rightsFieldRef.current;
        scrollTarget?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      setAlignValidationErrors(new Set());
    }
    if (
      doc.currentStep === "review" &&
      !myAcked &&
      (payload.review.finalLinks ?? []).length === 0
    ) {
      toast.error("ใส่ลิงก์ผลงานสุดท้ายอย่างน้อย 1 อันก่อนยืนยัน");
      return;
    }
    setBusy(true);
    try {
      const result = await toggleAck();
      if (result?.complete) {
        try {
          await send.mutateAsync({
            conversationId,
            content: buildStepLockedMessage(stage.title),
          });
        } catch {
          /* non-blocking */
        }
        toast.success("ยืนยันครบทุกคนแล้ว — ไปขั้นถัดไปได้");
      } else if (result?.acked) {
        toast.success(`ติ๊กแล้ว (${ackProgress.done + 1}/${ackProgress.total})`);
      } else {
        toast.message("ยกเลิกติ๊กแล้ว");
      }
    } catch (e: unknown) {
      toast.error(getSupabaseErrorMessage(e, "อัปเดตไม่สำเร็จ"));
    } finally {
      setBusy(false);
    }
  };

  const onAdvance = async () => {
    setBusy(true);
    try {
      await advanceStep();
      toast.success("ไปขั้นถัดไปแล้ว");
    } catch (e: unknown) {
      toast.error(getSupabaseErrorMessage(e, "ไปขั้นถัดไปไม่ได้"));
    } finally {
      setBusy(false);
    }
  };

  const onAdvanceDemo = async () => {
    setBusy(true);
    try {
      const next = nextStepId(doc.currentStep);
      const nextTitle = COLLAB_PIPELINE.find((s) => s.id === next)?.title ?? "ขั้นถัดไป";
      if (dirty && editable) await save();
      await advanceStepDemo();
      toast.success(`ไป「${nextTitle}」แล้ว (demo)`);
    } catch (e: unknown) {
      toast.error(getSupabaseErrorMessage(e, "ไปขั้นถัดไปไม่ได้"));
    } finally {
      setBusy(false);
    }
  };

  const onRetreatDemo = async () => {
    setBusy(true);
    try {
      const prev = prevStepId(doc.currentStep);
      const prevTitle = COLLAB_PIPELINE.find((s) => s.id === prev)?.title ?? "ขั้นก่อนหน้า";
      if (dirty && editable && !isFinalSummary) await save();
      await retreatStepDemo();
      toast.success(`ย้อนไป「${prevTitle}」แล้ว (demo)`);
    } catch (e: unknown) {
      toast.error(getSupabaseErrorMessage(e, "ย้อนกลับไม่ได้"));
    } finally {
      setBusy(false);
    }
  };

  const onRequestChange = async () => {
    setBusy(true);
    try {
      const target =
        changeTarget ??
        (doc.currentStep === "align" || doc.status === "step_locked"
          ? doc.currentStep
          : "align");
      const stepLabel =
        COLLAB_PIPELINE.find((s) => s.id === target)?.title ?? stage.title;
      const row = await requestChange(changeReason, target);
      if (row) {
        await send.mutateAsync({
          conversationId,
          content: buildChangeRequestMessage({
            requestId: row.id,
            stepLabel,
            reason: changeReason,
          }),
        });
      }
      setChangeOpen(false);
      setChangeReason("");
      setChangeTarget(undefined);
      toast.success("ส่งคำขอแก้ไขแล้ว — รอทุกคนอนุมัติ");
    } catch (e: unknown) {
      toast.error(getSupabaseErrorMessage(e, "ขอแก้ไขไม่สำเร็จ"));
    } finally {
      setBusy(false);
    }
  };

  const openChangeRequest = (target?: CollabPipelineStageId) => {
    setChangeTarget(target);
    setChangeOpen(true);
  };

  const onApproveChange = async () => {
    setBusy(true);
    try {
      const { approved } = await approveChange();
      toast.success(approved ? "อนุมัติครบ — แก้ไขได้แล้ว" : "อนุมัติแล้ว รอคนอื่น");
    } catch (e: unknown) {
      toast.error(getSupabaseErrorMessage(e, "อนุมัติไม่สำเร็จ"));
    } finally {
      setBusy(false);
    }
  };

  const onApproveChangeDemo = async () => {
    setBusy(true);
    try {
      await approveChangeDemo();
      toast.success("อนุมัติครบทุกคนแล้ว (demo) — แก้ไขได้");
    } catch (e: unknown) {
      toast.error(getSupabaseErrorMessage(e, "อนุมัติไม่สำเร็จ"));
    } finally {
      setBusy(false);
    }
  };

  const collabPdfMeta = () => ({
    generatedAt: new Date(),
    memberNames: memberIds.map(
      (id) => memberNameMap.get(id) || (id === user?.id ? "คุณ" : `${id.slice(0, 8)}…`),
    ),
    conversationId,
    version: viewVersion ?? doc.version,
  });

  const openDocPreview = (url: string, opts?: { autoPrint?: boolean }) => {
    revokeDocPreviewUrl();
    setDocPreviewUrl(url);
    setDocPreviewOpen(true);
    if (opts?.autoPrint) {
      window.setTimeout(() => {
        const iframe = document.getElementById("collab-doc-preview-frame") as HTMLIFrameElement | null;
        try {
          iframe?.contentWindow?.print();
        } catch {
          toast.error("พิมพ์ไม่ได้ — กด「บันทึกเป็น PDF」ด้านล่าง");
        }
      }, 450);
    }
  };

  const downloadCollabPdf = () => {
    const ok = printCollabPlanPdf(payload, collabPdfMeta());
    if (!ok) {
      openDocPreview(createCollabPlanBlobUrl(payload, collabPdfMeta()), { autoPrint: true });
      toast.info("เลือก「บันทึกเป็น PDF」ในหน้าต่างพิมพ์");
      return;
    }
    toast.info("เลือก「บันทึกเป็น PDF」ในหน้าต่างพิมพ์");
  };

  const previewCollabPdf = () => {
    openDocPreview(createCollabPlanPreviewBlobUrl(formPayload, collabPdfMeta()));
  };

  const printDocPreview = () => {
    const iframe = document.getElementById("collab-doc-preview-frame") as HTMLIFrameElement | null;
    try {
      iframe?.contentWindow?.print();
    } catch {
      toast.error("พิมพ์ไม่ได้ — ลองเปิดในแท็บใหม่");
    }
  };

  const uploadAttachment = async (
    file: File,
    target: "align" | "create" = "align",
  ) => {
    if (!user?.id) return;
    if (target === "align" && !editable) return;
    if (target === "create" && (!editable || doc.currentStep !== "create")) return;
    if (target === "create" && !file.type.startsWith("image/")) {
      toast.error("ขั้นสร้างงานรองรับเฉพาะรูปภาพ");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error("ไฟล์ใหญ่เกินไป — สูงสุด 25 MB");
      return;
    }
    setUploading(true);
    try {
      const safe = file.name.replace(/[^\w.\-() ]/g, "_").slice(0, 100);
      const path = `anthem/collab-plans/${conversationId}/${crypto.randomUUID()}-${safe}`;
      const { error } = await sharedStorage.storage
        .from(SHARED_MEDIA_BUCKET)
        .upload(path, file, {
          upsert: false,
          contentType: file.type || "application/octet-stream",
        });
      if (error) throw error;
      const att: CollabAttachment = {
        path,
        name: file.name,
        contentType: file.type || undefined,
      };
      if (target === "create") {
        updatePayload((prev) => ({
          ...prev,
          create: {
            ...prev.create,
            attachments: [...(prev.create.attachments ?? []), att],
          },
        }));
      } else {
        updatePayload((prev) => ({
          ...prev,
          align: { ...prev.align, attachments: [...prev.align.attachments, att] },
        }));
      }
      toast.success("แนบแล้ว — กดบันทึกเพื่อเก็บลงแผน");
    } catch (e: unknown) {
      toast.error(getSupabaseErrorMessage(e, "อัปโหลดไม่สำเร็จ"));
    } finally {
      setUploading(false);
    }
  };

  const uploadProgressFile = async (
    step: "create" | "review",
    entryId: string,
    file: File,
    kind: "image" | "file",
  ) => {
    if (!user?.id || !formEditable) return;
    if (kind === "image" && !file.type.startsWith("image/")) {
      toast.error("อัปโหลดได้เฉพาะรูปภาพ");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error("ไฟล์ใหญ่เกินไป — สูงสุด 25 MB");
      return;
    }
    const existing = normalizeStepProgressEntries(formPayload[step], {
      userId: user.id,
      userName: memberUsernameMap.get(user.id) || "user",
    }).find((e) => e.id === entryId);
    if (!existing || existing.userId !== user.id) {
      toast.error("เฉพาะเจ้าของรายการนี้ที่อัปไฟล์ได้");
      return;
    }
    if (isProgressEntryConfirmed(existing)) {
      toast.error("โพสต์แล้ว — อัปไฟล์เพิ่มไม่ได้");
      return;
    }
    setUploading(true);
    try {
      const safe = file.name.replace(/[^\w.\-() ]/g, "_").slice(0, 100);
      const path = `anthem/collab-plans/${conversationId}/${crypto.randomUUID()}-${safe}`;
      const { error } = await sharedStorage.storage
        .from(SHARED_MEDIA_BUCKET)
        .upload(path, file, {
          upsert: false,
          contentType: file.type || "application/octet-stream",
        });
      if (error) throw error;
      const att: CollabAttachment = {
        path,
        name: file.name,
        contentType: file.type || undefined,
      };
      updatePayload((prev) => {
        const stepPayload = prev[step];
        const entries = normalizeStepProgressEntries(stepPayload, {
          userId: user.id,
          userName: memberUsernameMap.get(user.id) || "user",
        }).map((e) => {
          if (e.id !== entryId) return e;
          if (e.userId !== user.id) return e;
          if (kind === "image") {
            return { ...e, images: [...e.images, att] };
          }
          return { ...e, files: [...(e.files ?? []), att] };
        });
        return {
          ...prev,
          [step]: {
            ...stepPayload,
            progressEntries: entries,
            note: summarizeProgressEntries(entries),
            attachments: entries.flatMap((e) => [...e.images, ...(e.files ?? [])]),
            ...(step === "review" ? { finalLinks: stepPayload.finalLinks ?? [] } : {}),
          },
        };
      });
      toast.success(kind === "image" ? "อัปภาพแล้ว — กดบันทึกเพื่อเก็บลงแผน" : "อัปไฟล์แล้ว — กดบันทึกเพื่อเก็บลงแผน");
    } catch (e: unknown) {
      toast.error(getSupabaseErrorMessage(e, "อัปโหลดไม่สำเร็จ"));
    } finally {
      setUploading(false);
    }
  };

  const uploadCommentFile = async (file: File): Promise<CollabAttachment | null> => {
    if (!user?.id) return null;
    if (file.size > 25 * 1024 * 1024) {
      toast.error("ไฟล์ใหญ่เกินไป — สูงสุด 25 MB");
      return null;
    }
    try {
      const safe = file.name.replace(/[^\w.\-() ]/g, "_").slice(0, 100);
      const path = `anthem/collab-plans/${conversationId}/comments/${crypto.randomUUID()}-${safe}`;
      const { error } = await sharedStorage.storage
        .from(SHARED_MEDIA_BUCKET)
        .upload(path, file, {
          upsert: false,
          contentType: file.type || "application/octet-stream",
        });
      if (error) throw error;
      return {
        path,
        name: file.name,
        contentType: file.type || undefined,
      };
    } catch (e: unknown) {
      toast.error(getSupabaseErrorMessage(e, "อัปโหลดไม่สำเร็จ"));
      return null;
    }
  };

  /** Only the owner may add/edit/delete their progress entry content. Others' entries are preserved. */
  const mergeOwnedProgressEntries = (
    prevEntries: CollabProgressEntry[],
    nextEntries: CollabProgressEntry[],
    myId: string,
  ): CollabProgressEntry[] => {
    const prevById = new Map(prevEntries.map((e) => [e.id, e]));
    const nextById = new Map(nextEntries.map((e) => [e.id, e]));
    const out: CollabProgressEntry[] = [];

    for (const prev of prevEntries) {
      if (prev.userId !== myId) {
        out.push(prev);
        continue;
      }
      const next = nextById.get(prev.id);
      if (!next) continue; // owner deleted
      out.push({
        ...next,
        userId: prev.userId,
        userName: prev.userName || next.userName,
      });
    }

    for (const next of nextEntries) {
      if (prevById.has(next.id)) continue;
      if (next.userId !== myId) continue;
      out.push({ ...next, userId: myId });
    }

    return out;
  };

  /** Social updates (comments/likes/confirm) may touch any entry's comments; content fields stay owner-locked. */
  const mergeProgressSocialEntries = (
    prevEntries: CollabProgressEntry[],
    nextEntries: CollabProgressEntry[],
    myId: string,
  ): CollabProgressEntry[] => {
    const prevById = new Map(prevEntries.map((e) => [e.id, e]));
    const nextById = new Map(nextEntries.map((e) => [e.id, e]));
    const out: CollabProgressEntry[] = [];

    for (const prev of prevEntries) {
      const next = nextById.get(prev.id);
      if (!next) {
        out.push(prev);
        continue;
      }
      if (prev.userId === myId) {
        out.push({
          ...next,
          userId: prev.userId,
          userName: prev.userName || next.userName,
        });
        continue;
      }
      out.push({
        ...prev,
        comments: next.comments,
      });
    }

    for (const next of nextEntries) {
      if (prevById.has(next.id)) continue;
      if (next.userId !== myId) continue;
      out.push({ ...next, userId: myId });
    }

    return out;
  };

  const patchProgressEntries = (step: "create" | "review", entries: CollabProgressEntry[]) => {
    if (!user?.id) return;
    updatePayload((prev) => {
      const stepPayload = prev[step];
      const prevEntries = normalizeStepProgressEntries(stepPayload, {
        userId: user.id,
        userName: memberUsernameMap.get(user.id) || "user",
      });
      const merged = mergeOwnedProgressEntries(prevEntries, entries, user.id);
      return {
        ...prev,
        [step]: {
          ...stepPayload,
          progressEntries: merged,
          note: summarizeProgressEntries(merged),
          attachments: merged.flatMap((e) => [...e.images, ...(e.files ?? [])]),
          ...(step === "review" ? { finalLinks: stepPayload.finalLinks ?? [] } : {}),
        },
      };
    });
  };

  const persistProgressSocial = (
    step: "create" | "review",
    entries: CollabProgressEntry[],
  ) => {
    if (!user?.id) return;
    let nextPayload: import("@/lib/collabPlanDoc").CollabPlanPayload | null = null;
    updatePayload((prev) => {
      const stepPayload = prev[step];
      const prevEntries = normalizeStepProgressEntries(stepPayload, {
        userId: user.id,
        userName: memberUsernameMap.get(user.id) || "user",
      });
      const merged = mergeProgressSocialEntries(prevEntries, entries, user.id);
      nextPayload = {
        ...prev,
        [step]: {
          ...stepPayload,
          progressEntries: merged,
          note: summarizeProgressEntries(merged),
          attachments: merged.flatMap((e) => [...e.images, ...(e.files ?? [])]),
          ...(step === "review" ? { finalLinks: stepPayload.finalLinks ?? [] } : {}),
        },
      };
      return nextPayload;
    });
    if (nextPayload) void saveQuiet(nextPayload);
  };

  const myProgressUsername = useMemo(() => {
    if (!user?.id) return "user";
    return memberUsernameMap.get(user.id) || "user";
  }, [memberUsernameMap, user?.id]);

  const createProgressEntries = useMemo(
    () =>
      normalizeStepProgressEntries(formPayload.create, {
        userId: user?.id,
        userName: myProgressUsername,
      }),
    [formPayload.create, myProgressUsername, user?.id],
  );

  const removeAttachment = (path: string, target: "align" | "create" = "align") => {
    if (target === "create") {
      updatePayload((prev) => ({
        ...prev,
        create: {
          ...prev.create,
          attachments: (prev.create.attachments ?? []).filter((a) => a.path !== path),
        },
      }));
      return;
    }
    updatePayload((prev) => ({
      ...prev,
      align: {
        ...prev.align,
        attachments: prev.align.attachments.filter((a) => a.path !== path),
      },
    }));
  };

  const clearAlignValidationError = (field: AlignRequiredField) => {
    setAlignValidationErrors((prev) => {
      if (!prev.has(field)) return prev;
      const next = new Set(prev);
      next.delete(field);
      return next;
    });
  };

  const patchAlign = <K extends keyof typeof payload.align>(
    key: K,
    value: (typeof payload.align)[K],
  ) => {
    if (key === "dueAt") clearAlignValidationError("dueAt");
    if (key === "rights") clearAlignValidationError("rights");
    updatePayload((prev) => ({
      ...prev,
      align: { ...prev.align, [key]: value },
    }));
  };

  const setOverview = (text: string) => {
    clearAlignValidationError("idea");
    updatePayload((prev) => ({
      ...prev,
      align: { ...prev.align, idea: text, brief: "", roles: "" },
    }));
  };

  const setDeliverableItem = (index: number, value: string) => {
    if (value.trim()) clearAlignValidationError("deliverables");
    updatePayload((prev) => {
      const items = [
        ...(prev.align.deliverableItems?.length
          ? prev.align.deliverableItems
          : ["", "", ""]),
      ];
      items[index] = value;
      return {
        ...prev,
        align: {
          ...prev.align,
          deliverableItems: items,
          deliverables: items
            .map((t, i) => (t.trim() ? `${i + 1}. ${t.trim()}` : ""))
            .filter(Boolean)
            .join("\n"),
        },
      };
    });
  };

  const addDeliverableItem = () => {
    updatePayload((prev) => {
      const items = [
        ...(prev.align.deliverableItems?.length
          ? prev.align.deliverableItems
          : ["", "", ""]),
        "",
      ];
      return { ...prev, align: { ...prev.align, deliverableItems: items } };
    });
  };

  const removeDeliverableItem = (index: number) => {
    updatePayload((prev) => {
      const cur = prev.align.deliverableItems?.length
        ? prev.align.deliverableItems
        : ["", "", ""];
      const items = cur.filter((_, i) => i !== index);
      const next = items.length >= 3 ? items : padToThree(items);
      return {
        ...prev,
        align: {
          ...prev.align,
          deliverableItems: next,
          deliverables: next
            .map((t, i) => (t.trim() ? `${i + 1}. ${t.trim()}` : ""))
            .filter(Boolean)
            .join("\n"),
        },
      };
    });
  };

  const addReferenceLink = () => {
    let v = linkDraft.trim();
    if (!v) return;
    if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
    const safe = safeHttpUrl(v);
    if (!safe) {
      toast.error("ลิงก์ไม่ถูกต้อง");
      return;
    }
    if (payload.align.referenceLinks.includes(safe)) {
      toast.message("มีลิงก์นี้อยู่แล้ว");
      return;
    }
    if (payload.align.referenceLinks.length >= 8) {
      toast.error("ใส่ลิงก์ได้สูงสุด 8 อัน");
      return;
    }
    patchAlign("referenceLinks", [...payload.align.referenceLinks, safe]);
    setLinkDraft("");
  };

  const reviewFinalLinks = payload.review.finalLinks ?? [];

  const addReviewFinalLink = () => {
    let v = reviewLinkDraft.trim();
    if (!v) return;
    if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
    const safe = safeHttpUrl(v);
    if (!safe) {
      toast.error("ลิงก์ไม่ถูกต้อง");
      return;
    }
    if (reviewFinalLinks.includes(safe)) {
      toast.message("มีลิงก์นี้อยู่แล้ว");
      return;
    }
    if (reviewFinalLinks.length >= 8) {
      toast.error("ใส่ลิงก์ได้สูงสุด 8 อัน");
      return;
    }
    updatePayload((prev) => ({
      ...prev,
      review: {
        ...prev.review,
        finalLinks: [...(prev.review.finalLinks ?? []), safe],
      },
    }));
    setReviewLinkDraft("");
  };

  const patchReview = (patch: Partial<{ note: string; finalLinks: string[] }>) => {
    updatePayload((prev) => ({
      ...prev,
      review: { ...prev.review, ...patch },
    }));
  };

  const togglePortfolioRef = (ref: CollabPortfolioRef) => {
    const exists = payload.align.portfolioRefs.some((r) => r.projectId === ref.projectId);
    if (exists) {
      patchAlign(
        "portfolioRefs",
        payload.align.portfolioRefs.filter((r) => r.projectId !== ref.projectId),
      );
    } else if (payload.align.portfolioRefs.length >= 6) {
      toast.error("อ้างอิงผลงานได้สูงสุด 6 ชิ้น");
    } else {
      patchAlign("portfolioRefs", [...payload.align.portfolioRefs, ref]);
    }
  };

  const sendAckReminder = async (member: { id: string; label: string }) => {
    if (member.id === user?.id) {
      toast.message("นี่คือคุณเอง — กดปุ่มยืนยันมุมบนได้เลย");
      return;
    }
    setBusy(true);
    try {
      await send.mutateAsync({
        conversationId,
        content: [
          `🔔 เตือนยืนยันแผนคอลแลป`,
          `@${member.label}`,
          `ช่วยเปิดเอกสารแผน ตรวจรายละเอียดขั้น「${stage.title}」แล้วกดยืนยันด้วยนะ`,
        ].join("\n"),
      });
      toast.success(`ส่งเตือนถึง ${member.label} แล้ว`);
    } catch (e: unknown) {
      toast.error(getSupabaseErrorMessage(e, "ส่งเตือนไม่สำเร็จ"));
    } finally {
      setBusy(false);
    }
  };

  const sendDiscussionTemplate = async () => {
    setBusy(true);
    try {
      await send.mutateAsync({
        conversationId,
        content: buildAlignDiscussionTemplate(),
      });
      toast.success("ส่งเทมเพลตหัวข้อคุยเข้าแชทแล้ว");
    } catch (e: unknown) {
      toast.error(getSupabaseErrorMessage(e, "ส่งไม่สำเร็จ"));
    } finally {
      setBusy(false);
    }
  };

  const patchStepNote = (step: CollabPipelineStageId, note: string) => {
    if (step === "align") return;
    updatePayload((prev) => ({
      ...prev,
      [step]: { ...prev[step], note },
    }));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-6xl max-h-[92vh] overflow-hidden rounded-2xl p-0 flex flex-col gap-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0 text-left space-y-2">
            <div className="flex items-start justify-between gap-3 pr-8">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-[hsl(var(--chat-collab-soft))] flex items-center justify-center shrink-0">
                  <Handshake className="w-4 h-4 text-[hsl(var(--chat-collab))]" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-base">วางแผนงานร่วมกัน</DialogTitle>
                  <DialogDescription className="text-xs leading-snug">
                    {planReadOnly ? (
                      <span className="text-destructive font-medium">
                        คอลแลปยุติแล้ว — แผนนี้อ่านอย่างเดียว (ไม่นับเป็นจบงาน)
                      </span>
                    ) : (
                      <>
                        เอกสารร่วม · ทุกคนต้องยืนยันครบก่อนไปขั้นถัดไป · ไม่ใช่ใบเสนอราคาจ้างงาน
                      </>
                    )}
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  className={cn(
                    "rounded-full h-8 text-[11px]",
                    myAcked || doc.status === "step_locked"
                      ? "bg-muted text-muted-foreground hover:bg-muted"
                      : "bg-[hsl(var(--chat-collab))] text-white hover:opacity-90",
                  )}
                  disabled={busy || locked || dirty || !!pendingChange || isLoading}
                  onClick={() => void onToggleAck()}
                  title={
                    dirty
                      ? "บันทึกแผนก่อน แล้วค่อยยืนยัน"
                      : myAcked
                        ? "ยกเลิกการยืนยัน"
                        : "ยืนยันขั้นนี้"
                  }
                >
                  <Check className="w-3.5 h-3.5 mr-1" strokeWidth={2.5} />
                  {myAcked || doc.status === "step_locked" ? "ยืนยันแล้ว" : "ยืนยัน"}
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="rounded-full h-8 w-8"
                  onClick={() => setLogOpen(true)}
                  aria-label="ประวัติการทำแผน"
                  title="ประวัติการทำแผน"
                >
                  <History className="w-3.5 h-3.5" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="rounded-full h-8 text-[11px] gap-1 px-2.5 border-[hsl(var(--chat-collab)/0.45)] text-[hsl(var(--chat-collab))]"
                      title="เลือกดูเวอร์ชันแผน"
                    >
                      ver.{viewVersion ?? doc.version}
                      <ChevronDown className="w-3 h-3 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 rounded-xl">
                    <DropdownMenuLabel className="text-xs">
                      เวอร์ชันแผน · ปัจจุบัน ver.{doc.version}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-xs"
                      onClick={() => setViewVersion(null)}
                    >
                      ver.{doc.version} — ปัจจุบัน
                      {viewVersion == null ? " ✓" : ""}
                    </DropdownMenuItem>
                    {versionOptions
                      .filter((v) => v !== doc.version)
                      .map((v) => {
                        const snap = versions.find((s) => s.version === v);
                        const author =
                          snap?.savedBy != null
                            ? formatLogActorName(snap.savedBy, memberNameMap, user?.id)
                            : null;
                        return (
                          <DropdownMenuItem
                            key={v}
                            className="text-xs flex flex-col items-start gap-0.5"
                            onClick={() => setViewVersion(v)}
                          >
                            <span>
                              ver.{v}
                              {viewVersion === v ? " ✓" : ""}
                            </span>
                            {snap ? (
                              <span className="text-[10px] text-muted-foreground font-normal">
                                {new Date(snap.savedAt).toLocaleString("th-TH", {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                })}
                                {author ? ` · ${author}` : ""}
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground font-normal">
                                ยังไม่มี snapshot — บันทึกครั้งถัดไปจะเก็บเวอร์ชัน
                              </span>
                            )}
                          </DropdownMenuItem>
                        );
                      })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="space-y-2 pt-0.5">
              <div className="relative px-0.5">
                <div
                  className="absolute top-[11px] h-0.5 bg-muted"
                  style={{
                    left: `${stepTimelineTrack.left}%`,
                    width: `${stepTimelineTrack.width}%`,
                  }}
                  aria-hidden
                />
                <div
                  className="absolute top-[11px] h-0.5 bg-[hsl(var(--chat-collab))] transition-[width] duration-300"
                  style={{
                    left: `${stepTimelineTrack.left}%`,
                    width: `${stepTimelineTrack.progress}%`,
                  }}
                  aria-hidden
                />
                <ol className="relative grid grid-cols-4 gap-1">
                  {COLLAB_PIPELINE.map((s, i) => {
                    const past = i < formStepIndex;
                    const active = i === formStepIndex;
                    const doneHere = active && formStatus === "step_locked";
                    const reached = past || active || doneHere;
                    const shortTitle =
                      s.id === "align"
                        ? "จัดแนวทาง"
                        : s.id === "create"
                          ? "สร้างงาน"
                          : s.id === "review"
                            ? "ยืนยันสุดท้าย"
                            : "ลงผลงาน";
                    return (
                      <li key={s.id} className="flex flex-col items-center gap-1 min-w-0">
                        <span
                          className={cn(
                            "relative z-[1] flex h-[22px] w-[22px] items-center justify-center rounded-full text-[10px] font-semibold tabular-nums border",
                            active
                              ? "bg-[hsl(var(--chat-collab))] border-[hsl(var(--chat-collab))] text-white"
                              : past || doneHere
                                ? "bg-[hsl(var(--chat-collab)/0.85)] border-[hsl(var(--chat-collab)/0.85)] text-white"
                                : "bg-background border-border text-muted-foreground",
                          )}
                          aria-current={active ? "step" : undefined}
                        >
                          {s.step}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] leading-tight text-center truncate max-w-full px-0.5",
                            reached ? "text-foreground font-medium" : "text-muted-foreground",
                          )}
                          title={s.title}
                        >
                          {shortTitle}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
              <p className="text-[10px] text-muted-foreground text-right leading-snug whitespace-nowrap overflow-x-auto max-w-full">
                <span className="text-foreground/85">
                  ยืนยัน {ackProgress.done}/{ackProgress.total || "—"}
                </span>
                <span className="mx-1.5 text-border">|</span>
                <span>
                  แล้ว:{" "}
                  {ackedMembers.length > 0 ? (
                    <span className="text-[hsl(var(--chat-collab))]">
                      {ackedMembers.map((m) => m.label).join(", ")}
                    </span>
                  ) : (
                    <span>—</span>
                  )}
                </span>
                <span className="mx-1.5 text-border">|</span>
                <span>
                  รอ:{" "}
                  {pendingAckMembers.length > 0 ? (
                    pendingAckMembers.map((m, i) => (
                      <span key={m.id}>
                        {i > 0 ? ", " : null}
                        {m.id === user?.id ? (
                          <span>{m.label}</span>
                        ) : (
                          <button
                            type="button"
                            className="underline underline-offset-2 text-[hsl(var(--chat-collab))] hover:opacity-80 disabled:opacity-50"
                            disabled={busy}
                            title={`ส่งเตือนให้ ${m.label} ตรวจและยืนยัน`}
                            onClick={() => void sendAckReminder(m)}
                          >
                            {m.label}
                          </button>
                        )}
                      </span>
                    ))
                  ) : (
                    <span className="text-[hsl(var(--chat-collab))]">ครบแล้ว</span>
                  )}
                </span>
              </p>
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                โหลดแผนร่วม…
              </div>
            ) : (
              <div className="space-y-4">
                {isViewingHistory ? (
                  <div className="rounded-xl border border-sky-500/35 bg-sky-500/10 px-3 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2">
                    <span className="leading-relaxed text-foreground/90">
                      กำลังดู{" "}
                      <strong className="text-foreground">ver.{viewVersion}</strong>{" "}
                      (อ่านอย่างเดียว)
                      {historySnapshot ? (
                        <>
                          {" "}
                          · ขั้น {formStage.step}/{formStage.title} ·{" "}
                          {new Date(historySnapshot.savedAt).toLocaleString("th-TH", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </>
                      ) : null}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 rounded-full shrink-0"
                      onClick={() => setViewVersion(null)}
                    >
                      กลับ ver.{doc.version}
                    </Button>
                  </div>
                ) : null}

                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                      formStatus === "step_locked"
                        ? "bg-[hsl(var(--chat-collab))] text-white"
                        : "bg-[hsl(var(--chat-collab-soft))] text-[hsl(var(--chat-collab))]",
                    )}
                  >
                    {formStatus === "step_locked" ? (
                      <Check className="w-4 h-4" strokeWidth={2.5} />
                    ) : (
                      formStage.step
                    )}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-foreground">{formStage.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                      {formStage.summary}
                    </p>
                  </div>
                </div>

                {pendingChange ? (
                  <div
                    id="collab-change-pending"
                    className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-3 text-xs space-y-2.5"
                  >
                    <p className="font-semibold text-foreground">มีคำขอแก้ไขรออนุมัติ</p>
                    <p className="text-muted-foreground leading-relaxed">
                      {pendingChange.reason?.trim() || "ไม่ได้ระบุเหตุผล"}
                    </p>
                    <p className="text-muted-foreground">
                      อนุมัติแล้ว{" "}
                      <span className="font-medium text-foreground">
                        {Object.keys(pendingChange.approvals || {}).length}/{memberIds.length}
                      </span>
                      {memberIds.length > 0 ? (
                        <span className="text-muted-foreground/80">
                          {" "}
                          — รอ{" "}
                          {memberIds
                            .filter((id) => !pendingChange.approvals?.[id])
                            .map(
                              (id) =>
                                memberNameMap.get(id) ||
                                (id === user?.id ? "คุณ" : `${id.slice(0, 6)}…`),
                            )
                            .join(", ") || "ครบแล้ว"}
                        </span>
                      ) : null}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {!myChangeApproved ? (
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 rounded-full bg-[hsl(var(--chat-collab))] text-white hover:opacity-90"
                          disabled={busy}
                          onClick={() => void onApproveChange()}
                        >
                          {busy ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3 mr-1" strokeWidth={2.5} />
                          )}
                          อนุมัติให้แก้ไข
                        </Button>
                      ) : (
                        <p className="text-[hsl(var(--chat-collab))] self-center">
                          คุณอนุมัติแล้ว — รอคนอื่น
                        </p>
                      )}
                      {demoShortcuts ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-full border-amber-500/40 text-amber-800 dark:text-amber-300"
                          disabled={busy}
                          onClick={() => void onApproveChangeDemo()}
                          title="อนุมัติแทนทุกคน — ใช้ทดสอบ UX เท่านั้น"
                        >
                          อนุมัติ(demo)
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {!formEditable && !pendingChange && !formIsFinalSummary && !isViewingHistory ? (
                  <div className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    ขั้นนี้ล็อกแล้ว — ขออนุญาตแก้ไขจากทุกคนก่อนจึงจะแก้รายละเอียดได้
                  </div>
                ) : null}

                {formStage.id === "align" ? (
                  <div className="space-y-5">
                    <section className="rounded-2xl border border-border bg-card/40 p-3.5 space-y-3">
                      <AlignSectionHeading
                        icon={Lightbulb}
                        title="ไอเดีย"
                        hint="กรอกในช่องเดียว — เป้าหมาย · บรีฟ · ใครทำอะไร"
                        required
                      />
                      <Textarea
                        ref={ideaFieldRef}
                        value={getAlignOverview(formPayload.align)}
                        disabled={!formEditable}
                        onChange={(e) => setOverview(e.target.value)}
                        rows={8}
                        className={cn(
                          "rounded-xl text-sm resize-y min-h-[140px]",
                          alignValidationErrors.has("idea") &&
                            "border-destructive focus-visible:ring-destructive/40",
                        )}
                        placeholder={"เช่น\n• เป้าหมาย:\n• บรีฟ / สไตล์:\n• ใครทำอะไร:"}
                      />
                    </section>

                    <section className="rounded-2xl border border-border bg-card/40 p-3.5 space-y-4">
                      <AlignSectionHeading
                        icon={Bookmark}
                        title="อ้างอิง"
                        hint="ลิงก์ · ไฟล์แนบ · ผลงานในพอร์ต"
                      />

                      <div className="space-y-2">
                        <p className="text-[11px] font-medium flex items-center gap-1.5 text-muted-foreground">
                          <Link2 className="w-3.5 h-3.5" />
                          ลิงก์
                        </p>
                        {formEditable ? (
                          <div className="flex gap-2">
                            <Input
                              value={linkDraft}
                              onChange={(e) => setLinkDraft(e.target.value)}
                              placeholder="https://…"
                              className="rounded-xl text-sm"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addReferenceLink();
                                }
                              }}
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="rounded-full shrink-0"
                              onClick={addReferenceLink}
                            >
                              <Plus className="w-3.5 h-3.5 mr-1" />
                              เพิ่ม
                            </Button>
                          </div>
                        ) : null}
                        {formPayload.align.referenceLinks.length ? (
                          <ul className="space-y-1">
                            {formPayload.align.referenceLinks.map((url) => (
                              <li
                                key={url}
                                className="flex items-center gap-2 text-xs rounded-lg border border-border px-2.5 py-1.5"
                              >
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex-1 truncate text-[hsl(var(--chat-collab))] hover:underline"
                                >
                                  {url}
                                </a>
                                {formEditable ? (
                                  <button
                                    type="button"
                                    className="text-muted-foreground hover:text-destructive"
                                    onClick={() =>
                                      patchAlign(
                                        "referenceLinks",
                                        formPayload.align.referenceLinks.filter((u) => u !== url),
                                      )
                                    }
                                    aria-label="ลบลิงก์"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">ยังไม่มีลิงก์</p>
                        )}
                      </div>

                      <div className="space-y-2 border-t border-border/60 pt-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-medium flex items-center gap-1.5 text-muted-foreground">
                            <Paperclip className="w-3.5 h-3.5" />
                            ไฟล์ / รูป
                          </p>
                          {formEditable ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-full text-[11px]"
                              disabled={uploading}
                              onClick={() => fileRef.current?.click()}
                            >
                              {uploading ? (
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              ) : (
                                <Plus className="w-3 h-3 mr-1" />
                              )}
                              แนบไฟล์
                            </Button>
                          ) : null}
                        </div>
                        <input
                          ref={fileRef}
                          type="file"
                          className="hidden"
                          accept="image/*,.pdf,.zip,.doc,.docx,.txt"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.target.value = "";
                            if (f) void uploadAttachment(f, "align");
                          }}
                        />
                        {formPayload.align.attachments.length ? (
                          <ul className="space-y-1.5">
                            {formPayload.align.attachments.map((a) => (
                              <li
                                key={a.path}
                                className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-xs"
                              >
                                <a
                                  href={storageMediaPublicUrl(a.path)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex-1 truncate text-[hsl(var(--chat-collab))] hover:underline"
                                >
                                  {a.name}
                                </a>
                                {formEditable ? (
                                  <button
                                    type="button"
                                    className="text-muted-foreground hover:text-destructive"
                                    onClick={() => removeAttachment(a.path, "align")}
                                    aria-label="ลบไฟล์"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">ยังไม่มีไฟล์แนบ</p>
                        )}
                      </div>

                      <div className="space-y-2 border-t border-border/60 pt-4">
                        <p className="text-[11px] font-medium flex items-center gap-1.5 text-muted-foreground">
                          <ImagePlus className="w-3.5 h-3.5" />
                          ผลงานในพอร์ต
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          เลือกสมาชิกก่อน แล้วแตะ thumbnail ผลงานเป็นเรฟ (สูงสุด 6)
                        </p>
                        {memberIds.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground">กำลังโหลดสมาชิก…</p>
                        ) : (
                          <>
                            <div className="flex flex-wrap gap-1.5">
                              {memberIds.map((uid) => {
                                const label =
                                  uid === user?.id
                                    ? "ฉัน"
                                    : memberNameMap.get(uid) || `${uid.slice(0, 8)}…`;
                                const active = portfolioMemberId === uid;
                                return (
                                  <button
                                    key={uid}
                                    type="button"
                                    onClick={() => setPortfolioMemberId(uid)}
                                    className={cn(
                                      "text-[11px] px-2.5 py-1 rounded-full border transition-colors",
                                      active
                                        ? "bg-[hsl(var(--chat-collab))] text-white border-transparent"
                                        : "bg-muted/40 text-foreground border-border",
                                    )}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                            {portfolioMemberId ? (
                              (projectsByOwner.get(portfolioMemberId) ?? []).length === 0 ? (
                                <p className="text-[11px] text-muted-foreground rounded-xl border border-dashed border-border px-3 py-5 text-center">
                                  สมาชิกนี้ยังไม่มีผลงานเผยแพร่
                                </p>
                              ) : (
                                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-56 overflow-y-auto rounded-xl border border-border/70 p-2">
                                  {(projectsByOwner.get(portfolioMemberId) ?? []).map((p) => {
                                    const on = formPayload.align.portfolioRefs.some(
                                      (r) => r.projectId === p.id,
                                    );
                                    return (
                                      <div
                                        key={p.id}
                                        className={cn(
                                          "rounded-lg border overflow-hidden bg-muted/30",
                                          on
                                            ? "border-[hsl(var(--chat-collab))] ring-2 ring-[hsl(var(--chat-collab)/0.45)]"
                                            : "border-border",
                                        )}
                                      >
                                        <button
                                          type="button"
                                          disabled={!formEditable}
                                          onClick={() =>
                                            togglePortfolioRef({
                                              projectId: p.id,
                                              title: p.title,
                                              ownerId: p.owner_id,
                                            })
                                          }
                                          className={cn(
                                            "relative block w-full aspect-square text-left",
                                            !formEditable && "opacity-60",
                                          )}
                                          title={on ? "เอาออกจากเรฟ" : "เลือกเป็นเรฟ"}
                                        >
                                          <PortfolioThumb coverUrl={p.cover_url} title={p.title} />
                                          {on ? (
                                            <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-[hsl(var(--chat-collab))] text-white flex items-center justify-center">
                                              <Check className="w-2.5 h-2.5" strokeWidth={3} />
                                            </span>
                                          ) : null}
                                        </button>
                                        <Link
                                          to={`/project/${p.id}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="flex items-center justify-center gap-1 h-7 px-1 text-[10px] text-[hsl(var(--chat-collab))] hover:bg-[hsl(var(--chat-collab-soft))] border-t border-border"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <ExternalLink className="w-3 h-3 shrink-0" />
                                          ดูผลงาน
                                        </Link>
                                      </div>
                                    );
                                  })}
                                </div>
                              )
                            ) : null}
                          </>
                        )}
                        {formPayload.align.portfolioRefs.length ? (
                          <ul className="flex flex-wrap gap-1.5 pt-1">
                            {formPayload.align.portfolioRefs.map((r) => (
                              <li key={r.projectId}>
                                <Link
                                  to={`/project/${r.projectId}`}
                                  className="text-[11px] px-2 py-1 rounded-full bg-[hsl(var(--chat-collab-soft))] text-[hsl(var(--chat-collab))] hover:underline"
                                >
                                  {r.title}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </section>

                    <section className="rounded-2xl border border-border bg-card/40 p-3.5">
                      <div className="grid gap-3 sm:grid-cols-2 sm:items-start">
                        <div className="space-y-3">
                          <AlignSectionHeading icon={CalendarDays} title="Timeline" />
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <span className="text-[11px] font-medium text-muted-foreground block">
                                วันเริ่มคอลแลป
                              </span>
                              <Input
                                type="date"
                                disabled={!formEditable}
                                value={formPayload.align.draftAt?.slice(0, 10) ?? ""}
                                onChange={(e) =>
                                  patchAlign("draftAt", e.target.value ? e.target.value : null)
                                }
                                className="rounded-xl"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <span className="text-[11px] font-medium text-muted-foreground block">
                                กำหนดส่ง
                                <RequiredMark />
                              </span>
                              <Input
                                ref={dueAtFieldRef}
                                type="date"
                                disabled={!formEditable}
                                value={formPayload.align.dueAt?.slice(0, 10) ?? ""}
                                onChange={(e) =>
                                  patchAlign("dueAt", e.target.value ? e.target.value : null)
                                }
                                className={cn(
                                  "rounded-xl",
                                  alignValidationErrors.has("dueAt") &&
                                    "border-destructive focus-visible:ring-destructive/40",
                                )}
                              />
                            </div>
                            <div className="space-y-1.5 col-span-2">
                              <span className="text-[11px] font-medium text-muted-foreground block">
                                วันที่ลงผลงานหรือจัดแสดงงาน
                              </span>
                              <Input
                                type="date"
                                disabled={!formEditable}
                                value={formPayload.align.releaseAt?.slice(0, 10) ?? ""}
                                onChange={(e) =>
                                  patchAlign("releaseAt", e.target.value ? e.target.value : null)
                                }
                                className="rounded-xl"
                              />
                            </div>
                          </div>
                        </div>
                        <Field
                          label="รายละเอียดไทม์ไลน์"
                          value={formPayload.align.timelineNote}
                          disabled={!formEditable}
                          onChange={(v) => patchAlign("timelineNote", v)}
                          rows={5}
                          className="h-full"
                          placeholder={
                            "เช่น\n• วันนัดเจอ / คุยครั้งแรก:\n• วันประชุมสรุปแนวทาง:\n• รอบส่งร่าง / WIP:\n• รอบรีวิว · แก้ไข:\n• วันส่งงานจริง:"
                          }
                        />
                      </div>
                    </section>

                    <section className="grid gap-4 sm:grid-cols-2 sm:items-start">
                      <div
                        ref={deliverablesFieldRef}
                        className={cn(
                          "rounded-2xl border bg-card/40 p-3.5 space-y-2",
                          alignValidationErrors.has("deliverables")
                            ? "border-destructive"
                            : "border-border",
                        )}
                      >
                        <AlignSectionHeading icon={ListChecks} title="ชิ้นงานที่ต้องทำ" required />
                        <ul className="space-y-2">
                          {(formPayload.align.deliverableItems?.length
                            ? formPayload.align.deliverableItems
                            : ["", "", ""]
                          ).map((item, i) => (
                            <li key={`d-${i}`} className="flex items-start gap-2">
                              <span className="mt-2.5 text-xs tabular-nums text-muted-foreground w-4 shrink-0">
                                {i + 1}.
                              </span>
                              <Input
                                value={item}
                                disabled={!formEditable}
                                onChange={(e) => setDeliverableItem(i, e.target.value)}
                                placeholder={`ชิ้นงานที่ ${i + 1}`}
                                className={cn(
                                  "rounded-xl text-sm",
                                  alignValidationErrors.has("deliverables") &&
                                    "border-destructive focus-visible:ring-destructive/40",
                                )}
                              />
                              {formEditable && (formPayload.align.deliverableItems?.length ?? 3) > 3 ? (
                                <button
                                  type="button"
                                  className="mt-2 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeDeliverableItem(i)}
                                  aria-label="ลบรายการ"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                        {formEditable ? (
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 rounded-full text-[11px]"
                              onClick={addDeliverableItem}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              เพิ่ม
                            </Button>
                          </div>
                        ) : null}
                      </div>
                      <div
                        className={cn(
                          "rounded-2xl border bg-card/40 p-3.5 space-y-2",
                          alignValidationErrors.has("rights")
                            ? "border-destructive"
                            : "border-border",
                        )}
                      >
                        <AlignSectionHeading icon={Scale} title="สิทธิ์ / เครดิต" required />
                        <div className="space-y-2">
                          <Select
                            value={
                              RIGHTS_EXAMPLES.find(
                                (ex) => ex.body === formPayload.align.rights.trim(),
                              )?.key
                            }
                            onValueChange={(key) => {
                              const ex = RIGHTS_EXAMPLES.find((e) => e.key === key);
                              if (ex) patchAlign("rights", ex.body);
                            }}
                            disabled={!formEditable}
                          >
                            <SelectTrigger
                              className={cn(
                                "rounded-xl text-sm h-9",
                                alignValidationErrors.has("rights") &&
                                  "border-destructive focus:ring-destructive/40",
                              )}
                            >
                              <SelectValue placeholder="เลือกแม่แบบสิทธิ์ / เครดิต" />
                            </SelectTrigger>
                            <SelectContent>
                              {RIGHTS_EXAMPLES.map((ex) => (
                                <SelectItem key={ex.key} value={ex.key}>
                                  {ex.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Textarea
                            ref={rightsFieldRef}
                            value={formPayload.align.rights}
                            disabled={!formEditable}
                            onChange={(e) => patchAlign("rights", e.target.value)}
                            rows={6}
                            className={cn(
                              "rounded-xl text-sm resize-y min-h-[100px]",
                              alignValidationErrors.has("rights") &&
                                "border-destructive focus-visible:ring-destructive/40",
                            )}
                            placeholder={
                              "เช่น\n• เครดิต: ทั้งคู่\n• ใช้เชิงพาณิชย์ได้ไหม:\n• ลงพอร์ตร่วมได้ไหม:"
                            }
                          />
                        </div>
                      </div>
                    </section>
                  </div>
                ) : formStage.id === "create" ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-[hsl(var(--chat-collab)/0.35)] bg-[hsl(var(--chat-collab-soft))]/30 p-3.5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-[hsl(var(--chat-collab))]">
                            สรุปที่ตกลงไว้
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-full text-[11px] border-[hsl(var(--chat-collab)/0.45)] text-[hsl(var(--chat-collab))]"
                            disabled={busy || isLoading}
                            onClick={previewCollabPdf}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            ดูพรีวิว
                          </Button>
                          {!pendingChange ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-full text-[11px] shrink-0 border-[hsl(var(--chat-collab)/0.45)] text-[hsl(var(--chat-collab))]"
                              disabled={busy}
                              onClick={() => openChangeRequest("align")}
                            >
                              <Unlock className="w-3 h-3 mr-1" />
                              ขอแก้ไข
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 rounded-full p-0 border-[hsl(var(--chat-collab)/0.45)] text-[hsl(var(--chat-collab))]"
                            aria-expanded={!agreeSummaryCollapsed}
                            aria-label={agreeSummaryCollapsed ? "กางสรุปที่ตกลงไว้" : "หุบสรุปที่ตกลงไว้"}
                            onClick={() => setAgreeSummaryCollapsed((v) => !v)}
                          >
                            {agreeSummaryCollapsed ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronUp className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <AgreedPlanSummary
                        align={formPayload.align}
                        collapsed={agreeSummaryCollapsed}
                      />
                    </div>

                    <CollabProgressFeed
                      entries={createProgressEntries}
                      disabled={!formEditable}
                      canComment={!isViewingHistory && !!user?.id}
                      uploading={uploading}
                      currentUserId={user?.id ?? ""}
                      currentUserName={myProgressUsername}
                      currentUserAvatar={memberProfileMap.get(user?.id ?? "")?.avatarUrl ?? null}
                      memberProfiles={memberProfileMap}
                      title="โน้ตความคืบหน้า"
                      addLabel="+ ความคืบหน้า"
                      onChange={(entries) => patchProgressEntries("create", entries)}
                      onPersistSocial={(entries) => persistProgressSocial("create", entries)}
                      onUploadFile={(entryId, file, kind) =>
                        void uploadProgressFile("create", entryId, file, kind)
                      }
                      onUploadCommentFile={(entryId, file) => uploadCommentFile(file)}
                    />
                  </div>
                ) : formStage.id === "review" ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-[hsl(var(--chat-collab)/0.35)] bg-[hsl(var(--chat-collab-soft))]/30 px-4 py-3.5 space-y-1.5">
                      <p className="text-sm font-semibold text-[hsl(var(--chat-collab))]">
                        สรุปสุดท้ายก่อนจบงาน
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        ตรวจแผนและความคืบหน้า · ฝากลิงก์ที่เก็บงานไว้กลับมาดูทีหลัง · แล้วให้ทุกคนกด「ยืนยัน」มุมบน
                        ครบแล้วไปสรุปจบและลงผลงานร่วมกัน
                      </p>
                    </div>

                    <CollapsiblePlanPanel
                      title="แผนที่ตกลงไว้"
                      collapsed={reviewAgreedCollapsed}
                      onToggle={() => setReviewAgreedCollapsed((v) => !v)}
                      preview={<AgreedPlanSummary align={formPayload.align} collapsed />}
                    >
                      <AgreedPlanSummary align={formPayload.align} />
                    </CollapsiblePlanPanel>

                    <CollapsiblePlanPanel
                      title="ความคืบหน้าระหว่างทำ"
                      hint="กางเพื่อดูโพสต์และคอมเมนต์เต็ม ๆ จากขั้นสร้างงาน"
                      collapsed={reviewProgressCollapsed}
                      onToggle={() => setReviewProgressCollapsed((v) => !v)}
                      preview={<ProgressCollapsePreview step={formPayload.create} />}
                    >
                      <CollabProgressFeed
                        entries={createProgressEntries}
                        disabled
                        canComment={false}
                        uploading={false}
                        currentUserId={user?.id ?? ""}
                        currentUserName={myProgressUsername}
                        currentUserAvatar={memberProfileMap.get(user?.id ?? "")?.avatarUrl ?? null}
                        memberProfiles={memberProfileMap}
                        showHeader={false}
                        onChange={() => {}}
                        onUploadFile={async () => {}}
                      />
                    </CollapsiblePlanPanel>

                    <section className="rounded-2xl border border-border bg-card/40 p-3.5 space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          ลิงก์ผลงานสุดท้าย
                          <span className="text-[hsl(var(--chat-collab))] font-normal"> *</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                          ฝากลิงก์ที่เก็บงาน (พอร์ต / ไดรฟ์ / โซเชียล) — ไว้กลับมาดูทีหลังเมื่อจำไม่ได้
                        </p>
                      </div>
                      {formEditable ? (
                        <div className="flex gap-2">
                          <Input
                            value={reviewLinkDraft}
                            onChange={(e) => setReviewLinkDraft(e.target.value)}
                            placeholder="https://…"
                            className="rounded-xl text-sm font-mono"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addReviewFinalLink();
                              }
                            }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-full shrink-0"
                            onClick={addReviewFinalLink}
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            เพิ่ม
                          </Button>
                        </div>
                      ) : null}
                      {reviewFinalLinks.length ? (
                        <ul className="space-y-1.5">
                          {reviewFinalLinks.map((url) => (
                            <li
                              key={url}
                              className="flex items-center gap-2 text-xs rounded-lg border border-border px-2.5 py-2"
                            >
                              <a
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 truncate text-[hsl(var(--chat-collab))] hover:underline font-mono"
                              >
                                {url}
                              </a>
                              {formEditable ? (
                                <button
                                  type="button"
                                  className="text-muted-foreground hover:text-destructive shrink-0"
                                  onClick={() =>
                                    patchReview({
                                      finalLinks: reviewFinalLinks.filter((u) => u !== url),
                                    })
                                  }
                                  aria-label="ลบลิงก์"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[11px] text-muted-foreground rounded-xl border border-dashed border-border px-3 py-5 text-center">
                          ยังไม่มีลิงก์ผลงานสุดท้าย — ใส่อย่างน้อย 1 ลิงก์ก่อนยืนยันจบงาน
                        </p>
                      )}
                    </section>

                    <div className="rounded-xl border border-[hsl(var(--chat-collab)/0.35)] bg-[hsl(var(--chat-collab-soft))]/20 px-3 py-2.5 text-xs text-muted-foreground leading-relaxed">
                      เมื่อพร้อมแล้ว กด「บันทึก」ด้านล่าง แล้วกด「ยืนยัน」มุมขวาบน — ครบทุกคนแล้วไปขั้นสรุปจบ
                      และลงผลงานร่วมกันบนพอร์ต
                    </div>
                  </div>
                ) : formStage.id === "publish" ? (
                  <CollabFinalSummary
                    payload={formPayload}
                    onDownloadPdf={downloadCollabPdf}
                    publishPath={publishPath}
                    onGoPublish={() => {
                      onOpenChange(false);
                      if (publishPath) navigate(publishPath);
                    }}
                  />
                ) : (
                  <Field
                    label="โน้ตขั้นนี้"
                    value={formPayload[formStage.id].note}
                    disabled={!formEditable}
                    onChange={(v) => patchStepNote(formStage.id, v)}
                    rows={8}
                  />
                )}

                {dirty && !isFinalSummary ? (
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 rounded-xl bg-amber-500/10 px-3 py-2">
                    มีการแก้ที่ยังไม่บันทึก — กดบันทึกก่อน แล้วค่อยกดยืนยันมุมบน
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-border px-4 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] space-y-2">
            {saveError ? (
              <p className="text-[11px] text-destructive text-center">{saveError}</p>
            ) : null}
            {awaitingAllAcks && !demoShortcuts && !isViewingHistory ? (
              <p className="text-[11px] text-muted-foreground text-center leading-relaxed rounded-xl bg-muted/40 px-3 py-2">
                ต้องให้สมาชิกทุกคนกด「ยืนยัน」มุมบนครบก่อนไปขั้นถัดไป
                {" "}
                ({ackProgress.done}/{ackProgress.total || "—"})
                {pendingAckMembers.length > 0 ? (
                  <>
                    {" "}
                    — รอ{" "}
                    {pendingAckMembers.map((m) => m.label).join(", ")}
                  </>
                ) : null}
              </p>
            ) : null}
            {awaitingAllAcks && demoShortcuts && !isViewingHistory ? (
              <p className="text-[11px] text-amber-800 dark:text-amber-300 text-center leading-relaxed rounded-xl bg-amber-500/10 px-3 py-2">
                โหมด demo — ข้ามการยืนยันครบได้ด้วย「ถัดไป(demo)」
                {" "}
                (ยืนยันแล้ว {ackProgress.done}/{ackProgress.total || "—"})
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {!isFinalSummary ? (
                <Button
                  type="button"
                  className="rounded-full bg-[hsl(var(--chat-collab))] text-white hover:opacity-90"
                  disabled={!editable || !dirty || saving || busy || isLoading || isViewingHistory}
                  onClick={() => void onSave()}
                >
                  {saving || busy ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-1.5" />
                  )}
                  {saving ? "กำลังบันทึก…" : "บันทึก"}
                </Button>
              ) : null}

              {!isFinalSummary ? (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-[hsl(var(--chat-collab)/0.45)] text-[hsl(var(--chat-collab))]"
                  disabled={busy || isLoading || isViewingHistory}
                  onClick={() => void sendDiscussionTemplate()}
                >
                  {busy ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <MessageSquareText className="w-4 h-4 mr-1.5" />
                  )}
                  ส่งเทมเพลตลงแชท
                </Button>
              ) : (
                <Button
                  type="button"
                  className="rounded-full bg-[hsl(var(--chat-collab))] text-white hover:opacity-90"
                  disabled={busy || isLoading}
                  onClick={downloadCollabPdf}
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  ดาวน์โหลด PDF
                </Button>
              )}

              {pendingChange ? (
                <>
                  {!myChangeApproved ? (
                    <Button
                      type="button"
                      className="rounded-full bg-[hsl(var(--chat-collab))] text-white hover:opacity-90"
                      disabled={busy || isLoading}
                      onClick={() => void onApproveChange()}
                    >
                      {busy ? (
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 mr-1.5" strokeWidth={2.5} />
                      )}
                      อนุมัติให้แก้ไข
                    </Button>
                  ) : null}
                  {demoShortcuts ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full border-amber-500/45 text-amber-800 dark:text-amber-300"
                      disabled={busy || isLoading}
                      onClick={() => void onApproveChangeDemo()}
                      title="อนุมัติแทนทุกคน — ใช้ทดสอบ UX เท่านั้น"
                    >
                      อนุมัติ(demo)
                    </Button>
                  ) : null}
                </>
              ) : null}

              {doc.status === "step_locked" && !pendingChange ? (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  disabled={busy}
                  onClick={() => openChangeRequest(doc.currentStep)}
                >
                  <Unlock className="w-4 h-4 mr-1.5" />
                  ขออนุญาตแก้ไข
                </Button>
              ) : null}

              <div className="flex-1" />

              {(formStage.id === "align" || stage.id === "align") ? (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-[hsl(var(--chat-collab)/0.45)] text-[hsl(var(--chat-collab))]"
                  disabled={busy || isLoading}
                  onClick={previewCollabPdf}
                >
                  <Eye className="w-4 h-4 mr-1.5" />
                  ดูพรีวิวเอกสาร
                </Button>
              ) : null}

              {demoShortcuts && prevStepId(doc.currentStep) ? (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-[hsl(var(--chat-collab)/0.45)] text-[hsl(var(--chat-collab))]"
                  disabled={busy || isLoading}
                  onClick={() => void onRetreatDemo()}
                  title="ย้อนดูขั้นก่อนหน้า — ใช้ทดสอบ UX เท่านั้น"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  ย้อน(demo)
                </Button>
              ) : null}

              {canGoNext ? (
                <Button
                  type="button"
                  className="rounded-full bg-[hsl(var(--chat-collab))] text-white hover:opacity-90"
                  disabled={busy || isLoading || isViewingHistory}
                  onClick={() => void onAdvance()}
                >
                  ถัดไป
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : demoShortcuts && hasNextStep ? (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-[hsl(var(--chat-collab)/0.45)] text-[hsl(var(--chat-collab))]"
                  disabled={busy || isLoading}
                  onClick={() => void onAdvanceDemo()}
                  title="ข้ามการยืนยัน — ใช้ทดสอบ UX เท่านั้น"
                >
                  ถัดไป(demo)
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : hasNextStep ? (
                <Button
                  type="button"
                  className="rounded-full bg-[hsl(var(--chat-collab))] text-white hover:opacity-90"
                  disabled
                  title="ต้องให้สมาชิกทุกคนกดยืนยันครบก่อน"
                >
                  ถัดไป
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => onOpenChange(false)}
                >
                  ปิด
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="sm:max-w-md max-h-[70vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">ประวัติการทำแผน</DialogTitle>
            <DialogDescription className="text-xs">
              ใครบันทึก / ยืนยัน / ขอแก้ไข เมื่อไหร่
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 text-sm">
            {logs.length === 0 ? (
              <li className="text-muted-foreground text-xs py-6 text-center">ยังไม่มีประวัติ</li>
            ) : (
              logs.map((row) => {
                const meta = logActionMeta(row.action);
                return (
                  <li key={row.id} className="rounded-xl border border-border px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0 text-[10px] font-semibold leading-5",
                          meta.badgeClass,
                        )}
                      >
                        {meta.tag}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground leading-snug">
                          {meta.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
                          <span className="text-foreground/85 font-medium">
                            {formatLogActorName(row.actor_id, memberNameMap, user?.id)}
                          </span>
                          <span className="mx-1 text-border">·</span>
                          <span>
                            {new Date(row.created_at).toLocaleString("th-TH", {
                              dateStyle: "short",
                              timeStyle: "medium",
                            })}
                          </span>
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </DialogContent>
      </Dialog>

      <Dialog
        open={docPreviewOpen}
        onOpenChange={(next) => {
          setDocPreviewOpen(next);
          if (!next) {
            revokeDocPreviewUrl();
            setDocPreviewUrl(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-hidden rounded-2xl p-0 flex flex-col gap-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0 text-left">
            <DialogTitle className="text-base">พรีวิวเอกสารแผนคอลแลป</DialogTitle>
            <DialogDescription className="text-xs">
              ตัวอย่างจากข้อมูลที่กรอกแล้ว — กด「บันทึกเป็น PDF」เพื่อเก็บไฟล์
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 bg-muted/30 p-3">
            {docPreviewUrl ? (
              <iframe
                id="collab-doc-preview-frame"
                title="พรีวิวเอกสารแผนคอลแลป"
                src={docPreviewUrl}
                className="w-full h-[min(70vh,720px)] rounded-xl border border-border bg-white"
              />
            ) : (
              <div className="flex h-[min(70vh,720px)] items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
                กำลังโหลดพรีวิว…
              </div>
            )}
          </div>
          <div className="shrink-0 border-t border-border px-4 py-3 flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => setDocPreviewOpen(false)}
            >
              ปิด
            </Button>
            <Button
              type="button"
              className="rounded-full bg-[hsl(var(--chat-collab))] text-white hover:opacity-90"
              onClick={printDocPreview}
            >
              <Download className="w-4 h-4 mr-1.5" />
              บันทึกเป็น PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={changeOpen} onOpenChange={(open) => {
        setChangeOpen(open);
        if (!open) setChangeTarget(undefined);
      }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">ขออนุญาตแก้ไขแผน</DialogTitle>
            <DialogDescription className="text-xs">
              {changeTarget === "align" || doc.currentStep !== "align"
                ? "ขอแก้สรุปที่ตกลงไว้ — สมาชิกทุกคนต้องอนุมัติ แล้วจะกลับไปขั้นจัดแนวทาง"
                : "สมาชิกทุกคนในแชทต้องกดอนุมัติ จึงจะแก้รายละเอียดได้"}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={changeReason}
            onChange={(e) => setChangeReason(e.target.value)}
            placeholder="เหตุผลสั้น ๆ เช่น สโคปเปลี่ยน / ปรับไทม์ไลน์"
            rows={4}
            className="rounded-xl text-sm"
          />
          <Button
            type="button"
            className="rounded-full bg-[hsl(var(--chat-collab))] text-white"
            disabled={busy}
            onClick={() => void onRequestChange()}
          >
            {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
            ส่งคำขอ
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

function padToThree(items: string[]): string[] {
  if (items.length >= 3) return items;
  return [...items, ...Array(3 - items.length).fill("")];
}

function Field({
  label,
  value,
  onChange,
  disabled,
  rows = 4,
  className,
  placeholder = "พิมพ์รายละเอียดร่วมกัน…",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  rows?: number;
  className?: string;
  placeholder?: string;
}) {
  return (
    <div className={cn("space-y-1.5 flex flex-col", className)}>
      <label className="text-[11px] font-medium text-foreground">{label}</label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={rows}
        className="rounded-xl text-sm resize-y min-h-[100px] flex-1"
        placeholder={placeholder}
      />
    </div>
  );
}

function SummaryRow({
  label,
  value,
  clampLines,
}: {
  label: string;
  value: string;
  clampLines?: number;
}) {
  const text = value.trim();
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <p
        className={cn(
          "text-sm leading-snug whitespace-pre-wrap",
          text ? "text-foreground" : "text-muted-foreground/70",
          clampLines === 2 && "line-clamp-2 whitespace-normal",
        )}
      >
        {text || "—"}
      </p>
    </div>
  );
}

function CollabFinalSummary({
  payload,
  onDownloadPdf,
  publishPath,
  onGoPublish,
}: {
  payload: CollabPlanPayload;
  onDownloadPdf: () => void;
  publishPath?: string | null;
  onGoPublish: () => void;
}) {
  const finalLinks = payload.review.finalLinks ?? [];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[hsl(var(--chat-collab)/0.4)] bg-gradient-to-br from-[hsl(var(--chat-collab-soft))]/50 to-transparent p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1 min-w-0">
            <p className="text-base font-semibold text-foreground">สรุปแผนคอลแลป — ฉบับสมบูรณ์</p>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-lg flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 shrink-0 text-[hsl(var(--chat-collab))] mt-0.5" />
              <span>
                ทุกขั้นตกลงและยืนยันแล้ว · เอกสารสรุปสุดท้าย อ่านอย่างเดียว แก้ไขไม่ได้ ·
                ดาวน์โหลด PDF เก็บเป็นหลักฐานงานร่วม
              </span>
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 shrink-0 w-full sm:w-auto sm:min-w-[220px]">
            {publishPath ? (
              <Button
                type="button"
                className="h-16 rounded-[10px] text-sm font-semibold px-5 bg-[hsl(var(--chat-collab))] text-white hover:opacity-90"
                onClick={onGoPublish}
              >
                <Send className="w-5 h-5 mr-2 shrink-0" />
                ไปลงผลงานร่วมกันบนพอร์ต
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              className="rounded-[10px] bg-[hsl(var(--chat-collab))] text-white hover:opacity-90 shrink-0 h-9"
              onClick={onDownloadPdf}
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              ดาวน์โหลด PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/40 p-3.5 space-y-1">
        <p className="text-xs font-semibold text-foreground">1 · แผนที่ตกลง</p>
        <AgreedPlanSummary align={payload.align} />
      </div>

      <CreateProgressSummary create={payload.create} />

      <div className="rounded-2xl border border-[hsl(var(--chat-collab)/0.35)] bg-[hsl(var(--chat-collab-soft))]/20 p-3.5 space-y-3">
        <p className="text-xs font-semibold text-[hsl(var(--chat-collab))]">3 · ยืนยันสุดท้าย</p>
        {finalLinks.length ? (
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              ลิงก์ผลงานสุดท้าย
            </p>
            <ul className="space-y-1.5">
              {finalLinks.map((url) => (
                <li key={url}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-xs rounded-lg border border-border bg-background/60 px-2.5 py-2 text-[hsl(var(--chat-collab))] hover:underline font-mono break-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">— ไม่มีลิงก์ผลงานสุดท้าย</p>
        )}
      </div>
    </div>
  );
}

function CollapsiblePlanPanel({
  title,
  hint,
  collapsed,
  onToggle,
  preview,
  children,
  className,
}: {
  title: string;
  hint?: string;
  collapsed: boolean;
  onToggle: () => void;
  preview?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card/40 p-3.5 space-y-3", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">{title}</p>
          {hint ? (
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{hint}</p>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 w-8 rounded-full p-0 shrink-0 border-[hsl(var(--chat-collab)/0.45)] text-[hsl(var(--chat-collab))]"
          aria-expanded={!collapsed}
          aria-label={collapsed ? `กาง${title}` : `หุบ${title}`}
          onClick={onToggle}
        >
          {collapsed ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5" />
          )}
        </Button>
      </div>
      {collapsed ? preview : children}
    </div>
  );
}

function ProgressCollapsePreview({ step }: { step: CollabStepNotePayload }) {
  const entries = normalizeStepProgressEntries(step);
  const note = step.note.trim();
  const attachments = step.attachments ?? [];
  if (entries.length === 0 && !note && attachments.length === 0) {
    return (
      <p className="text-[11px] text-muted-foreground">
        ยังไม่มีโน้ตหรือภาพ WIP จากขั้นสร้างงาน
      </p>
    );
  }
  const confirmed = entries.filter(isProgressEntryConfirmed);
  const commentTotal = entries.reduce(
    (n, e) => n + countProgressComments(e.comments),
    0,
  );
  const latest = confirmed[confirmed.length - 1] ?? entries[entries.length - 1];
  const postCount = confirmed.length || entries.length;
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-muted-foreground">
        {postCount} โพสต์
        {commentTotal ? ` · ${commentTotal} คอมเมนต์` : ""}
      </p>
      {latest?.body.trim() ? (
        <p className="text-[12px] text-foreground line-clamp-2 leading-snug whitespace-pre-wrap">
          {latest.body.trim()}
        </p>
      ) : null}
    </div>
  );
}

function CreateProgressSummary({
  create,
  title = "ความคืบหน้าระหว่างทำ",
}: {
  create: CollabStepNotePayload;
  title?: string;
}) {
  const entries = normalizeStepProgressEntries(create);
  const note = create.note.trim();
  const attachments = create.attachments ?? [];
  if (entries.length === 0 && !note && attachments.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-3.5 py-4">
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground mt-1">ยังไม่มีโน้ตหรือภาพ WIP จากขั้นสร้างงาน</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-3.5 space-y-3">
      <p className="text-xs font-semibold text-foreground">{title}</p>
      {entries.length > 0 ? (
        <ul className="space-y-2.5">
          {entries.map((entry, i) => (
            <li
              key={entry.id}
              className="rounded-lg border border-border/70 bg-background/50 px-2.5 py-2 space-y-1.5"
            >
              <p className="text-[10px] font-medium text-[hsl(var(--chat-collab))]">
                #{String(i + 1).padStart(2, "0")} · {entry.date || "—"} · {entry.userName || "สมาชิก"}
                {entry.confirmedAt ? "" : " · ร่าง"}
              </p>
              {entry.body.trim() ? (
                <p className="text-[12px] text-foreground whitespace-pre-wrap leading-snug">
                  {entry.body}
                </p>
              ) : null}
              {entry.images.length ? (
                <div className="grid grid-cols-3 gap-1.5">
                  {entry.images.map((a) => (
                    <a
                      key={a.path}
                      href={storageMediaPublicUrl(a.path)}
                      target="_blank"
                      rel="noreferrer"
                      className="block aspect-square rounded-md border border-border overflow-hidden bg-muted"
                      title={a.name}
                    >
                      <img
                        src={storageMediaPublicUrl(a.path)}
                        alt={a.name}
                        className="w-full h-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              ) : null}
              {(entry.files ?? []).length ? (
                <ul className="space-y-0.5">
                  {(entry.files ?? []).map((f) => (
                    <li key={f.path} className="text-[11px] truncate">
                      <a
                        href={storageMediaPublicUrl(f.path)}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline text-[hsl(var(--chat-collab))]"
                      >
                        {f.name}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
              {entry.comments.length ? (
                <div className="space-y-1 pt-1 border-t border-border/60">
                  {entry.comments.map((c) => (
                    <p key={c.id} className="text-[10px] text-muted-foreground leading-snug">
                      <span className="font-medium text-foreground/80">{c.userName}</span>
                      {": "}
                      {c.text}
                    </p>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <>
          {note ? <SummaryRow label="โน้ตจากขั้นสร้างงาน" value={note} /> : null}
          {attachments.length ? (
            <div className="space-y-2">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                ภาพ WIP ({attachments.length})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {attachments.map((a) => (
                  <a
                    key={a.path}
                    href={storageMediaPublicUrl(a.path)}
                    target="_blank"
                    rel="noreferrer"
                    className="block aspect-square rounded-lg border border-border overflow-hidden bg-muted hover:opacity-90"
                    title={a.name}
                  >
                    <img
                      src={storageMediaPublicUrl(a.path)}
                      alt={a.name}
                      className="w-full h-full object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function RequiredMark() {
  return (
    <span className="text-[hsl(var(--chat-collab))] ml-0.5" aria-hidden="true">
      *
    </span>
  );
}

function AlignSectionHeading({
  icon: Icon,
  title,
  hint,
  required,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Icon className="w-4 h-4 text-[hsl(var(--chat-collab))] shrink-0" />
        {title}
        {required ? <RequiredMark /> : null}
      </h4>
      {hint ? (
        <p className="text-[10px] text-muted-foreground mt-0.5 pl-6">{hint}</p>
      ) : null}
    </div>
  );
}

function AgreedPlanSummary({
  align,
  collapsed = false,
}: {
  align: CollabAlignPayload;
  collapsed?: boolean;
}) {
  const dates = [
    align.draftAt ? `เริ่ม: ${align.draftAt.slice(0, 10)}` : null,
    align.dueAt ? `ส่ง: ${align.dueAt.slice(0, 10)}` : null,
    align.releaseAt ? `ลงผลงาน: ${align.releaseAt.slice(0, 10)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const timeline = [dates, align.timelineNote.trim()].filter(Boolean).join("\n");
  const overview = getAlignOverview(align);
  const deliverables = (align.deliverableItems?.length
    ? align.deliverableItems
    : align.deliverables
      ? align.deliverables.split("\n")
      : []
  )
    .map((t, i) => {
      const clean = t.replace(/^\s*\d+[\.\)\-]\s*/, "").trim();
      return clean ? `${i + 1}. ${clean}` : null;
    })
    .filter(Boolean)
    .join("\n");

  if (collapsed) {
    return (
      <div className="space-y-2.5">
        <SummaryRow label="ไอเดีย" value={overview} clampLines={2} />
        <SummaryRow label="Timeline" value={timeline} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SummaryRow label="ไอเดีย" value={overview} />
      {align.referenceLinks?.length ||
      align.portfolioRefs?.length ||
      align.attachments.length ? (
        <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            อ้างอิง
          </p>
          {align.referenceLinks?.length ? (
            <ul className="space-y-0.5">
              {align.referenceLinks.map((u) => (
                <li key={u}>
                  <a
                    href={u}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[hsl(var(--chat-collab))] hover:underline break-all"
                  >
                    {u}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          {align.portfolioRefs?.length ? (
            <p className="text-sm text-foreground">
              <span className="text-[10px] text-muted-foreground mr-1.5">พอร์ต:</span>
              {align.portfolioRefs.map((r) => r.title).join(" · ")}
            </p>
          ) : null}
          {align.attachments.length ? (
            <ul className="flex flex-wrap gap-1.5">
              {align.attachments.map((a) => (
                <li key={a.path}>
                  <a
                    href={storageMediaPublicUrl(a.path)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] px-2 py-1 rounded-full bg-muted text-[hsl(var(--chat-collab))] hover:underline"
                  >
                    {a.name}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      <SummaryRow label="Timeline" value={timeline} />
      <SummaryRow label="ชิ้นงานที่ต้องทำ" value={deliverables} />
      <SummaryRow label="สิทธิ์ / เครดิต" value={align.rights} />
    </div>
  );
}

function PortfolioThumb({
  coverUrl,
  title,
}: {
  coverUrl: string | null;
  title: string;
}) {
  const src = useSignedStorageUrl(coverUrl);
  return (
    <>
      {src ? (
        <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
      ) : (
        <div className="absolute inset-0 bg-muted" />
      )}
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1 py-0.5">
        <span className="block text-[9px] text-white truncate leading-tight">{title}</span>
      </span>
    </>
  );
}
