import { useState } from "react";
import { Gift } from "lucide-react";
import { getStoredReferralCode } from "@/lib/referralAttribution";

export function ReferralSignupHint() {
  const [code] = useState(() => getStoredReferralCode());
  if (!code) return null;

  return (
    <div className="flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5">
      <Gift className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <p className="text-xs leading-relaxed">
        สมัครผ่านคำเชิญนี้ รับ <strong className="text-primary">20 px</strong> หลังยืนยันบัญชี
        และรับเพิ่มอีก <strong className="text-primary">100 px</strong> เมื่อเผยแพร่ครั้งแรก
      </p>
    </div>
  );
}
