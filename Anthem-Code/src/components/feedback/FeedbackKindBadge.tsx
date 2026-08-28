import { cn } from "@/lib/utils";
import { feedbackKindLabel, isFeedbackKind } from "@/lib/feedbackTicket";

const TONE: Record<string, string> = {
  bug: "bg-red-500/10 text-red-700 border-red-500/30",
  idea: "bg-primary/10 text-primary border-primary/30",
  error: "bg-red-700/15 text-red-800 border-red-700/40",
};

export default function FeedbackKindBadge({ kind }: { kind: string | null | undefined }) {
  const label = feedbackKindLabel(kind);
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium",
        isFeedbackKind(kind) ? TONE[kind] : "bg-muted text-muted-foreground border-border",
      )}
    >
      {label}
    </span>
  );
}
