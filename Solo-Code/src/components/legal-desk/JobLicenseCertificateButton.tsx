import * as React from "react";
import { Button } from "@/components/ui/button";
import { Award, Loader2, Link2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthProvider";
import { useQuotations } from "@/store/quotations";
import { useUsageRightsById } from "@/store/legalUsageRights";
import { createLicenseVerifyToken } from "@/lib/licenseCertificate";
import { LicenseCertificatePrintPortal } from "./LicenseCertificate";
import { trackFeature } from "@/lib/featureUsage";
import type { UsageRightsInput } from "@/lib/usageRightsSchema";

export function JobLicenseCertificateButton({ quotationId }: { quotationId: string | null }) {
  const { user, profile } = useAuth();
  const quotations = useQuotations();
  const q = quotationId ? quotations.list.find((x) => x.id === quotationId) : null;
  const { data: rights } = useUsageRightsById(q?.usageRightsId);
  const [printing, setPrinting] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  if (!q || !rights) return null;

  const exportCert = () => {
    void trackFeature("legal.certificate.export");
    setPrinting(true);
  };

  const shareLink = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const url = await createLicenseVerifyToken({
        userId: user.id,
        quotation: q,
        rights: rights as UsageRightsInput,
        brandName: profile?.brand_name || profile?.display_name || undefined,
      });
      await navigator.clipboard.writeText(url);
      toast.success("คัดลอกลิงก์ตรวจสอบใบรับรองแล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "สร้างลิงก์ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={exportCert}>
          <Award className="h-3.5 w-3.5" />
          ออกใบรับรองสิทธิ์
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1"
          disabled={busy}
          onClick={() => void shareLink()}
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Link2 className="h-3.5 w-3.5" />
          )}
          ลิงก์ตรวจสอบ
        </Button>
      </div>
      <LicenseCertificatePrintPortal
        quotation={q}
        rights={rights as UsageRightsInput}
        open={printing}
        onClose={() => setPrinting(false)}
      />
    </>
  );
}
