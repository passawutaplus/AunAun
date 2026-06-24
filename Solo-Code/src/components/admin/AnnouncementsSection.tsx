import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Megaphone, Loader2, Trash2, Plus, Upload, Eye, X } from "lucide-react";
import { uploadCompressedImage } from "@/lib/imageCompress";

interface Announcement {
  id: string;
  message: string;
  banner_url: string | null;
  link_url: string | null;
  is_active: boolean;
  created_at: string;
  start_at: string | null;
  end_at: string | null;
}

// helpers: convert datetime-local <-> ISO
function localToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return isNaN(d.getTime()) ? null : d.toISOString();
}
function isoToLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isLive(a: Announcement, now = Date.now()): boolean {
  if (!a.is_active) return false;
  if (a.start_at && new Date(a.start_at).getTime() > now) return false;
  if (a.end_at && new Date(a.end_at).getTime() < now) return false;
  return true;
}

export function AnnouncementsSection() {
  const { user } = useAuth();
  const [items, setItems] = React.useState<Announcement[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);

  const [message, setMessage] = React.useState("");
  const [bannerUrl, setBannerUrl] = React.useState("");
  const [linkUrl, setLinkUrl] = React.useState("");
  const [startAt, setStartAt] = React.useState("");
  const [endAt, setEndAt] = React.useState("");
  const [previewOpen, setPreviewOpen] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("announcements")
      .select("id,message,banner_url,link_url,is_active,created_at,start_at,end_at")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setItems((data as Announcement[]) ?? []);
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const handleUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const url = await uploadCompressedImage({
        file,
        bucket: "announcement-banners",
        userId: user.id,
        prefix: "banner",
      });
      setBannerUrl(url);
      toast.success("อัปโหลดแบนเนอร์แล้ว (บีบอัดเรียบร้อย)");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async () => {
    const trimmed = message.trim();
    if (!trimmed && !bannerUrl.trim()) {
      toast.error("ใส่ข้อความหรือแบนเนอร์อย่างน้อย 1 อย่าง");
      return;
    }
    const startIso = localToIso(startAt);
    const endIso = localToIso(endAt);
    if (startIso && endIso && new Date(startIso) >= new Date(endIso)) {
      toast.error("เวลาเริ่มต้องมาก่อนเวลาสิ้นสุด");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("announcements").insert({
      message: trimmed,
      banner_url: bannerUrl.trim() || null,
      link_url: linkUrl.trim() || null,
      is_active: true,
      start_at: startIso,
      end_at: endIso,
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("สร้างประกาศแล้ว");
    setMessage("");
    setBannerUrl("");
    setLinkUrl("");
    setStartAt("");
    setEndAt("");
    refresh();
  };

  const toggleActive = async (id: string, next: boolean) => {
    setBusyId(id);
    const { error } = await supabase.from("announcements").update({ is_active: next }).eq("id", id);
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, is_active: next } : it)));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ลบประกาศนี้ถาวร?")) return;
    setBusyId(id);
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("ลบประกาศแล้ว");
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" /> ประกาศถึงผู้ใช้
        </h2>
        <p className="text-xs text-muted-foreground">
          กำหนดเวลาเริ่ม/สิ้นสุดได้ — เมื่อหมดเวลาจะหายเองโดยไม่ต้องปิดมือ
        </p>
      </div>

      <Card className="border-border">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div>
            <label className="text-xs font-medium mb-1 block">ข้อความประกาศ</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="เช่น ระบบจะปรับปรุงในวันเสาร์ 22:00 น. — ขอบคุณสำหรับฟีดแบ็กครับ"
              className="text-sm min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium">แบนเนอร์ (ไม่บังคับ)</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="https://... หรืออัปโหลด →"
                className="text-xs h-9 flex-1"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5 h-9"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                อัปโหลด
              </Button>
            </div>
            {bannerUrl && (
              <div className="relative inline-block">
                <img
                  src={bannerUrl}
                  alt="banner preview"
                  className="max-h-24 rounded-lg ring-1 ring-border"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute -top-2 -right-2 h-6 w-6 p-0 bg-background border border-border"
                  onClick={() => setBannerUrl("")}
                  aria-label="ลบรูป"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block">
              ลิงก์ปลายทางเมื่อคลิก (ไม่บังคับ)
            </label>
            <Input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              className="text-xs h-9"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">
                เริ่มแสดง (ไม่บังคับ — ว่าง = ทันที)
              </label>
              <Input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="text-xs h-9"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">
                หมดอายุ (ไม่บังคับ — ว่าง = ไม่หมด)
              </label>
              <Input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setPreviewOpen(true)}
              disabled={!message.trim() && !bannerUrl.trim()}
            >
              <Eye className="h-3.5 w-3.5" /> ทดสอบแสดงผล
            </Button>
            <Button onClick={handleCreate} disabled={saving} size="sm" className="gap-1.5">
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              เผยแพร่ประกาศ
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardContent className="p-4 sm:p-5">
          <h3 className="text-sm font-semibold mb-3">ประวัติประกาศ ({items.length})</h3>
          {loading ? (
            <div className="text-xs text-muted-foreground py-6 text-center">กำลังโหลด...</div>
          ) : items.length === 0 ? (
            <div className="text-xs text-muted-foreground py-6 text-center">ยังไม่มีประกาศ</div>
          ) : (
            <div className="space-y-2">
              {items.map((it) => {
                const live = isLive(it);
                const scheduled =
                  it.is_active && it.start_at && new Date(it.start_at).getTime() > Date.now();
                const expired = it.end_at && new Date(it.end_at).getTime() < Date.now();
                return (
                  <div
                    key={it.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {live ? (
                          <Badge className="bg-success text-success-foreground text-[10px]">
                            กำลังแสดง
                          </Badge>
                        ) : scheduled ? (
                          <Badge className="bg-primary/15 text-primary text-[10px]">รอเวลา</Badge>
                        ) : expired ? (
                          <Badge variant="secondary" className="text-[10px]">
                            หมดอายุ
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            ปิดอยู่
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          สร้าง{" "}
                          {new Date(it.created_at).toLocaleString("th-TH", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                        {it.start_at && (
                          <span className="text-[10px] text-muted-foreground">
                            · เริ่ม{" "}
                            {new Date(it.start_at).toLocaleString("th-TH", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </span>
                        )}
                        {it.end_at && (
                          <span className="text-[10px] text-muted-foreground">
                            · ถึง{" "}
                            {new Date(it.end_at).toLocaleString("th-TH", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </span>
                        )}
                      </div>
                      {it.banner_url && (
                        <img
                          src={it.banner_url}
                          alt=""
                          loading="lazy"
                          className="max-h-16 rounded mb-1 ring-1 ring-border"
                        />
                      )}
                      {it.message && (
                        <p className="text-xs text-foreground whitespace-pre-wrap line-clamp-3">
                          {it.message}
                        </p>
                      )}
                      {it.link_url && (
                        <div className="text-[10px] text-primary truncate mt-0.5">
                          → {it.link_url}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={it.is_active}
                        disabled={busyId === it.id}
                        onCheckedChange={(v) => toggleActive(it.id, v)}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        disabled={busyId === it.id}
                        onClick={() => handleDelete(it.id)}
                      >
                        {busyId === it.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>พรีวิว — มุมมองผู้ใช้</DialogTitle>
          </DialogHeader>
          <div className="rounded-2xl border border-primary/30 bg-primary/5 shadow-soft">
            <div className="flex items-start gap-3 p-3 sm:p-4">
              <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <Megaphone className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                {bannerUrl && (
                  <img
                    src={bannerUrl}
                    alt="banner preview"
                    className="w-full max-h-40 object-cover rounded-lg mb-2 ring-1 ring-border"
                  />
                )}
                {message && (
                  <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {message}
                  </p>
                )}
                {linkUrl && (
                  <div className="text-[10px] text-primary truncate mt-1">→ {linkUrl}</div>
                )}
              </div>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            * นี่คือพรีวิวเท่านั้น ยังไม่ได้เผยแพร่จริง
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
