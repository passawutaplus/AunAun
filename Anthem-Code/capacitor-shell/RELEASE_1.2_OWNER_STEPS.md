# อัปเดตแอป: Android 1.2.0 (versionCode 6) + iOS 1.1.0 — ขั้นตอนของเจ้าของ

ของใหม่ในแอปทั้งสอง:
- เข้าสู่ระบบด้วย Google / LINE / Facebook ในแอปได้แล้ว (เปิดหน้า login ใน browser ของเครื่อง แล้วเด้งกลับเข้าแอป)
- iPhone มี **Sign in with Apple** (Apple บังคับ ข้อ 4.8 เมื่อมี login ของเจ้าอื่น)
- ตั้งค่า → บัญชี → **บัญชีที่เชื่อมไว้** ใช้ในแอปได้แล้ว
- ลิงก์ samecor.com (ผลงาน โปรไฟล์ อีเวนต์ แชท ฯลฯ) เปิดในแอปเลย
- ลืมรหัสผ่านจากในแอป → ลิงก์ในอีเมลพากลับเข้าแอป
- ให้คะแนนแอปด้วยหน้าต่างของ store เอง (App Store / Google Play) แทนดาวของเรา
- Android: แจ้งเตือน push (FCM), บันทึกไฟล์ลง Download, พิมพ์, แชร์ผ่านเมนูของเครื่อง

เว็บเปลี่ยนตามอัตโนมัติเมื่อ merge (ไม่กระทบเว็บและแอปเวอร์ชันเก่า: ของใหม่เปิดเฉพาะแอปที่บอกว่าทำได้)

ทำตามลำดับนี้ ข้อที่มี ⚠️ ถ้าข้าม แอปจะ build ไม่ผ่านหรือฟีเจอร์ใช้ไม่ได้

---

## A. Supabase (ทำก่อน build)

1. ⚠️ **Redirect URL:** Supabase → Authentication → URL Configuration → Redirect URLs → Add URL
   `https://samecor.com/auth/app-return**` → Save
2. ⚠️ **Apple provider:** Authentication → Sign In / Providers → **Apple** → Enable
   - **Client IDs:** `com.samecor.app`
   - ช่อง Secret Key (for OAuth) เว้นว่างได้ เพราะเราใช้ Apple แบบ native ในแอป iOS เท่านั้น
   - Save
3. ⚠️ **Migration:** SQL Editor → วางไฟล์ `Solo-Code/supabase/migrations/20261120100000_android_fcm_tokens.sql` → Run
4. ⚠️ **Secret FCM** (หลังทำข้อ B4): Edge Functions → Secrets → Add `FCM_SERVICE_ACCOUNT` = เนื้อหาไฟล์ JSON ทั้งไฟล์
5. **Deploy send-push** (หลัง merge PR ของ Solo-Code) ใน PowerShell:

```powershell
cd F:\So1o\wt-paper\Solo-Code
npx supabase functions deploy send-push
```

6. ⚠️ **LINE / Facebook ต้องเปิดให้คนทั่วไปใช้ได้ก่อนส่งรีวิว**
   - LINE Developers → channel 2012407762 (LINE Login) → สถานะต้องเป็น **Published** (ถ้ายัง Developing จะ login ได้แค่ admin/tester)
   - Meta for Developers → app 971596228897650 → App Mode ต้องเป็น **Live**
   - ถ้ายังไม่พร้อม: ลบ `facebook` หรือ `line` ออกจาก `VITE_AUTH_EXTRA_PROVIDERS` ใน Vercel แล้ว redeploy (ปุ่มจะหายทั้งเว็บและแอป)

## B. Firebase (push ของ Android)

1. https://console.firebase.google.com → **Create a project** → ชื่อ `SAMECOR` → ปิด Google Analytics ได้ → Create
2. หน้า project → ไอคอน Android → **Android package name:** `com.samecor.app` → App nickname `SAMECOR Android` → Register app
   (ช่อง SHA-1 ไม่ต้องใส่)
3. ⚠️ ดาวน์โหลด `google-services.json` → วางที่ `F:\So1o\wt-paper\Anthem-Code\capacitor-shell\android\app\google-services.json`
   - ไฟล์นี้ถูก gitignore ไว้แล้ว **ห้าม commit** (repo เป็น public)
   - ถ้าไม่มีไฟล์นี้ คำสั่ง build release จะหยุดพร้อมข้อความเตือน (กันลืม)
4. ⚙️ Project settings → **Service accounts** → **Generate new private key** → ได้ไฟล์ JSON → เอาไปใส่ข้อ A4
   แล้วเก็บไฟล์ไว้ที่ปลอดภัยหรือลบทิ้ง (ห้ามใส่ใน repo)
5. Project settings → **Cloud Messaging** → ดูว่า "Firebase Cloud Messaging API (V1)" เป็น **Enabled**

## C. Apple Developer (ก่อน build iOS)

1. ⚠️ https://developer.apple.com/account → Certificates, Identifiers & Profiles → **Identifiers** → `com.samecor.app`
   → ติ๊ก **Sign In with Apple** (Enable as a primary App ID) และ **Associated Domains** → Save → Confirm
2. ⚠️ **Profiles** → ลบ profile App Store ของ `com.samecor.app` อันเดิม (ตัวเก่าไม่มีสิทธิ์ใหม่ → Codemagic จะสร้างใหม่ให้เอง)
3. App Store Connect → แอป Samecor → **+ (เพิ่มเวอร์ชัน)** → iOS → `1.1.0`

## D. Build

**Android 1.2.0** (PowerShell, หลัง merge PR แล้ว `git pull` ที่ main) — build ที่ `F:\So1o\wt-paper` เท่านั้น (keystore + google-services.json อยู่ที่นั่น):

```powershell
cd F:\So1o\wt-paper\Anthem-Code\capacitor-shell
npm install
npx cap sync android
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot"
$env:SAMECOR_KEYSTORE_PASSWORD = [Net.NetworkCredential]::new('', (Read-Host "Keystore password" -AsSecureString)).Password
cd android
.\gradlew.bat bundleRelease
Remove-Item Env:SAMECOR_KEYSTORE_PASSWORD
```

ไฟล์ที่ได้: `android\app\build\outputs\bundle\release\app-release.aab` (versionCode 6, 1.2.0)

**iOS 1.1.0:** Codemagic → AunAun → Start new build → workflow **iOS → TestFlight** → branch `main`
(ประมาณ 15 นาที + Apple ประมวลผล 10–30 นาที)

## E. ทดสอบบนเครื่องจริง (ก่อนส่งรีวิว)

**Android:** Play Console → ทดสอบภายใน (Internal testing) → สร้างรุ่นใหม่ → อัปโหลด AAB → ติดตั้งจากลิงก์ทดสอบ
(ติดตั้งผ่าน Play จะได้ลายเซ็นเดียวกับของจริง ทำให้ App Links ทำงาน)

| # | ทดสอบ | ผลที่ต้องได้ |
|---|---|---|
| 1 | หน้าเข้าสู่ระบบ → Google | เปิด Chrome แบบแท็บในแอป → เลือกบัญชี → กลับเข้าแอปและล็อกอินแล้ว (ถ้าเห็นหน้า "กลับไปที่แอป SAMECOR" ให้กดปุ่มแดง 1 ครั้ง) |
| 2 | LINE และ Facebook | เหมือนข้อ 1 |
| 3 | ตั้งค่า → บัญชี → บัญชีที่เชื่อมไว้ → เชื่อม Google | กลับมาหน้า ตั้งค่า และขึ้นว่าเชื่อมแล้ว |
| 4 | ออกจากระบบ → ลืมรหัสผ่าน → เปิดลิงก์ในอีเมลบนมือถือเครื่องเดียวกัน | เข้าหน้าตั้งรหัสใหม่ในแอป |
| 5 | ส่งลิงก์ `https://samecor.com/showcase/...` ใน LINE แล้วกด | เปิดในแอป (ถ้าเปิดใน Chrome: ตั้งค่าเครื่อง → แอป → SAMECOR → เปิดโดยค่าเริ่มต้น → ดูว่า samecor.com ถูกยืนยันแล้ว) |
| 6 | ตั้งค่า → การแจ้งเตือน → เปิด → อนุญาต แล้วให้อีกบัญชีทักแชท/กดติดตาม | แจ้งเตือนเด้ง มีไอคอน SAMECOR กดแล้วเปิดหน้าที่เกี่ยวข้อง |
| 7 | ดาวน์โหลด QR โปรไฟล์ / export CSV / ไฟล์แนบในแชท | toast "บันทึก … ไว้ในโฟลเดอร์ Download แล้ว" หรือแจ้งเตือนดาวน์โหลด และเปิดไฟล์ในแอป Files ได้ |
| 8 | เอกสาร (ใบเสนอราคา/ใบแจ้งหนี้) → พิมพ์ | หน้าต่างพิมพ์ของ Android → Save as PDF ได้ |
| 9 | ปุ่มแชร์ผลงาน | เมนูแชร์ของ Android |
| 10 | ปุ่มย้อนกลับ, ดึงรีเฟรช, สีแถบด้านบน | เหมือนเดิม |

หน้าต่างให้คะแนนของ Google Play มักไม่ขึ้นในรุ่นทดสอบ (ขึ้นจริงหลังเผยแพร่)

**iPhone (TestFlight):**

| # | ทดสอบ | ผลที่ต้องได้ |
|---|---|---|
| 1 | หน้าเข้าสู่ระบบ → ปุ่ม Apple (ซ้ายสุด) | หน้าต่าง Apple ขึ้น → Face ID → ล็อกอินแล้ว (บัญชีใหม่ได้ชื่อจาก Apple) |
| 2 | Google / LINE / Facebook | ขึ้นถาม "SAMECOR ต้องการใช้ supabase.co เพื่อลงชื่อเข้า" → Continue → login → กลับเข้าแอปเอง |
| 3 | ตั้งค่า → บัญชีที่เชื่อมไว้ → เชื่อม Apple และ Google | ขึ้นว่าเชื่อมแล้ว |
| 4 | ลืมรหัสผ่าน → เปิดลิงก์ในอีเมล | Safari → ถาม "เปิดใน SAMECOR?" → เปิด → หน้าตั้งรหัสใหม่ในแอป |
| 5 | กดลิงก์ `https://samecor.com/showcase/...` ใน Notes หรือ LINE | เปิดในแอป (ลิงก์ที่พิมพ์ในช่องที่อยู่ของ Safari จะไม่เปิดแอป เป็นปกติของ iOS) |
| 6 | **Push ครั้งแรกของ iPhone**: ตั้งค่า → การแจ้งเตือน → เปิด แล้วให้อีกบัญชีทักแชท | แจ้งเตือนเด้ง กดแล้วเปิดแชท |
| 7 | หน้าเข้าสู่ระบบ → แตะช่องอีเมล | iOS เสนอรหัสผ่าน samecor.com ที่บันทึกไว้ (ถ้ามี) |
| 8 | แชร์ / พิมพ์ / บันทึกไฟล์ | เหมือนเวอร์ชัน 1.0.0 |

TestFlight ไม่แสดงหน้าต่างให้คะแนนของ App Store (Apple ปิดไว้) จะเห็นได้หลังขึ้น store แล้วเท่านั้น

## F. ส่งรีวิว (รอบเดียวกันทั้งสอง store)

**App Store 1.1.0**
- App Review Information → Notes: วางข้อความจาก `Anthem-Code/ios/review-notes.md` (ส่วนหลังเส้น ---)
- Sign-in: `tester@samecor.com` + รหัสผ่าน (เจ้าของพิมพ์เอง)
- App Privacy: ไม่ต้องเพิ่มประเภทข้อมูล (ชื่อ อีเมล รหัสผู้ใช้ มีอยู่แล้ว) ดู `Anthem-Code/ios/app-privacy.md`
- What's New:
  - TH: `เข้าสู่ระบบด้วย Apple, Google, LINE, Facebook ได้ในแอปแล้ว · ลิงก์ samecor.com เปิดในแอปเลย · ลืมรหัสผ่านก็กลับเข้าแอปได้ทันที`
  - EN: `Sign in with Apple, Google, LINE or Facebook right in the app · samecor.com links now open in the app · Password reset links bring you back to the app`

**Google Play 1.2.0**
- Production → สร้างรุ่นใหม่ → ใช้ AAB เดียวกับที่ทดสอบ (versionCode 6)
- Release notes (≤500 ตัวอักษร):
  - th-TH: `เข้าสู่ระบบด้วย Google, LINE, Facebook ได้ในแอปแล้ว · แจ้งเตือนแชท ผู้ติดตาม และผลงานของคุณ · ลิงก์ samecor.com เปิดในแอปเลย · บันทึกไฟล์ พิมพ์ และแชร์ผ่านเมนูของเครื่อง`
  - en-US: `Sign in with Google, LINE or Facebook in the app · Notifications for chats, followers and your work · samecor.com links open in the app · Save files, print and share with your phone's menus`
- **Data safety:** "Device or other IDs" มีอยู่แล้ว แก้คำอธิบายเป็น push token (FCM) ตาม `Anthem-Code/android/data-safety.md` ถ้า Play ถาม
- App access: ใช้บัญชี tester เดิม

## สิ่งที่ยังไม่ได้ทดสอบ (ต้องดูบนเครื่องจริง)

- โค้ด Android compile ผ่านบน PC นี้ (debug build) แต่ยังไม่ได้ลงเครื่องจริง ทุกข้อในตาราง E
- โค้ด iOS ยังไม่ได้ compile (ไม่มี Mac) → build แรกบน Codemagic คือการตรวจ compile
- Push ของ iPhone ยังไม่เคยมีเครื่องจริงลงทะเบียน (ตั้งแต่ 1.0.0)
- การเด้งกลับจาก Chrome แท็บในแอปบน Android: บางเครื่อง Chrome อาจไม่เด้งเอง ต้องกดปุ่มแดง "เปิดแอป SAMECOR" 1 ครั้ง
- Sign in with Apple + ลบบัญชี: ยังไม่ได้เรียก revoke token ของ Apple ตอนลบบัญชี (ดู `Anthem-Code/ios/README.md`)
