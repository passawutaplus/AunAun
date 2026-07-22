import { Check, Handshake, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ChatCardShell,
  ChatCardStatus,
  CHAT_CARD_DECLINE_LABEL,
} from "@/components/chat/ChatCardShell";
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

/** Collab request document card — same layout as hire invite (structured brief + sender status). */
const CollabInviteCard = ({ content, mine, actions }: Props) => {
  return (
    <ChatCardShell
      tone="collab"
      icon={Handshake}
      title="คำขอคอลแลป"
      meta={mine ? "ส่งแล้ว" : actions?.canRespond ? "รอคุณตอบ" : "รอตอบ"}
      className={cn(mine && "ring-1 ring-[hsl(var(--chat-collab)/0.25)]")}
      footer={
        actions?.canRespond ? (
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={actions.busy}
              className="flex-1 rounded-full border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={actions.onDecline}
            >
              {actions.busy ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : (
                <X className="w-3.5 h-3.5 mr-1" />
              )}
              {CHAT_CARD_DECLINE_LABEL}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={actions.busy}
              className="flex-1 rounded-full bg-[hsl(var(--chat-collab))] text-white hover:opacity-90"
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
      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-foreground">
        {content}
      </p>
      <p className="text-[10px] text-muted-foreground mt-2">
        ไม่ใช่การจ้างงาน — ถ้ายอมรับจะได้เอกสารแผนคอลแลปเป็นแนวทางทำงานร่วมกัน
      </p>
    </ChatCardShell>
  );
};

export default CollabInviteCard;
