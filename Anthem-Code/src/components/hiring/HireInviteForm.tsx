import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { uploadProjectImage } from "@/lib/uploadImage";
import { jobTypeLabel } from "@/lib/hireBrief";
import { JOB_TYPES } from "@/components/hiring/HireWizardFields";

export type HireInviteFormState = {
  jobType: string;
  details: string;
  deliverablesText: string;
  budgetAmount: string;
  deadline: string;
  clientName: string;
  email: string;
  phone: string;
  referenceUrl: string;
  attachmentUrls: string[];
};

export const emptyHireInviteForm = (): HireInviteFormState => ({
  jobType: "branding",
  details: "",
  deliverablesText: "",
  budgetAmount: "",
  deadline: "",
  clientName: "",
  email: "",
  phone: "",
  referenceUrl: "",
  attachmentUrls: [],
});

export function buildHireInviteMessage(form: HireInviteFormState): string | null {
  const parts = [
    `ประเภทงาน: ${jobTypeLabel(form.jobType)}`,
    form.details.trim() ? `รายละเอียด:\n${form.details.trim()}` : null,
    form.deliverablesText.trim() ? `สิ่งที่ส่งมอบ:\n${form.deliverablesText.trim()}` : null,
    form.referenceUrl.trim() ? `ลิงก์อ้างอิง: ${form.referenceUrl.trim()}` : null,
  ].filter(Boolean);

  if (!parts.length) return null;
  let msg = parts.join("\n\n");
  if (form.attachmentUrls.length) {
    msg += `\n\n---\nแนบภาพ:\n${form.attachmentUrls.join("\n")}`;
  }
  return msg;
}

type JobOption = { id: string; title: string };

type Props = {
  form: HireInviteFormState;
  setForm: React.Dispatch<React.SetStateAction<HireInviteFormState>>;
  myJobs: JobOption[];
  jobPostId: string;
  onJobPostIdChange: (id: string) => void;
  userId?: string;
  maxImages?: number;
};

const HireInviteForm = ({
  form,
  setForm,
  myJobs,
  jobPostId,
  onJobPostIdChange,
  userId,
  maxImages = 3,
}: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const onPickImages = async (files: FileList | null) => {
    if (!files?.length || !userId) return;
    const slots = maxImages - form.attachmentUrls.length;
    if (slots <= 0) return;
    setUploading(true);
    try {
      const added: string[] = [];
      for (const file of Array.from(files).slice(0, slots)) {
        const url = await uploadProjectImage(file, userId, "hire-brief", "free", { fastQuotaCheck: true });
        added.push(url);
      }
      setForm((f) => ({ ...f, attachmentUrls: [...f.attachmentUrls, ...added] }));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs">ผูกประกาศงานของคุณ (ไม่บังคับ)</Label>
        {myJobs.length === 0 ? (
          <p className="text-xs text-muted-foreground mt-1.5">
            ยังไม่มีประกาศ —{" "}
            <Link to="/jobs?post=1" className="text-primary hover:underline">
              สร้างประกาศใหม่
            </Link>
          </p>
        ) : (
          <Select value={jobPostId || "__none__"} onValueChange={(v) => onJobPostIdChange(v === "__none__" ? "" : v)}>
            <SelectTrigger className="rounded-xl mt-1.5">
              <SelectValue placeholder="ไม่ผูกประกาศ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">ไม่ผูกประกาศ — ส่งคำชวนทั่วไป</SelectItem>
              {myJobs.map((j) => (
                <SelectItem key={j.id} value={j.id}>
                  {j.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div>
        <Label>ประเภทงาน</Label>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {JOB_TYPES.map((j) => (
            <button
              key={j.id}
              type="button"
              onClick={() => setForm((f) => ({ ...f, jobType: j.id }))}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs border transition-colors",
                form.jobType === j.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {j.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="hire-details">รายละเอียดงาน</Label>
        <Textarea
          id="hire-details"
          rows={3}
          value={form.details}
          onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))}
          placeholder="เป้าหมายงาน กลุ่มเป้าหมาย ข้อจำกัด"
          className="rounded-xl mt-1.5"
        />
      </div>

      <div>
        <Label htmlFor="hire-deliverables">สิ่งที่ต้องการส่งมอบ</Label>
        <Textarea
          id="hire-deliverables"
          rows={2}
          value={form.deliverablesText}
          onChange={(e) => setForm((f) => ({ ...f, deliverablesText: e.target.value }))}
          placeholder="เช่น โลโก้ 3 แบบ, ชุดโซเชียล 5 ภาพ"
          className="rounded-xl mt-1.5"
        />
      </div>

      <div>
        <Label>แนบภาพอ้างอิง (ไม่บังคับ)</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {form.attachmentUrls.map((url) => (
            <div key={url} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                aria-label="ลบรูป"
                className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-background/80"
                onClick={() => setForm((f) => ({ ...f, attachmentUrls: f.attachmentUrls.filter((u) => u !== url) }))}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {form.attachmentUrls.length < maxImages && userId && (
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="w-16 h-16 rounded-lg border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 text-[10px] gap-0.5"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
              เพิ่มรูป
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void onPickImages(e.target.files)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="hire-budget">งบประมาณ (บาท)</Label>
          <Input
            id="hire-budget"
            inputMode="numeric"
            value={form.budgetAmount}
            onChange={(e) => setForm((f) => ({ ...f, budgetAmount: e.target.value }))}
            placeholder="เช่น 15000"
            className="rounded-xl mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="hire-deadline">กำหนดส่งงาน</Label>
          <Input
            id="hire-deadline"
            value={form.deadline}
            onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
            placeholder="เช่น 2 สัปดาห์"
            className="rounded-xl mt-1.5"
          />
        </div>
      </div>

      <div className="space-y-3 pt-1 border-t border-border/60">
        <p className="text-xs font-medium text-muted-foreground">ข้อมูลติดต่อ</p>
        <div>
          <Label htmlFor="hire-client-name">ชื่อผู้ติดต่อ *</Label>
          <Input
            id="hire-client-name"
            value={form.clientName}
            onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
            className="rounded-xl mt-1.5"
            required
          />
        </div>
        <div>
          <Label htmlFor="hire-email">อีเมล *</Label>
          <Input
            id="hire-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="rounded-xl mt-1.5"
            required
          />
        </div>
        <div>
          <Label htmlFor="hire-phone">เบอร์มือถือ</Label>
          <Input
            id="hire-phone"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="0812345678"
            className="rounded-xl mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="hire-ref-url">ลิงก์อ้างอิง (ไฟล์ / brief)</Label>
          <Input
            id="hire-ref-url"
            value={form.referenceUrl}
            onChange={(e) => setForm((f) => ({ ...f, referenceUrl: e.target.value }))}
            placeholder="https://drive.google.com/..."
            className="rounded-xl mt-1.5"
          />
        </div>
      </div>
    </div>
  );
};

export default HireInviteForm;
