import { useState } from "react";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { resolveProjectAssetForOpen } from "@/lib/downloadProjectAsset";
import { assertProjectAssetSafeToOpen } from "@/lib/projectAssetScan";
import type { ProjectAsset } from "@/lib/projectAssets";
import { openSafeExternalUrl } from "@/lib/safeUrl";
import { cn } from "@/lib/utils";

type Props = {
  projectId: string;
  asset: ProjectAsset;
  className?: string;
};

const ProjectAssetDownloadButton = ({ projectId, asset, className }: Props) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    const localGate = assertProjectAssetSafeToOpen(asset);
    if (!localGate.ok) {
      toast.error(localGate.reason);
      return;
    }

    setLoading(true);
    try {
      const resolved = await resolveProjectAssetForOpen(projectId, asset);
      if (!resolved.ok) {
        toast.error(resolved.reason);
        return;
      }

      if (!openSafeExternalUrl(resolved.url)) {
        toast.error(
          asset.kind === "link"
            ? "ลิงก์นี้ไม่ปลอดภัยหรือเปิดไม่ได้"
            : "ไม่สามารถดาวน์โหลดไฟล์ได้",
        );
      }
    } catch {
      toast.error(
        asset.kind === "link"
          ? "ไม่สามารถเปิดลิงก์ได้"
          : "ไม่สามารถดาวน์โหลดไฟล์ได้",
      );
    } finally {
      setLoading(false);
    }
  };

  const Icon = asset.kind === "file" ? Download : ExternalLink;
  const blocked = asset.scan_status !== "clean";

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={loading || blocked}
      className={cn(
        "flex items-center gap-2 rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5 text-sm text-foreground hover:border-primary/40 hover:text-primary transition-colors w-full text-left",
        (loading || blocked) && "opacity-60 cursor-not-allowed",
        className,
      )}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 shrink-0 animate-spin" aria-hidden />
      ) : (
        <Icon className="w-4 h-4 shrink-0" aria-hidden />
      )}
      <span className="truncate font-medium flex-1 min-w-0">{asset.label}</span>
      {asset.kind === "file" && !loading && (
        <Download className="w-3.5 h-3.5 shrink-0 opacity-60" aria-hidden />
      )}
    </button>
  );
};

export default ProjectAssetDownloadButton;
