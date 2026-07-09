import { useRef, useState } from "react";
import {
  ExternalLink,
  Plus,
  X,
  Paperclip,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ProjectAssetScanBadge from "@/components/project/ProjectAssetScanBadge";
import {
  PROJECT_ASSETS_MAX,
  PROJECT_ASSET_ALLOWED_EXTENSIONS,
  createProjectFileAsset,
  createProjectLinkAsset,
  projectAssetDownloadUrl,
  type ProjectAsset,
} from "@/lib/projectAssets";
import { applyScanResult, evaluateProjectAssetOnAdd } from "@/lib/projectAssetScan";
import { uploadProjectAssetFile } from "@/lib/uploadProjectAsset";
import { safeHttpUrl } from "@/lib/safeUrl";
import type { Tier } from "@/core/subscription/useSubscription";
import { toast } from "sonner";
import { fetchProjectAssetDownloadUrl } from "@/lib/downloadProjectAsset";
import { cn } from "@/lib/utils";

type Props = {
  assets: ProjectAsset[];
  onChange: (assets: ProjectAsset[]) => void;
  userId: string;
  folder: string;
  projectId?: string;
  tier?: Tier;
};

const ACCEPT = Array.from(PROJECT_ASSET_ALLOWED_EXTENSIONS)
  .map((e) => `.${e}`)
  .join(",");

const ProjectAssetsEditor = ({ assets, onChange, userId, folder, projectId, tier = "free" }: Props) => {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [fileLabel, setFileLabel] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const atLimit = assets.length >= PROJECT_ASSETS_MAX;

  const addLink = () => {
    const trimmedUrl = url.trim();
    const trimmedLabel = label.trim();
    if (!trimmedUrl) {
      toast.error("กรุณาใส่ URL");
      return;
    }
    const safe = safeHttpUrl(trimmedUrl.startsWith("http") ? trimmedUrl : `https://${trimmedUrl}`);
    if (!safe) {
      toast.error("รองรับเฉพาะลิงก์ http/https");
      return;
    }
    if (atLimit) {
      toast.error(`เพิ่มได้ไม่เกิน ${PROJECT_ASSETS_MAX} รายการ`);
      return;
    }

    let hostname = safe;
    try {
      hostname = new URL(safe).hostname;
    } catch {
      /* keep safe */
    }

    const draft = createProjectLinkAsset(trimmedLabel || hostname, safe);
    const scanned = applyScanResult(draft, evaluateProjectAssetOnAdd(draft));
    onChange([...assets, scanned]);
    setLabel("");
    setUrl("");

    if (scanned.scan_status === "blocked") {
      toast.error(scanned.scan_reason ?? "ลิงก์ไม่ผ่านการตรวจสอบ");
    } else if (scanned.scan_status === "pending") {
      toast.message("เพิ่มลิงก์แล้ว — กำลังตรวจสอบความปลอดภัย");
    }
  };

  const onPickFile = async (files: FileList | null) => {
    if (!files?.length || atLimit) return;
    const file = files[0];
    const name = fileLabel.trim() || file.name.replace(/\.[^.]+$/, "");
    if (!name.trim()) {
      toast.error("กรุณาตั้งชื่อไฟล์");
      return;
    }

    setUploading(true);
    try {
      const uploaded = await uploadProjectAssetFile(file, userId, folder, tier);
      const draft = createProjectFileAsset({ label: name.trim(), ...uploaded });
      const scanned = applyScanResult(draft, evaluateProjectAssetOnAdd(draft));
      onChange([...assets, scanned]);
      setFileLabel("");
      if (fileInputRef.current) fileInputRef.current.value = "";

      if (scanned.scan_status === "blocked") {
        toast.error(scanned.scan_reason ?? "ไฟล์ไม่ผ่านการตรวจสอบ");
      } else {
        toast.message("อัปโหลดแล้ว — กำลังตรวจสอบความปลอดภัย");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  };

  const removeAsset = (id: string) => {
    onChange(assets.filter((a) => a.id !== id));
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <Label className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
        <Paperclip className="w-3.5 h-3.5" />
        ไฟล์แนบ / ลิงก์
      </Label>

      {assets.length > 0 && (
        <ul className="space-y-2">
          {assets.map((asset) => {
            const href = projectAssetDownloadUrl(asset);
            const canOpen = asset.scan_status === "clean" && href;
            return (
              <li
                key={asset.id}
                className={cn(
                  "flex items-start gap-2 rounded-xl border px-3 py-2",
                  asset.scan_status === "blocked"
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-border/60 bg-muted/20",
                )}
              >
                {asset.kind === "file" ? (
                  <Paperclip className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" aria-hidden />
                ) : (
                  <ExternalLink className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" aria-hidden />
                )}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-medium text-foreground truncate">{asset.label}</p>
                    <ProjectAssetScanBadge status={asset.scan_status} variant="owner" />
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {asset.kind === "file"
                      ? asset.file_name ?? "ไฟล์แนบ"
                      : asset.url}
                  </p>
                  {asset.scan_reason && asset.scan_status !== "clean" && (
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      {asset.scan_reason}
                    </p>
                  )}
                  {canOpen && asset.kind === "link" && href && (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-primary hover:underline"
                    >
                      เปิดดู
                    </a>
                  )}
                  {canOpen && asset.kind === "file" && projectId && (
                    <button
                      type="button"
                      className="text-[10px] text-primary hover:underline"
                      onClick={() => {
                        void fetchProjectAssetDownloadUrl(projectId, asset).then((u) => {
                          if (u) window.open(u, "_blank", "noopener,noreferrer");
                        });
                      }}
                    >
                      ดาวน์โหลด
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeAsset(asset.id)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label={`ลบ ${asset.label}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="space-y-3 pt-1 border-t border-border/50">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase">ลิงก์ภายนอก</p>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="ชื่อลิงก์ เช่น Prototype, Figma"
          disabled={atLimit}
          maxLength={80}
        />
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addLink();
              }
            }}
            placeholder="https://..."
            disabled={atLimit}
            className="min-w-0"
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={!url.trim() || atLimit}
            onClick={addLink}
            aria-label="เพิ่มลิงก์"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase">แนบไฟล์</p>
        <Input
          value={fileLabel}
          onChange={(e) => setFileLabel(e.target.value)}
          placeholder="ชื่อไฟล์ เช่น Brand guideline, Font pack"
          disabled={atLimit || uploading}
          maxLength={80}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          disabled={atLimit || uploading}
          onChange={(e) => void onPickFile(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          className="w-full rounded-xl"
          disabled={atLimit || uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Paperclip className="w-4 h-4 mr-2" />
          )}
          {uploading ? "กำลังอัปโหลด..." : "เลือกไฟล์"}
        </Button>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          รองรับ PDF, ZIP, รูป, ฟอนต์ — สูงสุด 25 MB/ไฟล์
        </p>
      </div>

      <p className="text-[10px] text-muted-foreground">
        {assets.length}/{PROJECT_ASSETS_MAX} รายการ
      </p>
    </div>
  );
};

export default ProjectAssetsEditor;
