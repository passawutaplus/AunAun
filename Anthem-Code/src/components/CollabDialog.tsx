import { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthDialog } from "@/stores/authDialogStore";
import { z } from "zod";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ResponsiveOverlay } from "@/components/ui/ResponsiveOverlay";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Handshake, Sparkles, UserCircle2, Link2, MessageCircle, Loader2, Plus, X, ImagePlus, Images, Tags, MessageSquareText, Search } from "lucide-react";
import CatalogIcon from "@/components/icons/CatalogIcon";
import { toast } from "sonner";
import { mapWriteFlowError } from "@/lib/writeFlowErrors";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useMyProjects } from "@/hooks/useProjects";
import { useMyProjectSeries, useProjectSeriesItems } from "@/hooks/useProjectSeries";
import { CompactLoader } from "@/components/ui/BanterLoader";
import { useCreateCollabRequest } from "@/hooks/useCollabRequests";
import { useOpenHireCollabChat } from "@/hooks/useChat";
import { isUuid } from "@/lib/uuid";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_COLLAB_MESSAGE,
  type ChatEntrySource,
} from "@/lib/chatContext";
import { validateProjectInquiry } from "@/domain/inquiry";
import ProjectReferencePreview from "@/components/opportunity/ProjectReferencePreview";
import { trackProductEvent } from "@/lib/productEvents";
import { serializeCollabReferenceLinks, buildCollabInviteChatMessage } from "@/lib/collabBrief";
import { briefTemplateForTypes } from "@/lib/collabToolkit";
import { safeHttpUrl } from "@/lib/safeUrl";
import { FieldError } from "@/components/ui/FieldError";
import { isBlockedFromOpportunity } from "@/hooks/useCommunityPostInteractions";
import { uploadProjectImage } from "@/lib/uploadImage";

const COLLAB_TYPES = [
  { key: "chat", label: "พูดคุย" },
  { key: "joint-project", label: "ร่วมโปรเจกต์ใหม่" },
  { key: "skill-swap", label: "แลกเปลี่ยนสกิล" },
  { key: "experiment", label: "งานทดลอง / สะสมพอร์ต" },
  { key: "content", label: "คอนเทนต์ / โปรโมตร่วม" },
  { key: "other", label: "อื่นๆ" },
] as const;

const MAX_COLLAB_LINKS = 8;
const MAX_COLLAB_IMAGES = 3;

/** Normalize + allow only safe http(s) absolute URLs. */
function validateCollabLink(raw: string): string | null {
  let v = raw.trim();
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
  return safeHttpUrl(v) ?? null;
}

const DEFAULT_COLLAB_TYPE = "chat";
const RECENT_WORK_CARDS = 3;

type CollabWorkRef = {
  id: string;
  title: string;
  cover_url: string | null;
  category?: string | null;
  gallery_urls?: string[] | null;
};

function workThumb(p: CollabWorkRef) {
  return p.cover_url || p.gallery_urls?.[0] || null;
}

function CollabWorkCard({
  project,
  selected,
  onToggle,
}: {
  project: CollabWorkRef;
  selected: boolean;
  onToggle: () => void;
}) {
  const thumb = workThumb(project);
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      aria-label={selected ? `ยกเลิก ${project.title}` : `เลือก ${project.title}`}
      className={cn(
        "relative aspect-square rounded-xl overflow-hidden border-2 transition-all",
        selected ? "border-primary shadow-md" : "border-transparent hover:border-border",
      )}
    >
      {thumb ? (
        <img src={thumb} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground p-1 text-center">
          {project.title}
        </div>
      )}
      {selected && (
        <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
          <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
            <Check className="w-4 h-4" />
          </div>
        </div>
      )}
      <span className="absolute bottom-0 inset-x-0 bg-black/55 text-white text-[10px] px-1 py-0.5 truncate">
        {project.title}
      </span>
    </button>
  );
}

function CollabCatalogThumb({
  title,
  coverUrl,
  covers,
  count,
  selected,
  onSelect,
  all,
}: {
  title: string;
  coverUrl?: string | null;
  covers?: string[];
  count?: number;
  selected: boolean;
  onSelect: () => void;
  all?: boolean;
}) {
  const custom = coverUrl?.trim() || null;
  const collage = !custom && (covers?.length ?? 0) > 1 ? covers!.slice(0, 4) : null;
  const thumb = custom || (!collage ? covers?.[0] || null : null);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="flex min-w-0 flex-col gap-1 text-left"
    >
      <div
        className={cn(
          "relative aspect-square w-full overflow-hidden rounded-lg border-2 bg-muted",
          selected ? "border-primary shadow-sm" : "border-transparent",
        )}
      >
        {thumb ? (
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : collage ? (
          <div className="grid h-full grid-cols-2 grid-rows-2 gap-px">
            {collage.map((url, i) => (
              <img key={i} src={url} alt="" className="h-full w-full object-cover" />
            ))}
          </div>
        ) : (
          <div className="grid h-full place-items-center text-primary">
            {all ? <Images className="h-5 w-5" /> : <CatalogIcon className="h-5 w-5" />}
          </div>
        )}
        {selected ? (
          <div className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
            <Check className="h-2.5 w-2.5 text-primary-foreground" />
          </div>
        ) : null}
      </div>
      <span className="truncate text-[10px] font-medium leading-tight">{title}</span>
      {count != null ? (
        <span className="text-[9px] leading-none text-muted-foreground">{count} ชิ้น</span>
      ) : null}
    </button>
  );
}

function CollabWorkRow({
  project,
  selected,
  onToggle,
}: {
  project: CollabWorkRef;
  selected: boolean;
  onToggle: () => void;
}) {
  const thumb = workThumb(project);
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      aria-label={selected ? `ยกเลิก ${project.title}` : `เลือก ${project.title}`}
      className={cn(
        "w-full flex items-center gap-3 p-2 rounded-lg border text-left transition-all",
        selected ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted hover:border-border",
      )}
    >
      <div className="w-12 h-12 shrink-0 rounded-md overflow-hidden bg-muted">
        {thumb ? (
          <img src={thumb} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground p-1 text-center">
            {project.title}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{project.title}</p>
        {project.category ? (
          <p className="text-[10px] text-muted-foreground truncate">{project.category}</p>
        ) : null}
      </div>
      <div
        className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
          selected ? "bg-primary border-primary" : "border-border",
        )}
      >
        {selected && <Check className="w-3 h-3 text-primary-foreground" />}
      </div>
    </button>
  );
}

type CollabFieldErrorKey = "attached" | "collabTypes" | "otherNote";

const collabDetailsSchema = z
  .object({
    collabTypes: z
      .array(z.string())
      .min(1, "เลือกประเภทการร่วมงานอย่างน้อย 1 แบบ")
      .max(1, "เลือกได้เพียง 1 แบบ"),
    message: z.string().trim().max(1000),
    attached: z
      .array(z.string())
      .min(1, "เลือกอ้างอิงผลงานของตัวเองอย่างน้อย 1 ชิ้น")
      .max(3, "แนบได้สูงสุด 3 ชิ้น"),
    referenceLinks: z.array(z.string()).max(MAX_COLLAB_LINKS, `ใส่ลิงก์ได้สูงสุด ${MAX_COLLAB_LINKS} อัน`),
    otherTypeNote: z.string().trim().max(80).optional(),
  })
  .refine(
    (d) => !d.collabTypes.includes("other") || (d.otherTypeNote && d.otherTypeNote.length > 0),
    { message: "กรุณาระบุประเภท 'อื่นๆ'", path: ["otherTypeNote"] },
  )
  .refine(
    (d) => d.referenceLinks.every((u) => !!safeHttpUrl(u)),
    { message: "มีลิงก์ที่ไม่ปลอดภัย", path: ["referenceLinks"] },
  );

interface CollabDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientId?: string;
  recipientName: string;
  projectId?: string;
  projectTitle?: string;
  projectCoverUrl?: string | null;
  source?: ChatEntrySource;
}

const CollabDialog = ({
  open,
  onOpenChange,
  recipientId,
  recipientName,
  projectId,
  projectTitle,
  projectCoverUrl,
  source = "project",
}: CollabDialogProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: myProjects = [] } = useMyProjects(user?.id);
  const { data: mySeries = [], isLoading: catalogsLoading } = useMyProjectSeries(
    open ? user?.id : undefined,
  );
  const createReq = useCreateCollabRequest();
  const openChat = useOpenHireCollabChat();

  const [selectedTypes, setSelectedTypes] = useState<string[]>([DEFAULT_COLLAB_TYPE]);
  const [otherNote, setOtherNote] = useState("");
  const [message, setMessage] = useState(() => briefTemplateForTypes([DEFAULT_COLLAB_TYPE])?.body ?? "");
  const [messageTouched, setMessageTouched] = useState(false);
  const [attached, setAttached] = useState<string[]>([]);
  const [linkDraft, setLinkDraft] = useState("");
  const [referenceLinks, setReferenceLinks] = useState<string[]>([]);
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<CollabFieldErrorKey, string>>>({});
  const [workCatalogOpen, setWorkCatalogOpen] = useState(false);
  const [workQuery, setWorkQuery] = useState("");
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);
  const busy = createReq.isPending || openChat.isPending || uploadingAttachment;

  useEffect(() => {
    if (!open) return;
    setSelectedTypes((prev) => (prev.length === 1 ? prev : [DEFAULT_COLLAB_TYPE]));
    setMessageTouched(false);
    setMessage(briefTemplateForTypes([DEFAULT_COLLAB_TYPE])?.body ?? "");
    setFieldErrors({});
    void trackProductEvent(
      "collab_open",
      { project_id: projectId ?? null, recipient_id: recipientId, source },
      { debounceMs: 1_000 },
    );
  }, [open, projectId, recipientId, source]);

  const published = useMemo(
    () =>
      myProjects
        .filter((p) => p.status === "Published")
        .slice()
        .sort((a, b) => {
          const tb = new Date(b.created_at ?? 0).getTime();
          const ta = new Date(a.created_at ?? 0).getTime();
          return tb - ta;
        }),
    [myProjects],
  );
  const previewWorks = useMemo(() => {
    const recent = published.slice(0, RECENT_WORK_CARDS);
    if (attached.length === 0) return recent;

    const byId = new Map(published.map((p) => [p.id, p]));
    const selected = attached
      .map((id) => byId.get(id))
      .filter((p): p is (typeof published)[number] => !!p);
    const recentIds = new Set(recent.map((p) => p.id));
    const extras = selected.filter((p) => !recentIds.has(p.id));
    if (extras.length === 0) return recent;

    const next = [...recent];
    let extraIdx = 0;
    for (let i = 0; i < next.length && extraIdx < extras.length; i += 1) {
      if (!attached.includes(next[i].id)) {
        next[i] = extras[extraIdx];
        extraIdx += 1;
      }
    }
    return next;
  }, [published, attached]);
  const catalogs = useMemo(
    () => mySeries.filter((s) => (s.published_count ?? 0) > 0),
    [mySeries],
  );
  const { data: catalogItems = [], isLoading: catalogItemsLoading } = useProjectSeriesItems(
    workCatalogOpen ? selectedCatalogId ?? undefined : undefined,
  );
  const catalogFiltered = useMemo(() => {
    const q = workQuery.trim().toLowerCase();
    let list = published;
    if (selectedCatalogId) {
      const ids = new Set(catalogItems.map((item) => item.project_id));
      list = published.filter((p) => ids.has(p.id));
    }
    if (!q) return list;
    return list.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q)),
    );
  }, [published, workQuery, selectedCatalogId, catalogItems]);
  const selectedCatalog = catalogs.find((s) => s.id === selectedCatalogId) ?? null;
  const otherSelected = selectedTypes.includes("other");

  const reset = () => {
    setSelectedTypes([DEFAULT_COLLAB_TYPE]);
    setOtherNote("");
    setMessage(briefTemplateForTypes([DEFAULT_COLLAB_TYPE])?.body ?? "");
    setMessageTouched(false);
    setAttached([]);
    setLinkDraft("");
    setReferenceLinks([]);
    setAttachmentUrls([]);
    setUploadingAttachment(false);
    setSubmitError(null);
    setFieldErrors({});
    setWorkCatalogOpen(false);
    setWorkQuery("");
    setSelectedCatalogId(null);
  };

  const clearFieldError = (key: CollabFieldErrorKey) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const scrollToField = (id: string) => {
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const selectType = (key: string) => {
    setSelectedTypes([key]);
    if (key !== "other") setOtherNote("");
    clearFieldError("collabTypes");
    clearFieldError("otherNote");
    if (!messageTouched) {
      const tpl = briefTemplateForTypes([key]);
      if (tpl) setMessage(tpl.body);
    }
  };

  const toggleAttach = (id: string) => {
    clearFieldError("attached");
    setAttached((s) => {
      if (s.includes(id)) return s.filter((x) => x !== id);
      if (s.length >= 3) {
        toast.info("แนบได้สูงสุด 3 ชิ้น");
        return s;
      }
      return [...s, id];
    });
  };

  const addReferenceLink = () => {
    const safe = validateCollabLink(linkDraft);
    if (!safe) {
      toast.error("ลิงก์ไม่ปลอดภัยหรือไม่ถูกต้อง — ใช้เฉพาะ http/https");
      return;
    }
    if (referenceLinks.includes(safe)) {
      toast.info("ลิงก์นี้เพิ่มแล้ว");
      return;
    }
    if (referenceLinks.length >= MAX_COLLAB_LINKS) {
      toast.info(`ใส่ลิงก์ได้สูงสุด ${MAX_COLLAB_LINKS} อัน`);
      return;
    }
    setReferenceLinks((prev) => [...prev, safe]);
    setLinkDraft("");
  };

  const onPickAttachments = async (files: FileList | null) => {
    if (!files?.length || !user) return;
    const slots = MAX_COLLAB_IMAGES - attachmentUrls.length;
    if (slots <= 0) {
      toast.info(`แนบภาพได้สูงสุด ${MAX_COLLAB_IMAGES} รูป`);
      return;
    }
    setUploadingAttachment(true);
    try {
      const added: string[] = [];
      for (const file of Array.from(files).slice(0, slots)) {
        const url = await uploadProjectImage(file, user.id, "collab-brief", "free", {
          fastQuotaCheck: true,
        });
        added.push(url);
      }
      setAttachmentUrls((prev) => [...prev, ...added]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setUploadingAttachment(false);
      if (attachmentInputRef.current) attachmentInputRef.current.value = "";
    }
  };

  const submitCollab = async () => {
    if (!user) {
      onOpenChange(false);
      useAuthDialog.getState().openSignup();
      return;
    }
    if (!recipientId || !isUuid(recipientId)) {
      toast.error("ผลงานนี้ยังไม่มีเจ้าของในระบบ — ไม่สามารถส่งคำขอได้");
      return;
    }
    if (recipientId === user.id) {
      toast.info("ส่งคำขอให้ตัวเองไม่ได้");
      return;
    }

    try {
      if (await isBlockedFromOpportunity(user.id, recipientId)) {
        toast.error("คุณถูกบล็อก — ส่งคำขอคอลแลปไปยังผู้ใช้นี้ไม่ได้");
        return;
      }
    } catch {
      /* fall through to server check */
    }

    const inquiryErr = validateProjectInquiry({ source, projectId });
    if (inquiryErr) {
      toast.error(inquiryErr);
      return;
    }

    if (published.length === 0) {
      toast.error("ต้องมีผลงานที่เผยแพร่ก่อน — ไปโพสต์ผลงานแล้วค่อยชวนคอลแลป");
      scrollToField("collab-attached-section");
      return;
    }

    const nextErrors: Partial<Record<CollabFieldErrorKey, string>> = {};
    if (attached.length === 0) {
      nextErrors.attached = "เลือกอ้างอิงผลงานของตัวเองอย่างน้อย 1 ชิ้น";
    }
    if (selectedTypes.length !== 1) {
      nextErrors.collabTypes = "เลือกประเภทการร่วมงาน 1 แบบ";
    }
    if (otherSelected && !otherNote.trim()) {
      nextErrors.otherNote = "กรุณาระบุประเภท 'อื่นๆ'";
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      const firstMsg =
        nextErrors.attached ||
        nextErrors.collabTypes ||
        nextErrors.otherNote ||
        "กรุณากรอกข้อมูลที่บังคับ";
      toast.error(firstMsg);
      const focusId = nextErrors.attached
        ? "collab-attached-section"
        : nextErrors.collabTypes
          ? "collab-types-section"
          : "collab-other-note";
      scrollToField(focusId);
      return;
    }
    setFieldErrors({});

    const parsed = collabDetailsSchema.safeParse({
      collabTypes: selectedTypes,
      message,
      attached,
      referenceLinks,
      otherTypeNote: otherNote,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
      return;
    }

    const payload = {
      collabTypes: parsed.data.collabTypes,
      message: parsed.data.message.trim() || DEFAULT_COLLAB_MESSAGE,
      attached: parsed.data.attached,
      referenceLinks: parsed.data.referenceLinks,
      otherTypeNote: otherSelected ? (parsed.data.otherTypeNote || undefined) : undefined,
    };

    let finalMessage = payload.message;
    if (attachmentUrls.length) {
      finalMessage += `\n\n---\nแนบภาพ:\n${attachmentUrls.join("\n")}`;
    }

    setSubmitError(null);
    try {
      const created = await createReq.mutateAsync({
        sender_id: user.id,
        recipient_id: recipientId,
        project_id: projectId && isUuid(projectId) ? projectId : null,
        collab_types: payload.collabTypes,
        message: finalMessage,
        attached_project_ids: payload.attached,
        external_drive_url: serializeCollabReferenceLinks(payload.referenceLinks) || null,
        website_url: null,
        other_type_note: payload.otherTypeNote ?? null,
      });
      void supabase.functions.invoke("notify-anthem-collab", {
        body: { request_id: created.id },
      });

      const title = projectTitle ?? (source === "profile" ? recipientName : "คอลแลป");
      const convId = await openChat.mutateAsync({
        kind: "collab",
        requestId: created.id,
        clientId: user.id,
        freelancerId: recipientId,
        projectId: projectId && isUuid(projectId) ? projectId : null,
        projectTitle: title,
        contextMessage: buildCollabInviteChatMessage({
          project_title: source === "project" ? title : null,
          message: finalMessage,
          collab_types: payload.collabTypes,
          timeline: null,
          sender_name: profile.display_name ?? null,
          sender_username: profile.username ?? null,
        }),
      });

      toast.success(`เปิดแชทกับ ${recipientName} แล้ว`);
      void trackProductEvent(
        "collab_submit",
        { project_id: projectId ?? null, recipient_id: recipientId, source },
        { debounceMs: 0 },
      );
      reset();
      onOpenChange(false);
      navigate(`/chat/${convId}`);
    } catch (err) {
      const msg = mapWriteFlowError(err, "ส่งคำขอไม่สำเร็จ");
      setSubmitError(msg);
      toast.error(msg);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitCollab();
  };

  return (
    <>
    <ResponsiveOverlay
      open={open}
      onOpenChange={(o) => {
        if (!o && workCatalogOpen) return;
        if (!o) reset();
        onOpenChange(o);
      }}
      accessibleTitle="Collaboration Request"
      desktopClassName="max-w-xl max-h-[90vh] rounded-3xl border-primary/20"
      bodyClassName="gap-4 pt-2"
      showGrabHandle
    >
        <DialogHeader className="space-y-2 text-left">
          <Handshake className="h-8 w-8 text-primary" aria-hidden />
          <DialogTitle className="text-2xl leading-tight tracking-tight sm:text-[1.75rem]">
            Collaboration Request
          </DialogTitle>
          {source === "profile" ? (
            <DialogDescription className="text-sm leading-6">
              จากโปรไฟล์{" "}
              <span className="text-foreground font-medium">{recipientName}</span>
            </DialogDescription>
          ) : (
            <DialogDescription className="sr-only">ชวนร่วมงานคอลแลป</DialogDescription>
          )}
        </DialogHeader>

        {source === "project" && projectTitle && (
          <ProjectReferencePreview
            title={projectTitle}
            coverUrl={projectCoverUrl}
            label="เริ่มจากผลงาน"
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {user && profile && (
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> สิ่งที่อีกฝั่งจะเห็น
                </span>
                <a href="/settings" onClick={() => onOpenChange(false)} className="text-xs text-primary hover:underline">แก้โปรไฟล์</a>
              </div>
              <div className="flex items-center gap-3">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center text-primary">
                    <UserCircle2 className="w-7 h-7" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{profile.display_name || "ยังไม่ได้ตั้งชื่อ"}</p>
                  {profile.role && <p className="text-xs text-muted-foreground truncate">{profile.role}</p>}
                  {profile.skills && profile.skills.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {profile.skills.slice(0, 4).map((s) => (
                        <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div
            id="collab-attached-section"
            className={cn(
              "rounded-2xl transition-shadow",
              fieldErrors.attached && "ring-2 ring-destructive ring-offset-2 ring-offset-background",
            )}
          >
            <Label className="flex items-center gap-1.5 text-sm font-semibold">
              <Images className="h-3.5 w-3.5 text-primary" />
              อ้างอิงผลงานของฉัน
              <span className="text-primary font-normal"> *</span>
            </Label>
            {fieldErrors.attached ? (
              <FieldError className="mt-1.5 mb-2" message={fieldErrors.attached} />
            ) : null}

            {published.length === 0 ? (
              <div className="mt-2.5 flex items-stretch gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    navigate("/portfolio/new");
                  }}
                  className={cn(
                    "aspect-square w-[4.75rem] shrink-0 rounded-xl border-2 border-dashed border-primary/45",
                    "bg-primary/5 hover:bg-primary/10 transition-colors",
                    "flex flex-col items-center justify-center gap-1 px-1 text-center",
                  )}
                  aria-label="ไปลงผลงานก่อน"
                >
                  <ImagePlus className="w-4 h-4 text-primary/80" />
                  <span className="text-[9px] leading-tight text-muted-foreground">ลงผลงาน</span>
                </button>
                <div className="min-w-0 flex-1 flex flex-col justify-center gap-2 py-0.5">
                  <p className="text-sm text-foreground leading-snug">
                    ยังไม่ได้ลงผลงาน — ลงอย่างน้อย 1 ชิ้นก่อน ถึงจะกด「แชทเลย」ได้
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-full w-fit"
                    onClick={() => {
                      onOpenChange(false);
                      navigate("/portfolio/new");
                    }}
                  >
                    ไปลงผลงานก่อน
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-2.5 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  {previewWorks.map((p) => (
                    <CollabWorkCard
                      key={p.id}
                      project={p}
                      selected={attached.includes(p.id)}
                      onToggle={() => toggleAttach(p.id)}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground">
                    เลือกแล้ว {attached.length}/3
                  </p>
                  {published.length > RECENT_WORK_CARDS ? (
                    <button
                      type="button"
                      onClick={() => setWorkCatalogOpen(true)}
                      className="rounded-sm text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      ดูทั้งหมด ({published.length})
                    </button>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          <div
            id="collab-types-section"
            className={cn(
              "border-t border-border/60 pt-5 rounded-2xl transition-shadow",
              fieldErrors.collabTypes && "ring-2 ring-destructive ring-offset-2 ring-offset-background",
            )}
          >
            <Label className="flex items-center gap-1.5 text-sm font-semibold">
              <Tags className="h-3.5 w-3.5 text-primary" />
              อยากร่วมงานแบบไหน
              <span className="text-primary font-normal"> *</span>
            </Label>
            {fieldErrors.collabTypes ? (
              <FieldError className="mt-1.5 mb-2" message={fieldErrors.collabTypes} />
            ) : null}
            <div className="mt-2.5 flex flex-wrap gap-2">
              {COLLAB_TYPES.map((t) => {
                const on = selectedTypes.includes(t.key);
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => selectType(t.key)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all",
                      on
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-card text-foreground border-border hover:border-primary/40",
                    )}
                  >
                    {on && <Check className="w-3 h-3 inline mr-1 -mt-0.5" />}
                    {t.label}
                  </button>
                );
              })}
            </div>
            {otherSelected && (
              <Input
                id="collab-other-note"
                value={otherNote}
                onChange={(e) => {
                  setOtherNote(e.target.value);
                  clearFieldError("otherNote");
                }}
                placeholder="ระบุประเภทที่อยากร่วมงาน เช่น เวิร์กชอป, นิทรรศการ"
                maxLength={80}
                className={cn(
                  "mt-2.5 rounded-xl",
                  fieldErrors.otherNote && "border-destructive focus-visible:ring-destructive",
                )}
                aria-invalid={!!fieldErrors.otherNote}
              />
            )}
            {fieldErrors.otherNote ? (
              <FieldError className="mt-1.5" message={fieldErrors.otherNote} />
            ) : null}
          </div>

          <div className="border-t border-border/60 pt-5">
            <Label htmlFor="collab-link-draft" className="text-sm font-semibold flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-primary" /> ลิงก์อ้างอิง (ไดรฟ์ / เว็บ / พอร์ต)
              <span className="text-muted-foreground font-normal"> (ไม่บังคับ)</span>
            </Label>
            <div className="mt-2.5 flex gap-2">
              <Input
                id="collab-link-draft"
                type="url"
                value={linkDraft}
                onChange={(e) => setLinkDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addReferenceLink();
                  }
                }}
                placeholder="https://drive.google.com/..."
                maxLength={500}
                className="rounded-xl font-mono text-xs"
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="rounded-xl shrink-0 h-10 w-10"
                onClick={addReferenceLink}
                aria-label="เพิ่มลิงก์"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {referenceLinks.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {referenceLinks.map((url) => (
                  <li
                    key={url}
                    className="flex items-center gap-2 rounded-xl border border-border bg-muted/20 px-2.5 py-2 text-xs"
                  >
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600"
                      title="ลิงก์ปลอดภัย"
                    >
                      <Check className="w-3 h-3" strokeWidth={2.5} />
                    </span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 flex-1 truncate font-mono text-foreground hover:underline"
                    >
                      {url}
                    </a>
                    <button
                      type="button"
                      aria-label="ลบลิงก์"
                      className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() => setReferenceLinks((prev) => prev.filter((u) => u !== url))}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-border/60 pt-5">
            <Label className="flex items-center gap-1.5 text-sm font-semibold">
              <ImagePlus className="h-3.5 w-3.5 text-primary" />
              แนบภาพอ้างอิง
              <span className="text-muted-foreground font-normal"> (ไม่บังคับ)</span>
            </Label>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {attachmentUrls.map((url) => (
                <div
                  key={url}
                  className="relative h-16 w-16 overflow-hidden rounded-lg border border-border"
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    aria-label="ลบรูป"
                    className="absolute right-0.5 top-0.5 rounded-full bg-background/80 p-0.5"
                    onClick={() =>
                      setAttachmentUrls((prev) => prev.filter((u) => u !== url))
                    }
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {attachmentUrls.length < MAX_COLLAB_IMAGES && user ? (
                <button
                  type="button"
                  disabled={uploadingAttachment}
                  onClick={() => attachmentInputRef.current?.click()}
                  className="flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-border text-[10px] text-muted-foreground hover:bg-muted/50"
                >
                  {uploadingAttachment ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  เพิ่มรูป
                </button>
              ) : null}
            </div>
            <input
              ref={attachmentInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => void onPickAttachments(e.target.files)}
            />
          </div>

          <div className="border-t border-border/60 pt-5">
            <Label htmlFor="collab-msg" className="flex items-center gap-1.5 text-sm font-semibold">
              <MessageSquareText className="h-3.5 w-3.5 text-primary" />
              ข้อความถึง {recipientName}
              <span className="text-muted-foreground font-normal"> (ไม่บังคับ)</span>
            </Label>
            <Textarea
              id="collab-msg"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setMessageTouched(true);
              }}
              rows={5}
              maxLength={1000}
              className="mt-1.5 rounded-xl text-sm"
            />
            <p className="text-[10px] text-muted-foreground text-right mt-1">{message.length}/1000</p>
          </div>

          {!user && (
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 text-xs text-foreground/80">
              ต้องเข้าสู่ระบบก่อนเพื่อส่งคำขอร่วมงาน
            </div>
          )}

          {submitError && (
            <p className="text-sm text-destructive rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2" role="alert">
              {submitError}
            </p>
          )}

          <p className="text-[11px] leading-relaxed text-muted-foreground border-t border-border/40 pt-3">
            ไม่ใช่การจ้างงาน — ต้องอ้างอิงผลงานของตัวเองอย่างน้อย 1 ชิ้น รายละเอียดอื่นเติมได้ถ้าต้องการ
          </p>

          <DialogFooter className="gap-2 sm:justify-end pt-2">
            <Button
              type="submit"
              disabled={busy}
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
              {!user
                ? "เข้าสู่ระบบเพื่อแชท"
                : busy
                  ? "กำลังเปิดแชท..."
                  : "แชทเลย"}
            </Button>
          </DialogFooter>
        </form>
    </ResponsiveOverlay>

    <ResponsiveOverlay
      open={open && workCatalogOpen}
      onOpenChange={(o) => {
        setWorkCatalogOpen(o);
        if (!o) {
          setWorkQuery("");
          setSelectedCatalogId(null);
        }
      }}
      title={
        <span className="inline-flex items-center gap-2">
          <CatalogIcon className="h-4 w-4 text-primary" />
          เลือกผลงานจาก Catalog
        </span>
      }
      accessibleTitle="เลือกผลงานจาก Catalog"
      desktopClassName="max-w-lg max-h-[85vh] rounded-3xl"
      bodyClassName="gap-0 pt-3"
      showGrabHandle
      stacked
    >
      <div className="sticky top-0 z-10 bg-background pb-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={workQuery}
            onChange={(e) => setWorkQuery(e.target.value)}
            placeholder="ค้นหาใน Catalog"
            className="h-10 rounded-xl pl-9"
            aria-label="ค้นหาใน Catalog"
          />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          เลือกได้สูงสุด 3 ชิ้น · เลือกแล้ว {attached.length}/3
        </p>
      </div>

      {catalogsLoading ? (
        <CompactLoader label="กำลังโหลด Catalog…" className="py-4" />
      ) : catalogs.length > 0 ? (
        <section className="pb-4">
          <p className="mb-2 text-xs font-semibold text-foreground">Catalog</p>
          <div className="grid grid-cols-4 gap-2">
            <CollabCatalogThumb
              title="ทั้งหมด"
              count={published.length}
              selected={!selectedCatalogId}
              onSelect={() => setSelectedCatalogId(null)}
              all
            />
            {catalogs.map((series) => (
              <CollabCatalogThumb
                key={series.id}
                title={series.title}
                coverUrl={series.cover_url}
                covers={series.covers}
                count={series.published_count ?? series.item_count}
                selected={selectedCatalogId === series.id}
                onSelect={() =>
                  setSelectedCatalogId((id) => (id === series.id ? null : series.id))
                }
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="pb-2">
        <p className="mb-2 text-xs font-semibold text-foreground">
          {selectedCatalog ? selectedCatalog.title : "ผลงานทั้งหมด"}
        </p>
        {selectedCatalogId && catalogItemsLoading ? (
          <CompactLoader label="กำลังโหลดผลงาน…" className="py-6" />
        ) : catalogFiltered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {workQuery.trim() ? "ไม่พบผลงานที่ตรงกับคำค้น" : "ยังไม่มีผลงานในหมวดนี้"}
          </p>
        ) : (
          <div className="space-y-1">
            {catalogFiltered.map((p) => (
              <CollabWorkRow
                key={p.id}
                project={p}
                selected={attached.includes(p.id)}
                onToggle={() => toggleAttach(p.id)}
              />
            ))}
          </div>
        )}
      </section>

      <div className="sticky bottom-0 bg-background pt-2">
        <Button
          type="button"
          className="w-full rounded-full"
          onClick={() => {
            setWorkCatalogOpen(false);
            setWorkQuery("");
            setSelectedCatalogId(null);
          }}
        >
          เสร็จแล้ว
        </Button>
      </div>
    </ResponsiveOverlay>
    </>
  );
};

export default CollabDialog;
