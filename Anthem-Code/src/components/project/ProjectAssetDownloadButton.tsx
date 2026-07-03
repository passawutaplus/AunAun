import { useState } from "react";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchProjectAssetDownloadUrl } from "@/lib/downloadProjectAsset";
import { projectAssetDownloadUrl, type ProjectAsset } from "@/lib/projectAssets";
import { cn } from "@/lib/utils";

type Props = {
  projectId: string;
  asset: ProjectAsset;
  className?: string;
};

const ProjectAssetDownloadButton = ({ projectId, asset, className }: Props) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (asset.scan_status !== "clean") return;

    if (asset.kind === "link") {
      const href = projectAssetDownloadUrl(asset);
      if (href) window.open(href, "_blank", "noopener,noreferrer");
      return;
    }

    setLoading(true);
    try {
      const url = await fetchProjectAssetDownloadUrl(projectId, asset);
      if (!url) {
        toast.error("ไม่สามารถดาวน์โหลดไฟล์ได้");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("ไม่สามารถดาวน์โหลดไฟล์ได้");
    } finally {
      setLoading(false);
    }
  };

  const Icon = asset.kind === "file" ? Download : ExternalLink;

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={loading}
      className={cn(
        "flex items-center gap-2 rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5 text-sm text-foreground hover:border-primary/40 hover:text-primary transition-colors w-full text-left",
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
