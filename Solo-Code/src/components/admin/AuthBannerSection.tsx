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
  Monitor,
  Tablet,
  Smartphone,
} from "lucide-react";
import { uploadCompressedImage } from "@/lib/imageCompress";
import { AuthBannerSlider, type BannerSlide } from "@/components/auth/AuthBannerSlider";

type DevicePreview = "desktop" | "tablet" | "mobile";

const DEVICE_FRAMES: Record<
  DevicePreview,
  { label: string; w: number; h: number; icon: typeof Monitor; showsBanner: boolean }
> = {
  desktop: { label: "คอมพิวเตอร์", w: 1440, h: 900, icon: Monitor, showsBanner: true },
  tablet: { label: "แท็บเล็ต", w: 820, h: 1180, icon: Tablet, showsBanner: false },
  mobile: { label: "มือถือ", w: 390, h: 844, icon: Smartphone, showsBanner: false },
};

export function AuthBannerSection() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = React.useState<BannerSlide | null>(null);
  const [openDialog, setOpenDialog] = React.useState(false);

  const { data: slides = [], isLoading } = useQuery({
    queryKey: ["admin_auth_banner_slides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auth_banner_slides")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as BannerSlide[];
    },
  });

  const reorderMut = useMutation({
    mutationFn: async ({ id, sort_order }: { id: string; sort_order: number }) => {
      const { error } = await supabase
        .from("auth_banner_slides")
        .update({ sort_order })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin_auth_banner_slides"] }),
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("auth_banner_slides")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_auth_banner_slides"] });
      qc.invalidateQueries({ queryKey: ["auth_banner_slides"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("auth_banner_slides").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_auth_banner_slides"] });
      qc.invalidateQueries({ queryKey: ["auth_banner_slides"] });
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
            <ImageIcon className="h-4 w-4 text-primary" /> แบนเนอร์หน้า Login
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            จัดการสไลด์ที่แสดงในหน้าเข้าสู่ระบบ / สมัครสมาชิก
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

      <div className="grid lg:grid-cols-2 gap-5">
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
                  <div className="h-16 w-24 rounded-lg overflow-hidden bg-muted shrink-0">
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

        {/* Live preview with device switcher */}
        <DevicePreviewPanel />
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

function DevicePreviewPanel() {
  const [device, setDevice] = React.useState<DevicePreview>("desktop");
  const frame = DEVICE_FRAMES[device];
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(0.3);

  React.useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const recalc = () => {
      const availW = el.clientWidth - 24;
      // Scale purely on width so the device fills the panel; height grows naturally.
      setScale(Math.max(0.1, Math.min(1, availW / frame.w)));
    };
    recalc();
    const ro = new ResizeObserver(recalc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [frame.w, frame.h]);

  const scaledH = Math.ceil(frame.h * scale);

  return (
    <div>
      <div className="flex items-center justify-between mb-2 gap-2">
        <p className="text-xs text-muted-foreground">ตัวอย่างหน้า Login</p>
        <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
          {(Object.keys(DEVICE_FRAMES) as DevicePreview[]).map((k) => {
            const F = DEVICE_FRAMES[k];
            const Icon = F.icon;
            const active = device === k;
            return (
              <button
                key={k}
                onClick={() => setDevice(k)}
                title={F.label}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-colors ${
                  active
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            );
          })}
        </div>
      </div>

      <div
        ref={containerRef}
        className="rounded-xl border bg-gradient-to-br from-muted/40 to-muted/10 p-3 overflow-hidden"
      >
        <div className="mx-auto relative" style={{ width: "100%", height: scaledH }}>
          <div
            className="absolute top-0 left-1/2 bg-background rounded-[14px] border shadow-xl overflow-hidden"
            style={{
              width: frame.w,
              height: frame.h,
              transform: `translateX(-50%) scale(${scale})`,
              transformOrigin: "top center",
            }}
          >
            <MockLoginPage device={device} />
          </div>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground mt-2 text-center">
        {frame.label} · {frame.w}×{frame.h}
        {!frame.showsBanner && " · แบนเนอร์จะถูกซ่อนบนอุปกรณ์นี้ (แสดงเฉพาะจอ ≥ 1024px)"}
      </p>
    </div>
  );
}

function MockLoginPage({ device }: { device: DevicePreview }) {
  const showBanner = DEVICE_FRAMES[device].showsBanner;
  return (
    <div
      className="w-full h-full grid"
      style={{ gridTemplateColumns: showBanner ? "1fr 1fr" : "1fr" }}
    >
      {showBanner && (
        <div className="p-6 xl:p-8 h-full">
          <div className="h-full min-h-full rounded-2xl overflow-hidden">
            <AuthBannerSlider className="h-full" />
          </div>
        </div>
      )}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4">
          <div className="text-center">
            <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white font-bold text-sm">
              So
            </div>
            <p className="text-lg font-semibold mt-3">เข้าสู่ระบบ</p>
            <p className="text-xs text-muted-foreground">ยินดีต้อนรับกลับ</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="h-9 rounded-md border bg-muted/40" />
            <div className="h-9 rounded-md border bg-muted/40" />
          </div>
          <div className="space-y-2">
            <div className="h-10 rounded-md border bg-muted/30" />
            <div className="h-10 rounded-md border bg-muted/30" />
          </div>
          <div className="h-10 rounded-md bg-gradient-to-r from-orange-500 to-orange-600" />
        </div>
      </div>
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
  slide: BannerSlide | null;
  userId: string;
  nextSortOrder: number;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = React.useState("");
  const [subtitle, setSubtitle] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setTitle(slide?.title ?? "");
      setSubtitle(slide?.subtitle ?? "");
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
        bucket: "auth-banners",
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
      if (slide) {
        const { error } = await supabase
          .from("auth_banner_slides")
          .update({
            title: title.trim() || null,
            subtitle: subtitle.trim() || null,
            image_url: imageUrl,
            is_active: isActive,
          })
          .eq("id", slide.id);
        if (error) throw error;
        toast.success("บันทึกการแก้ไขแล้ว");
      } else {
        const { error } = await supabase.from("auth_banner_slides").insert({
          title: title.trim() || null,
          subtitle: subtitle.trim() || null,
          image_url: imageUrl,
          is_active: isActive,
          sort_order: nextSortOrder,
        });
        if (error) throw error;
        toast.success("เพิ่มสไลด์ใหม่แล้ว");
      }
      qc.invalidateQueries({ queryKey: ["admin_auth_banner_slides"] });
      qc.invalidateQueries({ queryKey: ["auth_banner_slides"] });
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
            <Label className="text-xs">รูปภาพแบนเนอร์ (แนะนำ 4:5 หรือใหญ่กว่า)</Label>
            {imageUrl && (
              <div className="aspect-[4/5] w-full max-h-64 rounded-lg overflow-hidden bg-muted mb-2">
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
              placeholder="เช่น You can easily"
              className="h-10"
              maxLength={80}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">หัวเรื่องใหญ่ (title)</Label>
            <Textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น หลังบ้านฟรีแลนซ์ครบวงจร ที่คิดมาเพื่อคุณ"
              rows={2}
              maxLength={160}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">เปิดใช้งาน</p>
              <p className="text-xs text-muted-foreground">
                เฉพาะสไลด์ที่เปิดอยู่จะแสดงในหน้า Login
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
