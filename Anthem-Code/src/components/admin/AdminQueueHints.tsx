import { Link } from "react-router-dom";
import { Bot, ShieldAlert, Flag } from "lucide-react";
import { useAdminAlertCounts } from "@/hooks/admin/useAdminAlerts";
import { isAplus1LaunchMinimal } from "@/lib/aplus1Launch";

/** Sticky hints for admin queues — AI assists, human approves. */
export default function AdminQueueHints() {
  const { data } = useAdminAlertCounts();
  const launchMinimal = isAplus1LaunchMinimal();
  if (!data) return null;

  const { openReports, pendingKyc, highRiskKyc, urgentReports } = data;
  if (!openReports && (launchMinimal || pendingKyc <= 0)) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-sm border border-admin-border bg-admin-surface px-3 py-2 text-xs">
      <span className="inline-flex items-center gap-1 text-admin-muted font-mono uppercase tracking-wider">
        <Bot className="w-3.5 h-3.5" /> คิว
      </span>
      {openReports > 0 ? (
        <Link
          to="/admin/reports"
          className="inline-flex items-center gap-1 rounded-full border border-admin-border px-2 py-0.5 hover:bg-admin-hover"
        >
          <Flag className="w-3 h-3" />
          รายงาน {openReports}
          {urgentReports > 0 ? (
            <span className="text-destructive font-medium">({urgentReports} ด่วน)</span>
          ) : null}
        </Link>
      ) : null}
      {pendingKyc > 0 && !launchMinimal ? (
        <Link
          to="/admin/kyc"
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 hover:bg-admin-hover ${
            highRiskKyc > 0 ? "border-destructive/40 text-destructive" : "border-admin-border"
          }`}
        >
          <ShieldAlert className="w-3 h-3" />
          KYC {pendingKyc}
          {highRiskKyc > 0 ? (
            <span className="font-medium">({highRiskKyc} ความเสี่ยงสูง)</span>
          ) : null}
        </Link>
      ) : null}
      <span className="text-admin-muted ml-auto hidden sm:inline">
        AI สรุปช่วย triage — กดอนุมัติ/ดำเนินการเอง
      </span>
    </div>
  );
}
