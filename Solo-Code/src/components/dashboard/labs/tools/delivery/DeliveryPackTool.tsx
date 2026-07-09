import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { LabsFileDropzone } from "@/components/dashboard/labs/workbench/LabsFileDropzone";
import { LabsWorkspaceEmpty } from "@/components/dashboard/labs/workbench/LabsWorkspaceEmpty";
import { LabsInspectorSection } from "@/components/dashboard/labs/workbench/LabsInspectorSection";
import { Package, ChevronRight, ChevronLeft, Download, Copy } from "lucide-react";
import { toast } from "sonner";
import { downloadZip } from "@/lib/docZip";
import {
  buildClientDeliveryNote,
  buildDeliveryReadme,
  DEFAULT_FOLDERS,
  DELIVERY_CHECKLIST,
  PROJECT_TYPES,
} from "@/lib/labs/deliveryPack";
import type { DeliveryProjectType } from "@/lib/labs/types";
import { useLabsToolSetup } from "@/components/dashboard/labs/workbench/useLabsToolSetup";
import { pushRecentFile } from "@/lib/labs/recentFiles";
import { cn } from "@/lib/utils";

type WizardStep = 1 | 2 | 3 | 4;

const STEP_LABELS = ["ประเภทงาน", "ไฟล์", "บันทึกลูกค้า", "ส่งออก"] as const;

type FolderFiles = Record<string, { id: string; file: File }[]>;

export function DeliveryPackTool() {
  const [step, setStep] = React.useState<WizardStep>(1);
  const [projectType, setProjectType] = React.useState<DeliveryProjectType>("design");
  const [projectName, setProjectName] = React.useState("");
  const [clientName, setClientName] = React.useState("");
  const [folderFiles, setFolderFiles] = React.useState<FolderFiles>(() =>
    Object.fromEntries(DEFAULT_FOLDERS.map((f) => [f.id, []])),
  );
  const [clientNote, setClientNote] = React.useState("");
  const [licenseNote, setLicenseNote] = React.useState("");
  const [checked, setChecked] = React.useState<Record<string, boolean>>({});
  const [exporting, setExporting] = React.useState(false);
  const [started, setStarted] = React.useState(false);

  const allFiles = React.useMemo(
    () => Object.values(folderFiles).flat(),
    [folderFiles],
  );

  const treePreview = React.useMemo(() => {
    const lines = ["📦 delivery-pack/", "├── README_FOR_CLIENT.txt"];
    DEFAULT_FOLDERS.forEach((folder, i) => {
      const files = folderFiles[folder.id] ?? [];
      const prefix = i === DEFAULT_FOLDERS.length - 1 ? "└──" : "├──";
      lines.push(`${prefix} ${folder.label}/`);
      files.forEach((f, fi) => {
        const sub = fi === files.length - 1 ? "    └──" : "    ├──";
        lines.push(`${sub} ${f.file.name}`);
      });
    });
    return lines;
  }, [folderFiles]);

  React.useEffect(() => {
    if (step === 3 && !clientNote) {
      setClientNote(
        buildClientDeliveryNote({
          projectName,
          clientName,
          fileCount: allFiles.length,
        }),
      );
    }
  }, [step, projectName, clientName, allFiles.length, clientNote]);

  function addFiles(folderId: string, files: File[]) {
    setFolderFiles((prev) => ({
      ...prev,
      [folderId]: [
        ...(prev[folderId] ?? []),
        ...files.map((file) => ({ id: `${Date.now()}-${file.name}`, file })),
      ],
    }));
  }

  async function exportZip() {
    const missing = DELIVERY_CHECKLIST.filter((c) => c.id !== "license" && !checked[c.id]);
    if (missing.length > 0) {
      toast.error("เช็กลิสต์ก่อนส่งออก");
      return;
    }
    setExporting(true);
    try {
      const root = `delivery-${projectName || "pack"}`.replace(/[^\w\u0E00-\u0E7F-]+/g, "-");
      const readme = buildDeliveryReadme({
        projectName,
        clientName,
        projectType,
        fileNames: allFiles.map((f) => f.file.name),
        customNote: licenseNote,
      });
      const entries: { path: string; data: Blob | string }[] = [
        { path: `${root}/README_FOR_CLIENT.txt`, data: readme },
        { path: `${root}/CLIENT_NOTE.txt`, data: clientNote },
      ];
      for (const folder of DEFAULT_FOLDERS) {
        for (const { file } of folderFiles[folder.id] ?? []) {
          entries.push({ path: `${root}/${folder.label}/${file.name}`, data: file });
        }
      }
      const filename = `${root}.zip`;
      await downloadZip(entries, filename);
      pushRecentFile({ name: filename, toolId: "delivery-pack" });
      toast.success("ส่งออก ZIP แล้ว");
    } catch {
      toast.error("ส่งออกไม่สำเร็จ");
    } finally {
      setExporting(false);
    }
  }

  const inspector = (
    <div className="space-y-3 min-w-0">
      <LabsInspectorSection title="โครงสร้างแพ็ก">
        <pre className="text-[10px] font-mono bg-muted/40 rounded-md p-2 overflow-x-auto leading-relaxed max-h-48">
          {treePreview.join("\n")}
        </pre>
      </LabsInspectorSection>
      <Badge variant="secondary" className="text-[10px] font-normal">
        เบต้า — ZIP สร้างบนเครื่องคุณ
      </Badge>
    </div>
  );

  const exportZipRef = React.useRef(exportZip);
  exportZipRef.current = exportZip;
  const canExportZip = step === 4 && allFiles.length > 0;

  useLabsToolSetup({
    inspector,
    inspectorDeps: [step, allFiles.map((f) => f.file.name).join("|")],
    export:
      canExportZip
        ? {
            label: "ส่งออก ZIP",
            disabled: exporting,
            onExport: () => exportZipRef.current(),
          }
        : null,
    exportDeps: [canExportZip, exporting, allFiles.length],
    fileCount: allFiles.length,
    processing: exporting,
    processingLabel: "กำลังสร้าง ZIP...",
    lastAction: allFiles.length ? `${allFiles.length} ไฟล์ในชุด` : undefined,
  });

  if (!started) {
    return (
      <LabsWorkspaceEmpty
        icon={Package}
        title="สร้างชุดส่งมอบงาน"
        description="4 ขั้น — จัดโฟลเดอร์ README และบันทึกลูกค้า"
        action={{
          label: "เริ่มสร้างแพ็ก",
          icon: ChevronRight,
          onClick: () => setStarted(true),
        }}
      />
    );
  }

  return (
    <div className="space-y-4 max-w-xl">
      <div className="space-y-1">
        <p className="text-xs font-medium">
          ขั้น {step}/4 — {STEP_LABELS[step - 1]}
        </p>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={cn("h-1.5 flex-1 rounded-full", s <= step ? "bg-primary" : "bg-muted")}
            />
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <p className="text-xs font-medium">ขั้นที่ 1 — ประเภทงาน</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PROJECT_TYPES.map((t) => (
              <Button
                key={t.id}
                type="button"
                size="sm"
                variant={projectType === t.id ? "default" : "outline"}
                className="text-xs h-9"
                onClick={() => setProjectType(t.id)}
              >
                {t.label}
              </Button>
            ))}
          </div>
          <div className="space-y-2">
            <Label className="text-xs">ชื่อโครงการ</Label>
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="เช่น โลโก้ร้านกาแฟ"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">ชื่อลูกค้า</Label>
            <Input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="ชื่อลูกค้า"
              className="h-9 text-sm"
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <p className="text-xs font-medium">ขั้นที่ 2 — ไฟล์ในแต่ละโฟลเดอร์</p>
          {DEFAULT_FOLDERS.map((folder) => (
            <div key={folder.id} className="border border-border rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold">{folder.label}</p>
              <LabsFileDropzone
                onFiles={(files) => addFiles(folder.id, files)}
                accept="*/*"
                maxFiles={20}
                title="วางไฟล์"
                hint={`${(folderFiles[folder.id] ?? []).length} ไฟล์`}
              />
              <ul className="text-[10px] text-muted-foreground space-y-0.5">
                {(folderFiles[folder.id] ?? []).map((f) => (
                  <li key={f.id}>• {f.file.name}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <p className="text-xs font-medium">ขั้นที่ 3 — บันทึกส่งลูกค้า</p>
          <Textarea
            value={clientNote}
            onChange={(e) => setClientNote(e.target.value)}
            className="min-h-[140px] text-xs"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => {
              void navigator.clipboard.writeText(clientNote);
              toast.success("คัดลอกข้อความแล้ว");
            }}
          >
            <Copy className="h-3.5 w-3.5" />
            คัดลอกข้อความส่งลูกค้า
          </Button>
          <div className="space-y-2">
            <Label className="text-xs">หมายเหตุลิขสิทธิ์/การใช้งาน</Label>
            <Textarea
              value={licenseNote}
              onChange={(e) => setLicenseNote(e.target.value)}
              className="min-h-[80px] text-xs"
              placeholder="ขอบเขตการใช้งาน การแก้ไขครั้งถัดไป ฯลฯ"
            />
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <p className="text-xs font-medium">ขั้นที่ 4 — เช็กลิสต์ก่อนส่งออก</p>
          <ul className="space-y-2">
            {DELIVERY_CHECKLIST.map((item) => (
              <li key={item.id} className="flex items-center gap-2">
                <Checkbox
                  id={item.id}
                  checked={!!checked[item.id]}
                  onCheckedChange={(v) =>
                    setChecked((prev) => ({ ...prev, [item.id]: v === true }))
                  }
                />
                <Label htmlFor={item.id} className="text-xs font-normal">
                  {item.label}
                </Label>
              </li>
            ))}
          </ul>
          <Button
            className="w-full gap-2"
            onClick={() => void exportZip()}
            disabled={exporting || allFiles.length === 0}
          >
            <Download className="h-4 w-4" />
            ส่งออก ZIP
          </Button>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        {step > 1 && (
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setStep((s) => (s - 1) as WizardStep)}>
            <ChevronLeft className="h-3.5 w-3.5" /> ย้อน
          </Button>
        )}
        {step < 4 && (
          <Button
            size="sm"
            className="gap-1 ml-auto"
            disabled={step === 1 && !projectName.trim()}
            onClick={() => setStep((s) => (s + 1) as WizardStep)}
          >
            ถัดไป <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
