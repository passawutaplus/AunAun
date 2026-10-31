import { FlaskConical, Sparkles } from "lucide-react";
import { useBetaBadge } from "@/hooks/useBetaBadge";
import { betaBadgeLabel } from "@/lib/betaBadge";
import { cn } from "@/lib/utils";

/** Small Beta contributor badge shown next to a profile name. Renders nothing until earned. */
export default function BetaBadgeChip({ userId, className }: { userId: string | null | undefined; className?: string }) {
  const { data } = useBetaBadge(userId);
  const label = betaBadgeLabel(data);
  if (!label) return null;
  const Icon = data?.co_creator ? Sparkles : FlaskConical;
  return (
    <span
      title={`${label} — ช่วยพัฒนา SAMECOR ช่วง Beta`}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary",
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}
