import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMyKycRequests } from "@/hooks/useKyc";
import { useHasPublishedProject } from "@/hooks/useHasPublishedProject";
import { useUpsertObject, type ObjectWriteInput } from "@/hooks/useCreatorObjects";
import { useMyProjects } from "@/hooks/useProjects";
import { objectErrorText } from "@/lib/objects/db";
import { uploadProjectImage } from "@/lib/uploadImage";
import { isKycExpired, resolveKycExpiresAt } from "@/lib/kycIdentity";
import {
  OBJECT_EDITIONS,
  OBJECT_KINDS,
  OBJECT_SUBTYPES,
  SHOP_SALE_OPTIONS,
  axisLabel,
  axisOptions,
  isObjectKind,
  kindLabel,
  objectPublishBlockReason,
  subtypeLabel,
  type CreatorObject,
  type ObjectDownload,
  type ObjectFinish,
  type ObjectKind,
  type ObjectSpec,
  type ObjectStatus,
} from "@/lib/objects/taxonomy";

type Props = {
  ownerId: string;
  open: boolean;
  object: CreatorObject | null;
  onOpenChange: (open: boolean) => void;
};

const TITLE_MAX = 120;
const SUMMARY_MAX = 5000;
const PHOTO_MAX = 9;
const PROJECT_REF_MAX = 3;
const OPTION_SPEC = "ตัวเลือก";

type SaleRow = {
  name: string;
  hex: string;
  image: string;
  note: string;
  price: string;
  stock: string;
  sku: string;
};

function daysFromLead(value: string): string {
  return value.match(/\d+/)?.[0] ?? "";
}

function blankRow(): SaleRow {
  return { name: "", hex: "#c4a484", image: "", note: "", price: "", stock: "", sku: "" };
}

function rowsFromFinishes(finishes: ObjectFinish[]): SaleRow[] {
  if (!finishes.length) return [blankRow()];
  return finishes.map((row) => ({
    name: row.name,
    hex: row.hex || "#c4a484",
    image: row.image_url ?? "",
    note: row.note ?? "",
    price: row.price_thb ? String(row.price_thb) : "",
    stock: typeof row.stock === "number" ? String(row.stock) : "",
    sku: row.sku ?? "",
  }));
}

export default function ObjectEditorDialog({ ownerId, open, object, onOpenChange }: Props) {
  const save = useUpsertObject(ownerId);
  const { data: hasProject = false } = useHasPublishedProject(ownerId);
  const { data: kycRows = [] } = useMyKycRequests();
  const kycApproved = kycRows.some((row) => row.status === "approved" && !isKycExpired(resolveKycExpiresAt(row)));
  const block = objectPublishBlockReason({ hasPublishedProject: hasProject, kycApproved });

  const pickingFile = useRef(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const optionPhotoRef = useRef<HTMLInputElement>(null);
  const optionPhotoIndex = useRef<number | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [optionName, setOptionName] = useState("ตัวเลือก");
  const [hasOptions, setHasOptions] = useState(false);
  const [rows, setRows] = useState<SaleRow[]>([blankRow()]);
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkStock, setBulkStock] = useState("");
  const [bulkSku, setBulkSku] = useState("");
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<ObjectKind>("prints");
  const [subtype, setSubtype] = useState("art-print");
  const [material, setMaterial] = useState("paper");
  const [fulfillment, setFulfillment] = useState<ObjectWriteInput["fulfillment"]>("ready");
  const [edition, setEdition] = useState<ObjectWriteInput["edition"]>("open");
  const [editionLabel, setEditionLabel] = useState("");
  const [price, setPrice] = useState("");
  const [leadDays, setLeadDays] = useState("");
  const [summary, setSummary] = useState("");
  const [story, setStory] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [licenseNote, setLicenseNote] = useState("");
  const [specs, setSpecs] = useState<ObjectSpec[]>([]);
  const [downloads, setDownloads] = useState<ObjectDownload[]>([]);
  const [projectIds, setProjectIds] = useState<string[]>([]);

  useEffect(() => {
    const release = () => {
      window.setTimeout(() => {
        pickingFile.current = false;
      }, 500);
    };
    window.addEventListener("focus", release);
    return () => window.removeEventListener("focus", release);
  }, []);

  useEffect(() => {
    if (!open) return;
    setCategoryOpen(false);
    setBulkPrice("");
    setBulkStock("");
    setBulkSku("");
    setTitle(object?.title ?? "");
    setCode(object?.code ?? "");
    const nextKind = object && isObjectKind(object.kind) ? object.kind : "prints";
    setKind(nextKind);
    setSubtype(object?.subtype ?? OBJECT_SUBTYPES[nextKind][0].id);
    setMaterial(object?.material ?? axisOptions(nextKind)[0].id);
    setFulfillment(
      nextKind === "files" || object?.fulfillment === "download"
        ? "download"
        : object?.fulfillment === "preorder"
          ? "preorder"
          : "ready",
    );
    setEdition(object?.edition ?? "open");
    setEditionLabel(object?.edition_label ?? "");
    setPrice(object ? String(object.price_thb) : "");
    setLeadDays(daysFromLead(object?.lead_time ?? ""));
    setSummary(object?.summary ?? "");
    setStory(object?.story ?? "");
    setPhotos([object?.cover_url, ...(object?.gallery_urls ?? [])].filter((url): url is string => !!url));
    setLicenseNote(object?.license_note ?? "");
    const savedOption = object?.specs.find((row) => row.label === OPTION_SPEC);
    setOptionName(savedOption?.value || "ตัวเลือก");
    setSpecs((object?.specs ?? []).filter((row) => row.label !== OPTION_SPEC));
    const nextRows = rowsFromFinishes(object?.finishes ?? []);
    setRows(nextRows);
    setHasOptions(nextRows.some((row) => row.name.trim()));
    setDownloads(object?.downloads ?? []);
    setProjectIds(object?.reference_project_ids ?? []);
  }, [open, object]);

  const changeKind = (next: ObjectKind) => {
    setKind(next);
    setSubtype(OBJECT_SUBTYPES[next][0].id);
    setMaterial(axisOptions(next)[0].id);
    if (next === "files") setFulfillment("download");
    else setFulfillment((current) => (current === "download" || current === "made_to_order" ? "ready" : current));
  };

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = PHOTO_MAX - photos.length;
    const batch = Array.from(files).slice(0, room);
    if (!batch.length) {
      toast.error(`รูปได้สูงสุด ${PHOTO_MAX} รูป`);
      return;
    }
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of batch) {
        urls.push(await uploadProjectImage(file, ownerId, "objects"));
      }
      setPhotos((current) => [...current, ...urls].slice(0, PHOTO_MAX));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  };

  const submit = (nextStatus: ObjectStatus) => {
    if (nextStatus === "Published" && block) {
      toast.error(block);
      return;
    }
    if (!title.trim()) {
      toast.error("ใส่ชื่อสินค้า");
      return;
    }
    const namedRows = hasOptions ? rows.filter((row) => row.name.trim()) : [];
    const finishPayload: ObjectFinish[] = namedRows.map((row) => {
      const next: ObjectFinish = { name: row.name.trim(), hex: row.hex || "#c4a484" };
      if (row.image.trim()) next.image_url = row.image.trim();
      const rowPrice = Number(row.price);
      const rowStock = Number(row.stock);
      if (row.note.trim()) next.note = row.note.trim();
      if (Number.isFinite(rowPrice) && rowPrice > 0) next.price_thb = Math.round(rowPrice);
      if (row.stock.trim() && Number.isFinite(rowStock) && rowStock >= 0) next.stock = Math.round(rowStock);
      if (row.sku.trim()) next.sku = row.sku.trim();
      return next;
    });
    const variantPrices = finishPayload.map((row) => row.price_thb ?? 0).filter((value) => value > 0);
    const listedPrice = variantPrices.length ? Math.min(...variantPrices) : Number(price || 0);
    const optionStocks = finishPayload.map((row) => row.stock).filter((value): value is number => typeof value === "number");
    const preorderDays = Number(leadDays);
    const lead =
      kind !== "files" && fulfillment === "preorder" && Number.isFinite(preorderDays) && preorderDays > 0
        ? `${Math.round(preorderDays)} วัน`
        : "";
    const specPayload = specs.filter((row) => row.label.trim() && row.value.trim() && row.label !== OPTION_SPEC);
    if (optionName.trim() && finishPayload.length) specPayload.push({ label: OPTION_SPEC, value: optionName.trim() });
    const patch: ObjectWriteInput = {
      title: title.trim(),
      code: hasOptions ? finishPayload.find((row) => row.sku)?.sku ?? code.trim() : code.trim(),
      summary: summary.slice(0, SUMMARY_MAX),
      story,
      kind,
      subtype,
      material,
      fulfillment: kind === "files" ? "download" : fulfillment === "preorder" ? "preorder" : "ready",
      edition: hasOptions ? (optionStocks.length ? "limited" : "open") : edition,
      edition_label: hasOptions ? (optionStocks.length ? String(optionStocks.reduce((sum, value) => sum + value, 0)) : "") : editionLabel,
      price_thb: listedPrice,
      lead_time: lead,
      cover_url: photos[0] ?? null,
      gallery_urls: photos.slice(1),
      finishes: finishPayload,
      specs: specPayload,
      downloads: downloads.filter((row) => row.label.trim() && row.url.trim()),
      license_note: licenseNote,
      reference_project_ids: projectIds.slice(0, PROJECT_REF_MAX),
      status: nextStatus,
    };
    save.mutate(
      { id: object?.id, patch },
      {
        onSuccess: () => {
          toast.success(nextStatus === "Published" ? "เผยแพร่แล้ว" : "บันทึกแบบร่างแล้ว");
          onOpenChange(false);
        },
        onError: (error) => toast.error(objectErrorText(error)),
      },
    );
  };

  const categoryText = `${kindLabel(kind)} · ${subtypeLabel(kind, subtype)} · ${axisLabel(material)}`;
  const namedCount = rows.filter((row) => row.name.trim()).length;
  const updateRow = (index: number, patch: Partial<SaleRow>) => {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };
  const applyBulk = () => {
    setRows((current) =>
      current.map((row) => ({
        ...row,
        price: bulkPrice || row.price,
        stock: bulkStock || row.stock,
        sku: bulkSku || row.sku,
      })),
    );
  };
  const openPhotoPicker = () => {
    pickingFile.current = true;
    photoInputRef.current?.click();
  };
  const openOptionPhoto = (index: number) => {
    optionPhotoIndex.current = index;
    pickingFile.current = true;
    optionPhotoRef.current?.click();
  };
  const addOptionPhoto = async (files: FileList | null) => {
    const index = optionPhotoIndex.current;
    optionPhotoIndex.current = null;
    const file = files?.[0];
    if (index == null || !file) return;
    setUploading(true);
    try {
      const url = await uploadProjectImage(file, ownerId, "objects");
      updateRow(index, { image: url });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[92vh] max-w-3xl flex-col gap-0 overflow-hidden p-0"
        onFocusOutside={(event) => {
          if (pickingFile.current) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (pickingFile.current) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (pickingFile.current) event.preventDefault();
        }}
      >
        <DialogHeader className="border-b px-4 py-4 pr-12 text-left">
          <DialogTitle>{object ? "แก้สินค้า" : "ลงสินค้า"}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div className="grid gap-8">
              {block ? <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">{block} แบบร่างบันทึกได้ก่อน</p> : null}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                disabled={uploading}
                tabIndex={-1}
                className="sr-only"
                aria-label="เพิ่มรูปสินค้า"
                onChange={(event) => {
                  pickingFile.current = false;
                  void addPhotos(event.target.files);
                  event.target.value = "";
                }}
              />
              <input
                ref={optionPhotoRef}
                type="file"
                accept="image/*"
                disabled={uploading}
                tabIndex={-1}
                className="sr-only"
                aria-label="รูปตัวเลือก"
                onChange={(event) => {
                  pickingFile.current = false;
                  void addOptionPhoto(event.target.files);
                  event.target.value = "";
                }}
              />

              <section className="space-y-4">
                <h3 className="text-base font-semibold">ข้อมูลทั่วไป</h3>
                <div>
                  <p className="text-sm font-medium">ภาพสินค้า <span className="text-destructive">*</span></p>
                  <p className="mt-1 text-xs text-muted-foreground">รูปสี่เหลี่ยม รูปแรกเป็นปก · สูงสุด {PHOTO_MAX} รูป</p>
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                    {photos.map((url, index) => (
                      <div key={url} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border bg-muted">
                        <img src={url} alt="" className="h-full w-full object-cover" />
                        {index === 0 ? (
                          <span className="absolute inset-x-0 bottom-0 bg-black/70 py-0.5 text-center text-[10px] text-white">ปก</span>
                        ) : null}
                        <button
                          type="button"
                          aria-label={index === 0 ? "ลบภาพปก" : `ลบรูป ${index + 1}`}
                          className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-0.5 text-white"
                          onClick={() => setPhotos((current) => current.filter((_, i) => i !== index))}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {photos.length < PHOTO_MAX ? (
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={openPhotoPicker}
                        className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-md border border-dashed text-[11px] text-muted-foreground"
                      >
                        <ImagePlus className="mb-1 h-4 w-4" />
                        {uploading ? "กำลังอัปโหลด" : "เพิ่มรูป"}
                      </button>
                    ) : null}
                  </div>
                </div>

                <Field label="ชื่อสินค้า" id="object-title" required>
                  <div className="relative">
                    <Input
                      id="object-title"
                      value={title}
                      maxLength={TITLE_MAX}
                      className="pr-16"
                      onChange={(event) => setTitle(event.target.value.slice(0, TITLE_MAX))}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      {title.length}/{TITLE_MAX}
                    </span>
                  </div>
                </Field>

                <div className="grid gap-1.5">
                  <Label>หมวดหมู่ <span className="text-destructive">*</span></Label>
                  <button
                    type="button"
                    aria-expanded={categoryOpen}
                    onClick={() => setCategoryOpen((current) => !current)}
                    className="flex h-10 w-full items-center justify-between gap-3 rounded-md border bg-background px-3 text-left text-sm"
                  >
                    <span className="truncate">{categoryText}</span>
                    <Pencil className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                  {categoryOpen ? (
                    <div className="grid gap-3 rounded-md border p-3">
                      <ChoiceGroup label="ชนิด" value={kind} options={OBJECT_KINDS.map((item) => ({ id: item.id, label: item.label }))} onChange={(id) => changeKind(id as ObjectKind)} />
                      <ChoiceGroup label="หมวดย่อย" value={subtype} options={OBJECT_SUBTYPES[kind]} onChange={setSubtype} />
                      <ChoiceGroup label={kind === "files" ? "ฟอร์แมต" : "วัสดุ"} value={material} options={axisOptions(kind)} onChange={setMaterial} />
                    </div>
                  ) : null}
                </div>

                <ProjectRefField ownerId={ownerId} selectedIds={projectIds} onChange={setProjectIds} />
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-semibold">รายละเอียด</h3>
                <div className="grid gap-1.5">
                  <Label htmlFor="object-summary">รายละเอียดสินค้า <span className="text-destructive">*</span></Label>
                  <div className="overflow-hidden rounded-md border bg-muted/40">
                    <div className="flex items-center justify-between gap-3 border-b px-3 py-2 text-xs">
                      <button type="button" className="inline-flex items-center gap-1" onClick={openPhotoPicker} disabled={uploading || photos.length >= PHOTO_MAX}>
                        <ImagePlus className="h-3.5 w-3.5" />
                        เพิ่มรูปภาพ ({photos.length}/{PHOTO_MAX})
                      </button>
                      <span className="text-muted-foreground">{summary.length}/{SUMMARY_MAX}</span>
                    </div>
                    <Textarea
                      id="object-summary"
                      value={summary}
                      maxLength={SUMMARY_MAX}
                      rows={8}
                      placeholder="พิมพ์รายละเอียดสินค้าได้เลย"
                      className="min-h-40 resize-y border-0 bg-transparent shadow-none focus-visible:ring-0"
                      onChange={(event) => setSummary(event.target.value.slice(0, SUMMARY_MAX))}
                    />
                  </div>
                </div>
                {kind === "files" ? (
                  <>
                    <Field label="ไลเซนส์การใช้ไฟล์" id="object-license">
                      <Textarea id="object-license" value={licenseNote} onChange={(event) => setLicenseNote(event.target.value)} rows={3} />
                    </Field>
                    <PairEditor
                      title="ไฟล์ให้ดาวน์โหลด"
                      rows={downloads.map((file) => ({ label: file.label, value: file.url }))}
                      onChange={(next) => setDownloads(next.map((row) => ({ label: row.label, url: row.value })))}
                      leftPlaceholder="ชื่อไฟล์"
                      rightPlaceholder="https://"
                    />
                  </>
                ) : null}
              </section>

              <section className="space-y-3">
                <h3 className="text-base font-semibold">ข้อมูลการขาย</h3>
                {hasOptions ? (
                  <div className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">ตัวเลือกสินค้า</p>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                        onClick={() => {
                          setHasOptions(false);
                          setRows([blankRow()]);
                          setOptionName("ตัวเลือก");
                        }}
                      >
                        ไม่มีตัวเลือก
                      </button>
                    </div>
                    <label className="mt-3 grid gap-1 text-xs text-muted-foreground">
                      ชื่อชุดตัวเลือก
                      <Input value={optionName} onChange={(event) => setOptionName(event.target.value)} placeholder="เช่น สี หรือ ขนาด" />
                    </label>
                    <div className="mt-3 grid gap-2">
                      {rows.map((row, index) => (
                        <div key={index} className="grid gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              aria-label={`รูปตัวเลือก ${index + 1}`}
                              disabled={uploading}
                              onClick={() => openOptionPhoto(index)}
                              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted"
                            >
                              {row.image ? <img src={row.image} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-4 w-4 text-muted-foreground" />}
                            </button>
                            <Input
                              aria-label={`ชื่อตัวเลือก ${index + 1}`}
                              value={row.name}
                              placeholder="เช่น ขาวอุ่น"
                              className="min-w-[8rem] flex-1"
                              onChange={(event) => updateRow(index, { name: event.target.value })}
                            />
                            <Input
                              aria-label={`จำนวนตัวเลือก ${index + 1}`}
                              inputMode="numeric"
                              value={row.stock}
                              placeholder="จำนวน"
                              className="w-24"
                              onChange={(event) => updateRow(index, { stock: event.target.value.replace(/[^\d]/g, "") })}
                            />
                            <Input
                              aria-label={`รหัสชิ้นงาน ${index + 1}`}
                              value={row.sku}
                              placeholder="รหัสชิ้นงาน"
                              className="w-32"
                              onChange={(event) => updateRow(index, { sku: event.target.value })}
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              aria-label={`ลบตัวเลือก ${index + 1}`}
                              disabled={rows.length === 1}
                              onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button type="button" variant="outline" className="mt-3" onClick={() => setRows((current) => [...current, blankRow()])}>
                      <Plus className="mr-1 h-4 w-4" />
                      เพิ่มตัวเลือก
                    </Button>
                    {namedCount > 0 ? (
                      <div className="mt-4 overflow-x-auto rounded-md border">
                        <div className="flex min-w-[36rem] flex-wrap items-end gap-2 border-b p-3">
                          <label className="grid gap-1 text-xs text-muted-foreground">
                            ราคา
                            <Input inputMode="numeric" value={bulkPrice} className="h-9 w-28" onChange={(event) => setBulkPrice(event.target.value.replace(/[^\d]/g, ""))} />
                          </label>
                          <label className="grid gap-1 text-xs text-muted-foreground">
                            คงเหลือ
                            <Input inputMode="numeric" value={bulkStock} className="h-9 w-24" onChange={(event) => setBulkStock(event.target.value.replace(/[^\d]/g, ""))} />
                          </label>
                          <label className="grid gap-1 text-xs text-muted-foreground">
                            รหัสชิ้นงาน
                            <Input value={bulkSku} className="h-9 w-32" onChange={(event) => setBulkSku(event.target.value)} />
                          </label>
                          <Button type="button" className="h-9" onClick={applyBulk}>
                            อัปเดตกับสินค้าทั้งหมด
                          </Button>
                        </div>
                        <table className="w-full min-w-[36rem] text-sm">
                          <thead>
                            <tr className="border-b text-left text-xs text-muted-foreground">
                              <th className="px-3 py-2 font-medium">{optionName || "ตัวเลือก"}</th>
                              <th className="px-3 py-2 font-medium">ราคา</th>
                              <th className="px-3 py-2 font-medium">คงเหลือ</th>
                              <th className="px-3 py-2 font-medium">รหัสชิ้นงาน</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row, index) =>
                              row.name.trim() ? (
                                <tr key={index} className="border-b last:border-b-0">
                                  <td className="px-3 py-2">
                                    <span className="flex items-center gap-2">
                                      {row.image ? <img src={row.image} alt="" className="h-10 w-10 rounded object-cover" /> : <span className="h-10 w-10 rounded bg-muted" />}
                                      {row.name}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2">
                                    <Input aria-label={`ราคา ${row.name}`} inputMode="numeric" value={row.price} className="h-9 w-28" onChange={(event) => updateRow(index, { price: event.target.value.replace(/[^\d]/g, "") })} />
                                  </td>
                                  <td className="px-3 py-2">
                                    <Input aria-label={`คงเหลือ ${row.name}`} inputMode="numeric" value={row.stock} className="h-9 w-24" onChange={(event) => updateRow(index, { stock: event.target.value.replace(/[^\d]/g, "") })} />
                                  </td>
                                  <td className="px-3 py-2">
                                    <Input aria-label={`รหัส ${row.name}`} value={row.sku} className="h-9 w-32" onChange={(event) => updateRow(index, { sku: event.target.value })} />
                                  </td>
                                </tr>
                              ) : null,
                            )}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="ราคา (บาท)" id="object-price" required>
                        <Input
                          id="object-price"
                          inputMode="numeric"
                          value={price}
                          onChange={(event) => setPrice(event.target.value.replace(/[^\d]/g, ""))}
                        />
                      </Field>
                      <Field label="รหัสชิ้นงาน" id="object-code">
                        <Input id="object-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="เช่น AS10S" />
                      </Field>
                    </div>
                    <Button type="button" variant="outline" className="w-fit" onClick={() => setHasOptions(true)}>
                      <Plus className="mr-1 h-4 w-4" />
                      มีตัวเลือก
                    </Button>
                  </div>
                )}

                <div className={hasOptions ? "grid gap-4" : "grid grid-cols-2 gap-4"}>
                  <fieldset className="grid min-w-0 content-start gap-2">
                    <legend className="text-sm font-medium">การจัดส่ง</legend>
                    {kind === "files" ? (
                      <p className="text-sm text-muted-foreground">ไฟล์ดาวน์โหลด ไม่ต้องส่งพัสดุ</p>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        {SHOP_SALE_OPTIONS.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            aria-pressed={fulfillment === item.id}
                            onClick={() => setFulfillment(item.id)}
                            className={
                              fulfillment === item.id
                                ? "rounded-full bg-foreground px-3 py-1 text-xs text-background"
                                : "rounded-full border px-3 py-1 text-xs"
                            }
                          >
                            {item.label}
                          </button>
                        ))}
                        {fulfillment === "preorder" ? (
                          <>
                            <Input
                              aria-label="จำนวนวัน"
                              inputMode="numeric"
                              value={leadDays}
                              className="h-8 w-20"
                              onChange={(event) => setLeadDays(event.target.value.replace(/[^\d]/g, ""))}
                            />
                            <span className="text-sm">วัน</span>
                          </>
                        ) : null}
                      </div>
                    )}
                  </fieldset>
                  {hasOptions ? null : <div className="grid min-w-0 content-start gap-2">
                    <p className="text-sm font-medium">จำนวน</p>
                    <div className="flex flex-wrap gap-2">
                      {OBJECT_EDITIONS.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          aria-pressed={edition === item.id}
                          onClick={() => setEdition(item.id)}
                          className={
                            edition === item.id
                              ? "rounded-full bg-foreground px-3 py-1 text-xs text-background"
                              : "rounded-full border px-3 py-1 text-xs"
                          }
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    {edition !== "open" ? (
                      <Input aria-label="จำนวนที่จำกัด" value={editionLabel} onChange={(event) => setEditionLabel(event.target.value)} placeholder="เช่น 80" />
                    ) : null}
                  </div>}
                </div>
              </section>
            </div>
        </div>

          <div className="flex gap-2 border-t px-4 py-3">
            <Button type="button" variant="outline" className="flex-1" disabled={save.isPending || uploading} onClick={() => submit("Draft")}>
              บันทึกแบบร่าง
            </Button>
            <Button type="button" className="flex-1" disabled={save.isPending || uploading || !!block} onClick={() => submit("Published")}>
              เผยแพร่
            </Button>
          </div>
      </DialogContent>
    </Dialog>
  );
}

function ProjectRefField({
  ownerId,
  selectedIds,
  onChange,
}: {
  ownerId: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: myProjects = [], isLoading } = useMyProjects(ownerId);
  const published = useMemo(
    () =>
      myProjects
        .filter((project) => project.status === "Published")
        .map((project) => ({
          id: project.id,
          title: project.title,
          cover: project.cover_url || project.gallery_urls?.[0] || null,
        })),
    [myProjects],
  );
  const selected = published.filter((project) => selectedIds.includes(project.id));

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
      return;
    }
    if (selectedIds.length >= PROJECT_REF_MAX) return;
    onChange([...selectedIds, id]);
  };

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-10 w-full items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-left text-sm"
      >
        <span className="min-w-0">
          <span className="block text-sm font-medium">อ้างอิงผลงาน</span>
          <span className="block truncate text-xs text-muted-foreground">
            {selected.length > 0 ? selected.map((project) => project.title).join(", ") : "เลือกผลงานในพอร์ตที่ชิ้นนี้มาจาก"}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="mt-2 max-h-48 overflow-y-auto rounded-md border">
          {isLoading ? <p className="px-3 py-4 text-xs text-muted-foreground">กำลังโหลดผลงาน…</p> : null}
          {!isLoading && published.length === 0 ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">เผยแพร่ผลงานในพอร์ตก่อน แล้วค่อยอ้างอิงจากสินค้า</p>
          ) : null}
          {published.map((project) => {
            const on = selectedIds.includes(project.id);
            const full = !on && selectedIds.length >= PROJECT_REF_MAX;
            return (
              <button
                key={project.id}
                type="button"
                aria-pressed={on}
                disabled={full}
                onClick={() => toggle(project.id)}
                className="flex w-full items-center gap-2 border-b px-3 py-2 text-left text-sm last:border-b-0 disabled:opacity-40"
              >
                {project.cover ? (
                  <img src={project.cover} alt="" className="h-8 w-8 rounded object-cover" />
                ) : (
                  <span className="h-8 w-8 rounded bg-muted" />
                )}
                <span className="min-w-0 flex-1 truncate">{project.title}</span>
                {on ? <span className="text-xs text-muted-foreground">เลือกแล้ว</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
      <p className="mt-1 text-xs text-muted-foreground">เลือกได้สูงสุด {PROJECT_REF_MAX} ผลงาน คนดูเปิดไปดูที่มาของชิ้นนี้ได้</p>
    </div>
  );
}

function ChoiceGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={value === item.id}
            onClick={() => onChange(item.id)}
            className={
              value === item.id
                ? "rounded-full bg-foreground px-3 py-1 text-xs text-background"
                : "rounded-full border px-3 py-1 text-xs"
            }
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PairEditor({
  title,
  rows,
  onChange,
  leftPlaceholder,
  rightPlaceholder,
}: {
  title: string;
  rows: ObjectSpec[];
  onChange: (rows: ObjectSpec[]) => void;
  leftPlaceholder: string;
  rightPlaceholder: string;
}) {
  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium">{title}</p>
      {rows.map((row, index) => (
        <div key={index} className="flex gap-2">
          <Input
            aria-label={`${title} ชื่อ ${index + 1}`}
            value={row.label}
            placeholder={leftPlaceholder}
            onChange={(event) => onChange(rows.map((item, i) => (i === index ? { ...item, label: event.target.value } : item)))}
          />
          <Input
            aria-label={`${title} ค่า ${index + 1}`}
            value={row.value}
            placeholder={rightPlaceholder}
            onChange={(event) => onChange(rows.map((item, i) => (i === index ? { ...item, value: event.target.value } : item)))}
          />
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => onChange([...rows, { label: "", value: "" }])}>
        เพิ่มแถว
      </Button>
    </div>
  );
}

function Field({
  label,
  id,
  required,
  hint,
  children,
}: {
  label: string;
  id: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </Label>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}
