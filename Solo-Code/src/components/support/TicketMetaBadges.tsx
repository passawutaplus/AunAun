import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SOURCE_LABELS, type TicketSource } from "@/lib/ticketSchema";
import { cn } from "@/lib/utils";

export function TicketRatingStars({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3 w-3",
            i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30",
          )}
        />
      ))}
      <span className="text-[10px] font-medium text-muted-foreground ml-0.5">{rating}/5</span>
    </span>
  );
}

export function TicketSourceBadge({ source }: { source: TicketSource }) {
  const isFeedback = source === "feedback_button";
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[9px] h-5 px-1.5",
        isFeedback ? "border-primary/40 bg-primary/10 text-primary" : "text-muted-foreground",
      )}
    >
      {SOURCE_LABELS[source]}
    </Badge>
  );
}

export function TicketFeatureBadge({ feature }: { feature: string }) {
  return (
    <Badge variant="secondary" className="text-[9px] h-5 px-1.5 font-normal">
      {feature}
    </Badge>
  );
}
