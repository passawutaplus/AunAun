import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const JOB_TYPES = [
  { id: "branding", label: "Branding / Identity" },
  { id: "web-ui", label: "Web / UI Design" },
  { id: "motion", label: "Motion / Video" },
  { id: "print", label: "Print / Packaging" },
  { id: "other", label: "อื่นๆ" },
] as const;

export const DELIVERABLES = [
  "Logo & Visual Identity",
  "Social Media Kit",
  "Website / Landing",
  "Presentation Deck",
  "Packaging",
  "Brand Guidelines",
] as const;

export const STUDIO_SERVICES = [
  { id: "design", label: "Design / Branding" },
  { id: "motion", label: "Motion / Video" },
  { id: "campaign", label: "Full Campaign" },
] as const;

export type HireWizardForm = {
  clientName: string;
  email: string;
  phone: string;
  budgetAmount: string;
  deadline: string;
  message: string;
  jobType: string;
  serviceType: string;
  deliverables: string[];
  referenceUrl: string;
};

export const emptyHireWizardForm = (): HireWizardForm => ({
  clientName: "",
  email: "",
  phone: "",
  budgetAmount: "",
  deadline: "",
  message: "",
  jobType: "branding",
  serviceType: "design",
  deliverables: [],
  referenceUrl: "",
});

export const buildHireMessage = (form: HireWizardForm, extras?: { studio?: boolean }) => {
  const meta = [
    extras?.studio ? `บริการ: ${STUDIO_SERVICES.find((s) => s.id === form.serviceType)?.label ?? form.serviceType}` : `ประเภทงาน: ${JOB_TYPES.find((j) => j.id === form.jobType)?.label ?? form.jobType}`,
    form.deliverables.length ? `Deliverables: ${form.deliverables.join(", ")}` : null,
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
      <div>
        <Label>งบประมาณ (บาท)</Label>
        <Input
          inputMode="numeric"
          value={form.budgetAmount}
          onChange={(e) => setForm((f) => ({ ...f, budgetAmount: e.target.value }))}
          placeholder="เช่น 15000"
        />
      </div>
      <div>
        <Label>Timeline</Label>
        <Input
          value={form.deadline}
          onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
          placeholder="เช่น 2 สัปดาห์"
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
      <p><span className="text-muted-foreground">Deliverables:</span> {form.deliverables.join(", ")}</p>
    )}
    {form.budgetAmount && <p><span className="text-muted-foreground">งบ:</span> ฿{form.budgetAmount}</p>}
    {form.deadline && <p><span className="text-muted-foreground">Timeline:</span> {form.deadline}</p>}
    <p><span className="text-muted-foreground">ติดต่อ:</span> {form.clientName} · {form.email}</p>
    {form.referenceUrl && <p className="break-all"><span className="text-muted-foreground">อ้างอิง:</span> {form.referenceUrl}</p>}
    {form.message && <p className="text-muted-foreground whitespace-pre-wrap">{form.message}</p>}
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
