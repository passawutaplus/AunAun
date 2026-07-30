import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
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
import { ChevronLeft, ChevronRight, Eye, ImagePlus, Loader2, Plus, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { CommunityImageCropDialog } from "@/components/community/CommunityImageCropDialog";
import ServiceDetailDialog from "@/components/services/ServiceDetailDialog";
import { useAuth } from "@/hooks/useAuth";
import {
  CREATOR_SERVICES_GALLERY_MAX,
  type CreatorService,
  type CreatorServiceInput,
  type CreatorServiceStatus,
} from "@/hooks/useCreatorServices";
import { uploadProjectImage } from "@/lib/uploadImage";
import { uploadProjectVideo } from "@/lib/uploadVideo";
import { isVideoFile, isVideoUrl } from "@/lib/videoAccept";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: CreatorService | null;
  busy?: boolean;
  onSubmit: (patch: CreatorServiceInput, id?: string) => Promise<void>;
};

const empty = (): CreatorServiceInput => ({
  title: "",
  price_thb: 0,
  price_min_thb: 0,
  summary: "",
  deliverables: [""],
  duration_label: "",
  concepts_label: "",
  revisions_label: "",
  cover_url: "",
  gallery_urls: [],
  status: "Draft",
});

function sameList(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

function digitsOnlyLabel(raw: string | null | undefined): string {
  return String(raw ?? "").replace(/[^\d]/g, "");
}

export default function ServiceEditorDialog({
  open,
  onOpenChange,
  initial,
  busy,
  onSubmit,
}: Props) {
  const { user } = useAuth();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<CreatorServiceInput>(empty());
  const [deliverables, setDeliverables] = useState<string[]>([""]);
  const [uploading, setUploading] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [exitAskOpen, setExitAskOpen] = useState(false);
  const [baseline, setBaseline] = useState<{
    form: CreatorServiceInput;
    deliverables: string[];
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    const nextForm = initial
      ? {
          title: initial.title,
          price_thb: initial.price_thb,
          price_min_thb: initial.price_min_thb || initial.price_thb,
          summary: initial.summary,
          deliverables: initial.deliverables,
          duration_label: initial.duration_label.replace(/[^\d]/g, ""),
          concepts_label: digitsOnlyLabel(initial.concepts_label),
          revisions_label: digitsOnlyLabel(initial.revisions_label),
          cover_url: initial.cover_url ?? "",
          gallery_urls: initial.gallery_urls ?? [],
          status: initial.status,
        }
      : empty();
    const nextDel = initial?.deliverables?.length ? [...initial.deliverables] : [""];
    setForm(nextForm);
    setDeliverables(nextDel);
    setBaseline({ form: nextForm, deliverables: nextDel });
    setPreviewOpen(false);
    setExitAskOpen(false);
  }, [open, initial]);

  const gallery = form.gallery_urls ?? [];

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
      (f.concepts_label ?? "") !== (b.concepts_label ?? "") ||
      (f.revisions_label ?? "") !== (b.revisions_label ?? "") ||
      (f.cover_url ?? "") !== (b.cover_url ?? "") ||
      !sameList(f.gallery_urls ?? [], b.gallery_urls ?? []) ||
      !sameList(
        deliverables.map((d) => d.trim()).filter(Boolean),
        baseline.deliverables.map((d) => d.trim()).filter(Boolean),
      )
    );
  }, [baseline, form, deliverables]);

  const forceClose = () => {
    setExitAskOpen(false);
    onOpenChange(false);
  };

  const requestClose = () => {
    if (cropOpen || previewOpen) return;
    if (!isDirty) {
      forceClose();
      return;
    }
    setExitAskOpen(true);
  };

  const buildPreviewService = (): CreatorService => {
    const max = Math.max(0, Math.round(form.price_thb));
    let min = Math.max(0, Math.round(form.price_min_thb ?? max));
    if (min > max) [min, max] = [max, min];
    const items = deliverables.map((d) => d.trim()).filter(Boolean);
    return {
      id: initial?.id ?? "preview",
      owner_id: user?.id ?? "",
      title: form.title.trim() || "แพ็กเกจยังไม่มีชื่อ",
      price_thb: max || min,
      price_min_thb: min || max,
      summary: form.summary.trim() || "—",
      deliverables: items.length ? items : ["—"],
      duration_label: (form.duration_label ?? "").replace(/[^\d]/g, ""),
      concepts_label: digitsOnlyLabel(form.concepts_label),
      revisions_label: digitsOnlyLabel(form.revisions_label),
      cover_url: form.cover_url?.trim() || null,
      gallery_urls: gallery,
      status: "Draft",
      sort_order: 0,
      created_at: "",
      updated_at: "",
    };
  };

  const submit = async (status: CreatorServiceStatus, thenClose = false) => {
    const items = deliverables.map((d) => d.trim()).filter(Boolean);
    if (status === "Published" && !form.cover_url?.trim()) {
      toast.error("เผยแพร่ต้องมีภาพปก 4:3");
      return;
    }
    if (!items.length) {
      toast.error("ใส่สิ่งที่ส่งมอบงานอย่างน้อย 1 ข้อ");
      return;
    }
    await onSubmit(
      {
        ...form,
        deliverables: items,
        status,
        concepts_label: digitsOnlyLabel(form.concepts_label),
        revisions_label: digitsOnlyLabel(form.revisions_label),
        cover_url: form.cover_url?.trim() || null,
        gallery_urls: gallery,
        duration_label: (form.duration_label ?? "").replace(/[^\d]/g, ""),
      },
      initial?.id,
    );
    if (thenClose) forceClose();
  };

  const moveGallery = (from: number, to: number) => {
    if (to < 0 || to >= gallery.length) return;
    setForm((f) => {
      const next = [...(f.gallery_urls ?? [])];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return { ...f, gallery_urls: next };
    });
  };

  const onPickCover = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("ภาพปกต้องเป็นไฟล์รูป");
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
        } else if (file.type.startsWith("image/")) {
          added.push(
            await uploadProjectImage(file, user.id, "creator-services", "free", {
              fastQuotaCheck: true,
            }),
          );
        } else {
          toast.error(`ข้ามไฟล์ที่ไม่รองรับ: ${file.name}`);
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
          className="max-w-lg max-h-[min(90dvh,90vh)] overflow-y-auto overscroll-contain w-[calc(100vw-1rem)] sm:w-full"
          onPointerDownOutside={(e) => {
            e.preventDefault();
            requestClose();
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            requestClose();
          }}
        >
          <DialogHeader>
            <DialogTitle>{initial ? "แก้ไขบริการ" : "เพิ่มบริการ"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ภาพปก * (4:3 แนวนอน)</Label>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPickCover(e.target.files)}
              />
              {form.cover_url ? (
                <div className="relative overflow-hidden rounded-xl border border-border/60">
                  <img
                    src={form.cover_url}
                    alt=""
                    className="aspect-[4/3] w-full object-cover"
                  />
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
                  className={cn(
                    "flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-muted/20 text-sm text-muted-foreground hover:bg-muted/40",
                  )}
                >
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <ImagePlus className="h-5 w-5" />
                  )}
                  อัปโหลดภาพปก (4:3)
                </button>
              )}
            </div>

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
                  disabled={
                    uploading || busy || gallery.length >= CREATOR_SERVICES_GALLERY_MAX
                  }
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
              <p className="text-[11px] text-muted-foreground">
                สูงสุด {CREATOR_SERVICES_GALLERY_MAX} รูปหรือวิดีโอ — กดลูกศรเพื่อสลับตำแหน่ง
              </p>
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={(e) => void onPickGallery(e.target.files)}
              />
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
                      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-[10px] text-white tabular-nums">
                        {idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="svc-title">ชื่อบริการ *</Label>
              <Input
                id="svc-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="เช่น โลโก้พรีเมียม"
                maxLength={120}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1.4fr_0.8fr] gap-3">
              <div className="space-y-1.5">
                <Label>ราคา (บาท) *</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    id="svc-price-min"
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
                    id="svc-price-max"
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
                <Label htmlFor="svc-duration">จำนวนวัน</Label>
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
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="svc-concepts">จำนวนแนวคิด</Label>
                <Input
                  id="svc-concepts"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={form.concepts_label || ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      concepts_label: digitsOnlyLabel(e.target.value),
                    }))
                  }
                  placeholder="เช่น 3"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="svc-revisions">จำนวนรอบแก้</Label>
                <Input
                  id="svc-revisions"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={form.revisions_label || ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      revisions_label: digitsOnlyLabel(e.target.value),
                    }))
                  }
                  placeholder="เช่น 2"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="svc-summary">รายละเอียด *</Label>
              <Textarea
                id="svc-summary"
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                placeholder="อธิบายรายละเอียดแพ็กเกจ"
                rows={3}
                maxLength={1000}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>สิ่งที่ส่งมอบงาน *</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full h-8"
                  onClick={() => setDeliverables((rows) => [...rows, ""])}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  เพิ่ม
                </Button>
              </div>
              <div className="space-y-2">
                {deliverables.map((row, idx) => (
                  <div key={`del-${idx}`} className="flex gap-2">
                    <Input
                      value={row}
                      onChange={(e) =>
                        setDeliverables((rows) =>
                          rows.map((r, i) => (i === idx ? e.target.value : r)),
                        )
                      }
                      placeholder={`รายการที่ ${idx + 1}`}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      disabled={deliverables.length <= 1}
                      onClick={() =>
                        setDeliverables((rows) => rows.filter((_, i) => i !== idx))
                      }
                      aria-label="ลบรายการ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between pt-2 flex-col sm:flex-row">
            <Button
              type="button"
              variant="ghost"
              disabled={busy || uploading}
              className="rounded-full gap-1.5 order-last sm:order-first"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="w-4 h-4" />
              ดูตัวอย่าง
            </Button>
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={busy || uploading}
                className="rounded-full"
                onClick={() => void submit("Draft")}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                บันทึกร่าง
              </Button>
              <Button
                type="button"
                disabled={busy || uploading}
                className="rounded-full"
                onClick={() => void submit("Published")}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                เผยแพร่
              </Button>
            </div>
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
            <Button
              type="button"
              className="w-full rounded-full"
              onClick={() => setExitAskOpen(false)}
            >
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

      <ServiceDetailDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        service={previewOpen ? buildPreviewService() : null}
        creatorName="ตัวอย่าง"
        previewOnly
        onRequest={() => setPreviewOpen(false)}
      />
    </>
  );
}
