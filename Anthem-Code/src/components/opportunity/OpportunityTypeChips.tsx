import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  OPPORTUNITY_AVAILABILITY,
  labelOpportunityType,
  normalizeOpportunityNote,
  normalizeOpportunityProfile,
} from "@/lib/opportunity";

type Props = {
  status?: string | null;
  types?: string[] | null;
  note?: string | null;
  className?: string;
  size?: "sm" | "md";
};

const OpportunityTypeChips = ({ status, types, note, className, size = "sm" }: Props) => {
  const normalized = normalizeOpportunityProfile(status, types);
  const trimmedNote = normalizeOpportunityNote(note);
  const badgeClass =
    size === "sm"
      ? "rounded-full text-xs font-normal border-0"
      : "rounded-full text-sm font-normal border-0";

  const showAvailability =
    normalized.status !== "open_to_opportunities" || normalized.types.length === 0;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex flex-wrap gap-1.5">
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
      {trimmedNote && normalized.status !== "not_available" && (
        <p
          className={cn(
            "text-muted-foreground leading-snug",
            size === "md" ? "text-sm" : "text-xs",
          )}
        >
          {trimmedNote}
        </p>
      )}
    </div>
  );
};

export default OpportunityTypeChips;
