/** Demo / UX research mode — เปิดด้วย VITE_DEMO_MODE=true */

export const DEMO_EMAIL_SUFFIX = "@demo.pixel100.com";

export const DEMO_RESEARCH_ACCOUNTS = [
  {
    email: `phatsawut${DEMO_EMAIL_SUFFIX}`,
    label: "ฟรีแลนซ์ทั่วไป",
    note: "พอร์ตโฟลิโอ + onboarding + Welcome PX",
  },
  {
    email: `napatsara${DEMO_EMAIL_SUFFIX}`,
    label: "ครีเอเตอร์ยอดนิยม",
    note: "มีผู้ติดตามและผลงานหลายชิ้น",
  },
  {
    email: `chatchai${DEMO_EMAIL_SUFFIX}`,
    label: "ผู้จ้าง / สำรวจงาน",
    note: "ดู Jobs + ส่งคำขอจ้างจากผลงาน",
  },
] as const;

export function isDemoMode(): boolean {
  return import.meta.env.VITE_DEMO_MODE === "true";
}

/** Demo password — empty outside demo builds (Vite dead-code eliminates the fallback). */
export function isDemoEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(DEMO_EMAIL_SUFFIX);
}
