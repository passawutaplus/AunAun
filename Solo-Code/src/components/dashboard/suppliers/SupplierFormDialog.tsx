import * as React from "react";
import type { Supplier } from "@/store/suppliers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus,
  Phone,
  X,
  Loader2,
  ChevronDown,
  Mail,
  Globe,
  MapPin,
  Tag,
  StickyNote,
  MessageSquare,
  Sparkles,
  Building2,
  User as UserIcon,
  UserCircle,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import { SUPPLIER_CATEGORIES } from "./categories";
import { StarRatingInput } from "./StarRatingInput";
import { cn } from "@/lib/utils";
import { FormSection } from "@/components/dashboard/clients/shared";

interface Props {
  open: boolean;
  supplier: Supplier | null;
  onClose: () => void;
  onSubmit: (data: Partial<Supplier> & { name: string }) => Promise<void>;
}

const EMPTY: Partial<Supplier> & { name: string } = {
  name: "",
  type: "individual",
  category: "",
  contactName: "",
  contactPosition: "",
  phone: "",
  email: "",
  lineId: "",
  website: "",
  address: "",
  mapUrl: "",
  rateNote: "",
  rating: 0,
  tags: [],
  notes: "",
  isShared: false,
};

export function SupplierFormDialog({ open, supplier, onClose, onSubmit }: Props) {
  const [form, setForm] = React.useState<Partial<Supplier> & { name: string }>(EMPTY);
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [tagInput, setTagInput] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (supplier) {
      setForm({ ...supplier, type: supplier.type ?? "individual" });
      const isCo = (supplier.type ?? "individual") === "company";
      const hasAdvanced = Boolean(
        supplier.mapUrl ||
        supplier.rating > 0 ||
        supplier.tags.length > 0 ||
        supplier.notes ||
        (!isCo && (supplier.website || supplier.address)),
      );
      setAdvancedOpen(hasAdvanced);
    } else if (open) {
      setForm(EMPTY);
      setAdvancedOpen(false);
    }
    if (open) {
      setTagInput("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplier, open]);

  const set = <K extends keyof Supplier>(k: K, v: Supplier[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const isCompany = (form.type ?? "individual") === "company";

  const advancedCount = React.useMemo(() => {
    let n = 0;
    if (!isCompany) {
      if (form.website) n++;
      if (form.address) n++;
    }
    if (form.mapUrl) n++;
    if ((form.rating ?? 0) > 0) n++;
    if ((form.tags ?? []).length > 0) n++;
    if (form.notes) n++;
    return n;
  }, [form, isCompany]);

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if ((form.tags ?? []).includes(t)) return;
    set("tags", [...(form.tags ?? []), t]);
    setTagInput("");
  };

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("กรุณาระบุชื่อ Supplier");
      return;
    }
    if (!form.category?.trim()) {
      toast.error("กรุณาเลือกหมวดหมู่");
      return;
    }
    if (isCompany && !form.contactName?.trim()) {
      toast.error("กรุณากรอกชื่อผู้ติดต่อ");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      setSubmitting(false);
    }
  };

  const categoryField = (
    <Field label="หมวดหมู่" required>
      <select
        className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        value={form.category ?? ""}
        onChange={(e) => set("category", e.target.value)}
      >
        <option value="">— เลือกหมวดหมู่ —</option>
        {SUPPLIER_CATEGORIES.map((c) => (
          <option key={c.key} value={c.label}>
            {c.label}
          </option>
        ))}
      </select>
    </Field>
  );

  const rateNoteField = (
    <Field label="เรท / บริการหลัก" icon={<Sparkles className="h-3.5 w-3.5" />}>
      <Input
        placeholder="เช่น พิมพ์ A4 5 บาท/แผ่น, ขั้นต่ำ 100 ใบ"
        value={form.rateNote ?? ""}
        onChange={(e) => set("rateNote", e.target.value)}
        maxLength={200}
        className="h-11"
      />
    </Field>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] p-0 gap-0 overflow-hidden bg-card">
        <DialogHeader className="px-6 pt-6 pb-4 pr-12 sm:pr-14 border-b border-border/60">
          <DialogTitle className="text-lg font-semibold tracking-tight">
            {supplier ? "แก้ไข Supplier" : "เพิ่ม Supplier ใหม่"}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            กรอกข้อมูลพื้นฐานก่อนก็พอ — ค่อยเพิ่มรายละเอียดเชิงลึกได้ทีหลัง
          </p>
        </DialogHeader>

        <div className="overflow-y-auto px-6 py-5 space-y-5 max-h-[calc(92vh-180px)]">
          <section className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {(["individual", "company"] as const).map((t) => {
                const Icon = t === "company" ? Building2 : UserIcon;
                const active = (form.type ?? "individual") === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set("type", t)}
                    className={cn(
                      "flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 text-xs font-semibold transition-all",
                      active
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-border/80",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {t === "individual" ? "บุคคลธรรมดา" : "นิติบุคคล / บริษัท"}
                  </button>
                );
              })}
            </div>
          </section>

          {isCompany ? (
            <>
              <FormSection title="ข้อมูลร้าน / นิติบุคคล" icon={Building2} variant="company">
                <Field label="ชื่อร้าน / บริษัท" required>
                  <Input
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="เช่น บริษัท โรงพิมพ์พี่หมู จำกัด"
                    maxLength={120}
                    className="h-11"
                  />
                </Field>
                {categoryField}
                <Field label="เว็บไซต์" icon={<Globe className="h-3.5 w-3.5" />}>
                  <Input
                    placeholder="https://..."
                    value={form.website ?? ""}
                    onChange={(e) => set("website", e.target.value)}
                    maxLength={200}
                    className="h-11"
                  />
                </Field>
                <Field label="ที่อยู่" icon={<MapPin className="h-3.5 w-3.5" />}>
                  <Textarea
                    rows={2}
                    value={form.address ?? ""}
                    onChange={(e) => set("address", e.target.value)}
                    placeholder="สำหรับก็อปแปะตอนส่งของ"
                    maxLength={300}
                  />
                </Field>
                {rateNoteField}
              </FormSection>

              <FormSection title="ผู้ติดต่อหลัก" icon={UserCircle} variant="contact">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="ชื่อ-นามสกุลผู้ติดต่อ" required>
                    <Input
                      value={form.contactName ?? ""}
                      onChange={(e) => set("contactName", e.target.value)}
                      placeholder="เช่น พี่สมชาย ฝ่ายขาย"
                      maxLength={80}
                      className="h-11"
                    />
                  </Field>
                  <Field label="ตำแหน่ง / แผนก" icon={<Briefcase className="h-3.5 w-3.5" />}>
                    <Input
                      value={form.contactPosition ?? ""}
                      onChange={(e) => set("contactPosition", e.target.value)}
                      placeholder="เช่น ฝ่ายจัดซื้อ"
                      maxLength={80}
                      className="h-11"
                    />
                  </Field>
                  <Field label="เบอร์โทร" icon={<Phone className="h-3.5 w-3.5" />}>
                    <Input
                      value={form.phone ?? ""}
                      onChange={(e) => set("phone", e.target.value)}
                      placeholder="08x-xxx-xxxx"
                      maxLength={30}
                      className="h-11"
                    />
                  </Field>
                  <Field label="LINE ID" icon={<MessageSquare className="h-3.5 w-3.5" />}>
                    <Input
                      value={form.lineId ?? ""}
                      onChange={(e) => set("lineId", e.target.value)}
                      placeholder="@yourshop"
                      maxLength={50}
                      className="h-11"
                    />
                  </Field>
                  <Field label="อีเมล" icon={<Mail className="h-3.5 w-3.5" />}>
                    <Input
                      type="email"
                      value={form.email ?? ""}
                      onChange={(e) => set("email", e.target.value)}
                      placeholder="contact@shop.com"
                      maxLength={120}
                      className="h-11"
                    />
                  </Field>
                </div>
              </FormSection>
            </>
          ) : (
            <>
              <FormSection title="ข้อมูลส่วนตัว" icon={UserIcon} variant="default">
                <Field label="ชื่อ Supplier" required>
                  <Input
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="เช่น โรงพิมพ์พี่หมู, Studio ทอม"
                    maxLength={120}
                    className="h-11"
                  />
                </Field>
                {categoryField}
                {rateNoteField}
              </FormSection>

              <FormSection title="ช่องทางติดต่อ" icon={Phone} variant="contact">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="เบอร์โทร" icon={<Phone className="h-3.5 w-3.5" />}>
                    <Input
                      value={form.phone ?? ""}
                      onChange={(e) => set("phone", e.target.value)}
                      placeholder="08x-xxx-xxxx"
                      maxLength={30}
                      className="h-11"
                    />
                  </Field>
                  <Field label="LINE ID" icon={<MessageSquare className="h-3.5 w-3.5" />}>
                    <Input
                      value={form.lineId ?? ""}
                      onChange={(e) => set("lineId", e.target.value)}
                      placeholder="@yourshop"
                      maxLength={50}
                      className="h-11"
                    />
                  </Field>
                  <Field label="อีเมล" icon={<Mail className="h-3.5 w-3.5" />}>
                    <Input
                      type="email"
                      value={form.email ?? ""}
                      onChange={(e) => set("email", e.target.value)}
                      placeholder="hello@email.com"
                      maxLength={120}
                      className="h-11"
                    />
                  </Field>
                </div>
              </FormSection>
            </>
          )}

          {/* ────────── ADVANCED TOGGLE ────────── */}
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-dashed border-primary/40 bg-primary-soft/40 hover:bg-primary-soft transition-all group"
          >
            <span className="inline-flex items-center gap-2 text-sm font-medium text-primary">
              <Plus className={cn("h-4 w-4 transition-transform", advancedOpen && "rotate-45")} />
              {advancedOpen ? "ซ่อนรายละเอียดขั้นสูง" : "เพิ่มรายละเอียดขั้นสูง (Advanced)"}
            </span>
            <span className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
              {advancedCount > 0 && (
                <span className="rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-semibold">
                  {advancedCount}
                </span>
              )}
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform text-primary",
                  advancedOpen && "rotate-180",
                )}
              />
            </span>
          </button>

          {/* ────────── ADVANCED ────────── */}
          <div
            className={cn(
              "grid transition-all duration-300 ease-out",
              advancedOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
            )}
          >
            <div className="overflow-hidden">
              <div className="space-y-4 pt-1">
                {!isCompany && (
                  <>
                    <Field label="เว็บไซต์" icon={<Globe className="h-3.5 w-3.5" />}>
                      <Input
                        placeholder="https://..."
                        value={form.website ?? ""}
                        onChange={(e) => set("website", e.target.value)}
                        maxLength={200}
                      />
                    </Field>

                    <Field label="ที่อยู่" icon={<MapPin className="h-3.5 w-3.5" />}>
                      <Textarea
                        rows={2}
                        value={form.address ?? ""}
                        onChange={(e) => set("address", e.target.value)}
                        placeholder="สำหรับก็อปแปะตอนส่งของ"
                        maxLength={300}
                      />
                    </Field>
                  </>
                )}

                <Field
                  label="Google Maps URL"
                  icon={<MapPin className="h-3.5 w-3.5" />}
                  hint="วางลิงก์จากปุ่ม 'แชร์' บน Google Maps"
                >
                  <Input
                    placeholder="https://maps.app.goo.gl/... หรือ https://www.google.com/maps/..."
                    value={form.mapUrl ?? ""}
                    onChange={(e) => set("mapUrl", e.target.value)}
                    maxLength={500}
                  />
                </Field>

                <Field label="คะแนน (Rating)">
                  <StarRatingInput value={form.rating ?? 0} onChange={(v) => set("rating", v)} />
                </Field>

                <Field label="แท็ก (Tags)" icon={<Tag className="h-3.5 w-3.5" />}>
                  <Input
                    placeholder="พิมพ์แท็กแล้วกด Enter (เช่น งานด่วนได้, ราคาถูก)"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  {(form.tags ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(form.tags ?? []).map((t) => (
                        <span
                          key={t}
                          className="text-[11px] rounded-full bg-primary-soft text-primary px-2.5 py-1 inline-flex items-center gap-1"
                        >
                          #{t}
                          <button
                            type="button"
                            onClick={() =>
                              set(
                                "tags",
                                (form.tags ?? []).filter((x) => x !== t),
                              )
                            }
                            className="hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </Field>

                <Field
                  label="โน้ตภายใน (Private Notes)"
                  icon={<StickyNote className="h-3.5 w-3.5" />}
                  hint="เห็นเฉพาะคุณ — เก็บเลขบัญชีร้าน, ทริคการคุย ฯลฯ"
                >
                  <Textarea
                    rows={3}
                    value={form.notes ?? ""}
                    onChange={(e) => set("notes", e.target.value)}
                    maxLength={1000}
                  />
                </Field>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="border-t border-border/60 bg-card px-6 py-4 flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">
            {advancedCount > 0 ? (
              <>
                มีรายละเอียดเพิ่มเติม{" "}
                <span className="font-semibold text-primary">{advancedCount}</span> ฟิลด์
              </>
            ) : (
              "Basic — กรอกเพิ่มภายหลังได้"
            )}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              ยกเลิก
            </Button>
            <Button
              onClick={submit}
              disabled={submitting}
              className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground hover:opacity-95 shadow-soft min-w-[100px]"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "บันทึก"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
  required,
  hint,
  icon,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-foreground/80 flex items-center gap-1.5">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        {label}
        {required && <span className="text-destructive">*</span>}
        {hint && (
          <span className="text-[10px] text-muted-foreground font-normal ml-1">— {hint}</span>
        )}
      </Label>
      {children}
    </div>
  );
}
