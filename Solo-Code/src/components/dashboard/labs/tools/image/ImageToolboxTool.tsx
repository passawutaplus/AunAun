import * as React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LabsFileDropzone } from "@/components/dashboard/labs/workbench/LabsFileDropzone";
import { LabsWorkspaceEmpty } from "@/components/dashboard/labs/workbench/LabsWorkspaceEmpty";
import { LabsInspectorField } from "@/components/dashboard/labs/workbench/LabsInspectorSection";
import { Progress } from "@/components/ui/progress";
import { Images, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { downloadBlob, downloadZip } from "@/lib/docZip";
import type { LabsActionStackItem, LabsFileItem } from "@/lib/labs/types";
import {
  estimateBlobSize,
  processImageFile,
  readImageDimensions,
  renameOutput,
} from "@/lib/labs/imageToolbox";
import { useLabsToolSetup } from "@/components/dashboard/labs/workbench/useLabsToolSetup";
import { pushRecentFile } from "@/lib/labs/recentFiles";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const DEFAULT_ACTIONS: LabsActionStackItem[] = [
  { id: "resize", enabled: true, label: "ย่อขนาด", settings: { maxWidth: 1920, maxHeight: 1920 } },
  { id: "compress", enabled: true, label: "บีบอัด", settings: { quality: 0.85 } },
  { id: "convert", enabled: false, label: "แปลงฟอร์แมต", settings: { format: "jpeg" } },
  { id: "cropSocial", enabled: false, label: "ครอป Social", settings: { preset: "ig_square" } },
  { id: "removeExif", enabled: false, label: "ลบ EXIF", settings: {} },
  { id: "watermark", enabled: false, label: "ลายน้ำ", settings: { text: "© Preview" } },
  { id: "rename", enabled: false, label: "เปลี่ยนชื่อ", settings: { pattern: "{name}-{index}{ext}" } },
];

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImageToolboxTool() {
  const [items, setItems] = React.useState<LabsFileItem[]>([]);
  const [actions, setActions] = React.useState<LabsActionStackItem[]>(DEFAULT_ACTIONS);
  const [processing, setProcessing] = React.useState(false);
  const [progress, setProgress] = React.useState({ current: 0, total: 0 });
  const [previewId, setPreviewId] = React.useState<string | null>(null);

  const previewItem = items.find((i) => i.id === previewId) ?? items[0];

  async function handleUpload(files: File[]) {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      toast.error("เลือกไฟล์รูปเท่านั้น");
      return;
    }
    const next: LabsFileItem[] = [];
    for (const file of imageFiles) {
      try {
        const dims = await readImageDimensions(file);
        next.push({
          id: `${Date.now()}-${file.name}`,
          file,
          name: file.name,
          originalSize: file.size,
          width: dims.width,
          height: dims.height,
          targetFormat: "jpeg",
          status: "pending",
        });
      } catch {
        next.push({
          id: `${Date.now()}-${file.name}`,
          file,
          name: file.name,
          originalSize: file.size,
          targetFormat: "jpeg",
          status: "error",
          error: "อ่านไฟล์ไม่ได้",
        });
      }
    }
    setItems((prev) => [...prev, ...next]);
    if (!previewId && next[0]) setPreviewId(next[0].id);
  }

  function toggleAction(id: LabsActionStackItem["id"], enabled: boolean) {
    setActions((prev) => prev.map((a) => (a.id === id ? { ...a, enabled } : a)));
  }

  function updateActionSettings(id: LabsActionStackItem["id"], settings: Record<string, unknown>) {
    setActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, settings: { ...a.settings, ...settings } } : a)),
    );
  }

  async function runBatch() {
    if (items.length === 0) return;
    setProcessing(true);
    setProgress({ current: 0, total: items.length });
    const results = await Promise.allSettled(
      items.map(async (item, index) => {
        if (item.status === "error") return item;
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: "processing" } : i)),
        );
        try {
          const blob = await processImageFile(item, actions);
          const rename = actions.find((a) => a.id === "rename" && a.enabled);
          const name = rename
            ? renameOutput(item.name, String(rename.settings.pattern), index)
            : item.name;
          const done: LabsFileItem = {
            ...item,
            name,
            status: "done",
            outputBlob: blob,
            estimatedSize: estimateBlobSize(blob),
          };
          setItems((prev) => prev.map((i) => (i.id === item.id ? done : i)));
          setProgress((p) => ({ ...p, current: p.current + 1 }));
          return done;
        } catch (e) {
          const failed: LabsFileItem = {
            ...item,
            status: "error",
            error: e instanceof Error ? e.message : "ล้มเหลว",
          };
          setItems((prev) => prev.map((i) => (i.id === item.id ? failed : i)));
          setProgress((p) => ({ ...p, current: p.current + 1 }));
          return failed;
        }
      }),
    );
    setProcessing(false);
    const ok = results.filter((r) => r.status === "fulfilled").length;
    toast.success(`เสร็จ ${ok}/${items.length} ไฟล์`);
  }

  async function exportAll() {
    const done = items.filter((i) => i.outputBlob);
    if (done.length === 0) {
      toast.error("รัน batch ก่อน");
      return;
    }
    if (done.length === 1 && done[0].outputBlob) {
      downloadBlob(done[0].outputBlob, done[0].name);
      pushRecentFile({ name: done[0].name, toolId: "image-toolbox" });
      return;
    }
    await downloadZip(
      done.map((i) => ({ path: i.name, data: i.outputBlob! })),
      `solo-images-${Date.now()}.zip`,
    );
    toast.success("ดาวน์โหลด ZIP แล้ว");
  }

  const inspector = (
    <div className="space-y-4">
      <p className="text-xs font-medium">Action stack</p>
      {actions.map((action) => (
        <div key={action.id} className="space-y-2 border-b border-border/40 pb-3 last:border-0">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs">{action.label}</Label>
            <Switch
              checked={action.enabled}
              onCheckedChange={(v) => toggleAction(action.id, v)}
            />
          </div>
          {action.enabled && action.id === "resize" && (
            <LabsInspectorField label="ความกว้างสูงสุด" value={`${action.settings.maxWidth}px`}>
              <Slider
                min={640}
                max={3840}
                step={160}
                value={[Number(action.settings.maxWidth)]}
                onValueChange={([v]) => updateActionSettings("resize", { maxWidth: v })}
              />
            </LabsInspectorField>
          )}
          {action.enabled && action.id === "compress" && (
            <LabsInspectorField label="คุณภาพ" value={String(action.settings.quality)}>
              <Slider
                min={0.4}
                max={1}
                step={0.05}
                value={[Number(action.settings.quality)]}
                onValueChange={([v]) => updateActionSettings("compress", { quality: v })}
              />
            </LabsInspectorField>
          )}
          {action.enabled && action.id === "convert" && (
            <Select
              value={String(action.settings.format)}
              onValueChange={(v) => updateActionSettings("convert", { format: v })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="jpeg">JPEG</SelectItem>
                <SelectItem value="png">PNG</SelectItem>
                <SelectItem value="webp">WebP</SelectItem>
              </SelectContent>
            </Select>
          )}
          {action.enabled && action.id === "cropSocial" && (
            <Select
              value={String(action.settings.preset)}
              onValueChange={(v) => updateActionSettings("cropSocial", { preset: v })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ig_square">IG 1:1</SelectItem>
                <SelectItem value="ig_story">IG Story</SelectItem>
                <SelectItem value="fb_cover">FB Cover</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
              </SelectContent>
            </Select>
          )}
          {action.enabled && action.id === "watermark" && (
            <Input
              className="h-8 text-xs"
              value={String(action.settings.text)}
              onChange={(e) => updateActionSettings("watermark", { text: e.target.value })}
            />
          )}
          {action.enabled && action.id === "removeExif" && (
            <p className="text-[10px] text-muted-foreground">
              ลบ EXIF โดยการ render ใหม่บน canvas (เบต้า)
            </p>
          )}
          {action.enabled && action.id === "rename" && (
            <Input
              className="h-8 text-xs font-mono"
              value={String(action.settings.pattern)}
              onChange={(e) => updateActionSettings("rename", { pattern: e.target.value })}
            />
          )}
        </div>
      ))}
      {previewItem?.outputBlob && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground">ประมาณการขนาด</p>
          <p className="text-xs font-medium">
            {formatBytes(previewItem.originalSize)} → {formatBytes(previewItem.estimatedSize ?? 0)}
          </p>
        </div>
      )}
    </div>
  );

  const doneCount = items.filter((i) => i.status === "done").length;
  const canExport = doneCount > 0;
  const exportAllRef = React.useRef(exportAll);
  exportAllRef.current = exportAll;

  useLabsToolSetup({
    inspector,
    inspectorDeps: [actions, previewItem?.id, previewItem?.estimatedSize],
    export: canExport
      ? {
          label: doneCount > 1 ? "ส่งออก ZIP" : "ส่งออก",
          disabled: processing,
          onExport: () => exportAllRef.current(),
        }
      : null,
    exportDeps: [canExport, processing, doneCount],
    fileCount: items.length,
    processing,
    processingLabel: `ประมวลผล ${progress.current}/${progress.total}`,
    lastAction: canExport ? `พร้อมส่งออก ${doneCount} ไฟล์` : undefined,
  });

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <LabsWorkspaceEmpty
          icon={Images}
          title="อัปโหลดหลายรูปพร้อมกัน"
          description="ย่อ แปลง ลายน้ำ — ผิดพลาดต่อไฟล์ไม่ล้มทั้งชุด"
        />
        <LabsFileDropzone
          onFiles={(f) => void handleUpload(f)}
          accept="image/*"
          maxFiles={30}
          title="ลากรูปมาวาง"
          hint="JPEG, PNG, WebP — สูงสุด 30 ไฟล์"
        />
      </div>
    );
  }

  const batchPct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <Button size="sm" onClick={() => void runBatch()} disabled={processing} className="gap-1.5 h-8 text-xs">
          {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          รัน batch
        </Button>
        <LabsFileDropzone
          onFiles={(f) => void handleUpload(f)}
          accept="image/*"
          maxFiles={30}
          title="เพิ่มไฟล์"
          className="flex-1 min-w-[160px]"
        />
      </div>

      {processing && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>กำลังประมวลผล</span>
            <span>{progress.current}/{progress.total}</span>
          </div>
          <Progress value={batchPct} className="h-1.5" />
        </div>
      )}

      <div className="hidden sm:block overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px]">ชื่อ</TableHead>
              <TableHead className="text-[10px]">ขนาดเดิม</TableHead>
              <TableHead className="text-[10px]">มิติ</TableHead>
              <TableHead className="text-[10px]">สถานะ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={item.id}
                className={cn("cursor-pointer", previewId === item.id && "bg-muted/40")}
                onClick={() => setPreviewId(item.id)}
              >
                <TableCell className="text-xs max-w-[120px] truncate">{item.name}</TableCell>
                <TableCell className="text-[10px]">{formatBytes(item.originalSize)}</TableCell>
                <TableCell className="text-[10px]">
                  {item.width && item.height ? `${item.width}×${item.height}` : "—"}
                </TableCell>
                <TableCell>
                  {item.status === "error" ? (
                    <Badge variant="destructive" className="text-[9px] gap-0.5">
                      <AlertCircle className="h-3 w-3" />
                      {item.error ?? "ผิดพลาด"}
                    </Badge>
                  ) : item.status === "done" ? (
                    <Badge variant="secondary" className="text-[9px]">
                      เสร็จ
                      {item.estimatedSize ? ` · ${formatBytes(item.estimatedSize)}` : ""}
                    </Badge>
                  ) : item.status === "processing" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <span className="text-[10px] text-muted-foreground">รอ</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="sm:hidden space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className={cn(
              "rounded-lg border border-border p-2.5",
              previewId === item.id && "border-primary/40 bg-primary/5",
            )}
            onClick={() => setPreviewId(item.id)}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium truncate flex-1">{item.name}</p>
              {item.status === "error" ? (
                <Badge variant="destructive" className="text-[9px]">ผิดพลาด</Badge>
              ) : item.status === "done" ? (
                <Badge variant="secondary" className="text-[9px]">เสร็จ</Badge>
              ) : item.status === "processing" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
              ) : (
                <span className="text-[10px] text-muted-foreground">รอ</span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {formatBytes(item.originalSize)}
              {item.width && item.height ? ` · ${item.width}×${item.height}` : ""}
              {item.estimatedSize ? ` → ${formatBytes(item.estimatedSize)}` : ""}
            </p>
          </li>
        ))}
      </ul>

      {previewItem && (
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-border p-2">
            <p className="text-[10px] text-muted-foreground mb-1">ก่อน</p>
            <img
              src={URL.createObjectURL(previewItem.file)}
              alt=""
              className="max-h-40 w-full object-contain rounded bg-muted/30"
            />
          </div>
          <div className="rounded-lg border border-border p-2">
            <p className="text-[10px] text-muted-foreground mb-1">หลัง</p>
            {previewItem.outputBlob ? (
              <img
                src={URL.createObjectURL(previewItem.outputBlob)}
                alt=""
                className="max-h-40 w-full object-contain rounded bg-muted/30"
              />
            ) : (
              <p className="text-xs text-muted-foreground py-8 text-center">รัน batch เพื่อดูตัวอย่าง</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
