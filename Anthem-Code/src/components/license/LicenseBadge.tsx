import { Link } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getLicenseMeta, type LicenseType } from "@/lib/licenses";

interface Props {
  licenseType?: string | null;
  size?: "sm" | "md";
  className?: string;
  showLabel?: boolean;
}

const LicenseBadge = ({ licenseType, size = "sm", className, showLabel = true }: Props) => {
  const meta = getLicenseMeta(licenseType);
  const Icon = meta.icon;

  const badge = (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-sm",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        className,
      )}
    >
      <Icon className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      {showLabel && <span className="font-medium">{meta.shortLabel}</span>}
    </span>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            {badge}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs space-y-1">
          <p className="font-medium">{meta.shortLabel}</p>
          {meta.tooltipLines.map((line) => (
            <p key={line} className="text-muted-foreground">{line}</p>
          ))}
          <Link to="/legal/ip" className="text-primary hover:underline block pt-1">
            เรียนรู้เพิ่ม
          </Link>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default LicenseBadge;

export function LicenseBadgeInline({
  licenseType,
  className,
}: {
  licenseType?: string | null;
  className?: string;
}) {
  const meta = getLicenseMeta(licenseType);
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs text-foreground",
        className,
      )}
    >
      <Icon className="w-3.5 h-3.5 text-primary" />
      {meta.shortLabel}
    </span>
  );
}

export type { LicenseType };
