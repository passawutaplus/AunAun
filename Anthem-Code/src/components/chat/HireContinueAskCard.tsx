import { Check, Loader2, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ChatCardShell,
  ChatCardStatus,
  CHAT_CARD_DECLINE_BTN,
  CHAT_CARD_PRIMARY_BTN,
} from "@/components/chat/ChatCardShell";
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
  mine?: boolean;
  actions?: HireContinueAskActions | null;
};

const HireContinueAskCard = ({ actions }: Props) => {
  return (
    <ChatCardShell
      tone="hire"
      icon={MessageCircle}
      title="ผู้จ้างขอคุยต่อ"
      footer={
        actions?.canRespond ? (
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={actions.busy}
              className={CHAT_CARD_DECLINE_BTN}
              onClick={actions.onDecline}
            >
              {actions.busy ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : (
                <X className="w-3.5 h-3.5 mr-1" />
              )}
              ปฏิเสธ
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={actions.busy}
              className={CHAT_CARD_PRIMARY_BTN}
              onClick={actions.onAccept}
            >
              {actions.busy ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5 mr-1" />
              )}
              ยอมรับ
            </Button>
          </div>
        ) : actions?.statusHint ? (
          <ChatCardStatus>{actions.statusHint}</ChatCardStatus>
        ) : null
      }
    >
      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
        {HIRE_CLIENT_ASK_CONTINUE_TEXT}
      </p>
    </ChatCardShell>
  );
};

export default HireContinueAskCard;
