import { Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useMyPendingCollabInvite,
  useRespondProjectCollabInvite,
  useWithdrawProjectCollab,
} from "@/hooks/useProjectCollabInvites";

type Props = {
  projectId: string;
  ownerName: string;
  /** Signed-in user is already credited on this work. */
  isCollaborator: boolean;
};

/**
 * For someone tagged on this work: accept / decline while it is pending,
 * and a way to take their name off later.
 */
export default function ProjectCollabInviteBanner({ projectId, ownerName, isCollaborator }: Props) {
  const { data: invite } = useMyPendingCollabInvite(isCollaborator ? undefined : projectId);
  const respond = useRespondProjectCollabInvite();
  const withdraw = useWithdrawProjectCollab();

  if (isCollaborator) {
    return (
      <div className="mb-4 flex flex-col gap-2 rounded-xl border border-border/70 bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-foreground">
          <Handshake className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          คุณเป็นผู้ร่วมงานในผลงานนี้ของ {ownerName}
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" size="sm" variant="ghost" className="h-9 self-start rounded-full text-muted-foreground sm:self-auto">
              ถอนชื่อ
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>ถอนชื่อออกจากผลงานนี้?</AlertDialogTitle>
              <AlertDialogDescription>
                ชื่อคุณจะไม่ขึ้นในผลงานนี้อีก และ {ownerName} จะได้รับแจ้ง เจ้าของผลงานแท็กคุณซ้ำในผลงานนี้ไม่ได้
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
              <AlertDialogAction disabled={withdraw.isPending} onClick={() => withdraw.mutate(projectId)}>
                ถอนชื่อ
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

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
            กดยอมรับแล้วชื่อคุณจะขึ้นในผลงาน (ถอนชื่อทีหลังได้) ถ้าปฏิเสธ ผลงานยังเผยแพร่ตามปกติแต่จะไม่มีชื่อคุณ
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
