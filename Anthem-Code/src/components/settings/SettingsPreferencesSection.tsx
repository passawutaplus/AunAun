import { Link, useNavigate } from "react-router-dom";
import {
  ChevronRight,
  Flag,
  MessageSquare,
  Settings2,
  Shield,
} from "lucide-react";
import { requestOpenCookiePreferences } from "@/lib/cookieConsent";
import { ThemeSettingsSection } from "@/components/settings/ThemeSettingsSection";
import { AccountPrivacySection } from "@/components/settings/AccountPrivacySection";

export function SettingsPreferencesSection() {
  const navigate = useNavigate();

  return (
    <section className="rounded-2xl glass-panel p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Settings2 className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-foreground">การตั้งค่าเพิ่มเติม</h2>
      </div>

      <ThemeSettingsSection embedded />

      <div className="border-t border-border/40" />

      {/* การติดตาม */}
      <div className="space-y-2">
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
              กฎชุมชน
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
      </div>

      <div className="border-t border-border/40" />

      {/* PDPA */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          ความเป็นส่วนตัว (PDPA)
        </p>
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
      </div>

      <div className="border-t border-border/40" />

      <AccountPrivacySection embedded />
    </section>
  );
}
