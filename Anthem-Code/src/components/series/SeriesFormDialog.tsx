import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import {
  useCreateProjectSeries,
  useUpdateProjectSeries,
  type ProjectSeries,
} from "@/hooks/useProjectSeries";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { CommunityImageCropDialog } from "@/components/community/CommunityImageCropDialog";
import { uploadProjectImage } from "@/lib/uploadImage";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: ProjectSeries | null;
  /** Called after create — parent can open add-works step. */
  onCreated?: (series: ProjectSeries) => void;
}

export function SeriesFormDialog({ open, onOpenChange, initial, onCreated }: Props) {
  const { user } = useAuth();
  const create = useCreateProjectSeries();
  const update = useUpdateProjectSeries();
  const isEdit = !!initial;
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [coverUrl, setCoverUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? "");
    setSummary(initial?.summary ?? "");
    setIsPublic(initial?.is_public ?? true);
    setCoverUrl(initial?.cover_url ?? "");
    setCropOpen(false);
    setCropFile(null);
  }, [open, initial]);

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
      const url = await uploadProjectImage(file, user.id, "catalog-covers", "free", {
        skipCompression: true,
        fastQuotaCheck: true,
      });
      setCoverUrl(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "อัปโหลดภาพปกไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!title.trim()) {
      toast.error("กรุณาตั้งชื่อ Catalog");
      return;
    }
    try {
      if (isEdit && initial) {
        await update.mutateAsync({
          id: initial.id,
          patch: {
            title: title.trim(),
            summary: summary.trim(),
            client_label: "",
            year: null,
            is_public: isPublic,
            cover_url: coverUrl.trim() || null,
          },
        });
        toast.success("บันทึกแล้ว");
      } else {
        if (!user?.id) return;
        const created = await create.mutateAsync({
          ownerId: user.id,
          title: title.trim(),
          summary: summary.trim(),
          isPublic,
          coverUrl: coverUrl.trim() || null,
        });
        toast.success("สร้าง Catalog แล้ว");
        onCreated?.(created);
      }
      onOpenChange(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    }
  };

  const busy = create.isPending || update.isPending || uploading;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEdit ? "แก้ไข Catalog" : "สร้าง Catalog"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isEdit
                ? "ปรับชื่อ สรุป หรือความเป็นสาธารณะของ Catalog"
                : "ใส่รายละเอียด Catalog แล้วกดถัดไปเพื่อเลือกผลงานเข้า Catalog ได้เลย"}
            </p>

            <div className="space-y-2">
              <Label>ภาพปก Catalog (ไม่บังคับ)</Label>
              <p className="text-[11px] text-muted-foreground">
                ถ้าไม่อัปโหลด จะใช้ภาพผลงานใน Catalog แบบเดิม
              </p>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPickCover(e.target.files)}
              />
              {coverUrl ? (
                <div className="relative overflow-hidden rounded-xl border border-border/60">
                  <img src={coverUrl} alt="" className="aspect-[4/3] w-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 flex gap-2 p-2 bg-gradient-to-t from-black/60 to-transparent">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="rounded-full"
                      disabled={busy}
                      onClick={() => coverInputRef.current?.click()}
                    >
                      เปลี่ยน
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="rounded-full text-white hover:text-white"
                      disabled={busy}
                      onClick={() => setCoverUrl("")}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={busy}
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
                  อัปโหลดภาพปก
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="series-title">ชื่อ Catalog *</Label>
              <Input
                id="series-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น Rebrand Collection"
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="series-summary">สรุปสั้น ๆ</Label>
              <Textarea
                id="series-summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
                maxLength={400}
                placeholder="เล่าภาพรวม Catalog นี้สั้น ๆ"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <div>
                <p className="text-sm font-medium">แสดงต่อสาธารณะ</p>
                <p className="text-xs text-muted-foreground">โชว์บนโปรไฟล์เมื่อมีผลงานเผยแพร่ใน Catalog</p>
              </div>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <Button
              onClick={() => void submit()}
              disabled={busy}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {isEdit ? "บันทึก" : "ถัดไป"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
}
