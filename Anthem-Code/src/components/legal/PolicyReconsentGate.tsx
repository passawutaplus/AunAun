import { Link } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { useConsentStatus, useRecordReconsent } from "@/hooks/useLegalCompliance";
import { useEnsureSensitiveAction } from "@/components/legal/SensitiveActionReauthProvider";

/** แสดงเมื่อนโยบายเปลี่ยนและต้องยอมรับใหม่ */
const PolicyReconsentGate = () => {
  const { data, isLoading } = useConsentStatus();
  const reconsent = useRecordReconsent();
  const ensureVerified = useEnsureSensitiveAction();
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);

  const open = !isLoading && data?.authenticated && data.needs_reconsent;
  const missing = data?.missing ?? [];
  const needTerms = missing.includes("terms");
  const needPrivacy = missing.includes("privacy");
  const canSubmit =
    (!needTerms || terms) && (!needPrivacy || privacy) && (needTerms || needPrivacy);

  if (!open) return null;

  return (
    <Dialog open>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <ShieldAlert className="w-5 h-5" />
            <DialogTitle>อัปเดตนโยบาย</DialogTitle>
          </div>
          <DialogDescription className="text-left pt-1">
            เราปรับปรุงเอกสารกฎหมายแล้ว กรุณาอ่านและยืนยันก่อนใช้งานต่อ
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {needTerms ? (
            <label className="flex gap-2 items-start cursor-pointer rounded-lg border border-border/60 p-3">
              <Checkbox checked={terms} onCheckedChange={(v) => setTerms(v === true)} className="mt-0.5" />
              <span className="text-sm leading-relaxed">
                ฉันยอมรับ{" "}
                <Link to="/legal/terms" target="_blank" className="text-primary underline">
                  ข้อกำหนดฉบับใหม่
                </Link>
              </span>
            </label>
          ) : null}
          {needPrivacy ? (
            <label className="flex gap-2 items-start cursor-pointer rounded-lg border border-border/60 p-3">
              <Checkbox checked={privacy} onCheckedChange={(v) => setPrivacy(v === true)} className="mt-0.5" />
              <span className="text-sm leading-relaxed">
                ฉันรับทราบ{" "}
                <Link to="/legal/privacy" target="_blank" className="text-primary underline">
                  นโยบายความเป็นส่วนตัวฉบับใหม่
                </Link>
              </span>
            </label>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            className="w-full sm:w-auto"
            disabled={!canSubmit || reconsent.isPending}
            onClick={async () => {
              try {
                await ensureVerified("ยอมรับนโยบายฉบับใหม่");
              } catch {
                return;
              }
              reconsent.mutate({ terms: needTerms && terms, privacy: needPrivacy && privacy });
            }}
          >
            {reconsent.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            ยืนยันและใช้งานต่อ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PolicyReconsentGate;
