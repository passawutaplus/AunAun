import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  OPPORTUNITY_AVAILABILITY,
  labelOpportunityType,
  normalizeOpportunityProfile,
} from "@/lib/opportunity";

type Props = {
  status?: string | null;
  types?: string[] | null;
  /** @deprecated Note no longer shown on profile. Kept for call-site compat. */
  note?: string | null;
  className?: string;
  size?: "sm" | "md";
  /** "line" = one status line with a dot (profile header), "chips" = badge per type. */
  variant?: "chips" | "line";
};

const OpportunityTypeChips = ({ status, types, className, size = "sm", variant = "chips" }: Props) => {
  const normalized = normalizeOpportunityProfile(status, types);

  if (variant === "line") {
    const closed = normalized.status === "not_available";
    const text =
      closed || normalized.types.length === 0
        ? OPPORTUNITY_AVAILABILITY[normalized.status].chipLabel
        : normalized.types.map(labelOpportunityType).join(" · ");
    return (
      <p
        className={cn(
          "flex items-center gap-2 text-sm",
          closed ? "text-muted-foreground" : "text-foreground",
          className,
        )}
      >
        <span
          aria-hidden
          className={cn(
            "relative inline-flex h-2 w-2 shrink-0 rounded-full",
            closed ? "bg-muted-foreground/60" : normalized.status === "soft_open" ? "bg-amber-400" : "bg-emerald-500",
          )}
        />
        <span className="min-w-0">{text}</span>
      </p>
    );
  }
  const badgeClass =
    size === "sm"
      ? "rounded-full text-xs font-normal border-0"
      : "rounded-full text-sm font-normal border-0";

  const showAvailability =
    normalized.status !== "open_to_opportunities" || normalized.types.length === 0;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {showAvailability && (
        <Badge
          className={cn(
            badgeClass,
            normalized.status === "not_available"
              ? "bg-muted text-muted-foreground"
              : "bg-primary/15 text-primary",
          )}
        >
          {OPPORTUNITY_AVAILABILITY[normalized.status].chipLabel}
        </Badge>
      )}
      {normalized.types.map((t) => (
        <Badge key={t} className={cn(badgeClass, "bg-primary/10 text-primary")}>
          {labelOpportunityType(t)}
        </Badge>
      ))}
    </div>
  );
};

export default OpportunityTypeChips;
