import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  hireRequestQuickSchema,
  hireRequestSchema,
  hireInviteBriefSchema,
} from "@/lib/validators";
import { parseMoneyInput } from "@/lib/parseMoney";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useCreateHireRequest } from "@/hooks/useHiringRequests";
import { useMyOpenJobPosts } from "@/hooks/useJobs";
import { useOpenHireCollabChat } from "@/hooks/useChat";
import { supabase } from "@/integrations/supabase/client";
import { mapWriteFlowError } from "@/lib/writeFlowErrors";
import { buildHireContextMessage, type ChatEntrySource } from "@/lib/chatContext";
import HireInviteForm, {
  buildHireInviteMessage,
  emptyHireInviteForm,
} from "@/components/hiring/HireInviteForm";

interface HireDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectTitle?: string;
  projectId?: string;
  freelancerId?: string;
  source?: ChatEntrySource;
  profileName?: string;
}

const HireDialog = ({
  open,
  onOpenChange,
  projectTitle,
  projectId,
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
  const [showDetails, setShowDetails] = useState(false);
  const busy = createReq.isPending || openChat.isPending;

  useEffect(() => {
    if (!open || !user) return;
    setForm((f) => ({
      ...f,
      clientName: f.clientName || profile?.display_name || "",
      email: f.email || user.email || "",
    }));
  }, [open, user, profile?.display_name]);

  const reset = () => {
    setForm(emptyHireInviteForm());
    setJobPostId("");
    setShowDetails(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const resolvedTitle = () => {
    const selectedJob = myJobs.find((j) => j.id === jobPostId);
    return selectedJob?.title ?? projectTitle ?? (source === "profile" ? "โปรไฟล์" : "ผลงานในฟีด");
  };

  const submitHire = async (withDetails: boolean) => {
    if (!user) return;
    if (!freelancerId) {
      toast.error("ผลงานนี้ยังไม่มีเจ้าของในระบบ — ไม่สามารถส่งคำขอได้");
      return;
    }
    if (freelancerId === user.id) {
      toast.info("ไม่สามารถจ้างตัวเองได้");
      return;
    }

    const quickCheck = hireRequestQuickSchema.safeParse({
      clientName: form.clientName,
      email: form.email,
    });
    if (!quickCheck.success) {
      toast.error(quickCheck.error.issues[0]?.message ?? "กรอกข้อมูลไม่ครบ");
      return;
    }

    const budgetNum = parseMoneyInput(form.budgetAmount) ?? undefined;
    const inviteMessage = withDetails ? buildHireInviteMessage(form) : null;

    if (withDetails && inviteMessage) {
      const briefCheck = hireInviteBriefSchema.safeParse({
        jobType: form.jobType,
        details: form.details,
        budgetAmount: budgetNum,
        deadline: form.deadline,
      });
      if (!briefCheck.success) {
        toast.error(briefCheck.error.issues[0]?.message ?? "กรอกข้อมูลไม่ครบ");
        return;
      }
      const parsed = hireRequestSchema.safeParse({
        clientName: form.clientName,
        email: form.email,
        phone: form.phone,
        budgetAmount: budgetNum,
        deadline: form.deadline,
        message: inviteMessage,
      });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "กรอกข้อมูลไม่ครบ");
        return;
      }
    }

    try {
      const title = resolvedTitle();
      const requestId = await createReq.mutateAsync({
        freelancer_id: freelancerId,
        client_id: user.id,
        project_id: projectId ?? null,
        project_title: title,
        client_name: quickCheck.data.clientName,
        email: quickCheck.data.email,
        phone: form.phone || null,
        budget_amount: budgetNum ?? null,
        deadline: form.deadline || null,
        message: inviteMessage,
        job_post_id: jobPostId || null,
        invited_as: "personal",
        attachment_urls: withDetails && form.attachmentUrls.length ? form.attachmentUrls : null,
      } as never);

      void supabase.functions.invoke("notify-hire-request", {
        body: { request_id: requestId },
      });

      const convId = await openChat.mutateAsync({
        kind: "hire",
        requestId,
        clientId: user.id,
        freelancerId,
        projectId: projectId ?? null,
        projectTitle: title,
        contextMessage: buildHireContextMessage({
          source,
          projectTitle: title,
          profileName: profileName ?? profile?.display_name,
        }),
      });

      toast.success("เปิดแชทแล้ว — คุยรายละเอียดได้เลย");
      handleOpenChange(false);
      navigate(`/chat/${convId}`);
    } catch (err: unknown) {
      toast.error(mapWriteFlowError(err, "ส่งไม่สำเร็จ"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ชวนมาทำงาน</DialogTitle>
          <DialogDescription>
            {source === "profile" ? (
              <>จากโปรไฟล์: <span className="font-medium text-primary">{profileName ?? projectTitle}</span></>
            ) : (
              <>อ้างอิง: <span className="font-medium text-primary">{projectTitle}</span></>
            )}
          </DialogDescription>
        </DialogHeader>

        <Button
          type="button"
          disabled={busy}
          className="w-full rounded-xl h-11 gap-2"
          onClick={() => void submitHire(false)}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
          {busy ? "กำลังเปิดแชท..." : "แชทเลย"}
        </Button>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-2 text-muted-foreground">หรือ</span>
          </div>
        </div>

        {!showDetails ? (
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl"
            onClick={() => setShowDetails(true)}
          >
            เติมรายละเอียดงาน (ไม่บังคับ)
          </Button>
        ) : (
          <>
            <HireInviteForm
              form={form}
              setForm={setForm}
              myJobs={myJobs}
              jobPostId={jobPostId}
              onJobPostIdChange={setJobPostId}
              userId={user?.id}
              optional
            />
            <Button
              type="button"
              disabled={busy}
              variant="secondary"
              className="w-full rounded-xl mt-4"
              onClick={() => void submitHire(true)}
            >
              {busy ? "กำลังส่ง..." : "ส่งพร้อมรายละเอียด & เปิดแชท"}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default HireDialog;
