import * as React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FileDropzone } from "@/components/doc/FileDropzone";
import {
  extractPdfPages,
  fileToBytes,
  getPdfPageInfos,
  imagesToPdf,
  mergeFilesToPdf,
  rotatePdfPage,
} from "@/lib/docPdf";
import { downloadBlob } from "@/lib/docZip";
import { compressImageFile, dataUrlToBlob } from "@/lib/imageCompress";
import {
  buildBatchFilename,
  DEFAULT_BATCH_PATTERN,
  todayIsoDate,
} from "@/lib/docLabBatchRename";
import {
  fileToHandoffEntry,
  requestOpenClientPack,
  storeDocLabHandoff,
} from "@/lib/docLabHandoff";
import { DocLabClientHandoffDialog } from "./DocLabClientHandoffDialog";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  FileText,
  Loader2,
  Scissors,
  Download,
  AlertCircle,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type DocTool = "merge" | "split" | "images" | "rotate";

type DocRecipe = {
  id: string;
  label: string;
  tool: DocTool;
  hint: string;
  suggestedFrom?: ("figma" | "canva" | "adobe")[];
};

type QueuedFile = { id: string; file: File };

const RECIPES: DocRecipe[] = [
  { id: "merge", label: "รวม PDF", tool: "merge", hint: "หลายไฟล์ → PDF เดียว" },
  { id: "split", label: "แยกหน้า", tool: "split", hint: "เลือกหน้าจาก PDF" },
  { id: "images", label: "รูป → PDF", tool: "images", hint: "หลายรูป → PDF เดียว" },
  {
    id: "preview",
    label: "ส่ง preview",
    tool: "merge",
    hint: "รวมแล้วใส่ watermark",
    suggestedFrom: ["figma", "canva"],
  },
  {
    id: "figma-export",
    label: "จาก Figma/Canva",
    tool: "merge",
    hint: "watermark + ตั้งชื่อไฟล์อัตโนมัติ",
    suggestedFrom: ["figma", "canva", "adobe"],
  },
];

export function DocLabTab() {
  const navigate = useNavigate();
  const [wizardStep, setWizardStep] = React.useState<1 | 2 | 3>(1);
  const [tool, setTool] = React.useState<DocTool>("merge");
  const [queue, setQueue] = React.useState<QueuedFile[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [pdfBytes, setPdfBytes] = React.useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = React.useState(0);
  const [selectedPages, setSelectedPages] = React.useState<number[]>([]);
  const [watermark, setWatermark] = React.useState("PREVIEW");
  const [applyWatermark, setApplyWatermark] = React.useState(false);
  const [batchRename, setBatchRename] = React.useState(false);
  const [batchClient, setBatchClient] = React.useState("");
  const [batchProject, setBatchProject] = React.useState("");
  const [batchDate, setBatchDate] = React.useState(todayIsoDate());
  const [batchPattern, setBatchPattern] = React.useState(DEFAULT_BATCH_PATTERN);
  const [handoffOpen, setHandoffOpen] = React.useState(false);
  const [splitAsZip, setSplitAsZip] = React.useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function addFiles(files: File[]) {
    setQueue((prev) => [
      ...prev,
      ...files.map((file) => ({ id: `${file.name}-${Date.now()}-${Math.random()}`, file })),
    ]);
    const pdf = files.find((f) => f.type === "application/pdf" || f.name.endsWith(".pdf"));
    if (pdf && tool === "split") {
      void loadPdfForSplit(pdf);
    }
  }

  async function loadPdfForSplit(file: File) {
    try {
      const bytes = await fileToBytes(file);
      const infos = await getPdfPageInfos(bytes);
      setPdfBytes(bytes);
      setPageCount(infos.length);
      setSelectedPages(infos.map((p) => p.index));
    } catch {
      toast.error("โหลด PDF ไม่สำเร็จ");
    }
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setQueue((items) => {
      const oldIndex = items.findIndex((x) => x.id === active.id);
      const newIndex = items.findIndex((x) => x.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  }

  async function maybeCompress(file: File): Promise<File> {
    if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;
    if (file.size <= 2 * 1024 * 1024) return file;
    try {
      const dataUrl = await compressImageFile(file);
      const blob = dataUrlToBlob(dataUrl);
      return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
    } catch {
      return file;
    }
  }

  async function applyWatermarkToPdf(bytes: Uint8Array): Promise<Uint8Array> {
    if (!applyWatermark || !watermark.trim()) return bytes;
    const { PDFDocument, rgb, StandardFonts, degrees } = await import("pdf-lib");
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    for (const page of doc.getPages()) {
      const { width, height } = page.getSize();
      page.drawText(watermark, {
        x: width * 0.15,
        y: height * 0.5,
        size: Math.min(width, height) * 0.08,
        font,
        color: rgb(0.9, 0.4, 0.2),
        opacity: 0.25,
        rotate: degrees(-30),
      });
    }
    return doc.save();
  }

  function outputFilename(originalName?: string): string {
    if (!batchRename) return `doc-lab-${Date.now()}.pdf`;
    return buildBatchFilename({
      pattern: batchPattern,
      client: batchClient,
      project: batchProject,
      date: batchDate,
      originalName,
    });
  }

  async function processOutput(): Promise<{ bytes: Uint8Array; filename: string }> {
    if (queue.length === 0) throw new Error("เพิ่มไฟล์ก่อน");
    let out: Uint8Array;
    const files = await Promise.all(queue.map((q) => maybeCompress(q.file)));

    if (tool === "merge") {
      out = await mergeFilesToPdf(files);
    } else if (tool === "images") {
      const imgs = await Promise.all(
        files.map(async (f) => ({
          bytes: await fileToBytes(f),
          mimeType: f.type || "image/jpeg",
        })),
      );
      out = await imagesToPdf(imgs);
    } else if (tool === "split") {
      if (!pdfBytes) throw new Error("เลือก PDF ก่อน");
      out = await extractPdfPages(pdfBytes, selectedPages);
    } else if (tool === "rotate") {
      if (!pdfBytes) {
        const pdf = files.find((f) => f.name.endsWith(".pdf") || f.type === "application/pdf");
        if (!pdf) throw new Error("ต้องมีไฟล์ PDF");
        const b = await fileToBytes(pdf);
        out = await rotatePdfPage(b, 0, 90);
      } else {
        out = await rotatePdfPage(pdfBytes, selectedPages[0] ?? 0, 90);
      }
    } else {
      throw new Error("ไม่รู้จักเครื่องมือ");
    }

    out = await applyWatermarkToPdf(out);
    const filename = outputFilename(files[0]?.name);
    return { bytes: out, filename };
  }

  async function handleProcess() {
    setBusy(true);
    try {
      if (tool === "split" && splitAsZip && selectedPages.length > 1 && pdfBytes) {
        const { buildZipBlob } = await import("@/lib/docZip");
        const entries: { path: string; data: Blob }[] = [];
        for (const pageIdx of selectedPages) {
          const pageBytes = await extractPdfPages(pdfBytes, [pageIdx]);
          const wm = await applyWatermarkToPdf(pageBytes);
          const name = outputFilename(`page-${pageIdx + 1}.pdf`);
          entries.push({ path: name, data: new Blob([wm.slice()], { type: "application/pdf" }) });
        }
        const zip = await buildZipBlob(entries);
        downloadBlob(zip, `doc-lab-pages-${Date.now()}.zip`);
        toast.success("ดาวน์โหลด ZIP แยกหน้าแล้ว");
        return;
      }
      const { bytes, filename } = await processOutput();
      downloadBlob(new Blob([bytes.slice()], { type: "application/pdf" }), filename);
      toast.success("ดาวน์โหลดแล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ประมวลผลไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function buildHandoffFiles(): Promise<File[]> {
    if (tool === "split" && splitAsZip && selectedPages.length > 1 && pdfBytes) {
      const files: File[] = [];
      for (const pageIdx of selectedPages) {
        const pageBytes = await extractPdfPages(pdfBytes, [pageIdx]);
        const wm = await applyWatermarkToPdf(pageBytes);
        const name = outputFilename(`page-${pageIdx + 1}.pdf`);
        files.push(new File([wm.slice()], name, { type: "application/pdf" }));
      }
      return files;
    }
    const { bytes, filename } = await processOutput();
    return [new File([bytes.slice()], filename, { type: "application/pdf" })];
  }

  async function handleHandoffConfirm(quotationId: string | null) {
    setBusy(true);
    try {
      const files = await buildHandoffFiles();
      const entries = await Promise.all(files.map((f) => fileToHandoffEntry(f)));
      storeDocLabHandoff({ files: entries, quotationId: quotationId ?? undefined });
      requestOpenClientPack(quotationId ?? undefined);
      setHandoffOpen(false);
      toast.success("แนบไฟล์แล้ว — เปิดชุดส่งลูกค้า");
      void navigate({
        to: "/dashboard",
        search: { tab: "finance", sub: "quotations" },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ส่งต่อไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  const hasWhtHint = queue.some((q) => /50\s*ทวิ|wht|withholding/i.test(q.file.name));

  return (
    <div className="space-y-5">
      <Card className="p-5 glass">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-slate-500/15 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold">Doc Lab</h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              จัดไฟล์ PDF/รูปก่อนส่ง — ประมวลผลบนเครื่องคุณ ไม่เก็บบนเซิร์ฟเวอร์
            </p>
          </div>
        </div>
      </Card>

      {hasWhtHint && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2.5 text-xs text-amber-950">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            ใบ 50ทวิ ควรเก็บที่{" "}
            <Link to="/dashboard" search={{ tab: "finance", sub: "tax" }} className="font-medium underline">
              ภาษี → เอกสารภาษี
            </Link>{" "}
            เพื่อรวมชุดนักบัญชีอัตโนมัติ
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className={cn("font-medium", wizardStep === 1 && "text-primary")}>1. เลือกงาน</span>
        <span>→</span>
        <span className={cn("font-medium", wizardStep === 2 && "text-primary")}>2. ไฟล์</span>
        <span>→</span>
        <span className={cn("font-medium", wizardStep === 3 && "text-primary")}>3. ตัวเลือก</span>
      </div>

      {wizardStep === 1 && (
        <div className="grid sm:grid-cols-2 gap-2">
          {RECIPES.map((r) => (
            <button
              key={r.id}
              type="button"
              className={cn(
                "rounded-xl border p-3 text-left transition-colors",
                tool === r.tool && (r.id !== "preview" || applyWatermark)
                  ? "border-primary bg-primary/5"
                  : "border-border/60 hover:border-primary/40",
              )}
              onClick={() => {
                setTool(r.tool);
                if (r.id === "preview") setApplyWatermark(true);
                if (r.id === "figma-export") {
                  setApplyWatermark(true);
                  setBatchRename(true);
                }
              }}
            >
              <p className="text-sm font-semibold">{r.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{r.hint}</p>
              {r.suggestedFrom && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {r.suggestedFrom.map((s) => (
                    <Badge key={s} variant="outline" className="text-[9px]">
                      เหมาะกับ {s === "figma" ? "Figma PDF" : s === "canva" ? "Canva" : "Adobe"}
                    </Badge>
                  ))}
                </div>
              )}
            </button>
          ))}
          <div className="sm:col-span-2 flex justify-end">
            <Button type="button" size="sm" onClick={() => setWizardStep(2)}>
              ถัดไป — เพิ่มไฟล์
            </Button>
          </div>
        </div>
      )}

      {wizardStep === 2 && (
        <>
          <FileDropzone
            onFiles={addFiles}
            busy={busy}
            title="ลากไฟล์มาวาง"
            hint="PDF · JPG · PNG · สูงสุด 20 ไฟล์"
            icon={<FileText className="h-6 w-6" />}
          />

          {queue.length > 0 && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={queue.map((q) => q.id)} strategy={verticalListSortingStrategy}>
                <ul className="space-y-1.5">
                  {queue.map((q) => (
                    <SortableFileRow
                      key={q.id}
                      id={q.id}
                      name={q.file.name}
                      onRemove={() => setQueue((prev) => prev.filter((x) => x.id !== q.id))}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}

          <div className="flex justify-between gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setWizardStep(1)}>
              ย้อนกลับ
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={queue.length === 0}
              onClick={() => setWizardStep(3)}
            >
              ถัดไป — ตัวเลือก
            </Button>
          </div>
        </>
      )}

      {wizardStep === 3 && (
        <>
          {tool === "split" && pageCount > 1 && (
            <Card className="p-3 space-y-2">
              <p className="text-xs font-semibold flex items-center gap-1">
                <Scissors className="h-3.5 w-3.5" /> เลือกหน้า ({pageCount} หน้า)
              </p>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: pageCount }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      setSelectedPages((prev) =>
                        prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i].sort((a, b) => a - b),
                      )
                    }
                    className={cn(
                      "h-8 min-w-8 px-2 rounded-lg border text-xs font-medium",
                      selectedPages.includes(i)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60",
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={splitAsZip}
                  onChange={(e) => setSplitAsZip(e.target.checked)}
                />
                แยกเป็นไฟล์ละหน้า (ZIP / ส่งหลายไฟล์)
              </label>
            </Card>
          )}

          <Card className="p-3 space-y-2">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={batchRename}
                onChange={(e) => setBatchRename(e.target.checked)}
              />
              ตั้งชื่อไฟล์ตามโปรเจกต์
            </label>
            {batchRename && (
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  className="h-8 text-xs"
                  placeholder="ลูกค้า"
                  value={batchClient}
                  onChange={(e) => setBatchClient(e.target.value)}
                />
                <Input
                  className="h-8 text-xs"
                  placeholder="โปรเจกต์"
                  value={batchProject}
                  onChange={(e) => setBatchProject(e.target.value)}
                />
                <Input
                  className="h-8 text-xs"
                  type="date"
                  value={batchDate}
                  onChange={(e) => setBatchDate(e.target.value)}
                />
                <Input
                  className="h-8 text-xs sm:col-span-2"
                  placeholder={DEFAULT_BATCH_PATTERN}
                  value={batchPattern}
                  onChange={(e) => setBatchPattern(e.target.value)}
                />
              </div>
            )}
          </Card>

          <Card className="p-3 space-y-2">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={applyWatermark}
                onChange={(e) => setApplyWatermark(e.target.checked)}
              />
              ใส่ watermark ข้อความ
            </label>
            {applyWatermark && (
              <input
                className="w-full h-8 rounded-lg border border-border/60 px-2 text-sm"
                value={watermark}
                onChange={(e) => setWatermark(e.target.value)}
                placeholder="PREVIEW"
              />
            )}
          </Card>

          <div className="sticky bottom-2 z-10 flex flex-col sm:flex-row gap-2 bg-background/95 backdrop-blur p-2 rounded-xl border border-border/60">
            <Button type="button" size="sm" variant="outline" onClick={() => setWizardStep(2)}>
              ย้อนกลับ
            </Button>
            <Button className="flex-1 gap-2" disabled={busy || queue.length === 0} onClick={() => void handleProcess()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              ดาวน์โหลด
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="flex-1 gap-2"
              disabled={busy || queue.length === 0}
              onClick={() => setHandoffOpen(true)}
            >
              <Send className="h-4 w-4" />
              ส่งลูกค้า
            </Button>
          </div>
        </>
      )}

      <DocLabClientHandoffDialog
        open={handoffOpen}
        onOpenChange={setHandoffOpen}
        busy={busy}
        onConfirm={(id) => void handleHandoffConfirm(id)}
      />
    </div>
  );
}

function SortableFileRow({
  id,
  name,
  onRemove,
}: {
  id: string;
  name: string;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-xs bg-card",
        isDragging && "opacity-70 shadow-md",
      )}
    >
      <button type="button" className="cursor-grab text-muted-foreground" {...attributes} {...listeners}>
        ≡
      </button>
      <span className="flex-1 truncate">{name}</span>
      <Badge variant="outline" className="text-[9px]">
        ลากเรียง
      </Badge>
      <button type="button" className="text-destructive text-[11px]" onClick={onRemove}>
        ลบ
      </button>
    </li>
  );
}
