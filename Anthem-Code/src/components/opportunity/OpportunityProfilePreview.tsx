import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  OPPORTUNITY_AVAILABILITY,
  labelOpportunityType,
  type OpportunityStatusKey,
  type OpportunityTypeKey,
} from "@/lib/opportunity";

type Props = {
  status: OpportunityStatusKey;
  types: OpportunityTypeKey[];
  className?: string;
};

const OpportunityProfilePreview = ({ status, types, className }: Props) => {
  const availability = OPPORTUNITY_AVAILABILITY[status];
  const showAvailability = status !== "open_to_opportunities" || types.length === 0;

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-card/50 p-4 space-y-2",
        className,
      )}
    >
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        ตัวอย่างบนโปรไฟล์
      </p>
      <div className="flex flex-wrap gap-1.5 min-h-[28px] items-center">
        {showAvailability && (
          <Badge
            className={cn(
              "rounded-full text-xs font-normal border-0",
              status === "not_available"
                ? "bg-muted text-muted-foreground"
                : "bg-primary/15 text-primary",
            )}
          >
            {availability.chipLabel}
          </Badge>
        )}
        {types.map((t) => (
          <Badge
            key={t}
            className="rounded-full text-xs font-normal border-0 bg-primary/10 text-primary"
          >
            {labelOpportunityType(t)}
          </Badge>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {status === "not_available"
          ? "ปุ่มติดต่อจากผลงานจะถูกซ่อนชั่วคราว"
          : "ชิปเหล่านี้จะแสดงใต้ชื่อบนโปรไฟล์สาธารณะของคุณ"}
      </p>
    </div>
  );
};

export default OpportunityProfilePreview;
