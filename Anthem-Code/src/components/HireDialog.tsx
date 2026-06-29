import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { hireRequestSchema } from "@/lib/validators";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useCreateHireRequest } from "@/hooks/useHiringRequests";
import { useMyOpenJobPosts } from "@/hooks/useJobs";
import { supabase } from "@/integrations/supabase/client";
import { mapWriteFlowError } from "@/lib/writeFlowErrors";
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
}

const HireDialog = ({ open, onOpenChange, projectTitle, projectId, freelancerId }: HireDialogProps) => {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const createReq = useCreateHireRequest();
  const { data: myJobs = [] } = useMyOpenJobPosts();
  const [success, setSuccess] = useState(false);
  const [jobPostId, setJobPostId] = useState("");
  const [form, setForm] = useState(emptyHireInviteForm());

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
    setSuccess(false);
    setJobPostId("");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (!user) return;
    const budgetNum = form.budgetAmount ? Number(form.budgetAmount.replace(/[^\d]/g, "")) : undefined;
    const parsed = hireRequestSchema.safeParse({
      clientName: form.clientName,
      email: form.email,
      phone: form.phone,
      budgetAmount: budgetNum,
      deadline: form.deadline,
      message: buildHireInviteMessage(form) ?? "",
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "กรอกข้อมูลไม่ครบ");
      return;
    }
    if (!freelancerId) {
      toast.error("ผลงานนี้ยังไม่มีเจ้าของในระบบ — ไม่สามารถส่งคำขอได้");
      return;
    }
    try {
      const selectedJob = myJobs.find((j) => j.id === jobPostId);
      const requestId = await createReq.mutateAsync({
        freelancer_id: freelancerId,
        client_id: user.id,
        project_id: projectId ?? null,
        project_title: selectedJob?.title ?? projectTitle ?? "ผลงานในฟีด",
        client_name: parsed.data.clientName,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        budget_amount: budgetNum ?? null,
        deadline: parsed.data.deadline || null,
        message: buildHireInviteMessage(form),
        job_post_id: jobPostId || null,
        invited_as: "personal",
        attachment_urls: form.attachmentUrls.length ? form.attachmentUrls : null,
      } as never);
      void supabase.functions.invoke("notify-hire-request", {
        body: { request_id: requestId },
      });
      setSuccess(true);
    } catch (err: unknown) {
      toast.error(mapWriteFlowError(err, "ส่งไม่สำเร็จ"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {success ? (
          <div className="py-4 space-y-4 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-primary" />
            <DialogHeader className="text-center">
              <DialogTitle>ส่งคำชวนแล้ว</DialogTitle>
              <DialogDescription className="text-left space-y-2 pt-2">
                <p>ครีเอเตอร์จะได้รับแจ้งเตือนและติดต่อกลับทางอีเมลที่คุณให้ไว้</p>
                {jobPostId && (
                  <p className="text-sm">
                    <Link to={`/jobs/${jobPostId}`} className="text-primary hover:underline">
                      ดูประกาศงานที่เชื่อม
                    </Link>
                  </p>
                )}
              </DialogDescription>
            </DialogHeader>
            <Button className="w-full rounded-xl" onClick={() => handleOpenChange(false)}>
              ปิด
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>ชวนมาทำงาน</DialogTitle>
              <DialogDescription>
                อ้างอิง: <span className="font-medium text-primary">{projectTitle}</span>
              </DialogDescription>
            </DialogHeader>

            <HireInviteForm
              form={form}
              setForm={setForm}
              myJobs={myJobs}
              jobPostId={jobPostId}
              onJobPostIdChange={setJobPostId}
              userId={user?.id}
            />

            <Button
              type="button"
              disabled={createReq.isPending}
              className="w-full rounded-xl mt-4"
              onClick={() => void handleSubmit()}
            >
              {createReq.isPending ? "กำลังส่ง..." : "ส่งคำชวน"}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default HireDialog;
