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
  (import.meta.env.VITE_LEGAL_UPDATED_AT as string | undefined) ?? "17 มิถุนายน 2569";

/** รุ่นข้อความคำแถลการยืนยันลิขสิทธิ์ — เก็บใน projects.rights_attestation_version */
export const LEGAL_ATTESTATION_VERSION =
  (import.meta.env.VITE_LEGAL_ATTESTATION_VERSION as string | undefined) ?? "2026-06-14";

export const LEGAL_DPO_EMAIL =
  (import.meta.env.VITE_LEGAL_DPO_EMAIL as string | undefined) ?? BRAND_PRIVACY_EMAIL;

export const LEGAL_SUPPORT_EMAIL =
  (import.meta.env.VITE_LEGAL_SUPPORT_EMAIL as string | undefined) ?? BRAND_SUPPORT_EMAIL;

export const LEGAL_WEBSITE =
  (import.meta.env.VITE_LEGAL_WEBSITE as string | undefined) ??
  (import.meta.env.DEV ? "http://localhost:5173" : defaultSiteUrl());

/** แอปหลังบ้านใน ecosystem — ใช้ในเอกสารกฎหมาย */
export const LEGAL_SOLO_NAME = "So1o Freelancer";
export const LEGAL_SOLO_URL = "https://solofreelancer.com";
