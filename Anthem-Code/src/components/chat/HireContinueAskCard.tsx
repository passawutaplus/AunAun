import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HireContinueAskPayload } from "@/lib/hireRejectChat";
import { HIRE_CLIENT_ASK_CONTINUE_TEXT } from "@/lib/hireRejectChat";

export type HireContinueAskActions = {
  canRespond: boolean;
  busy?: boolean;
  statusHint?: string | null;
  onAccept: () => void;
  onDecline: () => void;
};

type Props = {
  payload: HireContinueAskPayload;
  mine: boolean;
  actions?: HireContinueAskActions | null;
};

const HireContinueAskCard = ({ mine, actions }: Props) => {
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
          ผู้จ้างขอคุยต่อ
        </p>
      </div>
      <div className="px-3.5 pb-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words">
        {HIRE_CLIENT_ASK_CONTINUE_TEXT}
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
            {actions.busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <X className="w-3.5 h-3.5 mr-1" />}
            ปฏิเสธ
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={actions.busy}
            className={cn(
              "flex-1 rounded-full",
              mine
                ? "bg-white text-[hsl(var(--chat-hire))] hover:bg-white/90"
                : "bg-[hsl(var(--chat-hire))] text-white hover:opacity-90",
            )}
            onClick={actions.onAccept}
          >
            {actions.busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
            ยอมรับ
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

export default HireContinueAskCard;
