import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  size?: "sm" | "md";
};

const BoostBadge = ({ className, size = "sm" }: Props) => (
  <span
    className={cn(
      "inline-flex items-center gap-0.5 rounded-full font-medium bg-amber-500/90 text-white shadow-sm",
      size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
      className,
    )}
  >
    <Zap className={cn(size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3")} />
    Boosted
  </span>
);

export default BoostBadge;
