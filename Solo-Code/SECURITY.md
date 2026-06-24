# Security Policy

ขอบคุณที่ช่วยให้ So1o Freelancer Management ปลอดภัยขึ้น

## Supported versions

เรา patch เฉพาะ build ปัจจุบันที่ deploy อยู่ที่ https://solofreelancer.com

## Reporting a vulnerability

หากพบช่องโหว่ **อย่า** เปิด GitHub issue สาธารณะ ส่งรายงานมาที่:

📧 **security@solofreelancer.com** *(owner: โปรดเปลี่ยนเป็น email จริงก่อน publish)*

หรือใช้ encrypted channel: ขอ PGP key ผ่าน email ด้านบน

## What to include

ดูเอกสาร [`docs/pentest-scope.md`](./docs/pentest-scope.md) — เราต้องการ:

1. รายละเอียดช่องโหว่
2. Steps to reproduce
3. Proof of concept (screenshot / video / curl)
4. Impact assessment
5. (optional) Suggested fix

## Our commitment

- **Acknowledge** ภายใน 72 ชั่วโมง
- **Triage + severity rating** ภายใน 7 วัน
- **Fix timeline:** Critical < 7 วัน, High < 30 วัน, Medium < 90 วัน
- **Credit** in `docs/security-hall-of-fame.md` (ถ้าคุณยินยอม)

## Safe harbor

เรา **ไม่ดำเนินคดี** กับนักวิจัยที่ทำตามเงื่อนไขทั้งหมดนี้:

- รายงานช่องโหว่ผ่านช่องทางด้านบนก่อน public disclose
- ไม่ทำลายข้อมูล ไม่ exfiltrate ข้อมูล user จริง
- หยุดทันทีเมื่อเข้าถึงข้อมูล sensitive ของ user จริงโดยไม่ตั้งใจ
- ไม่ทำ DoS / volumetric attack
- ปฏิบัติตาม 90-day coordinated disclosure window

## Out of scope

- Supabase managed infrastructure
- Cloudflare / Lovable platform
- Physical / social engineering ของทีม
- Third-party services (Google Fonts, GA)

รายละเอียดเต็มใน [`docs/pentest-scope.md`](./docs/pentest-scope.md)

## Bug bounty

ตอนนี้ **ยังไม่มี monetary bounty** — เรา offer:

- Public credit (ถ้าคุณยินยอม)
- Lovable swag (มี supply จำกัด)
- พิจารณา bounty case-by-case สำหรับ Critical findings ที่ impact สูง

## Vulnerability disclosure timeline

| วัน | กิจกรรม |
|---|---|
| 0 | ส่งรายงาน |
| 1-3 | Acknowledge |
| 7 | Triage + severity assigned |
| ตาม severity | Fix deployed |
| Fix + 7 | คุณยืนยัน fix |
| Fix + 90 | Public disclosure (coordinated) |

ขอบคุณที่ช่วยให้ freelancer ไทยใช้แอปอย่างปลอดภัย 🙏
