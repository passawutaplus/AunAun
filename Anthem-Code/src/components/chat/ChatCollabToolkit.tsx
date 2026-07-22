import { Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCollabPlanUi } from "@/stores/collabPlanUiStore";
import { cn } from "@/lib/utils";

type Props = {
  conversationId: string;
  className?: string;
  compact?: boolean;
};

/** Opens the shared collab plan document (sheet lives on ChatThreadView). */
export function ChatCollabToolkit({
  conversationId,
  className,
  compact = false,
}: Props) {
  const openFor = useCollabPlanUi((s) => s.openFor);

  return (
    <div className={cn("flex items-center", className)}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => openFor(conversationId)}
        className={cn(
          "collab-plan-btn h-8 shrink-0 rounded-full text-xs px-3",
          "border-[hsl(var(--chat-collab)/0.7)] bg-transparent text-[hsl(var(--chat-collab))]",
          "hover:bg-[hsl(var(--chat-collab))] hover:text-white hover:border-[hsl(var(--chat-collab))]",
          "transition-colors duration-200",
          compact && "h-7 text-[11px] px-2.5",
        )}
        aria-label="วางแผนงาน"
      >
        <Handshake className="w-3.5 h-3.5 mr-1.5" />
        วางแผนงาน
      </Button>
    </div>
  );
}
