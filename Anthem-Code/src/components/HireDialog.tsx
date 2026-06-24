import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { hireRequestSchema } from "@/lib/validators";
import { useAuth } from "@/hooks/useAuth";
import { useCreateHireRequest } from "@/hooks/useHiringRequests";
import { supabase } from "@/integrations/supabase/client";
import { useAuthDialog } from "@/stores/authDialogStore";
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
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyHireWizardForm());

  const reset = () => {
    setForm(emptyHireWizardForm());
    setSuccess(false);
    setStep(1);
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
    try {
      const requestId = await createReq.mutateAsync({
        freelancer_id: freelancerId,
        client_id: user.id,
        project_id: projectId ?? null,
        project_title: projectTitle ?? "ผลงานในฟีด",
        client_name: parsed.data.clientName,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        budget_amount: budgetNum ?? null,
        deadline: parsed.data.deadline || null,
        message: buildHireMessage(form),
      });
      void supabase.functions.invoke("notify-hire-request", {
        body: { request_id: requestId },
      });
      setSuccess(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "ส่งไม่สำเร็จ");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {success ? (
          <div className="py-4 space-y-4 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-primary" />
            <DialogHeader className="text-center">
              <DialogTitle>ส่งคำขอจ้างงานแล้ว</DialogTitle>
              <DialogDescription className="text-left space-y-2 pt-2">
                <p>ฟรีแลนซ์จะได้รับแจ้งเตือนและติดต่อกลับทางอีเมลที่คุณให้ไว้</p>
                <ol className="list-decimal list-inside text-sm space-y-1 text-muted-foreground">
                  <li>ฟรีแลนซ์ตอบรับคำขอในแชท</li>
                  <li>คุยรายละเอียดและขอบเขตงาน</li>
                  <li>รับใบเสนอราคาผ่าน So1o ecosystem</li>
                </ol>
              </DialogDescription>
            </DialogHeader>
            <Button className="w-full rounded-xl" onClick={() => handleOpenChange(false)}>
              ปิด
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>ส่งคำขอจ้างงาน</DialogTitle>
              <DialogDescription>
                อ้างอิง: <span className="font-medium text-primary">{projectTitle}</span>
              </DialogDescription>
            </DialogHeader>

            <HireWizardSteps step={step} />

            {step === 1 && <HireWizardStepOne form={form} setForm={setForm} />}
            {step === 2 && <HireWizardStepTwo form={form} setForm={setForm} />}
            {step === 3 && <HireWizardSummary form={form} setForm={setForm} />}

            <div className="flex gap-2 mt-4">
              {step > 1 && (
                <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setStep((s) => s - 1)}>
                  ย้อนกลับ
                </Button>
              )}
              {step < 3 ? (
                <Button type="button" className="flex-1 rounded-xl" onClick={() => setStep((s) => s + 1)}>
                  ถัดไป
                </Button>
              ) : (
                <Button type="button" disabled={createReq.isPending} className="flex-1 rounded-xl" onClick={handleSubmit}>
                  {createReq.isPending ? "กำลังส่ง..." : "ยืนยันส่งคำขอ"}
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default HireDialog;
