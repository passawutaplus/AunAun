import { Loader2, MessageCircle, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HireRejectChoicePayload } from "@/lib/hireRejectChat";
import {
  HIRE_CLIENT_ACCEPT_REJECT_TEXT,
  HIRE_CLIENT_ASK_CONTINUE_TEXT,
} from "@/lib/hireRejectChat";

export type HireRejectChoiceActions = {
  canRespond: boolean;
  busy?: boolean;
  statusHint?: string | null;
  onAcceptClose: () => void;
  onAskContinue: () => void;
};

type Props = {
  payload: HireRejectChoicePayload;
  mine: boolean;
  actions?: HireRejectChoiceActions | null;
};

const HireRejectChoiceCard = ({ payload, mine, actions }: Props) => {
  const body = [payload.reasonLabel, payload.note?.trim()].filter(Boolean).join("\n\n");

  return (
    <div
      className={cn(
        "rounded-2xl border overflow-hidden shadow-sm min-w-[16rem] max-w-[22rem]",
        mine
          ? "border-white/25 bg-[hsl(var(--chat-hire))] text-white"
          : "border-[hsl(var(--chat-hire)/0.35)] bg-[hsl(var(--chat-hire-soft))] text-foreground",
      )}
    >
      <div className="px-3.5 pt-3 pb-1">
        <p className={cn("text-[11px] font-medium", mine ? "text-white/80" : "text-muted-foreground")}>
          ปฏิเสธคำขอจ้าง
        </p>
      </div>
      <div
        className={cn(
          "px-3.5 pb-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words",
        )}
      >
        {body}
      </div>
      {actions?.canRespond ? (
        <div className="flex flex-col gap-2 px-3 pb-3">
          <Button
            type="button"
            size="sm"
            disabled={actions.busy}
            className={cn(
              "w-full rounded-full h-auto py-2 whitespace-normal text-left justify-start",
              mine
                ? "bg-white text-[hsl(var(--chat-hire))] hover:bg-white/90"
                : "bg-[hsl(var(--chat-hire))] text-white hover:opacity-90",
            )}
            onClick={actions.onAcceptClose}
          >
            {actions.busy ? (
              <Loader2 className="w-3.5 h-3.5 mr-2 shrink-0 animate-spin" />
            ) : (
              <ThumbsUp className="w-3.5 h-3.5 mr-2 shrink-0" />
            )}
            <span className="text-xs leading-snug">{HIRE_CLIENT_ACCEPT_REJECT_TEXT}</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={actions.busy}
            className={cn(
              "w-full rounded-full h-auto py-2 whitespace-normal text-left justify-start",
              mine
                ? "border-white/40 bg-transparent text-white hover:bg-white/10"
                : "border-[hsl(var(--chat-hire)/0.45)] text-foreground hover:bg-[hsl(var(--chat-hire-soft))]",
            )}
            onClick={actions.onAskContinue}
          >
            {actions.busy ? (
              <Loader2 className="w-3.5 h-3.5 mr-2 shrink-0 animate-spin" />
            ) : (
              <MessageCircle className="w-3.5 h-3.5 mr-2 shrink-0" />
            )}
            <span className="text-xs leading-snug">{HIRE_CLIENT_ASK_CONTINUE_TEXT}</span>
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

export default HireRejectChoiceCard;
