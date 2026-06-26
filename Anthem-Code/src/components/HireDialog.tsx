import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { hireRequestSchema } from "@/lib/validators";
import { useAuth } from "@/hooks/useAuth";
import { useCreateHireRequest } from "@/hooks/useHiringRequests";
import { useMyOpenJobPosts } from "@/hooks/useJobs";
import { supabase } from "@/integrations/supabase/client";
import { useAuthDialog } from "@/stores/authDialogStore";
import { Link } from "react-router-dom";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  HireWizardStepOne,
  HireWizardStepTwo,
  HireWizardSummary,
  HireWizardSteps,
  buildHireMessage,
  emptyHireWizardForm,
} from "@/components/hiring/HireWizardFields";

interface HireDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectTitle?: string;
  projectId?: string;
  freelancerId?: string;
}

const HireDialog = ({ open, onOpenChange, projectTitle, projectId, freelancerId }: HireDialogProps) => {
  const openAuth = useAuthDialog((s) => s.openSignup);
  const { user } = useAuth();
  const createReq = useCreateHireRequest();
  const { data: myJobs = [] } = useMyOpenJobPosts();
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState(0);
  const [inviteMode, setInviteMode] = useState<"general" | "job">("general");
  const [jobPostId, setJobPostId] = useState<string>("");
  const [form, setForm] = useState(emptyHireWizardForm());

  const reset = () => {
    setForm(emptyHireWizardForm());
    setSuccess(false);
    setStep(0);
    setInviteMode("general");
    setJobPostId("");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.info("กรุณาเข้าสู่ระบบก่อนส่งคำขอ");
      handleOpenChange(false);
      openAuth();
      return;
    }
    const budgetNum = form.budgetAmount ? Number(form.budgetAmount.replace(/[^\d]/g, "")) : undefined;
    const parsed = hireRequestSchema.safeParse({
      clientName: form.clientName,
      email: form.email,
      phone: form.phone,
      budgetAmount: budgetNum,
      deadline: form.deadline,
      message: buildHireMessage(form) ?? "",
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "กรอกข้อมูลไม่ครบ");
      return;
    }
    if (!freelancerId) {
      toast.error("ผลงานนี้ยังไม่มีเจ้าของในระบบ — ไม่สามารถส่งคำขอได้");
      return;
    }
    if (inviteMode === "job" && !jobPostId) {
      toast.error("กรุณาเลือกประกาศงาน");
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
        message: buildHireMessage(form),
        job_post_id: inviteMode === "job" ? jobPostId : null,
        invited_as: "personal",
      } as never);
      void supabase.functions.invoke("notify-hire-request", {
        body: { request_id: requestId },
      });
      setSuccess(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "ส่งไม่สำเร็จ");
    }
  };

  const wizardStep = step;

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
                {inviteMode === "job" && jobPostId && (
                  <p className="text-sm">
                    <Link to={`/jobs/${jobPostId}`} className="text-primary hover:underline">ดูประกาศงานที่เชื่อม</Link>
                  </p>
                )}
              </DialogDescription>
            </DialogHeader>
            <Button className="w-full rounded-xl" onClick={() => handleOpenChange(false)}>ปิด</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>ชวนมาทำงาน</DialogTitle>
              <DialogDescription>
                อ้างอิง: <span className="font-medium text-primary">{projectTitle}</span>
              </DialogDescription>
            </DialogHeader>

            {step === 0 ? (
              <div className="space-y-3">
                <Label className="text-xs">ประเภทคำชวน</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant={inviteMode === "general" ? "default" : "outline"} className="rounded-xl h-auto py-3 flex-col" onClick={() => setInviteMode("general")}>
                    <span className="text-sm">คำขอทั่วไป</span>
                    <span className="text-[10px] opacity-80 font-normal">ไม่ผูกประกาศ</span>
                  </Button>
                  <Button type="button" variant={inviteMode === "job" ? "default" : "outline"} className="rounded-xl h-auto py-3 flex-col" onClick={() => setInviteMode("job")}>
                    <span className="text-sm">จากประกาศงาน</span>
                    <span className="text-[10px] opacity-80 font-normal">Invite to Job</span>
                  </Button>
                </div>
                {inviteMode === "job" && (
                  <div>
                    <Label className="text-xs">เลือกประกาศที่เปิดอยู่</Label>
                    {myJobs.length === 0 ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        ยังไม่มีประกาศ — <Link to="/jobs?post=1" className="text-primary hover:underline">สร้างประกาศใหม่</Link>
                      </p>
                    ) : (
                      <Select value={jobPostId} onValueChange={setJobPostId}>
                        <SelectTrigger className="rounded-xl mt-1"><SelectValue placeholder="เลือกประกาศ" /></SelectTrigger>
                        <SelectContent>
                          {myJobs.map((j) => (
                            <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}
                <Button type="button" className="w-full rounded-xl" onClick={() => setStep(1)} disabled={inviteMode === "job" && !jobPostId && myJobs.length > 0}>
                  ถัดไป
                </Button>
              </div>
            ) : (
              <>
                <HireWizardSteps step={wizardStep} />
                {wizardStep === 1 && <HireWizardStepOne form={form} setForm={setForm} />}
                {wizardStep === 2 && <HireWizardStepTwo form={form} setForm={setForm} />}
                {wizardStep === 3 && <HireWizardSummary form={form} setForm={setForm} />}
                <div className="flex gap-2 mt-4">
                  <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setStep((s) => s - 1)}>
                    ย้อนกลับ
                  </Button>
                  {wizardStep < 3 ? (
                    <Button type="button" className="flex-1 rounded-xl" onClick={() => setStep((s) => s + 1)}>ถัดไป</Button>
                  ) : (
                    <Button type="button" disabled={createReq.isPending} className="flex-1 rounded-xl" onClick={handleSubmit}>
                      {createReq.isPending ? "กำลังส่ง..." : "ยืนยันส่งคำชวน"}
                    </Button>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default HireDialog;
