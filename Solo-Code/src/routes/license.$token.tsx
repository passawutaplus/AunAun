import { createFileRoute } from "@tanstack/react-router";
import { RouteError } from "@/components/RouteError";
import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldCheck } from "lucide-react";
import { LicenseCertificateView } from "@/components/legal-desk/LicenseCertificate";
import type { UsageRightsInput } from "@/lib/usageRightsSchema";
import type { Quotation } from "@/store/quotations";

export const Route = createFileRoute("/license/$token")({
  head: () => ({
    meta: [{ title: "ใบรับรองสิทธิ — So1o" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: LicenseVerifyPage,
});

function LicenseVerifyPage() {
  const { token } = Route.useParams();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [payload, setPayload] = React.useState<{
    quotation: Quotation;
    rights: UsageRightsInput;
    brandName?: string;
  } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: row, error: tokErr } = await (supabase as any)
        .from("legal_license_tokens")
        .select("summary, quotation_id, expires_at")
        .eq("token", token)
        .maybeSingle();
      if (cancelled) return;
      if (tokErr || !row) {
        setError("ไม่พบใบรับรองหรือลิงก์หมดอายุ");
        setLoading(false);
        return;
      }
      const summary = row.summary as {
        quotation?: Partial<Quotation>;
        rights?: UsageRightsInput;
        brandName?: string;
      };
      if (!summary?.quotation || !summary?.rights) {
        setError("ข้อมูลใบรับรองไม่สมบูรณ์");
        setLoading(false);
        return;
      }
      setPayload({
        quotation: summary.quotation as Quotation,
        rights: summary.rights,
        brandName: summary.brandName,
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        กำลังโหลด…
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <ShieldCheck className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">{error ?? "ไม่พบข้อมูล"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <LicenseCertificateView
        quotation={payload.quotation}
        rights={payload.rights}
        brandName={payload.brandName}
      />
    </div>
  );
}
