import { Link } from "react-router-dom";
import { AlertCircle, Check, ExternalLink, FileText, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { HireSellerReadiness } from "@/lib/hireSellerReadiness";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  readiness: HireSellerReadiness & { isLoading?: boolean };
  /** Save draft then close (optional busy). */
  onSaveDraft?: () => void | Promise<void>;
  draftBusy?: boolean;
};

/** Center popup when user tries to enable hire before seller setup is complete. */
export function HireSellerReadinessDialog({
  open,
  onOpenChange,
  readiness,
  onSaveDraft,
  draftBusy,
}: Props) {
  const nextStep = readiness.items.find((i) => !i.done) ?? null;
  const doneCount = readiness.items.filter((i) => i.done).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader className="text-left space-y-1.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 flex items-center justify-center mb-1">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <DialogTitle>ยังเปิดปุ่มจ้างงานไม่ได้</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            ต้องตั้งบัญชีรับเงินให้ครบก่อนรับคำขอจ้าง — ทำทีละขั้นได้ หรือบันทึก/เผยแพร่ผลงานก่อน
            แล้วค่อยกลับมาเปิดรับจ้างทีหลัง
            {readiness.kycPending ? " (มี KYC รอตรวจอยู่)" : ""}
          </DialogDescription>
        </DialogHeader>

        {readiness.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            กำลังตรวจความพร้อม...
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[11px] text-muted-foreground">
              ความคืบหน้า {doneCount}/{readiness.items.length} ขั้นตอน
            </p>
            <ul className="space-y-1.5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-2">
              {readiness.items.map((item) => (
                <li key={item.id}>
                  <Link
                    to={item.href}
                    onClick={() => onOpenChange(false)}
                    className={cn(
                      "flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                      item.done ? "opacity-65" : "hover:bg-background/70",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0",
                        item.done
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-amber-600/55",
                      )}
                    >
                      {item.done ? <Check className="w-3 h-3" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-sm text-foreground flex items-center gap-1.5">
                        {item.label}
                        {!item.done ? (
                          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        ) : null}
                      </span>
                      <span className="block text-[11px] text-muted-foreground leading-snug mt-0.5">
                        {item.hint}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-1.5">
              <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              ลงผลงานแบบยังไม่เปิดรับจ้างได้ปกติ — หลังลงทะเบียนรับจ้างครบ ค่อยกลับมาเปิดสวิตช์นี้ทีหลัง
            </p>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {nextStep ? (
            <Button asChild className="w-full rounded-full">
              <Link to={nextStep.href} onClick={() => onOpenChange(false)}>
                ไปทำขั้นตอนถัดไป: {nextStep.label}
              </Link>
            </Button>
          ) : null}
          {onSaveDraft ? (
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-full"
              disabled={draftBusy}
              onClick={() => void onSaveDraft()}
            >
              {draftBusy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              บันทึกฉบับร่างก่อน แล้วไปตั้งบัญชี
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            className="w-full rounded-full"
            onClick={() => onOpenChange(false)}
          >
            ลงผลงานโดยยังไม่เปิดรับจ้าง
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Compact success note when hire seller setup is already complete. */
export function HireSellerReadyBadge({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 flex items-start gap-2",
        className,
      )}
    >
      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
      <p className="text-[11px] text-muted-foreground leading-snug">
        <span className="font-medium text-foreground">พร้อมเปิดรับจ้าง</span>
        {" — "}ยืนยันตัวตนและบัญชีรับเงินครบแล้ว
      </p>
    </div>
  );
}
