import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Briefcase, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { INQUIRY_PLATFORM_DISCLAIMER } from "@/lib/legalSignupCopy";
import { parseMoneyInput } from "@/lib/parseMoney";
import { isUuid } from "@/lib/uuid";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useCreateHireRequest } from "@/hooks/useHiringRequests";
import { useMyOpenJobPosts } from "@/hooks/useJobs";
import { useOpenHireCollabChat } from "@/hooks/useChat";
import { supabase } from "@/integrations/supabase/client";
import { mapWriteFlowError } from "@/lib/writeFlowErrors";
import {
  buildHireContextMessage,
  DEFAULT_HIRE_MESSAGE,
  type ChatEntrySource,
} from "@/lib/chatContext";
import { validateProjectInquiry } from "@/domain/inquiry";
import { hireInviteBriefSchema } from "@/lib/validators";
import HireInviteForm, {
  buildHireInviteMessage,
  emptyHireInviteForm,
} from "@/components/hiring/HireInviteForm";
import ProjectReferencePreview from "@/components/opportunity/ProjectReferencePreview";
import { trackProductEvent } from "@/lib/productEvents";
import { isBlockedFromOpportunity } from "@/hooks/useCommunityPostInteractions";

type HireFieldErrorKey = "deadline" | "budgetMax" | "jobTypes";

interface HireDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectTitle?: string;
  projectId?: string;
  projectCoverUrl?: string | null;
  freelancerId?: string;
  source?: ChatEntrySource;
  profileName?: string;
}

const HireDialog = ({
  open,
  onOpenChange,
  projectTitle,
  projectId,
  projectCoverUrl,
  freelancerId,
  source = "project",
  profileName,
}: HireDialogProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const createReq = useCreateHireRequest();
  const openChat = useOpenHireCollabChat();
  const { data: myJobs = [] } = useMyOpenJobPosts();
  const [jobPostId, setJobPostId] = useState("");
  const [form, setForm] = useState(emptyHireInviteForm());
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<HireFieldErrorKey, string>>>({});
  const busy = createReq.isPending || openChat.isPending;

  useEffect(() => {
    if (!open) return;
    void trackProductEvent(
      "hire_open",
      { project_id: projectId ?? null, freelancer_id: freelancerId ?? null, source },
      { debounceMs: 1_000 },
    );
  }, [open, projectId, freelancerId, source]);

  const reset = () => {
    setForm(emptyHireInviteForm());
    setJobPostId("");
    setFieldErrors({});
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const clearFieldError = (key: HireFieldErrorKey) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const resolvedTitle = () => {
    const selectedJob = myJobs.find((j) => j.id === jobPostId);
    return selectedJob?.title ?? projectTitle ?? (source === "profile" ? "โปรไฟล์" : "ผลงานในฟีด");
  };

  const resolveClientContact = () => {
    const clientName =
      profile?.display_name?.trim() ||
      profile?.username?.trim() ||
      user?.user_metadata?.full_name?.trim() ||
      user?.email?.split("@")[0] ||
      "ผู้ใช้";
    const email = user?.email?.trim() || profile?.email?.trim() || "";
    return { clientName, email };
  };

  const submitHire = async () => {
    if (!user) return;
    if (!freelancerId || !isUuid(freelancerId)) {
      toast.error("ผลงานนี้ยังไม่มีเจ้าของในระบบ — ไม่สามารถส่งคำขอได้");
      return;
    }
    if (freelancerId === user.id) {
      toast.info("ไม่สามารถจ้างตัวเองได้");
      return;
    }

    try {
      if (await isBlockedFromOpportunity(user.id, freelancerId)) {
        toast.error("คุณถูกบล็อก — ส่งคำขอจ้างไปยังผู้ใช้นี้ไม่ได้");
        return;
      }
    } catch {
      /* fall through to server check */
    }

    const inquiryErr = validateProjectInquiry({ source, projectId });
    if (inquiryErr) {
      toast.error(inquiryErr);
      return;
    }

    const { clientName, email } = resolveClientContact();
    if (!email) {
      toast.error("บัญชีนี้ยังไม่มีอีเมล — ตั้งค่าอีเมลในบัญชีก่อนส่งคำขอจ้าง");
      return;
    }

    const budgetMin = parseMoneyInput(form.budgetMin) ?? undefined;
    const budgetMax = parseMoneyInput(form.budgetMax) ?? undefined;
    const briefCheck = hireInviteBriefSchema.safeParse({
      jobTypes: form.jobTypes,
      details: form.details || undefined,
      budgetMin,
      budgetMax,
      deadline: form.deadline.trim(),
    });
    if (!briefCheck.success) {
      const nextErrors: Partial<Record<HireFieldErrorKey, string>> = {};
      for (const issue of briefCheck.error.issues) {
        const path = issue.path[0];
        if (path === "deadline" || path === "budgetMax" || path === "jobTypes") {
          nextErrors[path] = issue.message;
        }
      }
      if (!form.deadline.trim() && !nextErrors.deadline) {
        nextErrors.deadline = "กรุณาเลือกกำหนดส่งงาน";
      }
      if (!form.jobTypes.length && !nextErrors.jobTypes) {
        nextErrors.jobTypes = "กรุณาเลือกประเภทงานอย่างน้อย 1 อย่าง";
      }
      setFieldErrors(nextErrors);
      const firstMsg =
        nextErrors.jobTypes ||
        nextErrors.deadline ||
        nextErrors.budgetMax ||
        briefCheck.error.issues[0]?.message ||
        "กรุณากรอกข้อมูลที่บังคับ";
      toast.error(firstMsg);
      const focusId = nextErrors.jobTypes
        ? "hire-job-types"
        : nextErrors.deadline
          ? "hire-deadline"
          : nextErrors.budgetMax
            ? "hire-budget-max"
            : "hire-job-types";
      requestAnimationFrame(() => {
        const el = document.getElementById(focusId);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        if (focusId !== "hire-job-types") el?.focus();
      });
      return;
    }
    setFieldErrors({});
    const budgetNum = budgetMin ?? budgetMax;
    const inviteMessage = buildHireInviteMessage(form) ?? DEFAULT_HIRE_MESSAGE;
    const safeProjectId = projectId && isUuid(projectId) ? projectId : null;

    try {
      const title = resolvedTitle();
      const requestId = await createReq.mutateAsync({
        freelancer_id: freelancerId,
        client_id: user.id,
        target_type: "freelancer",
        project_id: safeProjectId,
        project_title: title,
        client_name: clientName,
        email,
        phone: profile?.phone?.trim() || null,
        budget_amount: budgetNum ?? null,
        budget_min: budgetMin ?? null,
        budget_max: budgetMax ?? null,
        deadline: form.deadline.trim(),
        message: inviteMessage,
        job_type: form.jobTypes.join(",") || null,
        job_type_other: null,
        job_post_id: jobPostId && isUuid(jobPostId) ? jobPostId : null,
        attachment_urls: form.attachmentUrls.length ? form.attachmentUrls : null,
      } as never);

      void supabase.functions.invoke("notify-hire-request", {
        body: { request_id: requestId },
      });

      const convId = await openChat.mutateAsync({
        kind: "hire",
        requestId,
        clientId: user.id,
        freelancerId,
        projectId: safeProjectId,
        projectTitle: title,
        contextMessage: buildHireContextMessage({
          source,
          projectTitle: title,
          profileName: profileName ?? profile?.display_name,
        }),
      });

      toast.success("เปิดแชทแล้ว — คุยรายละเอียดได้เลย");
      void trackProductEvent(
        "hire_submit",
        { project_id: projectId ?? null, freelancer_id: freelancerId ?? null, source },
        { debounceMs: 0 },
      );
      handleOpenChange(false);
      navigate(`/chat/${convId}`);
    } catch (err: unknown) {
      toast.error(mapWriteFlowError(err, "ส่งไม่สำเร็จ"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-2 text-left">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-xl">คำขอจ้างงาน</DialogTitle>
          <DialogDescription className="text-sm leading-6">
            {source === "profile" ? (
              <>
                จากโปรไฟล์:{" "}
                <span className="font-medium text-foreground">{profileName ?? projectTitle}</span>
                <span className="block mt-1 text-xs text-muted-foreground">
                  เติมรายละเอียดได้ถ้าต้องการ — ไม่กรอกก็คุยต่อได้เลย
                </span>
              </>
            ) : (
              <>เติมรายละเอียดได้ถ้าต้องการ — ไม่กรอกก็คุยต่อได้เลย</>
            )}
          </DialogDescription>
        </DialogHeader>

        {source === "project" && projectTitle && (
          <ProjectReferencePreview title={projectTitle} coverUrl={projectCoverUrl} />
        )}

        <HireInviteForm
          form={form}
          setForm={setForm}
          myJobs={myJobs}
          jobPostId={jobPostId}
          onJobPostIdChange={setJobPostId}
          userId={user?.id}
          fieldErrors={fieldErrors}
          onClearFieldError={clearFieldError}
        />

        <p className="text-[11px] leading-relaxed text-muted-foreground border-t border-border/40 pt-3">
          {INQUIRY_PLATFORM_DISCLAIMER}
        </p>

        <DialogFooter className="gap-2 sm:justify-end pt-2">
          <Button
            type="button"
            disabled={busy}
            className="rounded-full gap-1.5"
            onClick={() => void submitHire()}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
            {busy ? "กำลังเปิด..." : "สนใจจ้างงาน"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HireDialog;
