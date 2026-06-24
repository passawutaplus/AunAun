import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  UserPlus,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Hash,
  Briefcase,
  Building2,
  User as UserIcon,
  Wallet,
  Tag,
  Plus,
  Globe,
  UserCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { ClientFile, SavedClient } from "@/store/clients";
import type { ClientDocCategory } from "./shared";
import { Field, SectionTitle, FormSection, INDUSTRY_PRESETS, PAYMENT_TERM_LABELS } from "./shared";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { mergeFieldClass } from "@/lib/formFieldStyles";
import { ClientDocumentsField, type StagedClientFile } from "./ClientDocumentsField";

type Draft = Omit<SavedClient, "id" | "createdAt">;

const EMPTY_DRAFT: Draft = {
  name: "",
  type: "individual",
  industry: "",
  phone: "",
  lineId: "",
  email: "",
  social: "",
  preferredChannel: "line",
  address: "",
  taxId: "",
  paymentTerms: "50/50",
  rate: undefined,
  notes: "",
  tags: [],
  contactName: "",
  contactPosition: "",
  branchCode: "",
  website: "",
};

function PreferredChannelPicker({
  value,
  onChange,
}: {
  value: Draft["preferredChannel"];
  onChange: (v: NonNullable<Draft["preferredChannel"]>) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold">
        ช่องทางติดต่อหลัก (ใช้ส่งใบเสนอราคา/ใบแจ้งหนี้)
      </label>
      <div className="grid grid-cols-4 gap-2">
        {(["line", "phone", "email", "social"] as const).map((ch) => {
          const Icon =
            ch === "line"
              ? MessageCircle
              : ch === "phone"
                ? Phone
                : ch === "email"
                  ? Mail
                  : Hash;
          const active = value === ch;
          return (
            <button
              key={ch}
              type="button"
              onClick={() => onChange(ch)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-[11px] font-semibold transition-all ${
                active
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {ch.toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PaymentTermsField({
  value,
  onChange,
}: {
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label="เงื่อนไขชำระเงิน" icon={Wallet}>
      <TooltipProvider delayDuration={200}>
        <div className="flex gap-1.5 flex-wrap">
          {Object.keys(PAYMENT_TERM_LABELS).map((t) => {
            const active = value === t;
            return (
              <Tooltip key={t}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onChange(t)}
                    className={`text-[11px] font-semibold px-3 py-1 rounded-full border transition-all ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border bg-card hover:border-primary"
                    }`}
                  >
                    {t}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[220px] text-xs">
                  {PAYMENT_TERM_LABELS[t]}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    </Field>
  );
}

function IndustryField({
  draft,
  industryCustom,
  industryIsOther,
  onIndustryChange,
  onCustomChange,
  label = "ประเภทธุรกิจ / สายงาน",
}: {
  draft: Draft;
  industryCustom: string;
  industryIsOther: boolean;
  onIndustryChange: (v: string) => void;
  onCustomChange: (v: string) => void;
  label?: string;
}) {
  return (
    <Field label={label} icon={Briefcase}>
      <Select
        value={
          draft.industry &&
          INDUSTRY_PRESETS.includes(draft.industry as (typeof INDUSTRY_PRESETS)[number])
            ? draft.industry
            : draft.industry
              ? "อื่นๆ"
              : ""
        }
        onValueChange={(v) => {
          if (v === "อื่นๆ") {
            onIndustryChange(industryCustom || "");
          } else {
            onIndustryChange(v);
            onCustomChange("");
          }
        }}
      >
        <SelectTrigger className={mergeFieldClass("", draft.industry)}>
          <SelectValue placeholder="เลือกประเภทธุรกิจ" />
        </SelectTrigger>
        <SelectContent>
          {INDUSTRY_PRESETS.map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {(draft.industry === "อื่นๆ" || industryIsOther) && (
        <Input
          className={mergeFieldClass("mt-1.5", industryCustom || draft.industry)}
          value={industryCustom || (industryIsOther ? draft.industry : "")}
          onChange={(e) => {
            onCustomChange(e.target.value);
            onIndustryChange(e.target.value);
          }}
          placeholder="ระบุประเภทธุรกิจเอง"
          maxLength={60}
        />
      )}
    </Field>
  );
}

export function ClientFormDialog({
  editing,
  onClose,
  onCreate,
  onUpdate,
  files = [],
  onUpload,
  onDeleteFile,
  getSignedUrl,
}: {
  editing: SavedClient | "new" | null;
  onClose: () => void;
  onCreate: (payload: Draft, staged: StagedClientFile[]) => void | Promise<void>;
  onUpdate: (id: string, payload: Partial<SavedClient>) => void | Promise<void>;
  files?: ClientFile[];
  onUpload?: (file: File, docCategory: ClientDocCategory) => Promise<void>;
  onDeleteFile?: (f: ClientFile) => Promise<void>;
  getSignedUrl?: (path: string) => Promise<string>;
}) {
  const isEditing = editing && editing !== "new";
  const open = !!editing;
  const isCompany = (draft: Draft) => draft.type === "company";

  const [draft, setDraft] = React.useState<Draft>(EMPTY_DRAFT);
  const [tagInput, setTagInput] = React.useState("");
  const [touched, setTouched] = React.useState(false);
  const [industryCustom, setIndustryCustom] = React.useState("");
  const [stagedFiles, setStagedFiles] = React.useState<StagedClientFile[]>([]);
  const [submitting, setSubmitting] = React.useState(false);

  const industryIsOther =
    !!draft.industry &&
    !INDUSTRY_PRESETS.slice(0, -1).includes(draft.industry as (typeof INDUSTRY_PRESETS)[number]);

  React.useEffect(() => {
    if (editing === "new") setDraft(EMPTY_DRAFT);
    else if (editing) {
      const { id: _id, createdAt: _c, ...rest } = editing;
      setDraft({ ...EMPTY_DRAFT, ...rest });
    }
    setTagInput("");
    setTouched(false);
    setStagedFiles([]);
    if (editing === "new") {
      setIndustryCustom("");
    } else if (editing && editing.industry) {
      const preset = INDUSTRY_PRESETS.slice(0, -1) as readonly string[];
      setIndustryCustom(preset.includes(editing.industry) ? "" : editing.industry);
    } else {
      setIndustryCustom("");
    }
  }, [editing]);

  const upd = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const addTag = () => {
    const t = tagInput.trim();
    if (!t || draft.tags?.includes(t)) return;
    upd("tags", [...(draft.tags ?? []), t]);
    setTagInput("");
  };

  const nameError = touched && !draft.name.trim() ? "กรุณากรอกชื่อลูกค้า" : "";
  const contactNameError =
    touched && isCompany(draft) && !draft.contactName?.trim() ? "กรุณากรอกชื่อผู้ติดต่อ" : "";
  const emailError =
    touched && draft.email && !/^\S+@\S+\.\S+$/.test(draft.email) ? "รูปแบบอีเมลไม่ถูกต้อง" : "";

  const submit = async () => {
    setTouched(true);
    if (!draft.name.trim()) {
      toast.error("กรุณากรอกชื่อลูกค้า");
      return;
    }
    if (isCompany(draft) && !draft.contactName?.trim()) {
      toast.error("กรุณากรอกชื่อผู้ติดต่อ");
      return;
    }
    if (draft.email && !/^\S+@\S+\.\S+$/.test(draft.email)) {
      toast.error("รูปแบบอีเมลไม่ถูกต้อง");
      return;
    }
    setSubmitting(true);
    try {
      if (isEditing) await onUpdate((editing as SavedClient).id, draft);
      else await onCreate(draft, stagedFiles);
    } finally {
      setSubmitting(false);
    }
  };

  const noopSignedUrl = async () => "";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            {isEditing ? "แก้ไขลูกค้า" : "เพิ่มลูกค้าใหม่"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <section className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {(["individual", "company"] as const).map((t) => {
                const Icon = t === "company" ? Building2 : UserIcon;
                const active = draft.type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => upd("type", t)}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                      active
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-border/80"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {t === "individual" ? "บุคคลธรรมดา" : "นิติบุคคล / บริษัท"}
                  </button>
                );
              })}
            </div>
          </section>

          {isCompany(draft) ? (
            <>
              <FormSection title="ข้อมูลนิติบุคคล" icon={Building2} variant="company">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="ชื่อบริษัท / นิติบุคคล" icon={Building2} required>
                    <Input
                      value={draft.name}
                      onChange={(e) => upd("name", e.target.value)}
                      onBlur={() => setTouched(true)}
                      placeholder="บริษัท นิมบัส จำกัด"
                      maxLength={80}
                      aria-invalid={!!nameError}
                      className={mergeFieldClass(
                        nameError ? "border-destructive focus-visible:ring-destructive" : "",
                        draft.name,
                      )}
                    />
                    {nameError && <p className="text-[11px] text-destructive mt-1">{nameError}</p>}
                  </Field>
                  <IndustryField
                    draft={draft}
                    industryCustom={industryCustom}
                    industryIsOther={industryIsOther}
                    onIndustryChange={(v) => upd("industry", v)}
                    onCustomChange={setIndustryCustom}
                  />
                  <Field label="เลขผู้เสียภาษี" icon={Hash}>
                    <Input
                      value={draft.taxId ?? ""}
                      onChange={(e) => upd("taxId", e.target.value)}
                      placeholder="0-1055-12345-67-8"
                      maxLength={20}
                      className={mergeFieldClass("", draft.taxId)}
                    />
                  </Field>
                  <Field label="สาขา" icon={Hash}>
                    <Input
                      value={draft.branchCode ?? ""}
                      onChange={(e) => upd("branchCode", e.target.value)}
                      placeholder="00000 (สำนักงานใหญ่)"
                      maxLength={10}
                      className={mergeFieldClass("", draft.branchCode)}
                    />
                  </Field>
                  <Field label="เว็บไซต์บริษัท" icon={Globe}>
                    <Input
                      value={draft.website ?? ""}
                      onChange={(e) => upd("website", e.target.value)}
                      placeholder="https://nimbus.co"
                      maxLength={200}
                      className={mergeFieldClass("", draft.website)}
                    />
                  </Field>
                </div>
                <Field label="ที่อยู่ออกใบกำกับ" icon={MapPin}>
                  <Textarea
                    rows={2}
                    value={draft.address ?? ""}
                    onChange={(e) => upd("address", e.target.value)}
                    placeholder="123/45 ถ.พระราม 9 เขตห้วยขวาง กรุงเทพฯ 10310"
                  />
                </Field>
              </FormSection>

              <FormSection title="ผู้ติดต่อหลัก" icon={UserCircle} variant="contact">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="ชื่อ-นามสกุลผู้ติดต่อ" icon={UserCircle} required>
                    <Input
                      value={draft.contactName ?? ""}
                      onChange={(e) => upd("contactName", e.target.value)}
                      onBlur={() => setTouched(true)}
                      placeholder="คุณสมหญิง ใจดี"
                      maxLength={80}
                      aria-invalid={!!contactNameError}
                      className={mergeFieldClass(
                        contactNameError ? "border-destructive focus-visible:ring-destructive" : "",
                        draft.contactName,
                      )}
                    />
                    {contactNameError && (
                      <p className="text-[11px] text-destructive mt-1">{contactNameError}</p>
                    )}
                  </Field>
                  <Field label="ตำแหน่ง / แผนก" icon={Briefcase}>
                    <Input
                      value={draft.contactPosition ?? ""}
                      onChange={(e) => upd("contactPosition", e.target.value)}
                      placeholder="Marketing Manager"
                      maxLength={80}
                      className={mergeFieldClass("", draft.contactPosition)}
                    />
                  </Field>
                  <Field label="เบอร์โทร" icon={Phone}>
                    <PhoneInput
                      value={draft.phone ?? ""}
                      onChange={(v) => upd("phone", v)}
                      placeholder="08x-xxx-xxxx"
                    />
                  </Field>
                  <Field label="LINE ID" icon={MessageCircle}>
                    <Input
                      value={draft.lineId ?? ""}
                      onChange={(e) => upd("lineId", e.target.value)}
                      placeholder="@contact.line"
                      maxLength={50}
                      className={mergeFieldClass("", draft.lineId)}
                    />
                  </Field>
                  <Field label="อีเมล" icon={Mail}>
                    <Input
                      type="email"
                      value={draft.email ?? ""}
                      onChange={(e) => upd("email", e.target.value)}
                      onBlur={() => setTouched(true)}
                      placeholder="contact@nimbus.co"
                      maxLength={120}
                      aria-invalid={!!emailError}
                      className={mergeFieldClass(
                        emailError ? "border-destructive focus-visible:ring-destructive" : "",
                        draft.email,
                      )}
                    />
                    {emailError && <p className="text-[11px] text-destructive mt-1">{emailError}</p>}
                  </Field>
                  <Field label="Social (IG / FB / X)" icon={Hash}>
                    <Input
                      value={draft.social ?? ""}
                      onChange={(e) => upd("social", e.target.value)}
                      placeholder="@brand หรือ URL"
                      maxLength={120}
                      className={mergeFieldClass("", draft.social)}
                    />
                  </Field>
                </div>
                <PreferredChannelPicker
                  value={draft.preferredChannel}
                  onChange={(v) => upd("preferredChannel", v)}
                />
              </FormSection>

              <FormSection title="เงื่อนไขการเงิน" icon={Wallet} variant="default">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="งบประมาณทั่วไป (บาท)" icon={Wallet}>
                    <Input
                      type="number"
                      value={draft.rate ?? ""}
                      onChange={(e) =>
                        upd("rate", e.target.value ? Number(e.target.value) : undefined)
                      }
                      placeholder="20000"
                    />
                  </Field>
                </div>
                <PaymentTermsField
                  value={draft.paymentTerms}
                  onChange={(v) => upd("paymentTerms", v)}
                />
              </FormSection>
            </>
          ) : (
            <>
              <section className="space-y-3">
                <SectionTitle>ข้อมูลส่วนตัว</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="ชื่อ-นามสกุล" icon={UserIcon} required>
                    <Input
                      value={draft.name}
                      onChange={(e) => upd("name", e.target.value)}
                      onBlur={() => setTouched(true)}
                      placeholder="คุณสมชาย ใจดี"
                      maxLength={80}
                      aria-invalid={!!nameError}
                      className={mergeFieldClass(
                        nameError ? "border-destructive focus-visible:ring-destructive" : "",
                        draft.name,
                      )}
                    />
                    {nameError && <p className="text-[11px] text-destructive mt-1">{nameError}</p>}
                  </Field>
                  <IndustryField
                    draft={draft}
                    industryCustom={industryCustom}
                    industryIsOther={industryIsOther}
                    onIndustryChange={(v) => upd("industry", v)}
                    onCustomChange={setIndustryCustom}
                    label="อาชีพ / สายงาน"
                  />
                </div>
              </section>

              <section className="space-y-3">
                <SectionTitle>ช่องทางติดต่อ</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="เบอร์โทร" icon={Phone}>
                    <PhoneInput
                      value={draft.phone ?? ""}
                      onChange={(v) => upd("phone", v)}
                      placeholder="08x-xxx-xxxx"
                    />
                  </Field>
                  <Field label="LINE ID" icon={MessageCircle}>
                    <Input
                      value={draft.lineId ?? ""}
                      onChange={(e) => upd("lineId", e.target.value)}
                      placeholder="@username"
                      maxLength={50}
                      className={mergeFieldClass("", draft.lineId)}
                    />
                  </Field>
                  <Field label="อีเมล" icon={Mail}>
                    <Input
                      type="email"
                      value={draft.email ?? ""}
                      onChange={(e) => upd("email", e.target.value)}
                      onBlur={() => setTouched(true)}
                      placeholder="hello@email.com"
                      maxLength={120}
                      aria-invalid={!!emailError}
                      className={mergeFieldClass(
                        emailError ? "border-destructive focus-visible:ring-destructive" : "",
                        draft.email,
                      )}
                    />
                    {emailError && <p className="text-[11px] text-destructive mt-1">{emailError}</p>}
                  </Field>
                  <Field label="Social (IG / FB / X)" icon={Hash}>
                    <Input
                      value={draft.social ?? ""}
                      onChange={(e) => upd("social", e.target.value)}
                      placeholder="@brand หรือ URL"
                      maxLength={120}
                      className={mergeFieldClass("", draft.social)}
                    />
                  </Field>
                </div>
                <PreferredChannelPicker
                  value={draft.preferredChannel}
                  onChange={(v) => upd("preferredChannel", v)}
                />
              </section>

              <section className="space-y-3">
                <SectionTitle>ข้อมูลออกใบเสร็จ (ไม่บังคับ)</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="เลขผู้เสียภาษี" icon={Hash}>
                    <Input
                      value={draft.taxId ?? ""}
                      onChange={(e) => upd("taxId", e.target.value)}
                      placeholder="0-1055-12345-67-8"
                      maxLength={20}
                      className={mergeFieldClass("", draft.taxId)}
                    />
                  </Field>
                  <Field label="งบประมาณทั่วไป (บาท)" icon={Wallet}>
                    <Input
                      type="number"
                      value={draft.rate ?? ""}
                      onChange={(e) =>
                        upd("rate", e.target.value ? Number(e.target.value) : undefined)
                      }
                      placeholder="20000"
                    />
                  </Field>
                </div>
                <Field label="ที่อยู่ออกใบกำกับ" icon={MapPin}>
                  <Textarea
                    rows={2}
                    value={draft.address ?? ""}
                    onChange={(e) => upd("address", e.target.value)}
                    placeholder="123/45 ถ.พระราม 9 เขตห้วยขวาง กรุงเทพฯ 10310"
                  />
                </Field>
                <PaymentTermsField
                  value={draft.paymentTerms}
                  onChange={(v) => upd("paymentTerms", v)}
                />
              </section>
            </>
          )}

          <section className="space-y-3">
            <SectionTitle>เอกสารแนบ</SectionTitle>
            <ClientDocumentsField
              clientType={draft.type}
              isEditing={!!isEditing}
              files={isEditing ? files : []}
              stagedFiles={stagedFiles}
              onStagedChange={setStagedFiles}
              onUpload={isEditing ? onUpload : undefined}
              onDeleteFile={isEditing ? onDeleteFile : undefined}
              getSignedUrl={getSignedUrl ?? noopSignedUrl}
            />
          </section>

          <section className="space-y-3">
            <SectionTitle>โน้ตและแท็ก (สำหรับฟรีแลนซ์)</SectionTitle>
            <Field label="แท็ก (เช่น VIP, จ่ายตรง, แก้น้อย)" icon={Tag}>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="พิมพ์แล้วกด Enter"
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {draft.tags && draft.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {draft.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary"
                    >
                      #{t}
                      <button
                        type="button"
                        onClick={() => upd("tags", draft.tags?.filter((x) => x !== t) ?? [])}
                        aria-label={`ลบ ${t}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </Field>

            <Field label="โน้ตส่วนตัว (เห็นเฉพาะคุณ)">
              <Textarea
                rows={3}
                value={draft.notes ?? ""}
                onChange={(e) => upd("notes", e.target.value)}
                placeholder="ชอบโทนสีอ่อน ตอบ LINE เร็ว ห้ามโทรหลัง 6 โมงเย็น..."
              />
            </Field>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            ยกเลิก
          </Button>
          <Button
            onClick={submit}
            disabled={submitting}
            className="bg-gradient-primary text-primary-foreground"
          >
            {isEditing ? "บันทึกการแก้ไข" : "เพิ่มลูกค้า"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
