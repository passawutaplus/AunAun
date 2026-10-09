# ชุดเอกสาร Payso (marketplace) — สารบัญ

| ไฟล์ | ใช้ทำอะไร | ส่ง Payso? |
|---|---|---|
| `Payso_Submission_Pack.pdf` / `.html` | เอกสารหลัก: ข้อมูลที่เก็บ, KYC, ขั้นตอนจ่ายเงิน, นโยบายคืนเงิน, เช็กลิสต์ข้อ 4–15 (มีกรอบ “แทรกภาพ F-xx”) | **ใช่** (หลังใส่ภาพและกรอกช่องสีเหลือง) |
| `Screenshot_Guide.md` | คู่มือถ่ายภาพทีละรหัส F-xx + วิธีตั้ง Preview โหมดทดสอบ | ไม่ |
| `INTERNAL_readiness_and_gaps.md` | สิ่งที่ต้องแก้/ตัดสินใจก่อนยื่น และคำถามที่ควรถาม Payso | **ไม่** |
| `findings-so-far.md` | บันทึกข้อเท็จจริงที่ตรวจจากโค้ด/ฐานข้อมูล | ไม่ |

สร้าง PDF ใหม่จาก HTML (Windows, Edge):
`msedge --headless=new --no-pdf-header-footer --print-to-pdf=Payso_Submission_Pack.pdf file:///.../Payso_Submission_Pack.html`
