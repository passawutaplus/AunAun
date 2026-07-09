import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LabsFileDropzone } from "@/components/dashboard/labs/workbench/LabsFileDropzone";
import { LabsWorkspaceEmpty } from "@/components/dashboard/labs/workbench/LabsWorkspaceEmpty";
import { LabsInspectorField, LabsInspectorSection } from "@/components/dashboard/labs/workbench/LabsInspectorSection";
import { LabsToolToolbar } from "@/components/dashboard/labs/workbench/LabsToolToolbar";
import { Image, Link2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { downloadBlob } from "@/lib/docZip";
import {
  DEFAULT_MOCKUP_SETTINGS,
  MOCKUP_PRESETS,
  QUICK_PRESETS,
  exportMockupCanvas,
  loadImageFromSrc,
  renderMockupCanvas,
  type MockupSettings,
} from "@/lib/labs/mockupExport";
import { useLabsToolSetup } from "@/components/dashboard/labs/workbench/useLabsToolSetup";
import { pushRecentFile } from "@/lib/labs/recentFiles";
import { Badge } from "@/components/ui/badge";

export function MockupLabTool() {
  const [settings, setSettings] = React.useState<MockupSettings>(DEFAULT_MOCKUP_SETTINGS);
  const [image, setImage] = React.useState<HTMLImageElement | null>(null);
  const [imageBefore, setImageBefore] = React.useState<HTMLImageElement | null>(null);
  const [imageAfter, setImageAfter] = React.useState<HTMLImageElement | null>(null);
  const [urlInput, setUrlInput] = React.useState("");
  const [loadingUrl, setLoadingUrl] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState(false);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const patch = React.useCallback((p: Partial<MockupSettings>) => {
    setSettings((s) => ({ ...s, ...p }));
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const canvas = await renderMockupCanvas({
          image,
          imageBefore,
          imageAfter,
          settings,
        });
        if (cancelled) return;
        const dataUrl = canvas.toDataURL("image/png");
        setPreviewUrl(dataUrl);
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext("2d");
          canvasRef.current.width = canvas.width;
          canvasRef.current.height = canvas.height;
          ctx?.drawImage(canvas, 0, 0);
        }
      } catch {
        if (!cancelled) setPreviewUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [image, imageBefore, imageAfter, settings]);

  async function handleFile(files: File[]) {
    const file = files.find((f) => f.type.startsWith("image/"));
    if (!file) {
      toast.error("เลือกไฟล์รูป");
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImageFromSrc(url);
      if (settings.preset === "beforeAfter" && !imageBefore) {
        setImageBefore(img);
      } else if (settings.preset === "beforeAfter") {
        setImageAfter(img);
      } else {
        setImage(img);
      }
      pushRecentFile({ name: file.name, toolId: "mockup-lab" });
      toast.success("โหลดภาพแล้ว");
    } catch {
      toast.error("โหลดภาพไม่สำเร็จ");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function loadFromUrl() {
    if (!urlInput.trim()) return;
    setLoadingUrl(true);
    try {
      toast.info("URL capture — พรีวิว (อาจถูก CORS บล็อก)", { duration: 3000 });
      const img = await loadImageFromSrc(urlInput.trim());
      setImage(img);
      toast.success("โหลดจาก URL แล้ว");
    } catch {
      toast.error("โหลด URL ไม่ได้ — ลองอัปโหลดไฟล์แทน");
    } finally {
      setLoadingUrl(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const canvas = await renderMockupCanvas({
        image,
        imageBefore,
        imageAfter,
        settings,
      });
      const blob = await exportMockupCanvas(
        canvas,
        settings.exportFormat,
        settings.exportQuality,
      );
      const ext = settings.exportFormat;
      const name = `mockup-${Date.now()}.${ext}`;
      downloadBlob(blob, name);
      pushRecentFile({ name, toolId: "mockup-lab" });
      toast.success("ส่งออกแล้ว");
    } catch {
      toast.error("ส่งออกไม่สำเร็จ");
    } finally {
      setExporting(false);
    }
  }

  function applyQuickPreset(id: string) {
    const preset = QUICK_PRESETS.find((p) => p.id === id);
    if (preset) setSettings((s) => ({ ...s, ...preset.settings }));
  }

  const canExport = Boolean(image || imageBefore);

  const handleExportRef = React.useRef(handleExport);
  handleExportRef.current = handleExport;

  const inspector = (
    <div className="space-y-4 min-w-0">
      <LabsInspectorSection title="กรอบภาพ">
        <Select value={settings.preset} onValueChange={(v) => patch({ preset: v as MockupSettings["preset"] })}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MOCKUP_PRESETS.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </LabsInspectorSection>

      <LabsInspectorField label="พื้นหลัง">
        <Input
          type="color"
          value={settings.background}
          onChange={(e) => patch({ background: e.target.value })}
          className="h-8 p-1 w-full"
        />
      </LabsInspectorField>

      <LabsInspectorField label="ระยะขอบ" value={`${settings.padding}px`}>
        <Slider value={[settings.padding]} min={8} max={120} step={4} onValueChange={([v]) => patch({ padding: v })} />
      </LabsInspectorField>

      <LabsInspectorField label="เงา" value={`${settings.shadow}`}>
        <Slider value={[settings.shadow]} min={0} max={48} step={2} onValueChange={([v]) => patch({ shadow: v })} />
      </LabsInspectorField>

      <LabsInspectorField label="มุมโค้ง" value={`${settings.radius}px`}>
        <Slider value={[settings.radius]} min={0} max={32} step={2} onValueChange={([v]) => patch({ radius: v })} />
      </LabsInspectorField>

      <LabsInspectorField label="สีเฟรม">
        <Input
          type="color"
          value={settings.deviceColor}
          onChange={(e) => patch({ deviceColor: e.target.value })}
          className="h-8 p-1 w-full"
        />
      </LabsInspectorField>

      <LabsInspectorField label="คำบรรยาย">
        <Input
          value={settings.caption}
          onChange={(e) => patch({ caption: e.target.value })}
          className="h-8 text-xs"
          placeholder="ใต้ภาพ (ถ้ามี)"
        />
      </LabsInspectorField>

      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">แสดงโลโก้</Label>
        <Switch checked={settings.showLogo} onCheckedChange={(v) => patch({ showLogo: v })} />
      </div>

      <LabsInspectorField label="ความกว้างส่งออก" value={`${settings.exportWidth}px`}>
        <Slider
          value={[settings.exportWidth]}
          min={800}
          max={2400}
          step={100}
          onValueChange={([v]) => patch({ exportWidth: v })}
        />
      </LabsInspectorField>

      <LabsInspectorSection title="ไฟล์ส่งออก">
        <ToggleGroup
          type="single"
          value={settings.exportFormat}
          onValueChange={(v) => v && patch({ exportFormat: v as MockupSettings["exportFormat"] })}
          className="justify-start flex-wrap"
        >
          <ToggleGroupItem value="png" className="text-xs h-7 px-2">
            PNG
          </ToggleGroupItem>
          <ToggleGroupItem value="jpg" className="text-xs h-7 px-2">
            JPG
          </ToggleGroupItem>
          <ToggleGroupItem value="webp" className="text-xs h-7 px-2">
            WebP
          </ToggleGroupItem>
        </ToggleGroup>
      </LabsInspectorSection>

      <p className="text-[10px] text-muted-foreground leading-relaxed">
        ประมวลผลบนเครื่องคุณ — กดส่งออกที่แถบบนหรือด้านล่าง
      </p>
    </div>
  );

  useLabsToolSetup({
    inspector,
    inspectorDeps: [settings, image, imageBefore, imageAfter],
    export: canExport
      ? {
          label: "ส่งออกภาพ",
          disabled: exporting,
          onExport: () => handleExportRef.current(),
        }
      : null,
    exportDeps: [canExport, exporting, settings.exportFormat],
    fileCount: canExport ? 1 : 0,
    processing: loadingUrl || exporting,
    processingLabel: exporting ? "กำลังส่งออก..." : "กำลังโหลด...",
    lastAction: canExport ? "พร้อมส่งออก" : undefined,
  });

  const hasImage = Boolean(image || imageBefore);

  if (!hasImage) {
    return (
      <div className="space-y-4">
        <LabsWorkspaceEmpty
          icon={Image}
          title="อัปโหลดภาพหรือวาง URL"
          description="ใส่กรอบ mockup ก่อนส่งลูกค้า — ประมวลผลบนเครื่องคุณ"
        />
        <LabsFileDropzone
          onFiles={(f) => void handleFile(f)}
          accept="image/*"
          title="เลือก screenshot"
          hint="PNG, JPG, WebP"
        />
        <div className="flex gap-2">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://..."
            className="h-9 text-xs"
          />
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-1"
            onClick={() => void loadFromUrl()}
            disabled={loadingUrl}
          >
            {loadingUrl ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
            โหลด URL
          </Button>
        </div>
        <Badge variant="secondary" className="text-[10px] font-normal">
          โหลดจาก URL = พรีวิว — อาจถูก CORS บล็อก แนะนำอัปโหลดไฟล์
        </Badge>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <LabsToolToolbar
        items={QUICK_PRESETS.map((p) => ({
          id: p.id,
          label: p.label,
          icon: Sparkles,
          onClick: () => applyQuickPreset(p.id),
        }))}
      />

      <div className="rounded-lg border border-border bg-muted/20 p-2 sm:p-3 flex items-center justify-center min-h-[200px] max-h-[min(52vh,480px)] overflow-auto">
        {previewUrl ? (
          <img src={previewUrl} alt="ตัวอย่าง mockup" className="max-w-full max-h-full object-contain" />
        ) : (
          <canvas ref={canvasRef} className="max-w-full" />
        )}
      </div>

      <LabsFileDropzone
        onFiles={(f) => void handleFile(f)}
        accept="image/*"
        title="เปลี่ยนภาพ"
        hint="ลากมาวางหรือกดเลือก"
      />
    </div>
  );
}
