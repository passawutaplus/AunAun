import { BRAND_NAME, BRAND_STORAGE_NO_PERSIST } from "@/lib/brandConfig";

/** รายการคุกกี้/ที่เก็บในเบราว์เซอร์ที่แพลตฟอร์มใช้จริง */

export type CookieCatalogRow = {
  name: string;
  provider: string;
  purpose: string;
  duration: string;
  category: "essential" | "functional" | "analytics";
};

export const COOKIE_CATALOG: CookieCatalogRow[] = [
  {
    name: "sb-*-auth-token",
    provider: "Supabase Auth",
    purpose: "ยืนยันตัวตนและรักษาเซสชันการเข้าสู่ระบบ",
    duration: "เซสชัน — หมดอายุเมื่อปิดเบราว์เซอร์ (หรือ ~7 วันถ้าเลือกจดจำฉัน)",
    category: "essential",
  },
  {
    name: "anthem-cookie-consent",
    provider: BRAND_NAME,
    purpose: "บันทึกการเลือกความยินยอมคุกกี้",
    duration: "ถาวร — จนกว่าจะลบด้วยตนเองหรือเปลี่ยนเวอร์ชันนโยบาย",
    category: "essential",
  },
  {
    name: "theme",
    provider: BRAND_NAME,
    purpose: "จดจำโหมดสี (สว่าง/มืด)",
    duration: "ถาวร (localStorage) — จนกว่าจะลบด้วยตนเอง",
    category: "functional",
  },
  {
    name: "feed-mode",
    provider: BRAND_NAME,
    purpose: "จดจำมุมมองฟีด (ผลงาน/ดีไซเนอร์/สตูดิโอ)",
    duration: "ถาวร (localStorage) — จนกว่าจะลบด้วยตนเอง",
    category: "functional",
  },
  {
    name: "viewed:{projectId}",
    provider: BRAND_NAME,
    purpose: "นับยอดเข้าชมผลงานต่อเซสชัน (ไม่นับซ้ำ)",
    duration: "เซสชัน (sessionStorage) — หมดอายุเมื่อปิดแท็บ",
    category: "analytics",
  },
  {
    name: BRAND_STORAGE_NO_PERSIST,
    provider: BRAND_NAME,
    purpose: "ระบุว่าไม่ต้องการจดจำการเข้าสู่ระบบ",
    duration: "เซสชัน — หมดอายุเมื่อปิดเบราว์เซอร์",
    category: "functional",
  },
  {
    name: "aplus1-shell-* (Cache Storage)",
    provider: BRAND_NAME,
    purpose: "เก็บหน้าออฟไลน์และไอคอนแอป ให้เปิดได้เร็วและใช้งานได้ตอนเน็ตหลุด",
    duration: "ถาวร — แทนที่อัตโนมัติเมื่อมีเวอร์ชันใหม่",
    category: "essential",
  },
  {
    name: "samecor-share-target (Cache Storage)",
    provider: BRAND_NAME,
    purpose: "พักรูปที่คุณแชร์เข้าแอปจากเครื่อง จนกว่าจะกดโพสต์ (ไม่ส่งขึ้นเซิร์ฟเวอร์ก่อนกดโพสต์)",
    duration: "ชั่วคราว — ลบทันทีที่เปิดหน้าลงผลงาน",
    category: "functional",
  },
  {
    name: "samecor:android-banner-dismissed-at",
    provider: BRAND_NAME,
    purpose: "จดจำว่าคุณปิดแบนเนอร์ชวนโหลดแอปแล้ว",
    duration: "30 วัน (localStorage)",
    category: "functional",
  },
  {
    name: "samecor:studio-push-nudge-dismissed-at",
    provider: BRAND_NAME,
    purpose: "จดจำว่าคุณปิดการ์ดชวนเปิดแจ้งเตือนใน My Studio แล้ว",
    duration: "14 วัน (localStorage)",
    category: "functional",
  },
  {
    name: "_ga, _ga_*",
    provider: "Google Analytics 4",
    purpose: "สถิติการใช้งานเว็บแบบรวม — โหลดเฉพาะเมื่อคุณยินยอมคุกกี้วิเคราะห์",
    duration: "สูงสุด 2 ปี",
    category: "analytics",
  },
];
