import { useEffect, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isValidThaiTaxId, type OfferPartyType } from "@/lib/chatOffer";
import { cn } from "@/lib/utils";

type Props = {
  userId: string;
  profile: Record<string, unknown> | null | undefined;
  onSaved?: () => void;
};

export function BillingProfileSection({ userId, profile, onSaved }: Props) {
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
    setType(profile.billing_type === "corporate" ? "corporate" : "individual");
    setLegalName(String(profile.legal_name || profile.display_name || ""));
    setCompanyName(String(profile.company_name || ""));
    setTaxId(String(profile.tax_id || "").replace(/\D/g, "").slice(0, 13));
    setAddress(String(profile.billing_address || ""));
    setBranch(String(profile.branch || "สำนักงานใหญ่"));
    setContactPerson(String(profile.contact_person || ""));
    setContactRole(String(profile.contact_role || ""));
    setVatRegistered(!!profile.vat_registered);
  }, [profile]);

  const save = async () => {
    if (taxId && !isValidThaiTaxId(taxId)) {
      toast.error("เลขผู้เสียภาษี 13 หลักไม่ถูกต้อง");
      return;
    }
    if (type === "corporate" && !companyName.trim()) {
      toast.error("ใส่ชื่อนิติบุคคล");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          billing_type: type,
          legal_name: legalName.trim() || null,
          company_name: type === "corporate" ? companyName.trim() || null : null,
          tax_id: taxId || null,
          billing_address: address.trim() || null,
          branch: type === "corporate" ? branch.trim() || null : null,
          contact_person: type === "corporate" ? contactPerson.trim() || null : null,
          contact_role: type === "corporate" ? contactRole.trim() || null : null,
          vat_registered: vatRegistered,
        } as never)
        .eq("user_id", userId);
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
    <section className="rounded-2xl glass-panel p-6 space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-foreground">ข้อมูลออกเอกสาร / ภาษี</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        ใช้บนใบเสนอราคา ใบแจ้งหนี้ และใบเสร็จ — เก็บตาม PDPA เพื่อออกเอกสารเท่านั้น
      </p>

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
        <div className="space-y-1.5 sm:col-span-2">
          <Label>{type === "corporate" ? "ชื่อนิติบุคคล" : "ชื่อ-นามสกุล (ตามเอกสาร)"}</Label>
          {type === "corporate" ? (
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              maxLength={160}
              placeholder="บริษัท … จำกัด"
            />
          ) : (
            <Input
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              maxLength={120}
              placeholder="ชื่อ-นามสกุล"
            />
          )}
        </div>
        {type === "corporate" ? (
          <div className="space-y-1.5 sm:col-span-2">
            <Label>ชื่อผู้แทน / ชื่อที่แสดง</Label>
            <Input
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              maxLength={120}
              placeholder="ชื่อผู้มีอำนาจลงนาม (ไม่บังคับ)"
            />
          </div>
        ) : null}
        <div className="space-y-1.5">
          <Label>เลขประจำตัวผู้เสียภาษี</Label>
          <Input
            value={taxId}
            onChange={(e) => setTaxId(e.target.value.replace(/\D/g, "").slice(0, 13))}
            inputMode="numeric"
            maxLength={13}
            placeholder="13 หลัก"
            className={cn(taxId.length === 13 && !isValidThaiTaxId(taxId) && "border-destructive")}
          />
        </div>
        {type === "corporate" ? (
          <div className="space-y-1.5">
            <Label>สาขา</Label>
            <Input value={branch} onChange={(e) => setBranch(e.target.value)} maxLength={80} />
          </div>
        ) : null}
        <div className="space-y-1.5 sm:col-span-2">
          <Label>ที่อยู่สำหรับออกเอกสาร</Label>
          <Textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
            maxLength={300}
            className="resize-none"
          />
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

      <Button type="button" onClick={() => void save()} disabled={saving} className="rounded-xl">
        {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
        บันทึกข้อมูลเอกสาร
      </Button>
    </section>
  );
}
