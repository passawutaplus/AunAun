import { Link } from "react-router-dom";
import { useState } from "react";
import { Download, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { LEGAL_DPO_EMAIL } from "@/lib/legalConfig";

export function AccountPrivacySection() {
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    if (!user?.id) return;
    setExporting(true);
    try {
      const [profile, kyc, payout] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("kyc_requests").select("*").eq("user_id", user.id),
        supabase.from("payout_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      const payload = {
        exported_at: new Date().toISOString(),
        app: "an1hem",
        user_id: user.id,
        email: user.email,
        profile: profile.data,
        kyc_requests: kyc.data ?? [],
        payout_profile: payout.data,
        note_kyc_files:
          "รูปบัตร/selfie เก็บใน Storage ส่วนตัว — ติดต่อ DPO หากต้องการสำเนาไฟล์เอกสาร",
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `an1hem-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("ดาวน์โหลดข้อมูลแล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ส่งออกไม่สำเร็จ");
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="rounded-2xl glass-panel p-6 space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-foreground">ความเป็นส่วนตัว (PDPA)</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        สิทธิของคุณตาม PDPA — ส่งออกข้อมูล ถอนความยินยอม หรือลบบัญชี ecosystem
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={handleExport} disabled={exporting}>
          {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Download className="w-3.5 h-3.5 mr-1" />}
          ดาวน์โหลดข้อมูลของฉัน
        </Button>
        <Button asChild size="sm" variant="ghost" className="text-muted-foreground">
          <Link to="/legal/privacy">นโยบาย PDPA</Link>
        </Button>
        <Button asChild size="sm" variant="ghost" className="text-muted-foreground">
          <Link to="/legal/rights">สิทธิเจ้าของข้อมูล</Link>
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        ลบบัญชีถาวรทำได้ที่ So1o Freelancer (บัญชี ecosystem เดียวกัน) หรืออีเมล{" "}
        <a href={`mailto:${LEGAL_DPO_EMAIL}`} className="text-primary underline">
          {LEGAL_DPO_EMAIL}
        </a>
      </p>
    </section>
  );
}
