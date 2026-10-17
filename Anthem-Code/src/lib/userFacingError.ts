/**
 * Brand Book error copy: say what happened + what to do next, never show raw system codes.
 * Our own thrown errors are already written in Thai, so those pass through unchanged;
 * technical messages (English, PostgREST codes, fetch failures) become a known Thai line or the fallback.
 */
const THAI = /[฀-๿]/;

const KNOWN: Array<[RegExp, string]> = [
  [/failed to fetch|networkerror|network request failed|load failed|timeout|timed out/i, "เชื่อมต่อไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง"],
  [/invalid login credentials/i, "อีเมลหรือรหัสผ่านไม่ถูกต้อง ตรวจสอบแล้วลองใหม่อีกครั้ง"],
  [/email not confirmed/i, "ยังไม่ได้ยืนยันอีเมล เปิดลิงก์ในอีเมลของคุณก่อนเข้าสู่ระบบ"],
  [/user already registered|already been registered/i, "อีเมลนี้มีบัญชีแล้ว ลองเข้าสู่ระบบแทน"],
  [/password should be|weak password|password is too/i, "รหัสผ่านยังไม่ปลอดภัยพอ ลองใช้รหัสที่ยาวขึ้นและผสมตัวเลข"],
  [/same password|different from the old password/i, "รหัสผ่านใหม่ต้องไม่ซ้ำรหัสเดิม ลองตั้งรหัสใหม่อีกครั้ง"],
  [/rate limit|too many requests|429/i, "ทำรายการถี่เกินไป รอสักครู่แล้วลองใหม่อีกครั้ง"],
  [/jwt|session.*(expired|missing)|not authenticated|auth session/i, "เซสชันหมดอายุ เข้าสู่ระบบใหม่แล้วลองอีกครั้ง"],
  [/permission denied|row-level security|42501|403/i, "คุณไม่มีสิทธิ์ทำรายการนี้ หากคิดว่าผิดพลาด ติดต่อทีมงาน"],
  [/payload too large|file size|too large|413/i, "ไฟล์ใหญ่เกินกำหนด ลองลดขนาดแล้วอัปโหลดใหม่"],
  [/duplicate key|23505|already exists/i, "ข้อมูลนี้มีอยู่แล้ว ตรวจสอบแล้วลองใหม่อีกครั้ง"],
];

function rawMessage(e: unknown): string {
  if (typeof e === "string") return e;
  if (e && typeof e === "object" && "message" in e) {
    const msg = (e as { message: unknown }).message;
    if (typeof msg === "string") return msg;
  }
  return "";
}

export function userFacingError(e: unknown, fallback = "ทำรายการไม่สำเร็จ ลองใหม่อีกครั้ง"): string {
  const msg = rawMessage(e).trim();
  if (!msg) return fallback;
  if (THAI.test(msg)) return msg;
  for (const [re, text] of KNOWN) if (re.test(msg)) return text;
  return fallback;
}
