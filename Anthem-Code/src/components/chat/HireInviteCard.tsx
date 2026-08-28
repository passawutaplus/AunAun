import { Check, Loader2, X } from "lucide-react";
import BriefIcon from "@/components/icons/BriefIcon";
import { Button } from "@/components/ui/button";
import {
  ChatCardShell,
  ChatCardStatus,
  CHAT_CARD_DECLINE_BTN,
  CHAT_CARD_DECLINE_LABEL,
  CHAT_CARD_PRIMARY_BTN,
} from "@/components/chat/ChatCardShell";
import ProjectReferencePreview from "@/components/opportunity/ProjectReferencePreview";
import { HireInviteFieldList } from "@/components/hiring/HireInviteFieldList";
import { hireInviteDisplay } from "@/lib/hireBrief";
import { safeHttpUrl } from "@/lib/safeUrl";

export type HireInviteActions = {
  canRespond: boolean;
  busy?: boolean;
  statusHint?: string | null;
  onAccept: () => void;
  onDecline: () => void;
};

type Props = {
  content: string;
  mine?: boolean;
  actions?: HireInviteActions | null;
  projectTitle?: string | null;
  projectCoverUrl?: string | null;
};

const EMPTY = "-";

const HireInviteCard = ({ content, actions, projectTitle, projectCoverUrl }: Props) => {
  const brief = hireInviteDisplay({ message: content });
  const title = (projectTitle ?? brief.projectTitle ?? "").trim();
  const cover =
    safeHttpUrl(projectCoverUrl) ?? safeHttpUrl(brief.projectCoverUrl) ?? null;

  return (
    <ChatCardShell
      tone="hire"
      icon={BriefIcon}
      title="คำขอจ้างงาน"
      footer={
        <div className="space-y-2">
          <ChatCardStatus>{actions?.statusHint || "ดูรายละเอียดต่อได้"}</ChatCardStatus>
          {actions?.canRespond ? (
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
                {CHAT_CARD_DECLINE_LABEL}
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
          ) : null}
        </div>
      }
    >
      {title ? (
        <ProjectReferencePreview title={title} coverUrl={cover} label="อ้างอิงผลงาน" />
      ) : (
        <p className="text-sm">
          <span className="text-muted-foreground">อ้างอิงผลงาน: </span>
          <span className="text-muted-foreground">{EMPTY}</span>
        </p>
      )}

      <HireInviteFieldList
        jobTypesLabel={brief.jobTypesLabel}
        details={brief.details}
        links={brief.links}
        attachments={brief.attachments}
        budgetLabel={brief.budgetLabel}
        deadlineLabel={brief.deadlineLabel}
      />
    </ChatCardShell>
  );
};

export default HireInviteCard;
