import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CollabInviteActions = {
  canRespond: boolean;
  busy?: boolean;
  statusHint?: string | null;
  onAccept: () => void;
  onDecline: () => void;
};

type Props = {
  content: string;
  mine: boolean;
  actions?: CollabInviteActions | null;
};

const CollabInviteCard = ({ content, mine, actions }: Props) => {
  return (
    <div
      className={cn(
        "rounded-2xl border overflow-hidden shadow-sm min-w-[16rem] max-w-[22rem]",
        mine
          ? "border-white/25 bg-[hsl(var(--chat-collab))] text-white"
          : "border-[hsl(var(--chat-collab)/0.35)] bg-[hsl(var(--chat-collab-soft))] text-foreground",
      )}
    >
      <div
        className={cn(
          "px-3.5 py-2.5 text-base leading-relaxed whitespace-pre-wrap break-words",
          mine ? "rounded-br-md" : "rounded-bl-md",
        )}
      >
        {content}
      </div>
      {actions?.canRespond ? (
        <div className="flex gap-2 px-3 pb-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={actions.busy}
            className={cn(
              "flex-1 rounded-full",
              mine
                ? "border-white/40 bg-transparent text-white hover:bg-white/10"
                : "border-destructive/40 text-destructive hover:bg-destructive/10",
            )}
            onClick={actions.onDecline}
          >
            {actions.busy ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <X className="w-3.5 h-3.5 mr-1" />
            )}
            ยังไม่พร้อม
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={actions.busy}
            className={cn(
              "flex-1 rounded-full",
              mine
                ? "bg-white text-[hsl(var(--chat-collab))] hover:bg-white/90"
                : "bg-[hsl(var(--chat-collab))] text-white hover:opacity-90",
            )}
            onClick={actions.onAccept}
          >
            {actions.busy ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5 mr-1" />
            )}
            ตอบรับร่วมงาน
          </Button>
        </div>
      ) : actions?.statusHint ? (
        <p
          className={cn(
            "px-3 pb-2.5 text-[11px]",
            mine ? "text-white/80" : "text-muted-foreground",
          )}
        >
          {actions.statusHint}
        </p>
      ) : null}
    </div>
  );
};

export default CollabInviteCard;
