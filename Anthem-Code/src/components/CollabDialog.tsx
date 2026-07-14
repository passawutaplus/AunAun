import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthDialog } from "@/stores/authDialogStore";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Handshake, Sparkles, UserCircle2, Link2, MessageCircle, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { mapWriteFlowError } from "@/lib/writeFlowErrors";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useMyProjects } from "@/hooks/useProjects";
import { useCreateCollabRequest } from "@/hooks/useCollabRequests";
import { useOpenHireCollabChat } from "@/hooks/useChat";
import { isUuid } from "@/lib/uuid";
import { supabase } from "@/integrations/supabase/client";
import {
  buildCollabContextMessage,
  DEFAULT_COLLAB_MESSAGE,
  type ChatEntrySource,
} from "@/lib/chatContext";
import { validateProjectInquiry } from "@/domain/inquiry";
import ProjectReferencePreview from "@/components/opportunity/ProjectReferencePreview";
import { trackProductEvent } from "@/lib/productEvents";
import { serializeCollabReferenceLinks } from "@/lib/collabBrief";
import { safeHttpUrl } from "@/lib/safeUrl";
import { isBlockedFromOpportunity } from "@/hooks/useCommunityPostInteractions";

const COLLAB_TYPES = [
  { key: "chat", label: "พูดคุย" },
  { key: "joint-project", label: "ร่วมโปรเจกต์ใหม่" },
  { key: "skill-swap", label: "แลกเปลี่ยนสกิล" },
  { key: "experiment", label: "งานทดลอง / สะสมพอร์ต" },
  { key: "content", label: "คอนเทนต์ / โปรโมตร่วม" },
  { key: "other", label: "อื่นๆ" },
] as const;

const MAX_COLLAB_LINKS = 8;

/** Normalize + allow only safe http(s) absolute URLs. */
function validateCollabLink(raw: string): string | null {
  let v = raw.trim();
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
  return safeHttpUrl(v) ?? null;
}

const collabDetailsSchema = z
  .object({
    collabTypes: z.array(z.string()),
    message: z.string().trim().max(1000),
    attached: z.array(z.string()).max(3, "แนบได้สูงสุด 3 ชิ้น"),
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
  const createReq = useCreateCollabRequest();
  const openChat = useOpenHireCollabChat();

  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [otherNote, setOtherNote] = useState("");
  const [message, setMessage] = useState("");
  const [attached, setAttached] = useState<string[]>([]);
  const [linkDraft, setLinkDraft] = useState("");
  const [referenceLinks, setReferenceLinks] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const busy = createReq.isPending || openChat.isPending;

  useEffect(() => {
    if (!open) return;
    void trackProductEvent(
      "collab_open",
      { project_id: projectId ?? null, recipient_id: recipientId, source },
      { debounceMs: 1_000 },
    );
  }, [open, projectId, recipientId, source]);

  const published = useMemo(() => myProjects.filter((p) => p.status === "Published"), [myProjects]);
  const needsWorkPicker = published.length > 3;
  const otherSelected = selectedTypes.includes("other");

  const reset = () => {
    setSelectedTypes([]);
    setOtherNote("");
    setMessage("");
    setAttached([]);
    setLinkDraft("");
    setReferenceLinks([]);
    setSubmitError(null);
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

    setSubmitError(null);
    try {
      const created = await createReq.mutateAsync({
        sender_id: user.id,
        recipient_id: recipientId,
        project_id: projectId && isUuid(projectId) ? projectId : null,
        collab_types: payload.collabTypes,
        message: payload.message,
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
        contextMessage: buildCollabContextMessage({
          source,
          projectTitle: title,
          profileName: source === "profile" ? recipientName : undefined,
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
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border-primary/20">
        <DialogHeader className="space-y-2 text-left">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Handshake className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-xl">ชวน {recipientName} ร่วมงาน</DialogTitle>
          <DialogDescription className="text-sm leading-6">
            ไม่ใช่การจ้างงาน — เติมรายละเอียดได้ถ้าต้องการ ไม่กรอกก็แชทได้เลย
            {source === "profile" && <> จากโปรไฟล์ <span className="text-foreground font-medium">{recipientName}</span></>}
          </DialogDescription>
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

          <div>
            <Label className="text-sm font-semibold">
              อยากร่วมงานแบบไหน
              <span className="text-muted-foreground font-normal"> (ไม่บังคับ)</span>
            </Label>
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
                value={otherNote}
                onChange={(e) => setOtherNote(e.target.value)}
                placeholder="ระบุประเภทที่อยากร่วมงาน เช่น เวิร์กชอป, นิทรรศการ"
                maxLength={80}
                className="mt-2.5 rounded-xl"
              />
            )}
          </div>

          {published.length > 0 && (
            <div>
              <Label className="text-sm font-semibold">แนบผลงานของฉัน</Label>
              <p className="text-xs text-muted-foreground mb-2.5">
                {needsWorkPicker
                  ? `มี ${published.length} ชิ้น — กดเลือกได้สูงสุด 3 ชิ้น (${attached.length}/3)`
                  : `เลือกได้สูงสุด 3 ชิ้น (${attached.length}/3)`}
              </p>

              {needsWorkPicker ? (
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
                          on ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted hover:border-border",
                        )}
                      >
                        <div className="w-12 h-12 shrink-0 rounded-md overflow-hidden bg-muted">
                          {p.cover_url ? (
                            <img src={p.cover_url} alt={p.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground p-1 text-center">
                              {p.title}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                          {p.category ? (
                            <p className="text-[10px] text-muted-foreground truncate">{p.category}</p>
                          ) : null}
                        </div>
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                            on ? "bg-primary border-primary" : "border-border",
                          )}
                        >
                          {on && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {published.map((p) => {
                    const on = attached.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleAttach(p.id)}
                        className={cn(
                          "relative aspect-square rounded-xl overflow-hidden border-2 transition-all",
                          on ? "border-primary shadow-md" : "border-transparent hover:border-border",
                        )}
                      >
                        {p.cover_url ? (
                          <img src={p.cover_url} alt={p.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground p-1 text-center">
                            {p.title}
                          </div>
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
              )}
            </div>
          )}

          <div>
            <Label htmlFor="collab-link-draft" className="text-sm font-semibold flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-primary" /> ลิงก์อ้างอิง (ไดรฟ์ / เว็บ / พอร์ต)
              <span className="text-muted-foreground font-normal"> (ไม่บังคับ)</span>
            </Label>
            <p className="text-xs text-muted-foreground mt-1 mb-1.5">
              ใส่ทีละลิงก์แล้วกด + — ระบบตรวจว่าเป็นลิงก์ http/https ที่ปลอดภัยก่อนเพิ่ม
            </p>
            <div className="flex gap-2">
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

          <div>
            <Label htmlFor="collab-msg" className="text-sm font-semibold">
              ข้อความถึง {recipientName}
              <span className="text-muted-foreground font-normal"> (ไม่บังคับ)</span>
            </Label>
            <Textarea
              id="collab-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`ชอบงาน "${projectTitle ?? "นี้"}" มาก สนใจอยากลองทำ...`}
              rows={4}
              maxLength={1000}
              className="mt-1.5 rounded-xl"
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

          <DialogFooter className="gap-2 sm:justify-end pt-2">
            <Button
              type="submit"
              disabled={busy}
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
              {user ? (busy ? "กำลังเปิดแชท..." : "แชทเลย") : "เข้าสู่ระบบเพื่อแชท"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CollabDialog;
