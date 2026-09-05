import { Link } from "react-router-dom";
import { Pin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { applicationStatusLabel } from "@/components/jobs/jobCardUtils";
import type { JobApplication } from "@/hooks/useJobs";
import { formatThaiDateTime } from "@/lib/format";
import {
  isWaitingApplication,
  jobApplicationDaysLeft,
  jobRejectReasonUserCopy,
} from "@/lib/jobApplicationReview";
import { profilePublicPath } from "@/lib/profileRoutes";
import { cn } from "@/lib/utils";

type Props = {
  application: JobApplication;
  busy?: boolean;
  onAccept: () => void;
  onReject: () => void;
  onToggleInterest: (interested: boolean) => void;
  onViewCv: () => void;
};

export default function JobApplicantReviewRow({
  application: a,
  busy,
  onAccept,
  onReject,
  onToggleInterest,
  onViewCv,
}: Props) {
  const waiting = isWaitingApplication(a.status);
  const interested = a.status === "shortlisted";
  const daysLeft = waiting ? jobApplicationDaysLeft(a.created_at) : 0;
  const rejectCopy = jobRejectReasonUserCopy(a.reject_reason, a.reject_note);
  const name = a.applicant?.display_name || "ผู้สมัคร";
  const profileTo = a.applicant
    ? profilePublicPath({ user_id: a.applicant_id, username: a.applicant.username })
    : null;

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-3 space-y-2">
      <div className="flex items-start gap-3">
        <Avatar className="w-10 h-10">
          <AvatarImage src={a.applicant?.avatar_url ?? undefined} />
          <AvatarFallback>{name[0] ?? "?"}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{name}</p>
          <p className="text-[11px] text-muted-foreground tabular-nums">{formatThaiDateTime(a.created_at)}</p>
          {a.cover_letter ? (
            <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">{a.cover_letter}</p>
          ) : null}
          {waiting ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              เหลือ {daysLeft} วันในการตอบ ไม่งั้นระบบจะปฏิเสธอัตโนมัติ
            </p>
          ) : null}
          {a.status === "rejected" && rejectCopy ? (
            <p className="mt-1 text-[11px] text-muted-foreground">เหตุผล: {rejectCopy}</p>
          ) : null}
        </div>
        <Badge variant="secondary" className="text-[10px] shrink-0">
          {applicationStatusLabel[a.status] ?? a.status}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {profileTo ? (
          <Button size="sm" variant="ghost" className="h-7 text-xs rounded-lg" asChild>
            <Link to={profileTo}>ดูโปรไฟล์</Link>
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" className="h-7 text-xs rounded-lg" onClick={onViewCv}>
          ดู CV
        </Button>
        {a.conversation_id ? (
          <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg" asChild>
            <Link to={`/chat/${a.conversation_id}`}>เปิดแชท</Link>
          </Button>
        ) : null}
        {waiting ? (
          <>
            <Button
              size="sm"
              variant={interested ? "secondary" : "outline"}
              className="h-7 text-xs rounded-lg"
              disabled={busy}
              onClick={() => onToggleInterest(!interested)}
            >
              <Pin className={cn("mr-1 h-3 w-3", interested && "fill-current")} />
              {interested ? "สนใจแล้ว" : "สนใจ"}
            </Button>
            <Button size="sm" className="h-7 text-xs rounded-lg" disabled={busy} onClick={onAccept}>
              ยอมรับ
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg" disabled={busy} onClick={onReject}>
              ปฏิเสธ
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
