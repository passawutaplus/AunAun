import { Loader2, MessageCircle, ThumbsUp, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatCardShell, ChatCardStatus } from "@/components/chat/ChatCardShell";
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
  mine?: boolean;
  actions?: HireRejectChoiceActions | null;
};

const HireRejectChoiceCard = ({ payload, actions }: Props) => {
  const body = [payload.reasonLabel, payload.note?.trim()].filter(Boolean).join("\n\n");

  return (
    <ChatCardShell
      tone="danger"
      icon={XCircle}
      title="ไม่สนใจคำขอจ้าง"
      footer={
        actions?.canRespond ? (
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              size="sm"
              disabled={actions.busy}
              className="w-full rounded-full h-auto py-2 whitespace-normal text-left justify-start bg-[hsl(var(--chat-hire))] text-white hover:opacity-90"
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
                "border-[hsl(var(--chat-hire)/0.45)] text-foreground hover:bg-[hsl(var(--chat-hire-soft))]",
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
          <ChatCardStatus>{actions.statusHint}</ChatCardStatus>
        ) : null
      }
    >
      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{body}</p>
    </ChatCardShell>
  );
};

export default HireRejectChoiceCard;
