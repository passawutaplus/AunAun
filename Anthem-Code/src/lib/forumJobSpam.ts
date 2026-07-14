/** Soft detect job-hunting / hiring posts in Aplus1 forum (client warning). */

const JOB_SPAM_PATTERNS: RegExp[] = [
  /รับสมัคร/i,
  /หาฟรีแลนซ์/i,
  /หาfreelancer/i,
  /looking\s+for\s+(a\s+)?(designer|developer|freelancer)/i,
  /ด่วนจ้าง/i,
  /จ้างงานด่วน/i,
  /งบ\s*\d/i,
  /เรท\s*(วัน|งาน|ชม)/i,
  /rate\s*[:：]?\s*\d/i,
  /hiring\s+(designer|developer|freelancer)/i,
  /เปิดรับ(สมัคร)?(งาน|designer|ดีไซน์)/i,
  /ต้องการ(จ้าง|หาคน)/i,
  /ประกาศ(จ้าง|หางาน|รับสมัคร)/i,
];

export function looksLikeForumJobPost(text: string): boolean {
  const t = text.trim();
  if (t.length < 8) return false;
  let hits = 0;
  for (const re of JOB_SPAM_PATTERNS) {
    if (re.test(t)) hits += 1;
    if (hits >= 1) return true;
  }
  return false;
}

export const FORUM_JOB_WARNING =
  "โพสต์นี้อาจเข้าข่ายหางานหรือประกาศจ้าง — ฟอรัมนี้ใช้คุยและพัฒนาแพลตฟอร์มเท่านั้น กรุณาใช้หน้าโอกาสแทน";
