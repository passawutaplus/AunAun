import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock, ShieldCheck, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useMyKycRequests } from "@/hooks/useKyc";
import { cn } from "@/lib/utils";

type Props = { className?: string; showLink?: boolean };

export function useKycStatus() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: requests = [], isLoading } = useMyKycRequests();

  const isVerified = !!(profile as { is_verified?: boolean } | null)?.is_verified;
  const pending = requests.find((r) => r.status === "pending");
  const latestRejected = !pending && !isVerified ? requests.find((r) => r.status === "rejected") : null;

  let status: "verified" | "pending" | "rejected" | "none" = "none";
  if (isVerified) status = "verified";
  else if (pending) status = "pending";
  else if (latestRejected) status = "rejected";

  return { status, pending, latestRejected, isVerified, isLoading };
}

const CONFIG = {
  verified: {
    icon: CheckCircle2,
    label: "ยืนยันตัวตนแล้ว",
    detail: "พร้อมถอนเงินเมื่อครบเงื่อนไข",
    className: "text-emerald-600",
  },
  pending: {
    icon: Clock,
    label: "กำลังพิจารณา",
    detail: "ใช้เวลา 1–3 วันทำการ",
    className: "text-amber-600",
  },
  rejected: {
    icon: XCircle,
    label: "ไม่ผ่านการตรวจสอบ",
    detail: "ยื่นคำขอใหม่ได้",
    className: "text-destructive",
  },
  none: {
    icon: ShieldCheck,
    label: "ยังไม่ยืนยันตัวตน",
    detail: "จำเป็นก่อนถอนเงิน",
    className: "text-muted-foreground",
  },
} as const;

export function KycStatusBadge({ className, showLink = true }: Props) {
  const { status, latestRejected, isLoading } = useKycStatus();
  if (isLoading) return null;

  const cfg = CONFIG[status];
  const Icon = cfg.icon;

  return (
    <div className={cn("rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5", className)}>
      <div className="flex items-start gap-2">
        <Icon className={cn("w-4 h-4 shrink-0 mt-0.5", cfg.className)} />
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-medium", cfg.className)}>{cfg.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {status === "rejected" && latestRejected?.reject_reason_label
              ? latestRejected.reject_reason_label
              : cfg.detail}
          </p>
          {showLink && status !== "verified" && (
            <Link to="/verify" className="text-xs text-primary underline mt-1 inline-block">
              {status === "rejected" ? "ยื่นคำขอใหม่" : status === "pending" ? "ดูสถานะ" : "เริ่มยืนยันตัวตน"}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default KycStatusBadge;
