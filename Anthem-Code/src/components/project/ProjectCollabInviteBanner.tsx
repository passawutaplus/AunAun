import { Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMyPendingCollabInvite, useRespondProjectCollabInvite } from "@/hooks/useProjectCollabInvites";

type Props = {
  projectId: string;
  ownerName: string;
};

/** Shown to someone tagged on this work who has not answered yet. */
export default function ProjectCollabInviteBanner({ projectId, ownerName }: Props) {
  const { data: invite } = useMyPendingCollabInvite(projectId);
  const respond = useRespondProjectCollabInvite();
  if (!invite) return null;

  return (
    <div
      role="region"
      aria-label="คำเชิญร่วมงานในผลงานนี้"
      className="mb-4 flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <Handshake className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div>
          <p className="text-sm font-medium text-foreground">{ownerName} แท็กคุณเป็นผู้ร่วมงานในผลงานนี้</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            กดยอมรับแล้วชื่อคุณจะขึ้นในผลงาน ถ้าปฏิเสธ ผลงานยังเผยแพร่ตามปกติแต่จะไม่มีชื่อคุณ
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          type="button"
          size="sm"
          className="h-9 rounded-full"
          disabled={respond.isPending}
          onClick={() => respond.mutate({ inviteId: invite.id, accept: true })}
        >
          ยอมรับ
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 rounded-full"
          disabled={respond.isPending}
          onClick={() => respond.mutate({ inviteId: invite.id, accept: false })}
        >
          ปฏิเสธ
        </Button>
      </div>
    </div>
  );
}
