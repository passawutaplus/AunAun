import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Briefcase, ChevronLeft, ChevronRight, Eye, ImagePlus, Loader2, Plus, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { CommunityImageCropDialog } from "@/components/community/CommunityImageCropDialog";
import ServiceDetailDialog from "@/components/services/ServiceDetailDialog";
import PackageGallerySortableStrip from "@/components/services/PackageGallerySortableStrip";
import PackagePublishAttestation from "@/components/services/PackagePublishAttestation";
import { ProjectTaxonomyPicker } from "@/components/project/ProjectTaxonomyPicker";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { BackButton } from "@/components/ui/BackButton";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import {
  CREATOR_SERVICES_GALLERY_MAX,
  type CreatorService,
  type CreatorServiceInput,
  type CreatorServiceStatus,
} from "@/hooks/useCreatorServices";
import {
  inferTaxonomySelection,
  mergeCategorySubTag,
  resolveDbCategory,
  type CategoryParentId,
} from "@/data/categoryTaxonomy";
import { uploadProjectImage } from "@/lib/uploadImage";
import { uploadProjectVideo } from "@/lib/uploadVideo";
import { isVideoFile, isVideoUrl, PROJECT_VIDEO_ACCEPT } from "@/lib/videoAccept";
import {
  isAllowedPortfolioImage,
  isAllowedPortfolioStillImage,
  PORTFOLIO_IMAGE_ACCEPT,
  PORTFOLIO_IMAGE_FORMAT_HINT,
  PORTFOLIO_STILL_IMAGE_ACCEPT,
} from "@/lib/normalizeImageUpload";
import ServicePackageWorksPicker from "@/components/services/ServicePackageWorksPicker";
import { cn } from "@/lib/utils";

const PACKAGE_COVER_ACCEPT = PORTFOLIO_STILL_IMAGE_ACCEPT;
const PACKAGE_SLIDE_ACCEPT = `${PORTFOLIO_IMAGE_ACCEPT},${PROJECT_VIDEO_ACCEPT}`;
const PACKAGE_COVER_HINT = "JPG หรือ PNG · อัตราส่วน 4:3";

function ReqAsterisk() {
  return <span className="text-primary">*</span>;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: CreatorService | null;
  busy?: boolean;
  deleteBusy?: boolean;
  /** dialog = modal (legacy); page = full workspace editor */
  layout?: "dialog" | "page";
  onSubmit: (patch: CreatorServiceInput, id?: string) => Promise<void>;
  /** When editing an existing package — permanent delete */
  onDelete?: (id: string) => Promise<void>;
};

const empty = (): CreatorServiceInput => ({
  title: "",
  price_thb: 0,
  price_min_thb: 0,
  summary: "",
  deliverables: ["", "", ""],
  duration_label: "",
  concepts_label: "",
  revisions_label: "",
  exclusions_note: "",
  cover_url: "",
  gallery_urls: [],
  category: "",
  tags: [],
  reference_project_ids: [],
  status: "Draft",
});

function sameList(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

export default function ServiceEditorDialog({
  open,
  onOpenChange,
  initial,
  busy,
  deleteBusy,
  layout = "dialog",
  onSubmit,
  onDelete,
}: Props) {
  const isPage = layout === "page";
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<CreatorServiceInput>(empty());
  const [deliverables, setDeliverables] = useState<string[]>(["", "", ""]);
  const [categoryParentId, setCategoryParentId] = useState<CategoryParentId | null>(null);
  const [categorySubId, setCategorySubId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteAskOpen, setDeleteAskOpen] = useState(false);
  const [exitAskOpen, setExitAskOpen] = useState(false);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [publishAttestChecked, setPublishAttestChecked] = useState(false);
  const [publishChecklist, setPublishChecklist] = useState<string[]>([]);
  const [publishChecklistTick, setPublishChecklistTick] = useState(0);
  const [publishPopupOpaque, setPublishPopupOpaque] = useState(false);
  const [gallerySlideIdx, setGallerySlideIdx] = useState(0);
  const [baseline, setBaseline] = useState<{
    form: CreatorServiceInput;
    deliverables: string[];
  } | null>(null);

  useEffect(() => {
    if (!isPage && !open) return;
    const nextForm = initial
      ? {
          title: initial.title,
          price_thb: initial.price_thb,
          price_min_thb: initial.price_min_thb || initial.price_thb,
          summary: initial.summary,
          deliverables: initial.deliverables,
          duration_label: initial.duration_label.replace(/[^\d]/g, ""),
          concepts_label: "",
          revisions_label: initial.revisions_label?.replace(/[^\d]/g, "") ?? "",
          exclusions_note: initial.exclusions_note ?? "",
          cover_url: initial.cover_url ?? "",
          gallery_urls: initial.gallery_urls ?? [],
          category: initial.category ?? "",
          tags: initial.tags ?? [],
          reference_project_ids: initial.reference_project_ids ?? [],
          status: initial.status,
        }
      : empty();
    const nextDel = initial?.deliverables?.length
      ? [...initial.deliverables]
      : ["", "", ""];
    while (nextDel.length < 3) nextDel.push("");
    const inferred = inferTaxonomySelection(nextForm.category, nextForm.tags);
    nextForm.tags = mergeCategorySubTag([], inferred.subId);
    setForm(nextForm);
    setDeliverables(nextDel);
    setCategoryParentId(inferred.parentId);
    setCategorySubId(inferred.subId);
    setBaseline({ form: nextForm, deliverables: nextDel });
    setExitAskOpen(false);
    setPublishConfirmOpen(false);
    setPublishAttestChecked(false);
    setPublishChecklist([]);
    setGallerySlideIdx(0);
  }, [open, initial, isPage]);

  const gallery = form.gallery_urls ?? [];

  useEffect(() => {
    if (gallerySlideIdx >= gallery.length) {
      setGallerySlideIdx(Math.max(0, gallery.length - 1));
    }
  }, [gallery.length, gallerySlideIdx]);

  useEffect(() => {
    if (publishChecklist.length === 0) return;
    const fadeTimer = window.setTimeout(() => setPublishPopupOpaque(false), 2600);
    const clearTimer = window.setTimeout(() => setPublishChecklist([]), 3000);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(clearTimer);
    };
  }, [publishChecklist, publishChecklistTick]);

  const isDirty = useMemo(() => {
    if (!baseline) return false;
    const f = form;
    const b = baseline.form;
    return (
      f.title !== b.title ||
      f.price_thb !== b.price_thb ||
      (f.price_min_thb ?? 0) !== (b.price_min_thb ?? 0) ||
      f.summary !== b.summary ||
      (f.duration_label ?? "") !== (b.duration_label ?? "") ||
      (f.revisions_label ?? "") !== (b.revisions_label ?? "") ||
      (f.exclusions_note ?? "") !== (b.exclusions_note ?? "") ||
      (f.cover_url ?? "") !== (b.cover_url ?? "") ||
      (f.category ?? "") !== (b.category ?? "") ||
      !sameList(f.tags ?? [], b.tags ?? []) ||
      !sameList(f.reference_project_ids ?? [], b.reference_project_ids ?? []) ||
      !sameList(f.gallery_urls ?? [], b.gallery_urls ?? []) ||
      !sameList(
        deliverables.map((d) => d.trim()).filter(Boolean),
        baseline.deliverables.map((d) => d.trim()).filter(Boolean),
      )
    );
  }, [baseline, form, deliverables]);

  const leaveToPrevious = () => {
    setExitAskOpen(false);
    setDeleteAskOpen(false);
    setPreviewOpen(false);
    setPublishConfirmOpen(false);
    const idx = (window.history.state as { idx?: number } | null)?.idx;
    if ((typeof idx === "number" && idx > 0) || window.history.length > 1) {
      navigate(-1);
      return;
    }
    onOpenChange(false);
  };

  const forceClose = () => {
    if (isPage) {
      leaveToPrevious();
      return;
    }
    setExitAskOpen(false);
    setDeleteAskOpen(false);
    setPreviewOpen(false);
    setPublishConfirmOpen(false);
    onOpenChange(false);
  };

  const canDelete = Boolean(initial?.id && onDelete);
  const actionBusy = !!busy || !!deleteBusy || uploading;

  const confirmDelete = async () => {
    if (!initial?.id || !onDelete) return;
    try {
      await onDelete(initial.id);
      setDeleteAskOpen(false);
      forceClose();
    } catch {
      // Parent shows toast
    }
  };

  const requestClose = () => {
    if (cropOpen || deleteAskOpen) return;
    if (!isDirty) {
      forceClose();
      return;
    }
    setExitAskOpen(true);
  };

  const livePreview = useMemo((): CreatorService => {
    let max = Math.max(0, Math.round(form.price_thb));
    let min = Math.max(0, Math.round(form.price_min_thb ?? max));
    if (min > max) [min, max] = [max, min];
    const items = deliverables.map((d) => d.trim()).filter(Boolean);
    const category = categoryParentId
      ? resolveDbCategory(categoryParentId, categorySubId)
      : (form.category ?? "").trim();
    const tags = mergeCategorySubTag([], categorySubId);
    return {
      id: initial?.id ?? "preview",
      owner_id: user?.id ?? "",
      title: form.title.trim() || "แพ็กเกจยังไม่มีชื่อ",
      price_thb: max || min,
      price_min_thb: min || max,
      summary: form.summary.trim() || "—",
      deliverables: items.length ? items : ["—"],
      duration_label: (form.duration_label ?? "").replace(/[^\d]/g, ""),
      concepts_label: "",
      revisions_label: (form.revisions_label ?? "").replace(/[^\d]/g, ""),
      exclusions_note: (form.exclusions_note ?? "").trim(),
      cover_url: form.cover_url?.trim() || null,
      gallery_urls: gallery,
      category,
      tags,
      reference_project_ids: form.reference_project_ids ?? [],
      status: "Draft",
      sort_order: 0,
      created_at: "",
      updated_at: "",
    };
  }, [
    form,
    deliverables,
    gallery,
    categoryParentId,
    categorySubId,
    initial?.id,
    user?.id,
  ]);

  const collectPublishGaps = (): string[] => {
    const checklist: string[] = [];
    if (!form.title.trim()) checklist.push("กรอกชื่อบริการ");
    if (!form.summary.trim()) checklist.push("กรอกรายละเอียด");
    if (!form.cover_url?.trim()) checklist.push("อัปโหลดภาพปก");
    if (!categoryParentId) checklist.push("เลือกหมวดหมู่");
    const items = deliverables.map((d) => d.trim()).filter(Boolean);
    if (!items.length) checklist.push("ใส่สิ่งที่ส่งมอบงานอย่างน้อย 1 ข้อ");
    let max = Math.max(0, Math.round(form.price_thb));
    let min = Math.max(0, Math.round(form.price_min_thb ?? max));
    if (min > max) [min, max] = [max, min];
    if (max <= 0 && min <= 0) checklist.push("ใส่ราคาอย่างน้อย 1 ช่อง");
    const days = Number.parseInt(String(form.duration_label ?? "").replace(/[^\d]/g, ""), 10);
    if (!Number.isFinite(days) || days <= 0) checklist.push("ใส่จำนวนวันทำงาน");
    if (!(form.reference_project_ids ?? []).length) {
      checklist.push("เลือกผลงานตัวอย่างอย่างน้อย 1 ชิ้น");
    }
    return checklist;
  };

  const submit = async (status: CreatorServiceStatus, thenClose = false) => {
    const items = deliverables.map((d) => d.trim()).filter(Boolean);
    if (status === "Published") {
      const gaps = collectPublishGaps();
      if (gaps.length) {
        toast.error(gaps[0]);
        return;
      }
    } else if (!items.length) {
      toast.error("ใส่สิ่งที่ส่งมอบงานอย่างน้อย 1 ข้อ");
      return;
    }
    const category = categoryParentId
      ? resolveDbCategory(categoryParentId, categorySubId)
      : (form.category ?? "").trim();
    const tags = mergeCategorySubTag([], categorySubId);
    await onSubmit(
      {
        ...form,
        deliverables: items,
        status,
        category,
        tags,
        reference_project_ids: form.reference_project_ids ?? [],
        concepts_label: "",
        revisions_label: (form.revisions_label ?? "").replace(/[^\d]/g, ""),
        exclusions_note: (form.exclusions_note ?? "").trim().slice(0, 500),
        cover_url: form.cover_url?.trim() || null,
        gallery_urls: gallery,
        duration_label: (form.duration_label ?? "").replace(/[^\d]/g, ""),
      },
      initial?.id,
    );
    if (thenClose) forceClose();
  };

  const requestPublish = () => {
    const checklist = collectPublishGaps();
    if (checklist.length > 0) {
      setPublishChecklist(checklist);
      setPublishPopupOpaque(true);
      setPublishChecklistTick((n) => n + 1);
      toast.error("กรอกข้อมูลที่จำเป็นก่อนเผยแพร่");
      return;
    }
    setPublishChecklist([]);
    setPublishAttestChecked(false);
    setPublishConfirmOpen(true);
  };

  const handleConfirmPublish = async () => {
    if (!publishAttestChecked) {
      toast.error("กรุณายืนยันนโยบายก่อนเผยแพร่");
      return;
    }
    setPublishConfirmOpen(false);
    setPreviewOpen(false);
    try {
      await submit("Published");
    } catch {
      // Parent shows toast
    }
  };

  const moveGallery = (from: number, to: number) => {
    if (to < 0 || to >= gallery.length) return;
    setForm((f) => {
      const next = [...(f.gallery_urls ?? [])];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return { ...f, gallery_urls: next };
    });
    setGallerySlideIdx(to);
  };

  const reorderGallery = (urls: string[]) => {
    const prevActive = gallery[gallerySlideIdx];
    setForm((f) => ({ ...f, gallery_urls: urls }));
    const nextIdx = prevActive ? urls.indexOf(prevActive) : 0;
    setGallerySlideIdx(nextIdx >= 0 ? nextIdx : 0);
  };

  const onPickCover = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!isAllowedPortfolioStillImage(file)) {
      toast.error("ภาพปกรองรับเฉพาะ JPG หรือ PNG");
      if (coverInputRef.current) coverInputRef.current.value = "";
      return;
    }
    setCropFile(file);
    setCropOpen(true);
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  const uploadCover = async (file: File) => {
    if (!user?.id) {
      toast.error("ต้องเข้าสู่ระบบก่อนอัปโหลด");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadProjectImage(file, user.id, "creator-services", "free", {
        skipCompression: true,
        fastQuotaCheck: true,
      });
      setForm((f) => ({ ...f, cover_url: url }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "อัปโหลดภาพปกไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  };

  const onPickGallery = async (files: FileList | null) => {
    if (!files?.length || !user?.id) {
      if (!user?.id) toast.error("ต้องเข้าสู่ระบบก่อนอัปโหลด");
      return;
    }
    const slots = CREATOR_SERVICES_GALLERY_MAX - gallery.length;
    if (slots <= 0) {
      toast.message(`อัปโหลดสไลด์ได้สูงสุด ${CREATOR_SERVICES_GALLERY_MAX} ไฟล์`);
      return;
    }
    setUploading(true);
    try {
      const added: string[] = [];
      for (const file of Array.from(files).slice(0, slots)) {
        if (isVideoFile(file)) {
          added.push(await uploadProjectVideo(file, user.id, "creator-services", "free"));
        } else if (isAllowedPortfolioImage(file)) {
          added.push(
            await uploadProjectImage(file, user.id, "creator-services", "free", {
              fastQuotaCheck: true,
            }),
          );
        } else {
          toast.error(`ข้ามไฟล์ที่ไม่รองรับ: ${file.name} (ใช้ JPG/PNG/GIF หรือวิดีโอ)`);
        }
      }
      if (added.length) {
        setForm((f) => ({
          ...f,
          gallery_urls: [...(f.gallery_urls ?? []), ...added].slice(
            0,
            CREATOR_SERVICES_GALLERY_MAX,
          ),
        }));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "อัปโหลดสไลด์ไม่สำเร็จ");
    } finally {
      setUploading(false);
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  };

  const creatorName =
    profile?.display_name?.trim() || profile?.username?.trim() || "ครีเอเตอร์";

  const editorTitle = initial ? "แก้ไขแพ็กเกจ" : "ลงแพ็กเกจใหม่";

  const headerActions = (
    <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 shrink-0">
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={actionBusy}
        className="rounded-full shrink-0"
        onClick={() => setPreviewOpen(true)}
        title="พรีวิว"
        aria-label="พรีวิว"
      >
        <Eye className="w-4 h-4" />
      </Button>
      {canDelete ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={actionBusy}
          className="rounded-full text-destructive hover:text-destructive hover:bg-destructive/10 hidden sm:inline-flex"
          onClick={() => setDeleteAskOpen(true)}
        >
          <Trash2 className="w-4 h-4 mr-1.5" />
          ลบ
        </Button>
      ) : null}
      {canDelete ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={actionBusy}
          className="rounded-full text-destructive hover:text-destructive hover:bg-destructive/10 sm:hidden"
          onClick={() => setDeleteAskOpen(true)}
          aria-label="ลบ"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={actionBusy}
        className="rounded-full"
        onClick={() => void submit("Draft")}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
        <span className="hidden sm:inline">บันทึกร่าง</span>
        <span className="sm:hidden">ร่าง</span>
      </Button>
      <Button
        type="button"
        size="sm"
        disabled={actionBusy}
        className="rounded-full"
        onClick={requestPublish}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
        เผยแพร่
      </Button>
    </div>
  );

  const dialogFooterActions = (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="ghost"
          disabled={actionBusy}
          className="rounded-full"
          onClick={() => setPreviewOpen(true)}
        >
          <Eye className="w-4 h-4 mr-1.5" />
          พรีวิว
        </Button>
        {canDelete ? (
          <Button
            type="button"
            variant="ghost"
            disabled={actionBusy}
            className="rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => setDeleteAskOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            ลบ
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={actionBusy}
          className="rounded-full"
          onClick={() => void submit("Draft")}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          บันทึกร่าง
        </Button>
        <Button
          type="button"
          disabled={actionBusy}
          className="rounded-full"
          onClick={requestPublish}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          เผยแพร่
        </Button>
      </div>
    </>
  );

  const activeSlide = gallery[gallerySlideIdx] ?? null;

  const pageMediaBlock = (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label>พรีวิวสไลด์ ({gallery.length}/{CREATOR_SERVICES_GALLERY_MAX})</Label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-full"
          disabled={uploading || busy || gallery.length >= CREATOR_SERVICES_GALLERY_MAX}
          onClick={() => galleryInputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
          ) : (
            <ImagePlus className="w-3.5 h-3.5 mr-1" />
          )}
          เพิ่มสื่อ
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {PORTFOLIO_IMAGE_FORMAT_HINT} หรือวิดีโอ MP4/MOV/WebM · สูงสุด {CREATOR_SERVICES_GALLERY_MAX}{" "}
        ไฟล์ · ลากสลับลำดับได้
      </p>
      <input
        ref={galleryInputRef}
        type="file"
        accept={PACKAGE_SLIDE_ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => void onPickGallery(e.target.files)}
      />

      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-muted/30">
        {activeSlide ? (
          <div className="relative aspect-[4/3] w-full">
            {isVideoUrl(activeSlide) ? (
              <video
                src={activeSlide}
                className="absolute inset-0 h-full w-full object-cover"
                controls
                playsInline
              />
            ) : (
              <img
                src={activeSlide}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            {gallery.length > 1 ? (
              <>
                <button
                  type="button"
                  className="absolute left-2 top-1/2 z-[1] -translate-y-1/2 rounded-full bg-black/55 p-2 text-white disabled:opacity-30"
                  disabled={gallerySlideIdx <= 0}
                  onClick={() => setGallerySlideIdx((i) => Math.max(0, i - 1))}
                  aria-label="สไลด์ก่อนหน้า"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="absolute right-2 top-1/2 z-[1] -translate-y-1/2 rounded-full bg-black/55 p-2 text-white disabled:opacity-30"
                  disabled={gallerySlideIdx >= gallery.length - 1}
                  onClick={() =>
                    setGallerySlideIdx((i) => Math.min(gallery.length - 1, i + 1))
                  }
                  aria-label="สไลด์ถัดไป"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <p className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] text-white tabular-nums">
                  {gallerySlideIdx + 1}/{gallery.length}
                </p>
              </>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            disabled={uploading || busy}
            onClick={() => galleryInputRef.current?.click()}
            className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground hover:bg-muted/40"
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
            อัปโหลดสไลด์เพื่อพรีวิวแพ็กเกจ
          </button>
        )}
      </div>

      {gallery.length > 0 ? (
        <PackageGallerySortableStrip
          urls={gallery}
          activeIndex={gallerySlideIdx}
          disabled={uploading || busy}
          onSelect={setGallerySlideIdx}
          onRemove={(idx) => {
            setForm((f) => ({
              ...f,
              gallery_urls: (f.gallery_urls ?? []).filter((_, i) => i !== idx),
            }));
          }}
          onReorder={reorderGallery}
        />
      ) : null}

      <div className="space-y-1.5">
        <Label>
          ภาพปก {ReqAsterisk()} (thumbnail)
        </Label>
        <input
          ref={coverInputRef}
          type="file"
          accept={PACKAGE_COVER_ACCEPT}
          className="hidden"
          onChange={(e) => onPickCover(e.target.files)}
        />
        <div className="flex items-end gap-3">
          {form.cover_url ? (
            <div className="relative h-20 w-[6.5rem] overflow-hidden rounded-xl border border-border/60 bg-muted shrink-0">
              <img src={form.cover_url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white"
                disabled={uploading || busy}
                onClick={() => setForm((f) => ({ ...f, cover_url: "" }))}
                aria-label="ลบภาพปก"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={uploading || busy}
              onClick={() => coverInputRef.current?.click()}
              className="flex h-20 w-[6.5rem] shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border/80 bg-muted/20 text-[10px] text-muted-foreground hover:bg-muted/40"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              อัปโหลดปก
            </button>
          )}
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs text-muted-foreground leading-relaxed">
              ใช้โชว์ในการ์ดรายการ · {PACKAGE_COVER_HINT}
            </p>
            {form.cover_url ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full h-8"
                disabled={uploading || busy}
                onClick={() => coverInputRef.current?.click()}
              >
                เปลี่ยนภาพปก
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  const coverBlock = (
    <div className="space-y-2">
      <Label>
        ภาพปก {ReqAsterisk()} (4:3 แนวนอน)
      </Label>
      <p className="text-[11px] text-muted-foreground">{PACKAGE_COVER_HINT}</p>
      <input
        ref={coverInputRef}
        type="file"
        accept={PACKAGE_COVER_ACCEPT}
        className="hidden"
        onChange={(e) => onPickCover(e.target.files)}
      />
      {form.cover_url ? (
        <div className="relative overflow-hidden rounded-xl border border-border/60">
          <img src={form.cover_url} alt="" className="aspect-[4/3] w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 flex gap-2 p-2 bg-gradient-to-t from-black/60 to-transparent">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="rounded-full"
              disabled={uploading || busy}
              onClick={() => coverInputRef.current?.click()}
            >
              เปลี่ยน
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="rounded-full text-white hover:text-white"
              disabled={uploading || busy}
              onClick={() => setForm((f) => ({ ...f, cover_url: "" }))}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading || busy}
          onClick={() => coverInputRef.current?.click()}
          className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-muted/20 text-sm text-muted-foreground hover:bg-muted/40"
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          อัปโหลดภาพปก (4:3)
        </button>
      )}
    </div>
  );

  const galleryBlock = (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>
          สไลด์แกลเลอรี ({gallery.length}/{CREATOR_SERVICES_GALLERY_MAX})
        </Label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-full"
          disabled={uploading || busy || gallery.length >= CREATOR_SERVICES_GALLERY_MAX}
          onClick={() => galleryInputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
          ) : (
            <ImagePlus className="w-3.5 h-3.5 mr-1" />
          )}
          เพิ่มสื่อ
        </Button>
      </div>
      <input
        ref={galleryInputRef}
        type="file"
        accept={PACKAGE_SLIDE_ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => void onPickGallery(e.target.files)}
      />
      <p className="text-[11px] text-muted-foreground">
        {PORTFOLIO_IMAGE_FORMAT_HINT} หรือวิดีโอ · สูงสุด {CREATOR_SERVICES_GALLERY_MAX} ไฟล์
      </p>
      {gallery.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {gallery.map((url, idx) => (
            <div
              key={`${url}-${idx}`}
              className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border/60 bg-muted/30"
            >
              {isVideoUrl(url) ? (
                <div className="flex h-full w-full items-center justify-center bg-black/40">
                  <Video className="h-5 w-5 text-white" />
                  <video
                    src={url}
                    className="absolute inset-0 h-full w-full object-cover opacity-70"
                    muted
                  />
                </div>
              ) : (
                <img src={url} alt="" className="h-full w-full object-cover" />
              )}
              <div className="absolute inset-x-0 top-0 flex items-center justify-between p-1">
                <div className="flex gap-0.5">
                  <button
                    type="button"
                    className="rounded-full bg-black/70 p-1 text-white disabled:opacity-30"
                    disabled={idx === 0}
                    onClick={() => moveGallery(idx, idx - 1)}
                    aria-label="เลื่อนซ้าย"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-black/70 p-1 text-white disabled:opacity-30"
                    disabled={idx >= gallery.length - 1}
                    onClick={() => moveGallery(idx, idx + 1)}
                    aria-label="เลื่อนขวา"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  className="rounded-full bg-black/70 p-1 text-white"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      gallery_urls: (f.gallery_urls ?? []).filter((_, i) => i !== idx),
                    }))
                  }
                  aria-label="ลบสื่อ"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );

  const titleBlock = (
    <div className="space-y-1.5">
      <Label htmlFor="svc-title">
        ชื่อบริการ {ReqAsterisk()}
      </Label>
      <Input
        id="svc-title"
        value={form.title}
        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        placeholder="เช่น โลโก้พรีเมียม"
        maxLength={120}
      />
    </div>
  );

  const summaryBlock = (
    <div className="space-y-1.5">
      <Label htmlFor="svc-summary">
        รายละเอียด {ReqAsterisk()}
      </Label>
      <Textarea
        id="svc-summary"
        value={form.summary}
        onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
        placeholder="อธิบายรายละเอียดแพ็กเกจ"
        rows={isPage ? 6 : 3}
        maxLength={1000}
      />
    </div>
  );

  const detailsBlocks = (
    <>
      <div className="space-y-1.5">
        <Label>
          หมวดหมู่ {ReqAsterisk()}
        </Label>
        <ProjectTaxonomyPicker
          parentId={categoryParentId}
          subId={categorySubId}
          hideLabel
          disabled={!!busy || uploading}
          onChange={({ parentId, subId }) => {
            setCategoryParentId(parentId);
            setCategorySubId(subId);
            if (parentId) {
              setForm((f) => ({
                ...f,
                category: resolveDbCategory(parentId, subId),
                tags: mergeCategorySubTag([], subId),
              }));
            } else {
              setForm((f) => ({
                ...f,
                category: "",
                tags: [],
              }));
            }
          }}
        />
      </div>

      <div className="space-y-1.5">
        <Label>
          ราคา (บาท) {ReqAsterisk()}
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            min={0}
            value={form.price_min_thb || ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                price_min_thb: Number(e.target.value) || 0,
              }))
            }
            placeholder="ต่ำสุด"
          />
          <Input
            type="number"
            min={0}
            value={form.price_thb || ""}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                price_thb: Number(e.target.value) || 0,
              }))
            }
            placeholder="สูงสุด"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="svc-duration">
          จำนวนวันทำงาน {ReqAsterisk()}
        </Label>
        <Input
          id="svc-duration"
          type="number"
          min={1}
          inputMode="numeric"
          value={form.duration_label || ""}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              duration_label: e.target.value.replace(/[^\d]/g, ""),
            }))
          }
          placeholder="14"
          required
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label>
            สิ่งที่ส่งมอบงาน {ReqAsterisk()}
          </Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full h-8"
            onClick={() => setDeliverables((rows) => [...rows, ""])}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            เพิ่มรายการ
          </Button>
        </div>
        <div className="space-y-2">
          {deliverables.map((row, idx) => (
            <div key={`del-${idx}`} className="flex gap-2">
              <Input
                value={row}
                onChange={(e) =>
                  setDeliverables((rows) => rows.map((r, i) => (i === idx ? e.target.value : r)))
                }
                placeholder={`รายการที่ ${idx + 1}`}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                disabled={deliverables.length <= 1}
                onClick={() => setDeliverables((rows) => rows.filter((_, i) => i !== idx))}
                aria-label="ลบรายการ"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="svc-revisions">จำนวนรอบแก้ไข (ไม่บังคับ)</Label>
        <Input
          id="svc-revisions"
          type="number"
          min={0}
          inputMode="numeric"
          value={form.revisions_label || ""}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              revisions_label: e.target.value.replace(/[^\d]/g, ""),
            }))
          }
          placeholder="เช่น 2"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="svc-exclusions">สิ่งที่ไม่รวม (ไม่บังคับ)</Label>
        <Textarea
          id="svc-exclusions"
          value={form.exclusions_note || ""}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              exclusions_note: e.target.value.slice(0, 500),
            }))
          }
          placeholder="เช่น ไม่รวม source file, ไม่รวมเร่งด่วนภายใน 3 วัน"
          rows={2}
          maxLength={500}
        />
      </div>

      {user?.id ? (
        <ServicePackageWorksPicker
          userId={user.id}
          selectedIds={form.reference_project_ids ?? []}
          required
          disabled={!!busy || uploading}
          onChange={(ids) => setForm((f) => ({ ...f, reference_project_ids: ids }))}
        />
      ) : null}
    </>
  );

  const formFields = isPage ? (
    <div className="grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-2 lg:gap-8 lg:items-start">
      <section className="space-y-4">
        {pageMediaBlock}
        {titleBlock}
        {summaryBlock}
      </section>
      <section className="space-y-4 rounded-2xl border border-border/60 bg-card/40 p-4 sm:p-5">
        <div>
          <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Briefcase className="h-3.5 w-3.5 text-primary" />
            ข้อมูลแพ็กเกจ
          </h2>
        </div>
        {detailsBlocks}
      </section>
    </div>
  ) : (
    <div className="space-y-4 p-4 sm:p-5">
      {coverBlock}
      {galleryBlock}
      {titleBlock}
      {detailsBlocks}
      {summaryBlock}
    </div>
  );

  const renderPublishGapPopup = () =>
    publishChecklist.length > 0 ? (
      <div
        role="alert"
        className={cn(
          "fixed bottom-4 right-4 z-[60] w-max max-w-[min(16rem,calc(100vw-2rem))] rounded-xl border border-destructive/40 bg-card px-3 py-2.5 shadow-lg shadow-black/30 transition-opacity duration-300 ease-out",
          publishPopupOpaque ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      >
        <p className="text-xs font-medium text-destructive">กรอกข้อมูลที่จำเป็นก่อนเผยแพร่</p>
        <ul className="mt-1.5 space-y-0.5 text-xs text-destructive/90">
          {publishChecklist.map((item) => (
            <li key={item} className="flex items-start gap-1.5">
              <span aria-hidden>•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  const sharedOverlays = (
    <>
      {renderPublishGapPopup()}

      <DeleteConfirmDialog
        open={deleteAskOpen}
        onOpenChange={setDeleteAskOpen}
        title="ลบแพ็กเกจนี้?"
        description={
          <>
            「{initial?.title?.trim() || "แพ็กเกจนี้"}」จะถูกลบถาวรและไม่สามารถกู้คืนได้
            ต้องการลบจริงหรือไม่?
          </>
        }
        onConfirm={() => void confirmDelete()}
        loading={!!deleteBusy}
      />

      <ServiceDetailDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        service={livePreview}
        creatorName={creatorName}
        creatorUsername={profile?.username}
        creatorAvatarUrl={profile?.avatar_url}
        creatorRole={profile?.role}
        creatorId={user?.id}
        previewOnly
        publishBusy={busy}
        onPublish={requestPublish}
        onRequest={() => undefined}
      />

      <Dialog
        open={publishConfirmOpen}
        onOpenChange={(next) => {
          if (busy) return;
          setPublishConfirmOpen(next);
          if (!next) setPublishAttestChecked(false);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ยืนยันก่อนเผยแพร่แพ็กเกจ</DialogTitle>
            <DialogDescription>
              ติ๊กยอมรับนโยบาย แล้วกดยืนยันเผยแพร่
            </DialogDescription>
          </DialogHeader>
          <PackagePublishAttestation
            checked={publishAttestChecked}
            onCheckedChange={setPublishAttestChecked}
          />
          <DialogFooter className="gap-2 sm:justify-end flex-col-reverse sm:flex-row">
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setPublishConfirmOpen(false);
                setPublishAttestChecked(false);
              }}
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              className="rounded-full"
              onClick={() => {
                setPublishConfirmOpen(false);
                setPublishAttestChecked(false);
                setPreviewOpen(true);
              }}
            >
              <Eye className="w-4 h-4 mr-1" />
              ดูตัวอย่าง
            </Button>
            <Button
              type="button"
              disabled={busy || !publishAttestChecked}
              className="rounded-full"
              onClick={() => void handleConfirmPublish()}
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  กำลังเผยแพร่…
                </>
              ) : (
                "ยืนยันเผยแพร่"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={exitAskOpen} onOpenChange={setExitAskOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยังไม่ได้บันทึก</AlertDialogTitle>
            <AlertDialogDescription>
              มีการแก้ไขที่ยังไม่บันทึก ต้องการทำอย่างไรต่อ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-col gap-2 sm:space-x-0">
            <Button type="button" className="w-full rounded-full" onClick={() => setExitAskOpen(false)}>
              ทำต่อ
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-full"
              disabled={busy || uploading}
              onClick={() => void submit("Draft", true)}
            >
              บันทึกไว้ก่อน
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full rounded-full text-destructive hover:text-destructive"
              onClick={forceClose}
            >
              ยกเลิกทั้งหมด
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CommunityImageCropDialog
        file={cropFile}
        aspect="landscape43"
        open={cropOpen}
        onOpenChange={(next) => {
          setCropOpen(next);
          if (!next) setCropFile(null);
        }}
        onCancel={() => {
          setCropOpen(false);
          setCropFile(null);
        }}
        onConfirm={(file) => {
          setCropOpen(false);
          setCropFile(null);
          void uploadCover(file);
        }}
      />
    </>
  );

  if (isPage) {
    return (
      <>
        <div className="min-h-screen bg-background pb-10">
          <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
            <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-3 sm:px-6">
              <BackButton onClick={requestClose} fallbackTo="/portfolio?tab=services" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Packages
                </p>
                <h1 className="truncate text-base font-semibold text-foreground">
                  {editorTitle}
                </h1>
              </div>
              {headerActions}
            </div>
          </header>
          <div className="mx-auto max-w-6xl">{formFields}</div>
        </div>
        {sharedOverlays}
      </>
    );
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (next) onOpenChange(true);
          else requestClose();
        }}
      >
        <DialogContent
          className={cn(
            "w-[calc(100vw-0.75rem)] max-w-xl",
            "max-h-[min(94dvh,94vh)] overflow-hidden p-0 gap-0",
            "flex flex-col rounded-2xl",
          )}
          onPointerDownOutside={(e) => {
            e.preventDefault();
            requestClose();
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            requestClose();
          }}
        >
          <DialogHeader className="shrink-0 border-b border-border/50 px-4 py-3 text-left sm:px-5">
            <DialogTitle>{editorTitle}</DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{formFields}</div>

          <DialogFooter className="shrink-0 gap-2 border-t border-border/50 px-4 py-3 sm:justify-between">
            {dialogFooterActions}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {sharedOverlays}
    </>
  );
}
