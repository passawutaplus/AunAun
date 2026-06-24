import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { hireRequestSchema } from "@/lib/validators";
import { useAuth } from "@/hooks/useAuth";
import { useCreateStudioHireRequest } from "@/hooks/useHiringRequests";
import { supabase } from "@/integrations/supabase/client";
import { useAuthDialog } from "@/stores/authDialogStore";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  HireWizardStepOne,
  HireWizardStepTwo,
  HireWizardSummary,
  HireWizardSteps,
  buildHireMessage,
  emptyHireWizardForm,
} from "@/components/hiring/HireWizardFields";

interface HireStudioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioId: string;
  studioName: string;
  studioVerified?: boolean;
  projectTitle?: string;
}

const HireStudioDialog = ({
  open,
  onOpenChange,
  studioId,
  studioName,
  studioVerified,
  projectTitle,
}: HireStudioDialogProps) => {
  const openAuth = useAuthDialog((s) => s.openSignup);
  const { user } = useAuth();
  const createReq = useCreateStudioHireRequest();
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
      message: buildHireMessage(form, { studio: true }) ?? "",
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "กรอกข้อมูลไม่ครบ");
      return;
    }
    try {
      const requestId = await createReq.mutateAsync({
        studio_id: studioId,
        client_id: user.id,
        project_title: projectTitle ?? studioName,
        client_name: parsed.data.clientName,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        budget_amount: budgetNum ?? null,
        deadline: parsed.data.deadline || null,
        message: buildHireMessage(form, { studio: true }),
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
              <DialogTitle>ส่งคำขอจ้าง Studio แล้ว</DialogTitle>
              <DialogDescription className="text-left pt-2">
                ทีม {studioName} จะได้รับแจ้งเตือนและติดต่อกลับทางอีเมลที่คุณให้ไว้
              </DialogDescription>
            </DialogHeader>
            <Button className="w-full rounded-xl" onClick={() => handleOpenChange(false)}>
              ปิด
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 flex-wrap">
                จ้าง Studio
                {studioVerified && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center gap-1 text-xs font-normal text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          <ShieldCheck className="w-3.5 h-3.5" /> นิติบุคคล
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>Studio ยืนยันนิติบุคคลแล้ว — ออกใบกำกับ/สัญญาได้</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </DialogTitle>
              <DialogDescription>
                อ้างอิง: <span className="font-medium text-primary">{studioName}</span>
                {studioVerified && (
                  <span className="block mt-1 text-xs">Studio ที่ลงทะเบียนนิติบุคคล — ออกใบกำกับ/สัญญาได้</span>
                )}
              </DialogDescription>
            </DialogHeader>

            <HireWizardSteps step={step} />

            {step === 1 && <HireWizardStepOne form={form} setForm={setForm} studio />}
            {step === 2 && <HireWizardStepTwo form={form} setForm={setForm} studio />}
            {step === 3 && <HireWizardSummary form={form} setForm={setForm} studio />}

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

export default HireStudioDialog;
