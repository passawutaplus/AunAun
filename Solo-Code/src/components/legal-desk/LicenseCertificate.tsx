import * as React from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import type { Quotation } from "@/store/quotations";
import type { UsageRightsInput } from "@/lib/usageRightsSchema";
import { summarizeUsageRights } from "@/lib/buildCopyrightClauses";
import { LEGAL_DISCLAIMER } from "@/lib/usageRightsSchema";
import { useAuth } from "@/auth/AuthProvider";

const ORANGE = "#F37021";

export function LicenseCertificateView({
  quotation,
  rights,
  brandName,
  issuedAt = new Date(),
  verifyUrl,
}: {
  quotation: Quotation;
  rights: UsageRightsInput;
  brandName?: string;
  issuedAt?: Date;
  verifyUrl?: string;
}) {
  const lines = summarizeUsageRights(rights);
  const dateStr = format(issuedAt, "d MMMM yyyy", { locale: th });

  return (
    <div
      className="license-cert-print bg-white text-neutral-900 p-8 max-w-[210mm] mx-auto"
      style={{ fontFamily: "system-ui, sans-serif" }}
    >
      <div className="border-2 rounded-lg p-6" style={{ borderColor: ORANGE }}>
        <div className="text-center mb-6">
          <p className="text-[10px] tracking-widest text-neutral-500 uppercase">So1o Legal Desk</p>
          <h1 className="text-xl font-bold mt-1" style={{ color: ORANGE }}>
            ใบรับรองสิทธิการใช้งาน
          </h1>
          <p className="text-xs text-neutral-600 mt-1">License Certificate</p>
        </div>

        <div className="space-y-3 text-sm">
          <Row label="โปรเจกต์" value={quotation.projectName} />
          <Row label="ลูกค้า" value={quotation.clientName} />
          <Row label="เลขที่ใบเสนอราคา" value={quotation.number} />
          <Row label="ผู้ออกใบรับรอง" value={brandName ?? "ฟรีแลนซ์"} />
          <Row label="วันที่ออก" value={dateStr} />
        </div>

        <div className="mt-5 pt-4 border-t border-neutral-200">
          <p className="text-xs font-semibold text-neutral-700 mb-2">สิทธิที่ได้รับ</p>
          <ul className="space-y-1">
            {lines.map((line) => (
              <li key={line} className="text-xs flex gap-2">
                <span style={{ color: ORANGE }}>✓</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 pt-4 border-t border-neutral-200">
          <p className="text-[10px] font-semibold text-neutral-600 mb-1">
            สิ่งที่ไม่ได้รับ (โดยปกติ)
          </p>
          <ul className="text-[10px] text-neutral-600 space-y-0.5 list-disc pl-4">
            <li>สิทธิขายต่อหรือให้บุคคลที่สามใช้ โดยไม่ได้รับอนุญาต</li>
            <li>ไฟล์ต้นฉบับที่ไม่ได้ระบุในเงื่อนไขส่งมอบ</li>
            <li>การใช้งานนอกขอบเขตช่องทาง/ภูมิภาคที่ตกลง</li>
          </ul>
        </div>

        {verifyUrl && (
          <p className="text-[9px] text-neutral-500 mt-4 break-all">ตรวจสอบ: {verifyUrl}</p>
        )}

        <p className="text-[9px] text-neutral-500 mt-4 leading-relaxed border-t pt-3">
          {LEGAL_DISCLAIMER} เอกสารนี้สรุปสิทธิตามที่ตกลงในใบเสนอราคา/สัญญา ไม่แทนสัญญาฉบับเต็ม
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-xs border-b border-dotted border-neutral-200 pb-1">
      <span className="text-neutral-500 shrink-0">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

export function LicenseCertificatePrintPortal({
  quotation,
  rights,
  open,
  onClose,
}: {
  quotation: Quotation;
  rights: UsageRightsInput;
  open: boolean;
  onClose: () => void;
}) {
  const { profile } = useAuth();
  React.useEffect(() => {
    if (!open) return;
    document.body.classList.add("printing-license-cert");
    const t = window.setTimeout(() => {
      window.print();
      document.body.classList.remove("printing-license-cert");
      onClose();
    }, 400);
    return () => {
      window.clearTimeout(t);
      document.body.classList.remove("printing-license-cert");
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="license-cert-print-only fixed inset-0 z-[200] bg-white overflow-auto">
      <LicenseCertificateView
        quotation={quotation}
        rights={rights}
        brandName={profile?.brand_name || profile?.display_name || undefined}
      />
    </div>
  );
}
