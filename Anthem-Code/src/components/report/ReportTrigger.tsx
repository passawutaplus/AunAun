import { Flag } from "lucide-react";
import ReportDialog from "@/components/report/ReportDialog";
import type { ReportTargetType } from "@/hooks/useReports";
import { cn } from "@/lib/utils";

interface Props {
  targetType: ReportTargetType;
  targetId: string;
  targetOwnerId?: string | null;
  /** icon = ธงเล็กอย่างเดียว, text = ธง + คำว่ารายงาน */
  variant?: "icon" | "text";
  label?: string;
  className?: string;
}

const ReportTrigger = ({
  targetType,
  targetId,
  targetOwnerId,
  variant = "icon",
  label = "รายงาน",
  className,
}: Props) => (
  <ReportDialog targetType={targetType} targetId={targetId} targetOwnerId={targetOwnerId}>
    <button
      type="button"
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1 shrink-0 text-muted-foreground/50 hover:text-destructive/80 transition-colors",
        variant === "icon" && "p-0.5 rounded-md hover:bg-muted/30",
        variant === "text" && "text-[10px]",
        className,
      )}
    >
      <Flag className={variant === "icon" ? "w-3 h-3" : "w-2.5 h-2.5"} />
      {variant === "text" && <span>{label}</span>}
    </button>
  </ReportDialog>
);

export default ReportTrigger;
