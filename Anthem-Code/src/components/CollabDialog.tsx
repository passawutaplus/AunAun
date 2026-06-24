import { useMemo, useState } from "react";
import { useAuthDialog } from "@/stores/authDialogStore";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Handshake, Sparkles, UserCircle2, FolderOpen, Globe, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useMyProjects } from "@/hooks/useProjects";
import { useCreateCollabRequest } from "@/hooks/useCollabRequests";
import { supabase } from "@/integrations/supabase/client";

const COLLAB_TYPES = [
  { key: "joint-project", label: "ร่วมโปรเจกต์ใหม่" },
  { key: "skill-swap", label: "แลกเปลี่ยนสกิล" },
  { key: "studio", label: "เปิด studio / ทีม" },
  { key: "experiment", label: "งานทดลอง / สะสมพอร์ต" },
  { key: "content", label: "คอนเทนต์ / โปรโมตร่วม" },
  { key: "other", label: "อื่นๆ" },
] as const;

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\/.+\..+/.test(v), "ลิงก์ไม่ถูกต้อง (ต้องขึ้นต้น http/https)")
  .optional();

const collabSchema = z
  .object({
    collabTypes: z.array(z.string()).min(1, "เลือกอย่างน้อย 1 ประเภท"),
    message: z.string().trim().min(10, "เขียนข้อความอย่างน้อย 10 ตัวอักษร").max(1000),
    attached: z.array(z.string()).max(3, "แนบได้สูงสุด 3 ชิ้น"),
    externalDriveUrl: optionalUrl,
    websiteUrl: optionalUrl,
    otherTypeNote: z.string().trim().max(80).optional(),
  })
  .refine(
    (d) => !d.collabTypes.includes("other") || (d.otherTypeNote && d.otherTypeNote.length > 0),
    { message: "กรุณาระบุประเภท 'อื่นๆ'", path: ["otherTypeNote"] },
  );

interface CollabDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientId?: string;
  recipientName: string;
  projectId?: string;
  projectTitle?: string;
}

const CollabDialog = ({ open, onOpenChange, recipientId, recipientName, projectId, projectTitle }: CollabDialogProps) => {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: myProjects = [] } = useMyProjects(user?.id);
  const createReq = useCreateCollabRequest();

  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [otherNote, setOtherNote] = useState("");
  const [message, setMessage] = useState("");
  const [attached, setAttached] = useState<string[]>([]);
  const [driveUrl, setDriveUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [showAllWorks, setShowAllWorks] = useState(false);

  const published = useMemo(() => myProjects.filter((p) => p.status === "Published"), [myProjects]);
  const initialWorks = published.slice(0, 6);
  const otherSelected = selectedTypes.includes("other");

  const reset = () => {
    setSelectedTypes([]); setOtherNote(""); setMessage(""); setAttached([]);
    setDriveUrl(""); setWebsiteUrl(""); setShowAllWorks(false);
  };

  const toggleType = (key: string) =>
    setSelectedTypes((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));

  const toggleAttach = (id: string) =>
    setAttached((s) => {
      if (s.includes(id)) return s.filter((x) => x !== id);
      if (s.length >= 3) {
        toast.info("แนบได้สูงสุด 3 ชิ้น");
        return s;
      }
      return [...s, id];
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenChange(false);
      useAuthDialog.getState().openSignup();
      return;
    }
    if (!recipientId) { toast.error("ไม่พบเจ้าของผลงาน"); return; }
    if (recipientId === user.id) { toast.info("ส่งคำขอให้ตัวเองไม่ได้"); return; }

    const parsed = collabSchema.safeParse({
      collabTypes: selectedTypes,
      message,
      attached,
      externalDriveUrl: driveUrl,
      websiteUrl,
      otherTypeNote: otherNote,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
      return;
    }

    try {
      const created = await createReq.mutateAsync({
        sender_id: user.id,
        recipient_id: recipientId,
        project_id: projectId ?? null,
        collab_types: parsed.data.collabTypes,
        message: parsed.data.message,
        attached_project_ids: parsed.data.attached,
        external_drive_url: parsed.data.externalDriveUrl || null,
        website_url: parsed.data.websiteUrl || null,
        other_type_note: otherSelected ? (parsed.data.otherTypeNote || null) : null,
      });
      void supabase.functions.invoke("notify-anthem-collab", {
        body: { request_id: created.id },
      });
      toast.success(`ส่งคำขอร่วมงานไปหา ${recipientName} แล้ว`);
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ส่งคำขอไม่สำเร็จ");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border-primary/20">
        <DialogHeader>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-1">
            <Handshake className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-xl">ชวน {recipientName} ร่วมงาน</DialogTitle>
          <DialogDescription className="text-sm leading-6">
            ไม่ใช่การจ้างงาน — ส่งโปรไฟล์และผลงานของคุณให้ดู และบอกว่าอยากร่วมงานแบบไหน
            {projectTitle && <> เริ่มจากผลงาน <span className="text-foreground font-medium">"{projectTitle}"</span></>}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Your profile preview */}
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

          {/* Collab types */}
          <div>
            <Label className="text-sm font-semibold">อยากร่วมงานแบบไหน <span className="text-destructive">*</span></Label>
            <p className="text-xs text-muted-foreground mb-2.5">เลือกได้หลายแบบ</p>
            <div className="flex flex-wrap gap-2">
              {COLLAB_TYPES.map((t) => {
                const on = selectedTypes.includes(t.key);
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => toggleType(t.key)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all",
                      on
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-card text-foreground border-border hover:border-primary/40"
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
                value={otherNote}
                onChange={(e) => setOtherNote(e.target.value)}
                placeholder="ระบุประเภทที่อยากร่วมงาน เช่น เวิร์กชอป, นิทรรศการ"
                maxLength={80}
                className="mt-2.5 rounded-xl"
              />
            )}
          </div>

          {/* Attach my works */}
          {published.length > 0 && (
            <div>
              <Label className="text-sm font-semibold">แนบผลงานของฉัน</Label>
              <p className="text-xs text-muted-foreground mb-2.5">เลือกได้สูงสุด 3 ชิ้น ({attached.length}/3)</p>

              {!showAllWorks ? (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {initialWorks.map((p) => {
                      const on = attached.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => toggleAttach(p.id)}
                          className={cn(
                            "relative aspect-square rounded-xl overflow-hidden border-2 transition-all",
                            on ? "border-primary shadow-md" : "border-transparent hover:border-border"
                          )}
                        >
                          {p.cover_url ? (
                            <img src={p.cover_url} alt={p.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground">{p.title}</div>
                          )}
                          {on && (
                            <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                              <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                                <Check className="w-4 h-4" />
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {published.length > 6 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAllWorks(true)}
                      className="w-full mt-2.5 rounded-xl text-xs h-9"
                    >
                      ดูผลงานทั้งหมด ({published.length}) <ChevronDown className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <div className="space-y-1.5 max-h-72 overflow-y-auto rounded-xl border border-border p-1.5 bg-muted/20">
                    {published.map((p) => {
                      const on = attached.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => toggleAttach(p.id)}
                          className={cn(
                            "w-full flex items-center gap-3 p-2 rounded-lg border text-left transition-all",
                            on
                              ? "border-primary bg-primary/5"
                              : "border-transparent hover:bg-muted hover:border-border"
                          )}
                        >
                          <div className="w-12 h-12 shrink-0 rounded-md overflow-hidden bg-muted">
                            {p.cover_url ? (
                              <img src={p.cover_url} alt={p.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground p-1 text-center">{p.title}</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                            {p.category && (
                              <p className="text-[10px] text-muted-foreground truncate">{p.category}</p>
                            )}
                          </div>
                          <div
                            className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                              on ? "bg-primary border-primary" : "border-border"
                            )}
                          >
                            {on && <Check className="w-3 h-3 text-primary-foreground" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowAllWorks(false)}
                    className="w-full mt-2 rounded-xl text-xs h-9 text-muted-foreground"
                  >
                    ย่อรายการ <ChevronUp className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </>
              )}
            </div>
          )}

          {/* External drive link */}
          <div>
            <Label htmlFor="collab-drive" className="text-sm font-semibold flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5 text-primary" /> ลิงก์ไดรฟ์/ไฟล์ผลงานเพิ่มเติม (ไม่บังคับ)
            </Label>
            <Input
              id="collab-drive"
              type="url"
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              maxLength={500}
              className="mt-1.5 rounded-xl"
            />
          </div>

          {/* Website link */}
          <div>
            <Label htmlFor="collab-website" className="text-sm font-semibold flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-primary" /> ลิงก์เว็บไซต์/พอร์ตโฟลิโอ (ไม่บังคับ)
            </Label>
            <Input
              id="collab-website"
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://yourwebsite.com"
              maxLength={500}
              className="mt-1.5 rounded-xl"
            />
          </div>

          {/* Message */}
          <div>
            <Label htmlFor="collab-msg" className="text-sm font-semibold">ข้อความถึง {recipientName} <span className="text-destructive">*</span></Label>
            <Textarea
              id="collab-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`ชอบงาน "${projectTitle ?? "นี้"}" มาก สนใจอยากลองทำ...`}
              rows={4}
              maxLength={1000}
              className="mt-1.5 rounded-xl"
              required
            />
            <p className="text-[10px] text-muted-foreground text-right mt-1">{message.length}/1000</p>
          </div>

          {!user && (
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 text-xs text-foreground/80">
              ต้องเข้าสู่ระบบก่อนเพื่อส่งคำขอร่วมงาน
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full">ยกเลิก</Button>
            <Button
              type="submit"
              disabled={createReq.isPending}
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Handshake className="w-4 h-4 mr-1.5" />
              {user ? (createReq.isPending ? "กำลังส่ง..." : "ส่งคำขอร่วมงาน") : "เข้าสู่ระบบเพื่อส่งคำขอ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CollabDialog;
