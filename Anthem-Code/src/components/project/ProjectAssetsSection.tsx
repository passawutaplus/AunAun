import { useState } from "react";
import { ChevronDown, ExternalLink, Paperclip } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ProjectAssetScanBadge from "@/components/project/ProjectAssetScanBadge";
import {
  filterPublicProjectAssets,
  type ProjectAsset,
} from "@/lib/projectAssets";
import ProjectAssetDownloadButton from "@/components/project/ProjectAssetDownloadButton";
import { cn } from "@/lib/utils";

type Props = {
  projectId: string;
  assets: ProjectAsset[];
  isOwner?: boolean;
};

function assetCountLabel(count: number): string {
  if (count === 1) return "1 รายการ";
  return `${count} รายการ`;
}

const ProjectAssetsSection = ({ projectId, assets, isOwner }: Props) => {
  const [open, setOpen] = useState(false);
  const visible = isOwner ? assets : filterPublicProjectAssets(assets);
  if (visible.length === 0) return null;

  const sectionStatus = visible.some((a) => a.scan_status === "pending")
    ? "pending"
    : visible.some((a) => a.scan_status === "blocked")
      ? "blocked"
      : "clean";

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <section className="rounded-2xl glass-panel overflow-hidden">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-muted/20 transition-colors"
            aria-expanded={open}
            aria-label={open ? "ย่อไฟล์แนบและลิงก์" : "ดูไฟล์แนบและลิงก์"}
          >
            <div className="min-w-0 space-y-0.5">
              <h3 className="text-sm font-medium text-foreground">ไฟล์แนบ / ลิงก์</h3>
              {!open && (
                <p className="text-[11px] text-muted-foreground">
                  {assetCountLabel(visible.length)} — กดเพื่อดู
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <ProjectAssetScanBadge
                status={sectionStatus}
                variant={sectionStatus === "clean" ? "public" : "owner"}
              />
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform duration-200",
                  open && "rotate-180",
                )}
                aria-hidden
              />
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <ul className="space-y-2 px-5 pb-5 border-t border-border/50 pt-3">
            {visible.map((asset) => {
              const canOpen = asset.scan_status === "clean";
              const Icon = asset.kind === "file" ? Paperclip : ExternalLink;

              if (!isOwner && !canOpen) return null;

              return (
                <li key={asset.id}>
                  {canOpen ? (
                    <ProjectAssetDownloadButton projectId={projectId} asset={asset} />
                  ) : (
                    <div className="flex items-start gap-2 rounded-xl border border-border/50 bg-muted/10 px-3 py-2.5 text-sm opacity-80">
                      <Icon className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{asset.label}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {asset.scan_status === "pending"
                            ? "กำลังตรวจสอบความปลอดภัย"
                            : (asset.scan_reason ?? "ไม่ผ่านการตรวจสอบ")}
                        </p>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
};

export default ProjectAssetsSection;
