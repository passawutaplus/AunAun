import { Check, Handshake, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ChatCardShell,
  ChatCardStatus,
  CHAT_CARD_DECLINE_LABEL,
} from "@/components/chat/ChatCardShell";
import { CollabInviteFieldList } from "@/components/collab/CollabInviteFieldList";
import ProjectReferencePreview from "@/components/opportunity/ProjectReferencePreview";
import { collabInviteDisplay } from "@/lib/collabBrief";
import { safeHttpUrl } from "@/lib/safeUrl";
import { cn } from "@/lib/utils";

export type CollabInviteActions = {
  canRespond: boolean;
  busy?: boolean;
  statusHint?: string | null;
  onAccept: () => void;
  onDecline: () => void;
};

export type CollabInviteRef = {
  projectTitle?: string | null;
  projectCoverUrl?: string | null;
  projectId?: string | null;
  extraProjects?: { id: string; title: string; coverUrl: string | null }[];
  collabTypesLabel?: string | null;
  links?: string[];
  attachments?: string[];
  personalMessage?: string | null;
  otherTypeNote?: string | null;
  collabTypes?: string[] | null;
  externalDriveUrl?: string | null;
  websiteUrl?: string | null;
};

type Props = {
  content: string;
  mine: boolean;
  actions?: CollabInviteActions | null;
  inviteRef?: CollabInviteRef | null;
};

const EMPTY = "-";

/** Collab request document card — same fields as the collab popup. */
const CollabInviteCard = ({ content, mine, actions, inviteRef }: Props) => {
  const brief = collabInviteDisplay({
    message: content,
    collab_types: inviteRef?.collabTypes,
    other_type_note: inviteRef?.otherTypeNote,
    external_drive_url: inviteRef?.externalDriveUrl,
    website_url: inviteRef?.websiteUrl,
    project_title: inviteRef?.projectTitle,
    project_cover_url: inviteRef?.projectCoverUrl,
    project_id: inviteRef?.projectId,
    attachment_urls: inviteRef?.attachments,
  });
  const title = (inviteRef?.projectTitle ?? brief.projectTitle ?? "").trim();
  const cover =
    safeHttpUrl(inviteRef?.projectCoverUrl) ?? safeHttpUrl(brief.projectCoverUrl) ?? null;
  const projectId = inviteRef?.projectId || brief.projectId;
  const extra = (inviteRef?.extraProjects ?? []).filter((p) => p.id !== projectId);
  const personal = inviteRef?.personalMessage ?? brief.personalMessage;

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
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <X className="mr-1 h-3.5 w-3.5" />
              )}
              {CHAT_CARD_DECLINE_LABEL}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={actions.busy}
              className="flex-1 rounded-full bg-[hsl(var(--chat-collab))] text-[hsl(var(--chat-collab-foreground))] hover:opacity-90"
              onClick={actions.onAccept}
            >
              {actions.busy ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="mr-1 h-3.5 w-3.5" />
              )}
              ยอมรับ
            </Button>
          </div>
        ) : actions?.statusHint ? (
          <ChatCardStatus>{actions.statusHint}</ChatCardStatus>
        ) : null
      }
    >
      {title ? (
        <ProjectReferencePreview
          title={title}
          coverUrl={cover}
          label="อ้างอิงผลงานของฉัน"
          to={projectId ? `/project/${projectId}` : null}
        />
      ) : (
        <p className="text-sm">
          <span className="text-muted-foreground">อ้างอิงผลงานของฉัน: </span>
          <span className="text-muted-foreground">{EMPTY}</span>
        </p>
      )}
      {extra.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {extra.map((p) => (
            <ProjectReferencePreview
              key={p.id}
              compact
              title={p.title}
              coverUrl={p.coverUrl}
              label="ผลงานของฉัน"
              to={`/project/${p.id}`}
            />
          ))}
        </div>
      ) : null}

      <CollabInviteFieldList
        className="mt-2"
        collabTypesLabel={brief.collabTypesLabel}
        links={inviteRef?.links?.length ? inviteRef.links : brief.links}
        attachments={brief.attachments}
        personalMessage={personal}
      />

      <p className="mt-2 text-[10px] text-muted-foreground">
        ไม่ใช่การจ้างงาน — ถ้ายอมรับจะได้เอกสารแผนคอลแลปเป็นแนวทางทำงานร่วมกัน
      </p>
    </ChatCardShell>
  );
};

export default CollabInviteCard;
