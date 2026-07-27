import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Clock, ShieldCheck, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useMyKycRequests } from "@/hooks/useKyc";
import { isKycExpired, resolveKycExpiresAt } from "@/lib/kycIdentity";
import { cn } from "@/lib/utils";

type Props = { className?: string; showLink?: boolean };

export function useKycStatus() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: requests = [], isLoading } = useMyKycRequests();

  const profileRec = profile as {
    is_verified?: boolean;
    kyc_expires_at?: string | null;
  } | null;
  const approved = requests.find((r) => r.status === "approved");
  const expiresAt = resolveKycExpiresAt({
    kyc_expires_at: profileRec?.kyc_expires_at ?? approved?.kyc_expires_at,
    reviewed_at: approved?.reviewed_at,
  });
  const expired = isKycExpired(expiresAt);
  const isVerified = !!(profileRec?.is_verified) && !expired;
  const pending = requests.find((r) => r.status === "pending");
  const latestRejected = !pending && !isVerified && !expired ? requests.find((r) => r.status === "rejected") : null;

  let status: "verified" | "pending" | "rejected" | "expired" | "none" = "none";
  if (isVerified) status = "verified";
  else if (pending) status = "pending";
  else if (expired) status = "expired";
  else if (latestRejected) status = "rejected";

  return { status, pending, latestRejected, isVerified, expiresAt, isLoading };
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
  expired: {
    icon: AlertTriangle,
    label: "KYC หมดอายุ",
    detail: "ยืนยันตัวตนใหม่เพื่อถอนเงิน",
    className: "text-amber-600",
  },
  none: {
    icon: ShieldCheck,
    label: "ยังไม่ยืนยันตัวตน",
    detail: "จำเป็นก่อนถอนเงิน",
    className: "text-muted-foreground",
  },
} as const;

export function KycStatusBadge({ className, showLink = true }: Props) {
  const { status, latestRejected, expiresAt, isLoading } = useKycStatus();
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
              : status === "verified" && expiresAt
                ? `หมดอายุ ${new Date(expiresAt).toLocaleDateString("th-TH")}`
                : cfg.detail}
          </p>
          {showLink && status !== "verified" && (
            <Link to="/verify" className="text-xs text-primary underline mt-1 inline-block">
              {status === "rejected" || status === "expired"
                ? "ยื่นคำขอใหม่"
                : status === "pending"
                  ? "ดูสถานะ"
                  : "เริ่มยืนยันตัวตน"}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default KycStatusBadge;
