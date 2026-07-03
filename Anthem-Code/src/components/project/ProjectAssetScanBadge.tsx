import { Clock, ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ProjectAssetScanStatus } from "@/lib/projectAssets";

type Props = {
  status: ProjectAssetScanStatus;
  /** public = copy for visitors; owner = editor / owner view */
  variant?: "public" | "owner";
};

const ProjectAssetScanBadge = ({ status, variant = "public" }: Props) => {
  if (variant === "public" && status !== "clean") return null;

  if (status === "clean") {
    const label = variant === "public" ? "ปลอดภัย" : "ผ่าน";
    const title = variant === "public" ? "ผ่านการตรวจสอบความปลอดภัยแล้ว" : undefined;
    return (
      <Badge
        variant="outline"
        title={title}
        className="text-[10px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400 gap-1 shrink-0 font-medium"
      >
        <ShieldCheck className="w-3 h-3" aria-hidden />
        {label}
      </Badge>
    );
  }

  if (status === "blocked") {
    return (
      <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive gap-1 shrink-0">
        <ShieldAlert className="w-3 h-3" aria-hidden />
        ไม่ผ่าน
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600 gap-1 shrink-0">
      <Clock className="w-3 h-3" aria-hidden />
      กำลังตรวจสอบ
    </Badge>
  );
};

export default ProjectAssetScanBadge;
