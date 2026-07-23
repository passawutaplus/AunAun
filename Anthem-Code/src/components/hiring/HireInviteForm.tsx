import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ImagePlus, Loader2, Plus, X, Tags, FileText, Link2, Wallet, CalendarDays, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { safeHttpUrl } from "@/lib/safeUrl";

const MAX_HIRE_LINKS = 8;

function validateHireLink(raw: string): string | null {
  let v = raw.trim();
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
  return safeHttpUrl(v) ?? null;
}

export type HireInviteFormState = {
  jobTypes: string[];
  details: string;
  budgetMin: string;
  budgetMax: string;
  deadline: string;
  referenceUrls: string[];
  attachmentUrls: string[];
};

export const emptyHireInviteForm = (): HireInviteFormState => ({
  jobTypes: ["piece"], // default: จ้างทำชิ้นงาน — user can deselect
  details: "",
  budgetMin: "",
  budgetMax: "",
  deadline: "",
  referenceUrls: [],
  attachmentUrls: [],
});

export function buildHireInviteMessage(form: HireInviteFormState): string | null {
  const typeLabel = form.jobTypes.length
    ? form.jobTypes.map(jobTypeLabel).join(" · ")
    : null;
  const links = form.referenceUrls.map((u) => u.trim()).filter(Boolean);
  const parts = [
    typeLabel ? `ประเภทงาน: ${typeLabel}` : null,
    form.details.trim() ? `รายละเอียด:\n${form.details.trim()}` : null,
    links.length
      ? `ลิงก์อ้างอิง:\n${links.map((u) => `- ${u}`).join("\n")}`
      : null,
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
  const [linkDraft, setLinkDraft] = useState("");

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

  const addReferenceLink = () => {
    const safe = validateHireLink(linkDraft);
    if (!safe) {
      toast.error("ลิงก์ไม่ปลอดภัยหรือไม่ถูกต้อง — ใช้เฉพาะ http/https");
      return;
    }
    if (form.referenceUrls.includes(safe)) {
      toast.info("ลิงก์นี้เพิ่มแล้ว");
      return;
    }
    if (form.referenceUrls.length >= MAX_HIRE_LINKS) {
      toast.info(`ใส่ลิงก์ได้สูงสุด ${MAX_HIRE_LINKS} อัน`);
      return;
    }
    setForm((f) => ({ ...f, referenceUrls: [...f.referenceUrls, safe] }));
    setLinkDraft("");
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
    <div className="space-y-5">
      {!isAplus1LaunchMinimal() ? (
        <div>
          <Label className="flex items-center gap-1.5 text-xs">
            <ClipboardList className="h-3.5 w-3.5 text-primary" />
            ผูกประกาศงานของคุณ (ไม่บังคับ)
          </Label>
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

      <div id="hire-job-types" className={!isAplus1LaunchMinimal() ? "border-t border-border/60 pt-5" : undefined}>
        <Label className="flex items-center gap-1.5">
          <Tags className="h-3.5 w-3.5 text-primary" />
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
                    ? "border-orange-500 bg-transparent text-orange-500"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40",
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

      <div className="border-t border-border/60 pt-5">
        <Label htmlFor="hire-details" className="flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-primary" />
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

      <div className="border-t border-border/60 pt-5">
        <Label htmlFor="hire-ref-url" className="flex items-center gap-1.5">
          <Link2 className="h-3.5 w-3.5 text-primary" />
          ลิงก์อ้างอิง (ไฟล์ / brief){" "}
          <span className="text-muted-foreground font-normal">(ไม่บังคับ)</span>
        </Label>
        <div className="mt-1.5 flex gap-2">
          <Input
            id="hire-ref-url"
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
            className="h-10 w-10 shrink-0 rounded-xl"
            onClick={addReferenceLink}
            aria-label="เพิ่มลิงก์"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {form.referenceUrls.length > 0 ? (
          <ul className="mt-2 space-y-1.5">
            {form.referenceUrls.map((url) => (
              <li
                key={url}
                className="flex items-center gap-2 rounded-xl border border-border bg-muted/20 px-2.5 py-2 text-xs"
              >
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600"
                  title="ลิงก์ปลอดภัย"
                >
                  <Check className="h-3 w-3" strokeWidth={2.5} />
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
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      referenceUrls: f.referenceUrls.filter((u) => u !== url),
                    }))
                  }
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="border-t border-border/60 pt-5">
        <Label className="flex items-center gap-1.5">
          <ImagePlus className="h-3.5 w-3.5 text-primary" />
          แนบภาพอ้างอิง (ไม่บังคับ)
        </Label>
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

      <div className="grid grid-cols-2 gap-3 border-t border-border/60 pt-5">
        <div className="col-span-2 sm:col-span-1 space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5 text-primary" />
            งบประมาณ (บาท) <span className="text-muted-foreground font-normal">ช่วงราคา</span>
          </Label>
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
          <Label htmlFor="hire-deadline" className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
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
