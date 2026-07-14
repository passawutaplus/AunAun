import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const JOB_TYPES = [
  { id: "branding", label: "แบรนด์ / อัตลักษณ์" },
  { id: "web-ui", label: "เว็บ / UI Design" },
  { id: "motion", label: "โมชัน / วิดีโอ" },
  { id: "print", label: "สิ่งพิมพ์ / บรรจุภัณฑ์" },
  { id: "other", label: "อื่นๆ" },
] as const;

/** Hire invite engagement types (multi-select, required). */
export const HIRE_ENGAGEMENT_TYPES = [
  { id: "piece", label: "จ้างทำชิ้นงาน" },
  { id: "project", label: "จ้างทำเป็นโปรเจค" },
  { id: "full_time", label: "จ้างFull-time" },
  { id: "part_time", label: "จ้างPart-time" },
  { id: "retainer", label: "จ้างเป็นFreelanceประจำ" },
] as const;


export const DELIVERABLES = [
  "โลโก้และอัตลักษณ์แบรนด์",
  "ชุดโซเชียลมีเดีย",
  "เว็บไซต์ / Landing Page",
  "สไลด์นำเสนอ",
  "บรรจุภัณฑ์",
  "คู่มือแบรนด์",
] as const;

export const STUDIO_SERVICES = [
  { id: "design", label: "ดีไซน์ / แบรนด์" },
  { id: "motion", label: "โมชัน / วิดีโอ" },
  { id: "campaign", label: "แคมเปญครบวงจร" },
] as const;

export type HireWizardForm = {
  clientName: string;
  email: string;
  phone: string;
  budgetMin: string;
  budgetMax: string;
  deadline: string;
  message: string;
  jobType: string;
  jobTypeOther: string;
  serviceType: string;
  deliverables: string[];
  referenceUrl: string;
};

export const emptyHireWizardForm = (): HireWizardForm => ({
  clientName: "",
  email: "",
  phone: "",
  budgetMin: "",
  budgetMax: "",
  deadline: "",
  message: "",
  jobType: "branding",
  jobTypeOther: "",
  serviceType: "design",
  deliverables: [],
  referenceUrl: "",
});

export const buildHireMessage = (form: HireWizardForm, extras?: { studio?: boolean }) => {
  const typeLabel =
    extras?.studio
      ? STUDIO_SERVICES.find((s) => s.id === form.serviceType)?.label ?? form.serviceType
      : form.jobType === "other" && form.jobTypeOther.trim()
        ? `อื่นๆ — ${form.jobTypeOther.trim()}`
        : JOB_TYPES.find((j) => j.id === form.jobType)?.label ?? form.jobType;
  const meta = [
    extras?.studio ? `บริการ: ${typeLabel}` : `ประเภทงาน: ${typeLabel}`,
    form.deliverables.length ? `สิ่งที่ต้องการส่งมอบ: ${form.deliverables.join(", ")}` : null,
    form.referenceUrl ? `อ้างอิง: ${form.referenceUrl}` : null,
  ].filter(Boolean);

  const body = form.message.trim();
  if (!meta.length) return body || null;
  return [meta.join("\n"), body].filter(Boolean).join("\n\n");
};

type StepProps = {
  form: HireWizardForm;
  setForm: React.Dispatch<React.SetStateAction<HireWizardForm>>;
  studio?: boolean;
};

export const HireWizardStepOne = ({ form, setForm, studio }: StepProps) => (
  <div className="space-y-4">
    {studio ? (
      <div>
        <Label>บริการที่ต้องการ</Label>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {STUDIO_SERVICES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setForm((f) => ({ ...f, serviceType: s.id }))}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs border transition-colors",
                form.serviceType === s.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    ) : (
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
        {form.jobType === "other" ? (
          <Input
            value={form.jobTypeOther}
            onChange={(e) => setForm((f) => ({ ...f, jobTypeOther: e.target.value }))}
            placeholder="ระบุประเภทงาน"
            className="mt-2"
          />
        ) : null}
      </div>
    )}

    <div>
      <Label className="mb-2 block">สิ่งที่ต้องการส่งมอบ</Label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {DELIVERABLES.map((d) => {
          const checked = form.deliverables.includes(d);
          return (
            <label key={d} className="flex items-center gap-2 text-xs cursor-pointer rounded-lg border border-border px-2 py-2 hover:bg-muted/50">
              <Checkbox
                checked={checked}
                onCheckedChange={() =>
                  setForm((f) => ({
                    ...f,
                    deliverables: checked ? f.deliverables.filter((x) => x !== d) : [...f.deliverables, d],
                  }))
                }
              />
              <span>{d}</span>
            </label>
          );
        })}
      </div>
    </div>

    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2 sm:col-span-1 space-y-1.5">
        <Label>งบประมาณ (บาท) — ช่วงราคา</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input
            id="hire-budget-min"
            inputMode="numeric"
            value={form.budgetMin}
            onChange={(e) => setForm((f) => ({ ...f, budgetMin: e.target.value }))}
            placeholder="ต่ำสุด"
          />
          <Input
            id="hire-budget-max"
            inputMode="numeric"
            value={form.budgetMax}
            onChange={(e) => setForm((f) => ({ ...f, budgetMax: e.target.value }))}
            placeholder="สูงสุด"
          />
        </div>
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
          onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
          required
        />
      </div>
    </div>
  </div>
);

export const HireWizardStepTwo = ({ form, setForm }: StepProps) => (
  <div className="space-y-4">
    <div>
      <Label>ชื่อผู้ติดต่อ *</Label>
      <Input value={form.clientName} onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))} required />
    </div>
    <div>
      <Label>อีเมล *</Label>
      <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
    </div>
    <div>
      <Label>เบอร์มือถือ</Label>
      <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="0812345678" />
    </div>
    <div>
      <Label>ลิงก์อ้างอิง (ไฟล์ / brief)</Label>
      <Input
        value={form.referenceUrl}
        onChange={(e) => setForm((f) => ({ ...f, referenceUrl: e.target.value }))}
        placeholder="https://drive.google.com/..."
      />
    </div>
    <div>
      <Label>รายละเอียดเพิ่มเติม</Label>
      <Textarea
        rows={4}
        value={form.message}
        onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
        placeholder="เป้าหมายงาน กลุ่มเป้าหมาย ข้อจำกัด หรือสิ่งที่อยากได้"
      />
    </div>
  </div>
);

export const HireWizardSummary = ({ form, studio }: StepProps) => (
  <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2 text-sm">
    <p><span className="text-muted-foreground">ประเภท:</span>{" "}
      {studio
        ? STUDIO_SERVICES.find((s) => s.id === form.serviceType)?.label
        : JOB_TYPES.find((j) => j.id === form.jobType)?.label}
    </p>
    {form.deliverables.length > 0 && (
      <p><span className="text-muted-foreground">สิ่งที่ส่งมอบ:</span> {form.deliverables.join(", ")}</p>
    )}
    {form.budgetMin || form.budgetMax ? (
      <p>
        <span className="text-muted-foreground">งบ:</span>{" "}
        {[form.budgetMin && `฿${form.budgetMin}`, form.budgetMax && `฿${form.budgetMax}`]
          .filter(Boolean)
          .join("–")}
      </p>
    ) : null}
    {form.deadline && <p><span className="text-muted-foreground">กำหนดส่ง:</span> {form.deadline}</p>}
    {form.jobType === "other" && form.jobTypeOther ? (
      <p><span className="text-muted-foreground">ประเภทอื่น:</span> {form.jobTypeOther}</p>
    ) : null}
    <p><span className="text-muted-foreground">ติดต่อ:</span> {form.clientName} · {form.email}</p>
    {form.referenceUrl && <p className="break-all"><span className="text-muted-foreground">อ้างอิง:</span> {form.referenceUrl}</p>}
    {form.message && <p className="text-base text-foreground whitespace-pre-wrap">{form.message}</p>}
  </div>
);

export const HireWizardSteps = ({ step }: { step: number }) => (
  <div className="flex items-center gap-2 mb-4">
    {[1, 2, 3].map((s) => (
      <div key={s} className="flex items-center gap-2 flex-1">
        <div
          className={cn(
            "w-7 h-7 rounded-full text-xs font-medium grid place-items-center shrink-0",
            step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          {s}
        </div>
        {s < 3 && <div className={cn("h-0.5 flex-1 rounded", step > s ? "bg-primary" : "bg-muted")} />}
      </div>
    ))}
  </div>
);
