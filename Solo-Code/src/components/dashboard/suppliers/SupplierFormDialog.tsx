import * as React from "react";
import { safeHref } from "@/lib/security";
import type { Supplier } from "@/store/suppliers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  ExternalLink,
  FileText,
  Upload,
  Link as LinkIcon,
  Phone,
  X,
  Download,
  Image as ImageIcon,
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
import { uploadCompressedImage } from "@/lib/imageCompress";
import { assertFileSignature, type AllowedKind } from "@/lib/fileSignature";
import { useAuth } from "@/auth/AuthProvider";
import { SUPPLIER_CATEGORIES } from "./categories";
import { StarRatingInput } from "./StarRatingInput";
import { cn } from "@/lib/utils";
import { FormSection } from "@/components/dashboard/clients/shared";

interface Props {
  open: boolean;
  supplier: Supplier | null;
  onClose: () => void;
  onSubmit: (
    data: Partial<Supplier> & { name: string },
    staged: { links: { label: string; url: string }[]; files: File[] },
  ) => Promise<void>;
  files: { id: string; fileName: string; storagePath: string; sizeBytes?: number }[];
  linksList: { id: string; label: string; url: string }[];
  onUpload: (file: File) => Promise<void>;
  onDeleteFile: (f: { id: string; storagePath: string }) => Promise<void>;
  onAddLink: (label: string, url: string) => Promise<void>;
  onRemoveLink: (id: string) => Promise<void>;
  getSignedUrl: (path: string) => Promise<string>;
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

export function SupplierFormDialog({
  open,
  supplier,
  onClose,
  onSubmit,
  files,
  linksList,
  onUpload,
  onDeleteFile,
  onAddLink,
  onRemoveLink,
  getSignedUrl,
}: Props) {
  const { user } = useAuth();
  const [form, setForm] = React.useState<Partial<Supplier> & { name: string }>(EMPTY);
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  const [tagInput, setTagInput] = React.useState("");
  const [linkLabel, setLinkLabel] = React.useState("");
  const [linkUrl, setLinkUrl] = React.useState("");
  const [uploadingCover, setUploadingCover] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const coverInputRef = React.useRef<HTMLInputElement>(null);

  const [stagedLinks, setStagedLinks] = React.useState<{ label: string; url: string }[]>([]);
  const [stagedFiles, setStagedFiles] = React.useState<File[]>([]);

  React.useEffect(() => {
    if (supplier) {
      setForm({ ...supplier, type: supplier.type ?? "individual" });
      const isCo = (supplier.type ?? "individual") === "company";
      const hasAdvanced = Boolean(
        supplier.mapUrl ||
        supplier.rating > 0 ||
        supplier.tags.length > 0 ||
        supplier.notes ||
        (!isCo && (supplier.website || supplier.address)) ||
        linksList.length > 0 ||
        files.length > 0,
      );
      setAdvancedOpen(hasAdvanced);
    } else if (open) {
      setForm(EMPTY);
      setAdvancedOpen(false);
    }
    if (open) {
      setStagedLinks([]);
      setStagedFiles([]);
      setLinkLabel("");
      setLinkUrl("");
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
    n += stagedLinks.length + linksList.length;
    n += stagedFiles.length + files.length;
    return n;
  }, [form, isCompany, stagedLinks, stagedFiles, linksList, files]);

  const handleCoverPick = async (file: File) => {
    if (!user) {
      toast.error("ต้องเข้าสู่ระบบ");
      return;
    }
    setUploadingCover(true);
    try {
      const url = await uploadCompressedImage({
        file,
        bucket: "supplier-covers",
        userId: user.id,
        prefix: "cover",
      });
      set("coverImageUrl", url);
      toast.success("อัปโหลดรูปปกแล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploadingCover(false);
    }
  };

  const validateAndAddFile = async (f: File) => {
    if (f.size > 5 * 1024 * 1024) {
      toast.error("ไฟล์ใหญ่เกิน 5MB");
      return;
    }
    try {
      await assertFileSignature(f, ["jpeg", "png", "webp", "pdf"] as readonly AllowedKind[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ไฟล์ไม่ผ่านการตรวจสอบ");
      return;
    }
    if (supplier) {
      try {
        await onUpload(f);
        toast.success("อัปโหลดสำเร็จ");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
      }
    } else {
      setStagedFiles((prev) => [...prev, f]);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    for (const f of files) await validateAndAddFile(f);
  };

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
      await onSubmit(form, { links: stagedLinks, files: stagedFiles });
    } finally {
      setSubmitting(false);
    }
  };

  const coverField = (
    <Field label="รูปปก / โลโก้ร้าน" hint="optional">
      <div className="flex items-center gap-3">
        <div className="h-16 w-24 rounded-xl border border-border/60 bg-muted/40 overflow-hidden flex items-center justify-center shrink-0">
          {form.coverImageUrl ? (
            <img
              src={form.coverImageUrl}
              alt="Cover"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <ImageIcon className="h-5 w-5 text-muted-foreground/60" />
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1.5"
            disabled={uploadingCover}
            onClick={() => coverInputRef.current?.click()}
          >
            {uploadingCover ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {form.coverImageUrl ? "เปลี่ยนรูป" : "อัปโหลดรูปปก"}
          </Button>
          {form.coverImageUrl && (
            <button
              type="button"
              onClick={() => set("coverImageUrl", "")}
              className="text-[11px] text-destructive hover:underline inline-flex items-center gap-0.5"
            >
              <X className="h-3 w-3" /> ลบรูป
            </button>
          )}
          <input
            ref={coverInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleCoverPick(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </Field>
  );

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
                {coverField}
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
                {coverField}
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

                {/* Links */}
                <div className="rounded-xl border border-border/60 p-3.5 space-y-2.5">
                  <div className="flex items-center gap-1.5">
                    <LinkIcon className="h-3.5 w-3.5 text-primary" />
                    <h4 className="text-xs font-semibold">ลิงก์ผลงาน / Catalog / เพจ</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto] gap-2">
                    <Input
                      placeholder="ชื่อ (เช่น Catalog)"
                      value={linkLabel}
                      onChange={(e) => setLinkLabel(e.target.value)}
                      className="h-9 text-xs"
                    />
                    <Input
                      placeholder="https://..."
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      className="h-9 text-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-9 px-3"
                      disabled={!linkUrl.trim()}
                      onClick={async () => {
                        if (supplier) {
                          await onAddLink(linkLabel.trim(), linkUrl.trim());
                          toast.success("เพิ่มลิงก์แล้ว");
                        } else {
                          setStagedLinks((prev) => [
                            ...prev,
                            { label: linkLabel.trim(), url: linkUrl.trim() },
                          ]);
                        }
                        setLinkLabel("");
                        setLinkUrl("");
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {[
                    ...(supplier ? linksList : []),
                    ...stagedLinks.map((l, i) => ({ id: `__staged-${i}`, ...l })),
                  ].length === 0 ? (
                    <p className="text-[11px] text-muted-foreground text-center py-1">
                      ยังไม่มีลิงก์
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {(supplier ? linksList : []).map((l) => {
                        const safe = safeHref(l.url);
                        return (
                          <div
                            key={l.id}
                            className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-2.5 py-1.5"
                          >
                            {safe ? (
                              <a
                                href={safe}
                                target="_blank"
                                rel="noopener"
                                className="flex items-center gap-1.5 text-xs text-primary hover:underline truncate"
                              >
                                <ExternalLink className="h-3 w-3 shrink-0" />
                                {l.label || l.url}
                              </a>
                            ) : (
                              <span className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                                <ExternalLink className="h-3 w-3 shrink-0" />
                                {l.label || l.url}
                              </span>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={async () => {
                                await onRemoveLink(l.id);
                                toast.success("ลบลิงก์แล้ว");
                              }}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        );
                      })}
                      {stagedLinks.map((l, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-2.5 py-1.5"
                        >
                          <span className="flex items-center gap-1.5 text-xs truncate">
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            {l.label || l.url}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() =>
                              setStagedLinks((prev) => prev.filter((_, idx) => idx !== i))
                            }
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* File Drop Zone */}
                <div className="rounded-xl border border-border/60 p-3.5 space-y-2.5">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    <h4 className="text-xs font-semibold">ไฟล์แนบ (Company Profile / Quotation)</h4>
                  </div>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "rounded-xl border-2 border-dashed p-5 text-center cursor-pointer transition-all",
                      dragging
                        ? "border-primary bg-primary-soft/60 scale-[1.01]"
                        : "border-border/60 bg-muted/20 hover:border-primary/50 hover:bg-primary-soft/30",
                    )}
                  >
                    <Upload
                      className={cn(
                        "h-6 w-6 mx-auto mb-1.5",
                        dragging ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                    <p className="text-xs font-medium">
                      ลากไฟล์มาวาง หรือ <span className="text-primary">คลิกเพื่อเลือก</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      PDF / รูป (JPG, PNG, WEBP) · ไม่เกิน 5MB
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,image/*"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) await validateAndAddFile(f);
                      e.target.value = "";
                    }}
                  />

                  {(supplier ? files.length > 0 : stagedFiles.length > 0) && (
                    <div className="space-y-1.5">
                      {(supplier ? files : []).map((f) => (
                        <div
                          key={f.id}
                          className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-2.5 py-1.5"
                        >
                          <button
                            type="button"
                            onClick={async () =>
                              window.open(await getSignedUrl(f.storagePath), "_blank")
                            }
                            className="flex items-center gap-1.5 text-xs hover:text-primary truncate flex-1 text-left"
                          >
                            <FileText className="h-3 w-3 shrink-0" />
                            <span className="truncate">{f.fileName}</span>
                            {f.sizeBytes && (
                              <span className="text-muted-foreground text-[10px]">
                                ({Math.ceil(f.sizeBytes / 1024)} KB)
                              </span>
                            )}
                          </button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={async () =>
                              window.open(await getSignedUrl(f.storagePath), "_blank")
                            }
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive"
                            onClick={async () => {
                              await onDeleteFile(f);
                              toast.success("ลบไฟล์แล้ว");
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                      {stagedFiles.map((f, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-2.5 py-1.5"
                        >
                          <span className="flex items-center gap-1.5 text-xs truncate">
                            <FileText className="h-3 w-3 shrink-0" />
                            <span className="truncate">{f.name}</span>
                            <span className="text-muted-foreground text-[10px]">
                              ({Math.ceil(f.size / 1024)} KB)
                            </span>
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive"
                            onClick={() =>
                              setStagedFiles((prev) => prev.filter((_, idx) => idx !== i))
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {!supplier && stagedFiles.length > 0 && (
                    <p className="text-[10px] text-muted-foreground italic">
                      ไฟล์จะถูกอัปโหลดเมื่อกด "บันทึก"
                    </p>
                  )}
                </div>
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
