import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, Flag, MessageSquare, Shield } from "lucide-react";
import { requestOpenCookiePreferences } from "@/lib/cookieConsent";
import { AccountPrivacySection } from "@/components/settings/AccountPrivacySection";
import type { User } from "@supabase/supabase-js";

type Props = {
  user: User | null;
};

/** PDPA, cookies, community reports — Privacy & Security panel. */
export function PrivacySecuritySection({ user: _user }: Props) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <section className="rounded-2xl glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">ความเป็นส่วนตัว (PDPA)</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => requestOpenCookiePreferences()}
            className="flex items-center justify-between gap-2 rounded-xl bg-secondary hover:bg-accent px-3 py-2.5 text-sm text-foreground transition-colors text-left"
          >
            <span>คุกกี้</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
          <Link
            to="/legal/rights"
            className="flex items-center justify-between gap-2 rounded-xl bg-secondary hover:bg-accent px-3 py-2.5 text-sm text-foreground transition-colors"
          >
            <span>สิทธิข้อมูล</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </Link>
          <Link
            to="/legal/privacy"
            className="flex items-center justify-between gap-2 rounded-xl bg-secondary hover:bg-accent px-3 py-2.5 text-sm text-foreground transition-colors"
          >
            <span>นโยบาย</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </Link>
        </div>
      </section>

      <section className="rounded-2xl glass-panel p-6 space-y-3">
        <p className="text-sm font-medium text-foreground flex items-center gap-2">
          <Flag className="w-4 h-4 text-primary" />
          การติดตามของฉัน
        </p>
        <p className="text-xs text-muted-foreground">รายงานและฟีดแบ็กที่ส่งให้ทีมงาน</p>
        <div className="grid sm:grid-cols-2 gap-2">
          <Link
            to="/legal/community"
            className="flex items-center justify-between gap-2 rounded-xl bg-secondary hover:bg-accent px-4 py-2.5 text-sm font-medium text-foreground transition-colors"
          >
            <span className="inline-flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <span>
                กฎชุมชน
                <span className="block text-[11px] font-normal text-muted-foreground">
                  พฤติกรรม การรายงาน และ strike
                </span>
              </span>
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
          <button
            type="button"
            onClick={() => navigate("/me/reports")}
            className="flex items-center justify-between gap-2 rounded-xl bg-secondary hover:bg-accent px-4 py-2.5 text-sm font-medium text-foreground transition-colors"
          >
            <span className="inline-flex items-center gap-2">
              <Flag className="w-4 h-4 text-primary" />
              รายงานของฉัน
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={() => navigate("/me/feedback")}
            className="flex items-center justify-between gap-2 rounded-xl bg-secondary hover:bg-accent px-4 py-2.5 text-sm font-medium text-foreground transition-colors"
          >
            <span className="inline-flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              ฟีดแบ็กของฉัน
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </section>

      <AccountPrivacySection />
    </div>
  );
}
