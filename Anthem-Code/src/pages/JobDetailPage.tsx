import { useEffect, useState } from "react";
import { Share2 } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  canManageJob,
  useDecideJobApplication,
  useJobApplications,
  useToggleApplicationInterest,
  useJobById,
  useMyApplicationForJob,
  useRelatedHiringJobs,
  useUpdateJobStatus,
} from "@/hooks/useJobs";
import { useMyHiringOrgs } from "@/hooks/useHiringOrgs";
import { useMyStudioRoles } from "@/hooks/useStudios";
import { useAuth } from "@/hooks/useAuth";
import { requireAuth } from "@/lib/requireAuth";
import PageLoader from "@/components/ui/PageLoader";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import ReportTrigger from "@/components/report/ReportTrigger";
import { HeaderAccountActions } from "@/components/HeaderAccountActions";
import SharePopover from "@/components/SharePopover";
import JobDetailView from "@/components/jobs/JobDetailView";
import JobApplyProfileDialog from "@/components/jobs/JobApplyProfileDialog";
import JobCard from "@/components/jobs/JobCard";
import SeoHead from "@/components/SeoHead";
import { absoluteUrl, truncateDescription } from "@/lib/seo";
import ApplicantCvDialog from "@/components/jobs/ApplicantCvDialog";
import JobApplicantReviewRow from "@/components/jobs/JobApplicantReviewRow";
import JobRejectDialog from "@/components/jobs/JobRejectDialog";
import { getPosterInfo } from "@/components/jobs/jobCardUtils";
import { applyLenyShowcase } from "@/components/jobs/jobShowcase";
import {
  canApplicantOpenJobChat,
  jobRejectReasonUserCopy,
  type JobRejectReason,
} from "@/lib/jobApplicationReview";

const JobDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: job, isLoading } = useJobById(id);
  const { data: studioRoles = new Map<string, string>() } = useMyStudioRoles();
  const { data: myOrgs = [] } = useMyHiringOrgs();
  const { data: myApp } = useMyApplicationForJob(id);
  const { data: related = [] } = useRelatedHiringJobs(job ?? null);
  const updateJobStatus = useUpdateJobStatus();
  const decide = useDecideJobApplication();
  const pin = useToggleApplicationInterest();
  const [applyOpen, setApplyOpen] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [cvUserId, setCvUserId] = useState<string | null>(null);
  const orgIds = new Set(myOrgs.map((o) => o.id));
  const isAdmin = canManageJob(job ?? undefined, user?.id, studioRoles, orgIds);
  const { data: applications = [] } = useJobApplications(isAdmin ? id : undefined);

  useEffect(() => {
    if (searchParams.get("apply") === "1" && job?.status === "open") {
      requireAuth(user, () => setApplyOpen(true));
      const next = new URLSearchParams(searchParams);
      next.delete("apply");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, user, job?.status]);

  if (isLoading) return <PageLoader />;
  if (!job) {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground">ไม่พบประกาศนี้</div>
    );
  }

  const displayJob = applyLenyShowcase([job])[0] ?? job;
  const relatedJobs = applyLenyShowcase(related);
  const { name } = getPosterInfo(displayJob);
  const alreadyApplied = !!myApp;
  const companyLabel = name;

  return (
    <div className="min-h-screen bg-app-ambient pb-28 md:pb-8">
      <SeoHead
        title={displayJob.title}
        description={truncateDescription(displayJob.description || `${displayJob.title} — ประกาศจ้างงานบน Aplus1`)}
        path={`/hiring/${displayJob.id}`}
        image={displayJob.cover_image_url || undefined}
        noindex={displayJob.status !== "open"}
      />
      <header className="sticky top-0 z-20 border-b border-border/50 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 md:px-5 lg:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <BackButton to="/hiring" />
            <h1 className="truncate text-sm font-semibold md:text-base">{displayJob.title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <ReportTrigger targetType="job" targetId={job.id} targetOwnerId={job.posted_by} variant="text" />
            <SharePopover
              url={absoluteUrl(`/hiring/${displayJob.id}`)}
              title={displayJob.title}
              imageUrl={displayJob.cover_image_url || undefined}
              subtitle={companyLabel}
            >
              <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label="แชร์">
                <Share2 className="h-4 w-4" />
              </Button>
            </SharePopover>
            <HeaderAccountActions />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl">
        <div className="overflow-hidden border-b border-border/40 bg-card/40 md:mx-4 md:mt-4 md:rounded-2xl md:border">
          <JobDetailView
            job={displayJob}
            alreadyApplied={alreadyApplied}
            applicationStatus={myApp?.status}
            conversationId={myApp?.conversation_id}
            rejectReasonLabel={jobRejectReasonUserCopy(myApp?.reject_reason, myApp?.reject_note)}
            isOwner={isAdmin}
            onApply={() => requireAuth(user, () => setApplyOpen(true))}
            onOpenChat={() => {
              if (canApplicantOpenJobChat(myApp?.status, myApp?.conversation_id) && myApp?.conversation_id) {
                navigate(`/chat/${myApp.conversation_id}`);
              }
            }}
            onManage={() => document.getElementById("job-applicants")?.scrollIntoView({ behavior: "smooth" })}
          />
        </div>

        {isAdmin ? (
          <div id="job-applicants" className="px-4 py-6 md:px-5 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => updateJobStatus.mutate({ id: job.id, status: job.status === "open" ? "closed" : "open" })}
              >
                {job.status === "open" ? "ปิดรับ" : "เปิดประกาศใหม่"}
              </Button>
            </div>
            <h2 className="font-medium thai-display">ผู้สมัคร ({applications.length})</h2>
            {applications.length === 0 ? (
              <p className="text-sm text-muted-foreground">ยังไม่มีผู้สมัคร</p>
            ) : (
              <div className="space-y-3">
                {applications.map((a) => (
                  <JobApplicantReviewRow
                    key={a.id}
                    application={a}
                    busy={decide.isPending || pin.isPending}
                    onViewCv={() => setCvUserId(a.applicant_id)}
                    onToggleInterest={(interested) => pin.mutate({ id: a.id, interested })}
                    onAccept={() => {
                      void decide.mutateAsync({ id: a.id, decision: "accept" }).then((convId) => {
                        if (convId) navigate(`/chat/${convId}`);
                      });
                    }}
                    onReject={() => setRejectId(a.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}

        {relatedJobs.length > 0 ? (
          <div className="px-4 py-8 md:px-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">ประกาศอื่นของ {companyLabel}</h2>
              <Link to="/hiring" className="text-sm text-primary hover:underline">ดูทั้งหมด</Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedJobs.map((j) => <JobCard key={j.id} job={j} />)}
            </div>
          </div>
        ) : null}
      </main>

      <JobApplyProfileDialog
        job={displayJob}
        open={applyOpen}
        onOpenChange={setApplyOpen}
      />
      <ApplicantCvDialog userId={cvUserId} open={!!cvUserId} onOpenChange={(next) => !next && setCvUserId(null)} />
      <JobRejectDialog
        open={!!rejectId}
        applicantName={applications.find((a) => a.id === rejectId)?.applicant?.display_name}
        busy={decide.isPending}
        onOpenChange={(next) => {
          if (!next) setRejectId(null);
        }}
        onConfirm={(reason, note) => {
          if (!rejectId) return;
          void decide.mutateAsync({
            id: rejectId,
            decision: "reject",
            reason: reason as Exclude<JobRejectReason, "expired">,
            note,
          }).then(() => setRejectId(null));
        }}
      />
    </div>
  );
};

export default JobDetailPage;
