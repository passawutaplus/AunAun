import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { isAplus1LaunchMinimal } from "@/lib/aplus1Launch";
import { cn } from "@/lib/utils";
import { uploadProjectImage } from "@/lib/uploadImage";
import { jobTypeLabel } from "@/lib/hireBrief";
import { HIRE_ENGAGEMENT_TYPES } from "@/components/hiring/HireWizardFields";

export type HireInviteFormState = {
  jobTypes: string[];
  details: string;
  budgetMin: string;
  budgetMax: string;
  deadline: string;
  referenceUrl: string;
  attachmentUrls: string[];
};

export const emptyHireInviteForm = (): HireInviteFormState => ({
  jobTypes: ["piece"], // default: จ้างทำชิ้นงาน — user can deselect
  details: "",
  budgetMin: "",
  budgetMax: "",
  deadline: "",
  referenceUrl: "",
  attachmentUrls: [],
});

export function buildHireInviteMessage(form: HireInviteFormState): string | null {
  const typeLabel = form.jobTypes.length
    ? form.jobTypes.map(jobTypeLabel).join(" · ")
    : null;
  const parts = [
    typeLabel ? `ประเภทงาน: ${typeLabel}` : null,
    form.details.trim() ? `รายละเอียด:\n${form.details.trim()}` : null,
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

type HireFieldErrorKey = "deadline" | "budgetMax" | "jobTypes";

type Props = {
  form: HireInviteFormState;
  setForm: React.Dispatch<React.SetStateAction<HireInviteFormState>>;
  myJobs: JobOption[];
  jobPostId: string;
  onJobPostIdChange: (id: string) => void;
  userId?: string;
  maxImages?: number;
  /** Highlight required fields that failed validation. */
  fieldErrors?: Partial<Record<HireFieldErrorKey, string>>;
  onClearFieldError?: (key: HireFieldErrorKey) => void;
};

const HireInviteForm = ({
  form,
  setForm,
  myJobs,
  jobPostId,
  onJobPostIdChange,
  userId,
  maxImages = 3,
  fieldErrors,
  onClearFieldError,
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

  const toggleJobType = (id: string) => {
    setForm((f) => {
      const has = f.jobTypes.includes(id);
      return {
        ...f,
        jobTypes: has ? f.jobTypes.filter((x) => x !== id) : [...f.jobTypes, id],
      };
    });
    onClearFieldError?.("jobTypes");
  };

  return (
    <div className="space-y-4">
      {!isAplus1LaunchMinimal() ? (
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
      ) : null}

      <div id="hire-job-types">
        <Label>
          ประเภทงาน <span className="text-orange-500">*</span>
          <span className="text-muted-foreground font-normal"> (เลือกได้มากกว่า 1)</span>
        </Label>
        <div
          className={cn(
            "flex flex-wrap gap-1.5 mt-2 rounded-xl p-1 -m-1",
            fieldErrors?.jobTypes && "ring-1 ring-destructive",
          )}
        >
          {HIRE_ENGAGEMENT_TYPES.map((j) => {
            const selected = form.jobTypes.includes(j.id);
            return (
              <button
                key={j.id}
                type="button"
                onClick={() => toggleJobType(j.id)}
                aria-pressed={selected}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs border transition-colors",
                  selected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {j.label}
              </button>
            );
          })}
        </div>
        {fieldErrors?.jobTypes ? (
          <p className="text-xs text-destructive mt-1.5">{fieldErrors.jobTypes}</p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="hire-details">
          รายละเอียดงาน <span className="text-muted-foreground font-normal">(ไม่บังคับ)</span>
        </Label>
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
        <Label htmlFor="hire-ref-url">ลิงก์อ้างอิง (ไฟล์ / brief) <span className="text-muted-foreground font-normal">(ไม่บังคับ)</span></Label>
        <Input
          id="hire-ref-url"
          value={form.referenceUrl}
          onChange={(e) => setForm((f) => ({ ...f, referenceUrl: e.target.value }))}
          placeholder="https://drive.google.com/..."
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
        <div className="col-span-2 sm:col-span-1 space-y-1.5">
          <Label>งบประมาณ (บาท) <span className="text-muted-foreground font-normal">ช่วงราคา</span></Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              id="hire-budget-min"
              inputMode="numeric"
              value={form.budgetMin}
              onChange={(e) => {
                setForm((f) => ({ ...f, budgetMin: e.target.value }));
                onClearFieldError?.("budgetMax");
              }}
              placeholder="ต่ำสุด"
              className={cn(
                "rounded-xl",
                fieldErrors?.budgetMax && "border-destructive focus-visible:ring-destructive",
              )}
            />
            <Input
              id="hire-budget-max"
              inputMode="numeric"
              value={form.budgetMax}
              onChange={(e) => {
                setForm((f) => ({ ...f, budgetMax: e.target.value }));
                onClearFieldError?.("budgetMax");
              }}
              placeholder="สูงสุด"
              className={cn(
                "rounded-xl",
                fieldErrors?.budgetMax && "border-destructive focus-visible:ring-destructive",
              )}
              aria-invalid={!!fieldErrors?.budgetMax}
            />
          </div>
          {fieldErrors?.budgetMax ? (
            <p className="text-xs text-destructive">{fieldErrors.budgetMax}</p>
          ) : null}
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="hire-deadline">
            กำหนดส่งงาน <span className="text-orange-500">*</span>
          </Label>
          <Input
            id="hire-deadline"
            type="date"
            value={form.deadline}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => {
              setForm((f) => ({ ...f, deadline: e.target.value }));
              onClearFieldError?.("deadline");
            }}
            className={cn(
              "rounded-xl mt-1.5",
              fieldErrors?.deadline && "border-destructive focus-visible:ring-destructive",
            )}
            aria-invalid={!!fieldErrors?.deadline}
            required
          />
          {fieldErrors?.deadline ? (
            <p className="text-xs text-destructive mt-1">{fieldErrors.deadline}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default HireInviteForm;
