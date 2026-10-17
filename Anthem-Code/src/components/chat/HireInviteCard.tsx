import { Check, Link2, Loader2, X } from "lucide-react";
import BriefIcon from "@/components/icons/BriefIcon";
import { Button } from "@/components/ui/button";
import {
  ChatCardRows,
  ChatCardShell,
  ChatCardStatus,
  CHAT_CARD_DECLINE_BTN,
  CHAT_CARD_DECLINE_LABEL,
  CHAT_CARD_PRIMARY_BTN,
} from "@/components/chat/ChatCardShell";
import ProjectReferencePreview from "@/components/opportunity/ProjectReferencePreview";
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


const HireInviteCard = ({ content, actions, projectTitle, projectCoverUrl }: Props) => {
  const brief = hireInviteDisplay({ message: content });
  const title = (projectTitle ?? brief.projectTitle ?? "").trim();
  const cover =
    safeHttpUrl(projectCoverUrl) ?? safeHttpUrl(brief.projectCoverUrl) ?? null;
  const links = (brief.links ?? []).map((u) => safeHttpUrl(u)).filter((u): u is string => !!u);
  const attachments = (brief.attachments ?? []).map((u) => safeHttpUrl(u)).filter((u): u is string => !!u);

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
      {title ? <ProjectReferencePreview title={title} coverUrl={cover} label="อ้างอิงผลงาน" /> : null}

      <ChatCardRows
        rows={[
          { label: "ประเภทงาน", value: brief.jobTypesLabel?.trim() || "—" },
          { label: "กำหนดส่ง", value: brief.deadlineLabel?.trim() || "ยังไม่ระบุ" },
          { label: "งบประมาณ", value: brief.budgetLabel?.trim() || "คุยในแชท" },
          { label: "ไฟล์แนบ", value: attachments.length ? `${attachments.length} ไฟล์` : null },
        ]}
      />

      {brief.details?.trim() ? (
        <>
          <div className="border-t border-dashed border-border" aria-hidden />
          <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground/90">{brief.details.trim()}</p>
        </>
      ) : null}

      {links.length || attachments.length ? (
        <div className="space-y-2">
          {links.length ? (
            <div className="flex flex-wrap gap-1.5">
              {links.map((url, i) => (
                <a
                  key={`${url}-${i}`}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] hover:border-primary/40"
                >
                  <Link2 className="h-3 w-3 shrink-0 text-[hsl(var(--chat-hire))]" aria-hidden />
                  <span className="truncate">{url.replace(/^https?:\/\//, "")}</span>
                </a>
              ))}
            </div>
          ) : null}
          {attachments.length ? (
            <div className="flex flex-wrap gap-1.5">
              {attachments.map((url, i) => (
                <a key={`${url}-${i}`} href={url} target="_blank" rel="noopener noreferrer" className="block h-12 w-12 overflow-hidden rounded-md border border-border">
                  <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
                </a>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </ChatCardShell>
  );
};

export default HireInviteCard;
