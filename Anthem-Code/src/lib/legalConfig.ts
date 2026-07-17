import {
  BRAND_COMPANY,
  BRAND_NAME,
  BRAND_PRIVACY_EMAIL,
  BRAND_SUPPORT_EMAIL,
  defaultSiteUrl,
} from "@/lib/brandConfig";

/** ค่ากลางสำหรับเอกสารกฎหมาย — ปรับผ่าน env ได้ก่อน production */

export const LEGAL_APP_NAME =
  (import.meta.env.VITE_LEGAL_APP_NAME as string | undefined) ?? BRAND_NAME;

export const LEGAL_COMPANY_NAME =
  (import.meta.env.VITE_LEGAL_COMPANY_NAME as string | undefined) ?? BRAND_COMPANY;

export const LEGAL_UPDATED_AT =
  (import.meta.env.VITE_LEGAL_UPDATED_AT as string | undefined) ?? "3 กรกฎาคม 2569";

/** รุ่นข้อความคำแถลการยืนยันลิขสิทธิ์ — เก็บใน projects.rights_attestation_version */
export const LEGAL_ATTESTATION_VERSION =
  (import.meta.env.VITE_LEGAL_ATTESTATION_VERSION as string | undefined) ?? "2026-06-14";

/** รุ่นนโยบายที่ใช้บันทึก consent — sync กับ anthem.policy_versions */
export const LEGAL_TERMS_VERSION =
  (import.meta.env.VITE_LEGAL_TERMS_VERSION as string | undefined) ?? "2026-07-18";

export const LEGAL_PRIVACY_VERSION =
  (import.meta.env.VITE_LEGAL_PRIVACY_VERSION as string | undefined) ?? "2026-07-18";

export const LEGAL_COOKIES_VERSION =
  (import.meta.env.VITE_LEGAL_COOKIES_VERSION as string | undefined) ?? "2026-07-03";

/** รุ่นข้อตกลงการจ้างงาน / นโยบายชำระเงิน — บันทึกตอนผู้จ้างติ๊ก consent */
export const HIRE_POLICY_VERSION =
  (import.meta.env.VITE_HIRE_POLICY_VERSION as string | undefined) ?? "2026-07-18";

export const PAYMENT_POLICY_VERSION =
  (import.meta.env.VITE_PAYMENT_POLICY_VERSION as string | undefined) ?? "2026-07-18";

export const LEGAL_DPO_EMAIL =
  (import.meta.env.VITE_LEGAL_DPO_EMAIL as string | undefined) ?? BRAND_PRIVACY_EMAIL;

export const LEGAL_SUPPORT_EMAIL =
  (import.meta.env.VITE_LEGAL_SUPPORT_EMAIL as string | undefined) ?? BRAND_SUPPORT_EMAIL;

export const LEGAL_WEBSITE =
  (import.meta.env.VITE_LEGAL_WEBSITE as string | undefined) ??
  (import.meta.env.DEV ? "http://localhost:5173" : defaultSiteUrl());

/** ข้อมูลนิติบุคคลสำหรับใบเสร็จค่าธรรมเนียม + ETDA disclosure */
export const LEGAL_COMPANY_TAX_ID =
  (import.meta.env.VITE_LEGAL_COMPANY_TAX_ID as string | undefined) ?? "";

export const LEGAL_COMPANY_ADDRESS =
  (import.meta.env.VITE_LEGAL_COMPANY_ADDRESS as string | undefined) ??
  "กรุงเทพมหานคร ประเทศไทย";

/** เมื่อ true ออกใบเสร็จค่าธรรมเนียมเป็นใบกำกับภาษี (VAT 7%) */
export const LEGAL_VAT_REGISTERED =
  String(import.meta.env.VITE_LEGAL_VAT_REGISTERED ?? "false").toLowerCase() === "true";

/** แอปหลังบ้านใน ecosystem — ใช้ในเอกสารกฎหมาย */
export const LEGAL_SOLO_NAME = "So1o Freelancer";
export const LEGAL_SOLO_URL = "https://solofreelancer.com";
