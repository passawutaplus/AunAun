import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useApplyToJob, type JobPost } from "@/hooks/useJobs";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useMyProjects } from "@/hooks/useProjects";
import { useSendMessage } from "@/hooks/useChat";
import { profileAboutUrl } from "@/lib/profileRoutes";
import JobApplySuccessPanel from "@/components/jobs/JobApplySuccessPanel";
import { toast } from "sonner";

const SLOTS = [
  { id: "morning", label: "เช้า (9:00–12:00)" },
  { id: "afternoon", label: "บ่าย (13:00–16:00)" },
  { id: "evening", label: "เย็น (16:00–19:00)" },
  { id: "online", label: "นัดออนไลน์ ตามสะดวก" },
] as const;

type Props = {
  job: JobPost;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  alreadyApplied?: boolean;
  conversationId?: string | null;
  onOpenChat?: (conversationId: string) => void;
};

const JobBookingDialog = ({
  job,
  open,
  onOpenChange,
  alreadyApplied,
  conversationId,
  onOpenChat,
}: Props) => {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: myProjects = [] } = useMyProjects(user?.id);
  const apply = useApplyToJob();
  const send = useSendMessage();
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState<(typeof SLOTS)[number]["id"]>("afternoon");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sentConvId, setSentConvId] = useState<string | null | undefined>(undefined);

  const company = job.hiring_org?.display_name || "บริษัท";
  const sent = sentConvId !== undefined;
  const slotLabel = SLOTS.find((s) => s.id === slot)?.label ?? slot;
  const busy = apply.isPending || send.isPending;

  const bookingText = () => {
    const lines = [
      `ขอนัดคุยตำแหน่ง ${job.title}`,
      date ? `วันที่สะดวก: ${date}` : null,
      `ช่วงเวลา: ${slotLabel}`,
      note.trim() || null,
    ];
    return lines.filter(Boolean).join("\n");
  };

  const close = (next: boolean) => {
    if (!next) {
      setDate("");
      setSlot("afternoon");
      setNote("");
      setError(null);
      setSentConvId(undefined);
    }
    onOpenChange(next);
  };

  const submit = async () => {
    if (!user) return;
    if (!date) {
      setError("เลือกวันที่สะดวก");
      return;
    }
    const picked = new Date(`${date}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(picked.getTime()) || picked < today) {
      setError("วันที่ต้องเป็นวันนี้หรือวันถัดไป");
      return;
    }
    setError(null);
    const text = bookingText();
    try {
      if (alreadyApplied && conversationId) {
        await send.mutateAsync({ conversationId, content: text });
        setSentConvId(conversationId);
        return;
      }
      const published = myProjects.filter((p) => p.status === "Published");
      const cvUrl = profile
        ? profileAboutUrl({ user_id: user.id, username: profile.username })
        : "";
      await apply.mutateAsync({
        job_id: job.id,
        cover_letter: [text, cvUrl ? `About Me: ${cvUrl}` : ""].filter(Boolean).join("\n\n"),
        portfolio_project_ids: published.slice(0, 6).map((p) => p.id),
      });
      setSentConvId(null);
    } catch (e) {
      if (alreadyApplied) {
        toast.error(e instanceof Error ? e.message : "ส่งคำขอนัดไม่สำเร็จ");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        {sent ? (
          <>
            <DialogTitle className="sr-only">ส่งคำขอนัดแล้ว</DialogTitle>
            <DialogDescription className="sr-only">รอบริษัทยืนยันวันเวลา</DialogDescription>
            <JobApplySuccessPanel
              title="ส่งคำขอนัดแล้ว"
              body={`ส่งให้ ${company} แล้ว — รอบริษัทยืนยันวันเวลาแล้วจะทักกลับ`}
              onClose={() => close(false)}
              onOpenChat={undefined}
            />
          </>
        ) : (
          <>
            <DialogTitle className="thai-display pr-6">Booking นัดคุยกับ {company}</DialogTitle>
            <DialogDescription>
              เลือกวันที่สะดวก บริษัทจะตอบกลับในแชท — จุดนัด{job.meeting_location ? `: ${job.meeting_location}` : "ตามที่บริษัทนัด"}
            </DialogDescription>
            <div className="space-y-3">
              <div>
                <Label htmlFor="job-book-date" className="text-xs">วันที่สะดวก</Label>
                <Input
                  id="job-book-date"
                  type="date"
                  className="rounded-xl mt-1"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">ช่วงเวลา</Label>
                <Select value={slot} onValueChange={(v) => setSlot(v as typeof slot)}>
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SLOTS.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="job-book-note" className="text-xs">ข้อความเพิ่ม — ไม่บังคับ</Label>
                <Textarea
                  id="job-book-note"
                  rows={3}
                  className="rounded-xl mt-1"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="เช่น นัดออนไลน์ หรือเข้าออฟิสได้"
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" className="rounded-xl" onClick={() => close(false)}>ยกเลิก</Button>
              <Button className="rounded-xl" disabled={busy} onClick={() => void submit()}>
                {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                ส่งคำขอนัด
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default JobBookingDialog;
