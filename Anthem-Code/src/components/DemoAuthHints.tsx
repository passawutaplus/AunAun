import { Link } from "react-router-dom";
import { Info, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import UxChecklistPdfDownload from "@/components/research/UxChecklistPdfDownload";
import { DEMO_LOGIN_HINT, DEMO_SIGNUP_BLOCKED } from "@/lib/copyConstants";
import {
  DEMO_RESEARCH_ACCOUNTS,
  isDemoMode,
} from "@/lib/demoMode";

export function DemoLoginHint({
  onUseAccount,
}: {
  onUseAccount: (email: string, password: string) => void;
}) {
  if (!isDemoMode()) return null;

  return (
    <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 space-y-2.5">
      <p className="text-xs text-foreground/90 leading-relaxed">
        {DEMO_LOGIN_HINT}
        {" · "}
        <Link to="/research" className="text-primary hover:underline">คู่มือทดสอบ</Link>
        {" · "}
        <UxChecklistPdfDownload variant="link" className="text-primary hover:underline" />
      </p>
      <div className="flex flex-wrap gap-2">
        {DEMO_RESEARCH_ACCOUNTS.map((acc) => (
          <Button
            key={acc.email}
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-full text-[11px]"
            onClick={() => onUseAccount(acc.email, "")}
          >
            {acc.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function DemoSignupBlocked({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  if (!isDemoMode()) return null;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-4 space-y-3 text-center">
      <Info className="w-5 h-5 text-amber-600 mx-auto" aria-hidden />
      <p className="text-sm font-medium">{DEMO_SIGNUP_BLOCKED}</p>
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <Button type="button" size="sm" className="rounded-full gap-1.5" onClick={onSwitchToLogin}>
          <LogIn className="w-3.5 h-3.5" /> ไปเข้าสู่ระบบ
        </Button>
        <Button type="button" size="sm" variant="outline" className="rounded-full" asChild>
          <Link to="/research">อ่านคู่มือ UX</Link>
        </Button>
      </div>
    </div>
  );
}
