import { BadgeCheck } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const VERIFIED_BADGE_LABEL = "ยืนยันตัวตนแล้ว";

type Props = {
  verified?: boolean | null;
  size?: "sm" | "md";
  className?: string;
};

/** Orange checkmark after a creator name. Hidden when not verified. */
export default function VerifiedBadge({ verified, size = "md", className }: Props) {
  if (!verified) return null;

  const iconClass = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]";

  return (
    <Tooltip delayDuration={180}>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          role="img"
          aria-label={VERIFIED_BADGE_LABEL}
          className={cn(
            "inline-flex shrink-0 rounded-full align-middle outline-none",
            "focus-visible:ring-2 focus-visible:ring-primary/40",
            className,
          )}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <BadgeCheck
            className={cn(iconClass, "text-[hsl(14_100%_55%)] fill-[hsl(14_100%_55%)]/25")}
            aria-hidden
          />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {VERIFIED_BADGE_LABEL}
      </TooltipContent>
    </Tooltip>
  );
}
