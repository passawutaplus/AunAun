# Play Console — คำตอบสำหรับแอป com.samecor.app (SAMECOR)

เตรียมไว้ 2026-10-29 จากโค้ดและเว็บ ณ วันนั้น ตรวจกับแอปจริงก่อนกดยืนยันทุกข้อ (เป็นคำประกาศในนามเจ้าของ)

## ⚠ ถ้าแอป Samecor App (com.samecor.app) ถูกลบไปแล้ว (2026-10-29)
Play Console ให้เวลา 7 วันกู้คืนแอปที่ลบ และชื่อแพ็กเกจของแอปที่ลบมักใช้สร้างแอปใหม่ซ้ำไม่ได้ (ผมจำกฎนี้ได้ ยังไม่ได้ยืนยัน) ให้ลองกู้คืนก่อนสร้างใหม่ ถ้ากู้ไม่ได้และสร้างด้วยแพ็กเกจเดิมไม่ผ่าน ต้องเปลี่ยนแพ็กเกจ (แก้ appId ใน capacitor-shell + build.gradle + build ใหม่)

## สร้างแอป
- ชื่อ: Samecor App (ชื่อบน Store แก้ได้ภายหลัง) · แพ็กเกจ: com.samecor.app · ภาษา: ไทย · ประเภท: แอป · ฟรี
- ติ๊กยอมรับ 2 ข้อ (นโยบายนักพัฒนา + กฎหมายส่งออกสหรัฐฯ) ต้องกดเอง

## ข้อมูลสินค้าใน Store
- สั้น: แพลตฟอร์มครีเอทีฟ ค้นพบผลงาน เชื่อมต่อคน และเปิดโอกาสงานใหม่
- เต็ม: ข้อความที่ใส่ไว้แล้วเป็นฉบับร่าง (SAMECOR — You Create. We Connect. …)
- ไอคอน: android/play-icon-512.png (512x512)
- กราฟิกเด่น: android/feature-graphic-1024x500.png (พื้นแดงเต็มภาพ ตรวจกับ Brand Book ก่อน)
- ภาพหน้าจอ 2–8 ภาพ (ขั้นต่ำ 4 ภาพ ≥1080px เพื่อมีสิทธิ์โปรโมต): store-screenshots/ เป็นโลโก้เก่า ถ่ายใหม่

## สถานะ (2026-10-30)
- รุ่น 2 (1.0.1) ผ่านและเผยแพร่ใน Alpha แล้ว (ส่ง 11:37 เผยแพร่ 11:45) · แอปใหม่ Samecor App (com.samecor.app)
- ตัวอย่างข้อความ Store ที่จะเปลี่ยนทีหลัง (ตอนมีภาพหน้าจอใหม่) อยู่ท้ายไฟล์

## งานตั้งค่า (ลำดับตามแดชบอร์ด)
1. นโยบายความเป็นส่วนตัว: https://samecor.com/legal/privacy — ทำแล้ว
2. หมวดหมู่: แอป / ศิลปะและการออกแบบ · อีเมลติดต่อ support@samecor.com · เว็บ https://samecor.com — ทำแล้ว
3. แอปของรัฐบาล: ไม่ — ทำแล้ว
4. ฟีเจอร์ทางการเงิน: ไม่มี (ระบบจ่ายเงิน/ถอนเงินปิดไว้) — ทำแล้ว · ถ้าเปิดทีหลังต้องกลับมาแก้
5. สุขภาพ: ไม่มี — ทำแล้ว
6. โฆษณา: ใช่ (ฟีดมีการ์ดโฆษณา AdCard/HouseAdCard ในโค้ด FeedPage)
7. รายละเอียดการลงชื่อเข้าใช้: ฟังก์ชันบางส่วนจำกัดการเข้าถึง · tester@samecor.com + รหัสผ่านที่ตั้งเอง (ทดสอบว่าล็อกอินได้โดยไม่ต้องรอรหัสทางอีเมลอีก)
8. กลุ่มเป้าหมาย: 18+ เท่านั้น · ไม่ดึงดูดเด็ก
9. การให้คะแนนเนื้อหา: ผู้ใช้โต้ตอบ/แชร์เนื้อหาได้ = ใช่ · ความรุนแรง เนื้อหาทางเพศ ภาษาหยาบ ยาเสพติด การพนัน = ไม่ · แชร์ตำแหน่ง = ไม่ · ซื้อของดิจิทัล = ไม่
10. Data safety
    - รวบรวมข้อมูลผู้ใช้: ใช่ · เข้ารหัสระหว่างส่ง: ใช่
    - วิธีสร้างบัญชี: "ชื่อผู้ใช้ รหัสผ่าน และการตรวจสอบสิทธิ์อื่นๆ" (+ "ชื่อผู้ใช้และรหัสผ่าน") · ไม่ติ๊ก OAuth (ปุ่ม Google ซ่อนในแอป) · ถ้าเปิดปุ่ม Google ในแอปทีหลังต้องเพิ่ม OAuth
    - URL ลบบัญชี: https://samecor.com/legal/delete-account
    - ประเภทข้อมูล: ชื่อ, อีเมล, รหัสผู้ใช้, ที่อยู่, (เบอร์โทรถ้ามีช่องในแอป), รูปภาพ, (วิดีโอถ้าอัปโหลดได้), ข้อความอื่นในแอป, การโต้ตอบกับแอป, ประวัติค้นหาในแอป, เนื้อหาอื่นที่ผู้ใช้สร้าง, บันทึกข้อขัดข้อง, ข้อมูลวินิจฉัย
    - ไม่ติ๊ก: การเงิน, ตำแหน่ง, รายชื่อติดต่อ, ไฟล์, ปฏิทิน, สุขภาพ, รหัสอุปกรณ์
    - ทุกประเภท: รวบรวม = ใช่ · แชร์ = ไม่ (Supabase/Resend/Sentry เป็นผู้ประมวลผล) · ไม่ใช่ชั่วคราว
    - จำเป็น: ชื่อ อีเมล รหัสผู้ใช้ กิจกรรมในแอป ข้อขัดข้อง · ไม่บังคับ: ที่อยู่ เบอร์โทร รูป วิดีโอ ข้อความ เนื้อหาผู้ใช้
    - วัตถุประสงค์: ชื่อ/อีเมล/รหัส = ฟังก์ชันแอป + จัดการบัญชี · เนื้อหา/รูป/ข้อความ = ฟังก์ชันแอป · การโต้ตอบ/ค้นหา = ฟังก์ชันแอป + วิเคราะห์ · ข้อขัดข้อง = วิเคราะห์ · เพิ่ม "โฆษณา" ถ้าข้อมูลถูกใช้กับโฆษณา

## ปิดงาน
- Closed testing: ปลดล็อกหลังตั้งค่าแอปเสร็จ · สร้างรุ่นใน Alpha (หรือแทร็กที่ลิงก์ opt-in ของ provider ใช้)
- อัปโหลด: android/ → capacitor-shell/android/app/build/outputs/bundle/release/app-release.aab (versionCode 2 / 1.0.1, เซ็นแล้ว, SHA-256 81:AE:3B:76:…:D4:F1:42)
- ต้อง ≥12 ผู้ทดสอบ opt-in และทดสอบ ≥14 วัน ก่อนสมัคร production
- ก่อนส่ง provider: สมัคร tester@samecor.com ในแอป, ถ่ายภาพหน้าจอร้านค้าใหม่

## ข้อความ Store ฉบับอังกฤษ + ไทย 1 ย่อหน้า (ไว้เปลี่ยนทีหลัง)
คำอธิบายแบบย่อ:
Discover creative work, connect with makers. ค้นพบผลงานและคุยกับคนทำได้เลย

คำอธิบายแบบเต็ม:
SAMECOR is where creative work gets seen, and the people behind it get connected.

If you're a designer, illustrator, photographer, freelancer or studio, put your work here. Your profile becomes a portfolio you can share with one link, or let someone scan your personal QR code.

Looking for talent? Browse real work by real people. Found a style you like? Message the creator in chat right away, no middleman.

What you can do on SAMECOR
• Post your work and build your own profile
• Browse projects and designers by category: Graphic, Illustration, UX/UI, Motion, Photography, 3D, Architecture
• Chat directly with creators or clients
• Share your profile with a personal QR code

SAMECOR คือที่รวมผลงานครีเอทีฟของคนไทย ลงงานของคุณเพื่อให้คนเห็น หรือเลื่อนดูงานเก่ง ๆ แล้วทักคุยกับคนทำได้เลย ไม่ต้องผ่านตัวกลาง

For ages 18 and over.

Questions or ideas? Reach us at support@samecor.com
samecor.com
