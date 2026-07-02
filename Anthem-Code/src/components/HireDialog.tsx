import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { hireRequestQuickSchema } from "@/lib/validators";
import { parseMoneyInput } from "@/lib/parseMoney";
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
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const resolvedTitle = () => {
    const selectedJob = myJobs.find((j) => j.id === jobPostId);
    return selectedJob?.title ?? projectTitle ?? (source === "profile" ? "โปรไฟล์" : "ผลงานในฟีด");
  };

  const submitHire = async () => {
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
    const inviteMessage = buildHireInviteMessage(form) ?? DEFAULT_HIRE_MESSAGE;

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
            <span className="block mt-1 text-xs">เติมรายละเอียดได้ถ้าต้องการ — ไม่กรอกก็แชทได้เลย</span>
          </DialogDescription>
        </DialogHeader>

        <HireInviteForm
          form={form}
          setForm={setForm}
          myJobs={myJobs}
          jobPostId={jobPostId}
          onJobPostIdChange={setJobPostId}
          userId={user?.id}
          optional
        />

        <DialogFooter className="gap-2 sm:gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} className="rounded-xl">
            ยกเลิก
          </Button>
          <Button
            type="button"
            disabled={busy}
            className="rounded-xl gap-2 flex-1 sm:flex-none"
            onClick={() => void submitHire()}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
            {busy ? "กำลังเปิดแชท..." : "แชทเลย"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HireDialog;
