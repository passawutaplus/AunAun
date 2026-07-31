import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isValidThaiTaxId, type OfferPartyType } from "@/lib/chatOffer";
import { cn } from "@/lib/utils";
import { useMyKycRequests } from "@/hooks/useKyc";
import { isKycExpired, resolveKycExpiresAt, maskThaiNationalId } from "@/lib/kycIdentity";
import {
  formatKycAddressJson,
  hasApprovedKycBilling,
  mergeBillingWithKyc,
} from "@/lib/billingFromKyc";

type Props = {
  userId: string;
  profile: Record<string, unknown> | null | undefined;
  onSaved?: () => void;
};

export function BillingProfileSection({ userId, profile, onSaved }: Props) {
  const { data: kycRequests = [], isLoading: kycLoading } = useMyKycRequests();
  const approvedKyc = useMemo(() => {
    return (
      kycRequests.find((r) => {
        if (r.status !== "approved") return false;
        return !isKycExpired(
          resolveKycExpiresAt({ kyc_expires_at: r.kyc_expires_at, reviewed_at: r.reviewed_at }),
        );
      }) ?? null
    );
  }, [kycRequests]);

  const kycLocked = hasApprovedKycBilling(approvedKyc);

  const [type, setType] = useState<OfferPartyType>("individual");
  const [legalName, setLegalName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [address, setAddress] = useState("");
  const [branch, setBranch] = useState("สำนักงานใหญ่");
  const [contactPerson, setContactPerson] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [vatRegistered, setVatRegistered] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const merged = mergeBillingWithKyc(
      {
        billing_type: profile.billing_type as string | null | undefined,
        legal_name: profile.legal_name as string | null | undefined,
        company_name: profile.company_name as string | null | undefined,
        tax_id: profile.tax_id as string | null | undefined,
        billing_address: (profile.billing_address || profile.address) as string | null | undefined,
        branch: profile.branch as string | null | undefined,
        contact_person: profile.contact_person as string | null | undefined,
        contact_role: profile.contact_role as string | null | undefined,
        vat_registered: profile.vat_registered as boolean | null | undefined,
        display_name: profile.display_name as string | null | undefined,
      },
      approvedKyc,
    );
    setType(merged.billing_type === "corporate" ? "corporate" : "individual");
    setLegalName(String(merged.legal_name || merged.display_name || ""));
    setCompanyName(String(merged.company_name || ""));
    setTaxId(String(merged.tax_id || "").replace(/\D/g, "").slice(0, 13));
    setAddress(String(merged.billing_address || ""));
    setBranch(String(merged.branch || "สำนักงานใหญ่"));
    setContactPerson(String(merged.contact_person || ""));
    setContactRole(String(merged.contact_role || ""));
    setVatRegistered(!!merged.vat_registered);
  }, [profile, approvedKyc]);

  const save = async () => {
    if (!kycLocked && type === "individual") {
      toast.error("ยืนยันตัวตน (KYC) ก่อน — ข้อมูลเอกสารจะดึงจาก KYC");
      return;
    }
    if (type === "corporate") {
      if (!companyName.trim()) {
        toast.error("ใส่ชื่อนิติบุคคล");
        return;
      }
      if (!isValidThaiTaxId(taxId) && !kycLocked) {
        toast.error("เลขผู้เสียภาษี 13 หลักไม่ถูกต้อง");
        return;
      }
    }
    setSaving(true);
    try {
      const kycAddress = formatKycAddressJson(approvedKyc?.address_json);
      const kycName = (approvedKyc?.legal_name || "").trim();
      const kycTax = (approvedKyc?.national_id_number || "").replace(/\D/g, "").slice(0, 13);

      const payload =
        type === "individual"
          ? {
              billing_type: "individual" as const,
              legal_name: kycName || legalName.trim() || null,
              company_name: null,
              tax_id: kycTax || taxId || null,
              billing_address: kycAddress || address.trim() || null,
              address: kycAddress || address.trim() || null,
              branch: null,
              contact_person: null,
              contact_role: null,
              vat_registered: vatRegistered,
            }
          : {
              billing_type: "corporate" as const,
              legal_name: (kycName || legalName.trim()) || null,
              company_name: companyName.trim() || null,
              // Corporate tax ID is company ID — keep editable; fall back to KYC only if empty.
              tax_id: taxId || kycTax || null,
              billing_address: address.trim() || kycAddress || null,
              branch: branch.trim() || null,
              contact_person: contactPerson.trim() || null,
              contact_role: contactRole.trim() || null,
              vat_registered: vatRegistered,
            };

      if (payload.tax_id && !isValidThaiTaxId(payload.tax_id)) {
        toast.error("เลขผู้เสียภาษี 13 หลักไม่ถูกต้อง");
        setSaving(false);
        return;
      }

      const { error } = await supabase.from("profiles").update(payload as never).eq("user_id", userId);
      if (error) throw error;
      toast.success("บันทึกข้อมูลออกเอกสารแล้ว");
      onSaved?.();
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message.includes("column")
            ? "ยังไม่ได้ migrate คอลัมน์ billing — รัน aplus1-hire-flow-docs.sql"
            : e.message
          : "บันทึกไม่สำเร็จ",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section id="billing-profile" className="rounded-2xl glass-panel p-6 space-y-4 scroll-mt-24">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-foreground">ข้อมูลออกเอกสาร / ภาษี</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        ส่วน billing สำหรับใบเสนอราคา · ใบแจ้งหนี้ · ใบเสร็จ / ใบกำกับภาษี — ชื่อ ที่อยู่
        และเลขบัตร/ผู้เสียภาษีของบุคคลธรรมดา ดึงจาก KYC โดยตรง
      </p>

      {kycLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> กำลังโหลดข้อมูล KYC…
        </div>
      ) : kycLocked ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-foreground flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="min-w-0 space-y-0.5">
            <p className="font-medium">ใช้ข้อมูลจาก KYC ที่อนุมัติแล้ว</p>
            <p className="text-xs text-muted-foreground">
              ชื่อ · ที่อยู่ · เลขบัตรประชาชน (ใช้เป็นเลขผู้เสียภาษีบุคคลธรรมดา) — แก้ได้ที่{" "}
              <Link to="/verify" className="text-primary underline-offset-2 hover:underline">
                ยืนยันตัวตน
              </Link>
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm space-y-2">
          <p className="text-foreground">
            ยังไม่มี KYC ที่อนุมัติ — ข้อมูลเอกสารบุคคลธรรมดาต้องมาจาก KYC
          </p>
          <Button type="button" size="sm" className="rounded-full" asChild>
            <Link to="/verify">ไปยืนยันตัวตน</Link>
          </Button>
        </div>
      )}

      <div className="flex gap-2">
        {(
          [
            ["individual", "บุคคลธรรมดา"],
            ["corporate", "นิติบุคคล"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={type === id ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setType(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {type === "corporate" ? (
          <div className="space-y-1.5 sm:col-span-2">
            <Label>ชื่อนิติบุคคล</Label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              maxLength={160}
              placeholder="บริษัท … จำกัด"
            />
          </div>
        ) : null}

        <div className="space-y-1.5 sm:col-span-2">
          <Label>
            {type === "corporate" ? "ชื่อผู้แทน (จาก KYC)" : "ชื่อ-นามสกุลตามบัตร (จาก KYC)"}
          </Label>
          <Input value={legalName} readOnly disabled className="bg-muted/40" />
        </div>

        <div className="space-y-1.5">
          <Label>
            {type === "corporate" ? "เลขประจำตัวผู้เสียภาษี (นิติบุคคล)" : "เลขบัตรประชาชน / ผู้เสียภาษี"}
          </Label>
          <Input
            value={
              type === "individual" && taxId.length === 13
                ? maskThaiNationalId(taxId)
                : taxId
            }
            onChange={
              type === "corporate"
                ? (e) => setTaxId(e.target.value.replace(/\D/g, "").slice(0, 13))
                : undefined
            }
            readOnly={type === "individual"}
            disabled={type === "individual"}
            inputMode="numeric"
            maxLength={13}
            placeholder="13 หลัก"
            className={cn(
              type === "individual" && "bg-muted/40",
              type === "corporate" &&
                taxId.length === 13 &&
                !isValidThaiTaxId(taxId) &&
                "border-destructive",
            )}
          />
        </div>

        {type === "corporate" ? (
          <div className="space-y-1.5">
            <Label>สาขา</Label>
            <Input value={branch} onChange={(e) => setBranch(e.target.value)} maxLength={80} />
          </div>
        ) : null}

        <div className="space-y-1.5 sm:col-span-2">
          <Label>{type === "corporate" ? "ที่อยู่นิติบุคคลสำหรับออกเอกสาร" : "ที่อยู่ตามบัตร (จาก KYC)"}</Label>
          {type === "individual" ? (
            <Input value={address} readOnly disabled className="bg-muted/40" />
          ) : (
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value.slice(0, 300))}
              maxLength={300}
              placeholder="ที่อยู่บริษัทสำหรับออกเอกสาร"
            />
          )}
        </div>

        {type === "corporate" ? (
          <>
            <div className="space-y-1.5">
              <Label>ผู้ติดต่อ</Label>
              <Input
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <Label>ตำแหน่งในองค์กร</Label>
              <Input
                value={contactRole}
                onChange={(e) => setContactRole(e.target.value)}
                maxLength={80}
                placeholder="เช่น ฝ่ายจัดซื้อ"
              />
            </div>
          </>
        ) : null}
      </div>

      <label className="flex items-start gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          className="mt-1"
          checked={vatRegistered}
          onChange={(e) => setVatRegistered(e.target.checked)}
        />
        <span>
          จดทะเบียน VAT
          <span className="block text-[11px] text-muted-foreground">
            เปิดเมื่อคุณออกใบกำกับภาษีได้ — ถ้าไม่จด ระบบจะออกแค่ใบเสร็จรับเงิน
          </span>
        </span>
      </label>

      <Button
        type="button"
        onClick={() => void save()}
        disabled={saving || (!kycLocked && type === "individual")}
        className="rounded-xl"
      >
        {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
        บันทึกข้อมูล billing / เอกสาร
      </Button>
    </section>
  );
}
