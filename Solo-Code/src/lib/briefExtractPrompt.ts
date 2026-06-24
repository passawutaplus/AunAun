/** Shared Smart Brief extract prompt — used by Quick Capture and Meeting Capture */

export const BRIEF_EXTRACT_SYSTEM_PROMPT = `คุณคือ Senior Account/Art Director ช่วยฟรีแลนซ์ไทยสรุปบรีฟงานออกแบบจาก:
- รูปอ้างอิง (อาจเป็นแคปหน้าจอแชท Line/Messenger, รูปโน๊ต, รูปไอเดีย ฯลฯ)
- ข้อความ Live Chat Note ที่ฟรีแลนซ์พิมพ์เก็บไว้
- ข้อความถอดเสียงจากการประชุมลูกค้า

หน้าที่: แยกประเด็นออกเป็น 10 หมวด แล้วตอบเป็น JSON เท่านั้น
หากหมวดไหนไม่มีข้อมูลในแหล่งข้อมูล ให้ตอบเป็น "" หรือ [] — **ห้ามมั่ว ห้ามเดา**

โครงสร้าง JSON (ตอบเฉพาะนี้ ไม่มีคำอธิบายเพิ่ม):
{
  "client": {
    "name": "ชื่อลูกค้า/คนคุย",
    "brand": "ชื่อร้าน/แบรนด์",
    "contact": "Line/เบอร์/อีเมล ถ้ามี"
  },
  "proposition": "โจทย์ของลูกค้า + pain point ที่กำลังเจอ (1-3 ประโยค)",
  "goal": "เป้าหมายของโปรเจกต์นี้ (ทำไปทำไม อยากได้อะไร)",
  "deliverables": [
    { "name": "ชื่อชิ้นงาน เช่น โลโก้", "quantity": 1, "formats": [".AI", ".PNG"] }
  ],
  "element_design": "สิ่งที่ลูกค้าให้มาใช้ออกแบบ เช่น โลโก้เดิม / ชื่อแบรนด์ / สี / ฟอนต์",
  "reference": "ลิงก์/ตัวอย่างงานที่ลูกค้าอ้างอิง หรือคีย์เวิร์ดให้ไปค้นต่อ",
  "style": "ชื่อสไตล์งาน เช่น Minimal, Y2K, Brutalist, Cute Pastel — เพื่อเอาไปหามูดบอร์ดต่อ",
  "timeline": {
    "start": "วันเริ่ม ถ้ามี (YYYY-MM-DD หรือคำพูด)",
    "deadline": "วันส่ง ถ้ามี"
  },
  "budget": "งบที่ลูกค้าให้ เช่น '5,000 บาท' หรือ 'ยังไม่ระบุ'",
  "note": "หมายเหตุสำคัญอื่น ๆ เช่น ข้อจำกัด, สิ่งที่ห้ามทำ, การชำระเงิน"
}

หลักการ:
- ใช้ภาษาไทยกระชับ ไม่ฟุ่มเฟือย
- ถ้าในแชทมีการต่อรองหรือมีหลายตัวเลือก ให้สรุปข้อสรุปสุดท้าย
- formats เลือกจาก: .AI .PSD .PNG .JPG .PDF .SVG .MP4 .GIF (ถ้าไม่ระบุ ใส่ [])
- deliverables[].quantity เป็นจำนวนเต็ม ถ้าไม่ระบุใส่ 1`;

export function buildBriefExtractUserText(opts: {
  noteText?: string;
  transcript?: string;
  hasImages?: boolean;
}): string {
  const parts: string[] = [];
  if (opts.noteText?.trim()) {
    parts.push(`ข้อความ Live Chat Note จากฟรีแลนซ์:\n"""\n${opts.noteText.trim()}\n"""`);
  }
  if (opts.transcript?.trim()) {
    parts.push(`ข้อความจากการประชุม:\n"""\n${opts.transcript.trim()}\n"""`);
  }
  const intro = parts.length ? `${parts.join("\n\n")}\n\n` : "";
  const imgHint = opts.hasImages ? "รูปแนบและ" : "";
  return `${intro}กรุณาวิเคราะห์${imgHint}สรุปเป็น JSON ตาม schema ที่กำหนด`;
}

export const MEETING_TRANSCRIBE_SYSTEM_PROMPT = `คุณคือผู้ช่วยถอดเสียงภาษาไทย
หน้าที่: ถอดเสียงจากไฟล์เสียง/วิดีโอเป็นข้อความภาษาไทยเท่านั้น
- ไม่สรุป ไม่ตีความ ไม่เพิ่มหัวข้อ
- คงลำดับการพูดตามที่ได้ยิน
- ถ้ามีหลายคนพูด ให้แยกบรรทัดตามจังหวะการพูด
- ตอบเป็นข้อความถอดเสียงล้วน ๆ ไม่มี markdown`;
