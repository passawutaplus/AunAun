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
import {
  DashboardBannerSlider,
  type DashboardBannerSlide,
} from "@/components/DashboardBannerSlider";

export function DashboardBannerSection() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = React.useState<DashboardBannerSlide | null>(null);
  const [openDialog, setOpenDialog] = React.useState(false);

  const { data: slides = [], isLoading } = useQuery({
    queryKey: ["admin_dashboard_banner_slides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dashboard_banner_slides")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DashboardBannerSlide[];
    },
  });

  const reorderMut = useMutation({
    mutationFn: async ({ id, sort_order }: { id: string; sort_order: number }) => {
      const { error } = await supabase
        .from("dashboard_banner_slides")
        .update({ sort_order })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin_dashboard_banner_slides"] }),
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("dashboard_banner_slides")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_dashboard_banner_slides"] });
      qc.invalidateQueries({ queryKey: ["dashboard_banner_slides"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dashboard_banner_slides").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_dashboard_banner_slides"] });
      qc.invalidateQueries({ queryKey: ["dashboard_banner_slides"] });
      toast.success("ลบสไลด์เรียบร้อย");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function move(id: string, dir: -1 | 1) {
    const idx = slides.findIndex((s) => s.id === id);
    const swapWith = slides[idx + dir];
    if (!swapWith) return;
    reorderMut.mutate({ id, sort_order: swapWith.sort_order });
    reorderMut.mutate({ id: swapWith.id, sort_order: slides[idx].sort_order });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" /> แบนเนอร์หน้าแดชบอร์ด
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            สไลด์ใหญ่ที่แสดงด้านบนสุดของหน้าแดชบอร์ดให้ผู้ใช้ทุกคนเห็น
          </p>
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

      <div className="grid lg:grid-cols-[1fr_420px] gap-5">
        {/* List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">สไลด์ทั้งหมด ({slides.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                <Loader2 className="h-5 w-5 animate-spin mx-auto" />
              </div>
            ) : slides.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8 border border-dashed rounded-xl">
                ยังไม่มีสไลด์ — กด "เพิ่มสไลด์" เพื่อเริ่มต้น
              </div>
            ) : (
              slides.map((s, i) => (
                <div key={s.id} className="flex items-start gap-3 p-3 rounded-xl border bg-card">
                  <div className="h-16 w-28 rounded-lg overflow-hidden bg-muted shrink-0">
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
                    {s.link_url && (
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
                        disabled={i === 0}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => move(s.id, 1)}
                        disabled={i === slides.length - 1}
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

        {/* Live preview */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">ตัวอย่างที่จะแสดงบน Dashboard</p>
          <DashboardBannerSlider />
          <p className="text-[11px] text-muted-foreground mt-2 leading-snug">
            💡 อัตราส่วนแนะนำ <span className="font-medium">16:5 หรือ 16:4</span> —
            สไลด์จะเล่นอัตโนมัติทุก 6 วินาที
          </p>
        </div>
      </div>

      <SlideDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        slide={editing}
        userId={user?.id ?? ""}
        nextSortOrder={slides.length > 0 ? Math.max(...slides.map((s) => s.sort_order)) + 1 : 0}
      />
    </div>
  );
}

function SlideDialog({
  open,
  onClose,
  slide,
  userId,
  nextSortOrder,
}: {
  open: boolean;
  onClose: () => void;
  slide: DashboardBannerSlide | null;
  userId: string;
  nextSortOrder: number;
}) {
  const qc = useQueryClient();
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
        bucket: "dashboard-banners",
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
        link_url: linkUrl.trim() || null,
        is_active: isActive,
      };
      if (slide) {
        const { error } = await supabase
          .from("dashboard_banner_slides")
          .update(payload)
          .eq("id", slide.id);
        if (error) throw error;
        toast.success("บันทึกการแก้ไขแล้ว");
      } else {
        const { error } = await supabase
          .from("dashboard_banner_slides")
          .insert({ ...payload, sort_order: nextSortOrder });
        if (error) throw error;
        toast.success("เพิ่มสไลด์ใหม่แล้ว");
      }
      qc.invalidateQueries({ queryKey: ["admin_dashboard_banner_slides"] });
      qc.invalidateQueries({ queryKey: ["dashboard_banner_slides"] });
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
            <Label className="text-xs">รูปภาพแบนเนอร์ (แนะนำ 16:5 หรือ 16:4)</Label>
            {imageUrl && (
              <div className="aspect-[16/5] w-full rounded-lg overflow-hidden bg-muted mb-2">
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
              placeholder="เช่น โปรโมชั่นเดือนนี้"
              className="h-10"
              maxLength={80}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">หัวเรื่องใหญ่ (title)</Label>
            <Textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น ฟีเจอร์ใหม่: ตัวช่วยส่งใบเสนอราคา"
              rows={2}
              maxLength={160}
            />
          </div>
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
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">เปิดใช้งาน</p>
              <p className="text-xs text-muted-foreground">
                เฉพาะสไลด์ที่เปิดอยู่จะแสดงบน Dashboard
              </p>
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
