import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Pencil,
  ArrowUp,
  ArrowDown,
  Loader2,
  ImageIcon,
  Eye,
  EyeOff,
} from "lucide-react";
import { uploadCompressedImage } from "@/lib/imageCompress";

/** Columns shared by every banner-slide table. `link_url` exists only on some. */
export interface BannerSlideRow {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_url: string;
  sort_order: number;
  is_active: boolean;
  link_url?: string | null;
}

export interface BannerSlidesConfig {
  table: "auth_banner_slides" | "dashboard_banner_slides";
  /** Storage bucket for uploaded images. */
  bucket: string;
  /** React Query key used by this admin list. */
  adminQueryKey: string;
  /** React Query key used by the public slider (invalidated on every change). */
  publicQueryKey: string;
  heading: string;
  description: string;
  /** Tailwind grid classes for the list + preview layout. */
  gridClass: string;
  /** Tailwind width class for the list thumbnail. */
  thumbWidthClass: string;
  /** Show / edit the optional click-through link. */
  withLink: boolean;
  imageLabel: string;
  /** Tailwind classes for the image preview box inside the dialog. */
  dialogImageClass: string;
  subtitlePlaceholder: string;
  titlePlaceholder: string;
  activeHint: string;
}

type SlideTable = BannerSlidesConfig["table"];

/**
 * The two slide tables have the same columns apart from `link_url`, but the
 * generated Supabase types make a union-typed `.from()` awkward. Narrow once,
 * here, instead of sprinkling casts through the component.
 */
function slides(table: SlideTable) {
  return supabase.from(table as "dashboard_banner_slides");
}

export function BannerSlidesManager({
  config,
  preview,
}: {
  config: BannerSlidesConfig;
  /** Live preview rendered next to the list. */
  preview: React.ReactNode;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = React.useState<BannerSlideRow | null>(null);
  const [openDialog, setOpenDialog] = React.useState(false);

  const invalidate = React.useCallback(() => {
    qc.invalidateQueries({ queryKey: [config.adminQueryKey] });
    qc.invalidateQueries({ queryKey: [config.publicQueryKey] });
  }, [qc, config.adminQueryKey, config.publicQueryKey]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: [config.adminQueryKey],
    queryFn: async () => {
      const { data, error } = await slides(config.table)
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as BannerSlideRow[];
    },
  });

  // Swap two slides' sort_order in ONE mutation so the list refetches once
  // (two separate mutations re-ordered the list twice and made it flicker).
  const swapMut = useMutation({
    mutationFn: async ({ a, b }: { a: BannerSlideRow; b: BannerSlideRow }) => {
      const [ra, rb] = await Promise.all([
        slides(config.table).update({ sort_order: b.sort_order }).eq("id", a.id),
        slides(config.table).update({ sort_order: a.sort_order }).eq("id", b.id),
      ]);
      if (ra.error) throw ra.error;
      if (rb.error) throw rb.error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await slides(config.table).update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await slides(config.table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("ลบสไลด์เรียบร้อย");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function move(id: string, dir: -1 | 1) {
    const idx = rows.findIndex((s) => s.id === id);
    const other = rows[idx + dir];
    if (idx < 0 || !other) return;
    swapMut.mutate({ a: rows[idx], b: other });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" /> {config.heading}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setOpenDialog(true);
          }}
          className="gap-1.5 bg-primary hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> เพิ่มสไลด์
        </Button>
      </div>

      <div className={`grid gap-5 ${config.gridClass}`}>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">สไลด์ทั้งหมด ({rows.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                <Loader2 className="h-5 w-5 animate-spin mx-auto" />
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8 border border-dashed rounded-xl">
                ยังไม่มีสไลด์ — กด "เพิ่มสไลด์" เพื่อเริ่มต้น
              </div>
            ) : (
              rows.map((s, i) => (
                <div key={s.id} className="flex items-start gap-3 p-3 rounded-xl border bg-card">
                  <div
                    className={`h-16 ${config.thumbWidthClass} rounded-lg overflow-hidden bg-muted shrink-0`}
                  >
                    {s.image_url ? (
                      <img
                        src={s.image_url}
                        alt={s.title ?? ""}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {s.subtitle && (
                        <span className="text-[11px] text-muted-foreground truncate">
                          {s.subtitle}
                        </span>
                      )}
                      {!s.is_active && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          ปิดอยู่
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium truncate">{s.title || "(ไม่มีหัวเรื่อง)"}</p>
                    {config.withLink && s.link_url && (
                      <p className="text-[10px] text-primary truncate mt-0.5">→ {s.link_url}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => move(s.id, -1)}
                        disabled={i === 0 || swapMut.isPending}
                        aria-label="เลื่อนขึ้น"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => move(s.id, 1)}
                        disabled={i === rows.length - 1 || swapMut.isPending}
                        aria-label="เลื่อนลง"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => toggleMut.mutate({ id: s.id, is_active: !s.is_active })}
                        title={s.is_active ? "ปิดสไลด์" : "เปิดสไลด์"}
                        aria-label={s.is_active ? "ปิดสไลด์" : "เปิดสไลด์"}
                      >
                        {s.is_active ? (
                          <Eye className="h-3.5 w-3.5" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditing(s);
                          setOpenDialog(true);
                        }}
                        aria-label="แก้ไขสไลด์"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm("ลบสไลด์นี้หรือไม่?")) deleteMut.mutate(s.id);
                        }}
                        aria-label="ลบสไลด์"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {preview}
      </div>

      <SlideDialog
        config={config}
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        slide={editing}
        userId={user?.id ?? ""}
        nextSortOrder={rows.length > 0 ? Math.max(...rows.map((s) => s.sort_order)) + 1 : 0}
        onSaved={invalidate}
      />
    </div>
  );
}

function SlideDialog({
  config,
  open,
  onClose,
  slide,
  userId,
  nextSortOrder,
  onSaved,
}: {
  config: BannerSlidesConfig;
  open: boolean;
  onClose: () => void;
  slide: BannerSlideRow | null;
  userId: string;
  nextSortOrder: number;
  onSaved: () => void;
}) {
  const [title, setTitle] = React.useState("");
  const [subtitle, setSubtitle] = React.useState("");
  const [linkUrl, setLinkUrl] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setTitle(slide?.title ?? "");
      setSubtitle(slide?.subtitle ?? "");
      setLinkUrl(slide?.link_url ?? "");
      setImageUrl(slide?.image_url ?? "");
      setIsActive(slide?.is_active ?? true);
    }
  }, [open, slide]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploading(true);
    try {
      const url = await uploadCompressedImage({
        file,
        bucket: config.bucket,
        userId,
        prefix: "banner",
      });
      setImageUrl(url);
      toast.success("อัปโหลดรูปสำเร็จ");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "อัปโหลดล้มเหลว");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!imageUrl) {
      toast.error("กรุณาอัปโหลดรูปแบนเนอร์");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim() || null,
        subtitle: subtitle.trim() || null,
        image_url: imageUrl,
        is_active: isActive,
        ...(config.withLink ? { link_url: linkUrl.trim() || null } : {}),
      };
      if (slide) {
        const { error } = await slides(config.table).update(payload).eq("id", slide.id);
        if (error) throw error;
        toast.success("บันทึกการแก้ไขแล้ว");
      } else {
        const { error } = await slides(config.table).insert({
          ...payload,
          sort_order: nextSortOrder,
        });
        if (error) throw error;
        toast.success("เพิ่มสไลด์ใหม่แล้ว");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "บันทึกล้มเหลว");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{slide ? "แก้ไขสไลด์" : "เพิ่มสไลด์ใหม่"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">{config.imageLabel}</Label>
            {imageUrl && (
              <div className={`w-full rounded-lg overflow-hidden bg-muted mb-2 ${config.dialogImageClass}`}>
                <img src={imageUrl} alt="preview" className="w-full h-full object-cover" />
              </div>
            )}
            <Input
              type="file"
              accept="image/*"
              onChange={handleFile}
              disabled={uploading}
              className="h-10"
            />
            {uploading && (
              <p className="text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                กำลังอัปโหลด...
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">คำโปรยบนสุด (subtitle)</Label>
            <Input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder={config.subtitlePlaceholder}
              className="h-10"
              maxLength={80}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">หัวเรื่องใหญ่ (title)</Label>
            <Textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={config.titlePlaceholder}
              rows={2}
              maxLength={160}
            />
          </div>
          {config.withLink && (
            <div className="space-y-1.5">
              <Label className="text-xs">ลิงก์เมื่อกด (optional)</Label>
              <Input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="h-10"
                maxLength={500}
              />
            </div>
          )}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">เปิดใช้งาน</p>
              <p className="text-xs text-muted-foreground">{config.activeHint}</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            ยกเลิก
          </Button>
          <Button
            onClick={save}
            disabled={saving || uploading}
            className="bg-primary hover:bg-primary/90"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
