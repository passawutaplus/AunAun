import { useState } from "react";
import { Link } from "react-router-dom";
import { Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PIXEL_POLICY_PATH } from "@/lib/pixelPolicy";

export function EarningsClosedLoopNote() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
      >
        <Info className="w-3.5 h-3.5" />
        ทำไมถอนได้บางส่วน?
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ระบบ Pixel แบบ Closed-Loop</DialogTitle>
            <DialogDescription className="text-left space-y-3 pt-2">
              <p>
                ถอนได้เฉพาะ Pixel ที่ได้จาก<span className="font-medium text-foreground">ของขวัญที่ผู้สนับสนุนส่งให้</span>{" "}
                เท่านั้น
              </p>
              <p>
                Pixel ที่คุณเติมเองใช้ส่งของขวัญได้อย่างเดียว (ถอนไม่ได้) — เพื่อป้องกันการฟอกเงินและให้ระบบโปร่งใส
              </p>
              <p>การถอนเงินต้องผ่านการยืนยันตัวตน (KYC) และครบเงื่อนไขของแพลตฟอร์ม</p>
              <Link to={PIXEL_POLICY_PATH} className="text-primary hover:underline text-sm inline-block">
                อ่านนโยบาย Pixel
              </Link>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
