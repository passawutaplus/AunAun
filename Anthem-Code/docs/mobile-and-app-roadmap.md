# Pixel100 (Anthem-Code) — แผน Mobile & Native App

> **อัปเดต:** 2026-06-18  
> **เป้าหมาย:** มือถือใช้งานได้ดี → PWA ติดตั้งได้ → ขึ้น App Store + Google Play  
> **Production:** https://an1hem.app · **Demo:** https://1px-demo.vercel.app

---

## สรุปการตัดสินใจ

| คำถาม | คำตอบ |
|--------|--------|
| แยกโปรเจกต์ใหม่ไหม? | **ไม่** — พัฒนาใน `Anthem-Code/` ต่อ แล้วห่อด้วย Capacitor |
| React Native / Expo? | **ไม่** — rewrite เปลืองเวลา Supabase + UI ใช้ซ้ำไม่ได้ |
| ลิงก์ข้าม platform? | **Web URL เดิม** (`an1hem.app/...`) + deep link ในแอปชี้ route เดียวกัน |
| Backend | **Supabase เดิม** (`zkflkpbmbozrchqncpzi`) — ไม่แยก DB |
| So1o / Ops-Hub | ลิงก์ภายนอกผ่าน `VITE_SO1O_APP_URL` (ดู `docs/ecosystem-unified-account.md`) |

### ทำไมไม่แยก repo แอป

```
Anthem-Code/                 ← แหล่งความจริงเดียว (single source of truth)
├── src/                     React UI + business logic
├── dist/                    build สำหรับ web + Capacitor
├── capacitor.config.ts      (Phase 3)
├── ios/                     (Phase 3)
├── android/                 (Phase 3)
└── docs/mobile-and-app-roadmap.md
```

- แก้ UI ครั้งเดียว → web + app ได้พร้อมกัน
- Auth / Stripe / Chat ใช้โค้ดเดิม
- Store build = `npm run build` + `npx cap sync`

---

## สถานะปัจจุบัน

| มีแล้ว | ยังไม่มี |
|--------|---------|
| `FloatingNav` (pill + FAB) | PWA manifest / service worker |
| `useAppLayout` + `mobileLayout` | Capacitor `ios/` `android/` |
| Chat master-detail mobile | Push notification native |
| Playwright `iPhone 13` project | Mobile smoke ใน CI |
| Supabase auth + realtime chat | Universal links / app scheme |
| `browser-image-compression` | Store listing assets |

---

## ลำดับงานทั้งหมด (Master Sequence)

```
Phase 0  Foundation          ████████░░  เริ่มแล้ว
Phase 1  Mobile UX           ░░░░░░░░░░
Phase 2  PWA                 ░░░░░░░░░░
Phase 3  Capacitor shell     ░░░░░░░░░░
Phase 4  Store submission    ░░░░░░░░░░
Phase 5  App-only features   ░░░░░░░░░░
```

### Phase 0 — Foundation (สัปดาห์ 1) ✅ เริ่มแล้ว

| # | งาน | สถานะ | ไฟล์ |
|---|-----|--------|------|
| 0.1 | ค่าคงที่ layout + safe area | ✅ | `src/lib/mobileLayout.ts` |
| 0.2 | Hook `useAppLayout` | ✅ | `src/hooks/useAppLayout.ts` |
| 0.3 | Floating nav (pill 4 แท็บ + FAB) | ✅ | `src/components/FloatingNav.tsx` |
| 0.4 | `viewport-fit=cover` + theme-color | ✅ | `index.html` |
| 0.5 | ปรับ bottom padding หน้าหลัก | ✅ | `pages/*` |
| 0.6 | FAB ไม่ซ้อน nav (Assistant, Feedback) | ✅ | `AnthemAssistantFab`, `FeedbackFab` |
| 0.7 | รวม breakpoint ใน `useIsMobile` | ✅ | `src/hooks/use-mobile.tsx` |

**DoD:** มือถือไม่มี content/FAB ถูก nav บัง · nav ซ่อนใน chat thread / auth / admin

---

### Phase 1 — Mobile UX Polish (สัปดาห์ 2–3)

| # | งาน | ความสำคัญ |
|---|-----|-----------|
| 1.1 | Bell + badge แจ้งเตือนใน sticky header (ย้ายออกจาก bottom nav) | P0 |
| 1.2 | `navigator.share` ผลงาน / โปรไฟล์ / job | P0 |
| 1.3 | Upload `capture="environment"` ใน Project Editor | P0 |
| 1.4 | Project detail — side panel → bottom sheet | P1 |
| 1.5 | Portfolio editor — step wizard 3 ขั้นบน mobile | P1 |
| 1.6 | Settings — section tabs แนวนอน | P1 |
| 1.7 | Jobs filter → bottom sheet | P2 |
| 1.8 | Chat unread badge บน nav | P1 |
| 1.9 | Playwright `smoke-mobile` project | P1 |

**Journey ที่ต้องผ่านบน iPhone Safari:**
1. Guest เปิดฟีด → login → checklist
2. ลงผลงานจาก FAB
3. แชทงานจ้าง
4. ดูแจ้งเตือนจาก header bell

---

### Phase 2 — PWA (สัปดาห์ 4)

| # | งาน |
|---|-----|
| 2.1 | `vite-plugin-pwa` + `manifest.webmanifest` |
| 2.2 | Icons 192/512 maskable + iOS splash |
| 2.3 | Service worker: cache shell + fonts — **ไม่ cache API** |
| 2.4 | Install prompt (Android) + iOS guide modal |
| 2.5 | Offline fallback page |
| 2.6 | อัปเดต CSP ใน `vercel.json` ถ้าจำเป็น |

**DoD:** Add to Home Screen บน iOS/Android · เปิด offline เห็นหน้า fallback

---

### Phase 3 — Capacitor Native Shell (สัปดาห์ 5–8)

| # | งาน | Plugin / หมายเหตุ |
|---|-----|-------------------|
| 3.1 | `npm i @capacitor/core @capacitor/cli` + `cap init` | `webDir: dist` |
| 3.2 | iOS + Android project | `cap add ios` / `cap add android` |
| 3.3 | Deep links | `@capacitor/app` — `com.pixel100.app://` |
| 3.4 | Universal Links | `an1hem.app/.well-known/apple-app-site-association` |
| 3.5 | OAuth Supabase | redirect: `com.pixel100.app://auth/callback` |
| 3.6 | Push notifications | `@capacitor/push-notifications` + FCM/APNs |
| 3.7 | Status bar + safe area | `@capacitor/status-bar` |
| 3.8 | Keyboard | `@capacitor/keyboard` |
| 3.9 | Share / Camera | `@capacitor/share`, `@capacitor/camera` |
| 3.10 | Stripe checkout | `@capacitor/browser` in-app browser |
| 3.11 | ปรับ `Permissions-Policy` แยก web vs native build |

**โครงสร้างหลัง Phase 3:**

```
npm run build          → dist/
npx cap sync           → copy ไป ios/android
npx cap open ios       → Xcode → TestFlight
npx cap open android   → Android Studio → Play Internal
```

---

### Phase 4 — Store Submission (สัปดาห์ 9–10)

#### Apple App Store

| รายการ | รายละเอียด |
|--------|------------|
| Apple Developer | $99/ปี · Team ID |
| Bundle ID | `com.pixel100.app` (หรือ `app.an1hem.pixel100`) |
| Privacy Nutrition Labels | อีเมล, รูป, ข้อความแชท, analytics |
| Screenshots | 6.7", 6.5", 5.5" + iPad ถ้ารองรับ |
| Review notes | ส่งบัญชีและรหัส demo ให้ผู้รีวิวผ่านช่องทางส่วนตัว |
| Guideline 4.2 | ต้องมี native value (push, share, camera) — ไม่ใช่แค่ web wrap |

#### Google Play

| รายการ | รายละเอียด |
|--------|------------|
| Play Console | $25 ครั้งเดียว |
| Package name | ตรง Bundle ID |
| Data safety form | ตรงกับ Apple privacy |
| Internal testing → Closed → Production |

#### ร่วมกัน

- [ ] Crash reporting: Sentry native SDK (มี `@sentry/react` แล้ว)
- [ ] Versioning: semver ใน `package.json` + `capacitor.config`
- [ ] ไม่เก็บ secret ในแอป — ใช้ Supabase anon key + RLS เท่านั้น

---

### Phase 5 — App-only (หลังขึ้น Store)

| ฟีเจอร์ | ความยาก |
|---------|---------|
| Biometric unlock | กลาง |
| LINE LIFF deep link | กลาง (ดู `docs/setup-line.md`) |
| Background upload หลายรูป | กลาง |
| Widget Daily Drill | สูง |
| Share extension รับรูปเข้า portfolio | สูง |

---

## Floating Nav — แผนที่ปุ่ม

```
[  🏠 หน้าแรก  ]  💼   💬   [avatar]     [ + ]
       │           │    │       │           │
       /        /jobs /chat /portfolio   action sheet
```

| แท็บ | Route | Guest |
|------|-------|-------|
| หน้าแรก | `/` | เปิดได้ |
| งาน | `/jobs` | เปิดได้ |
| แชท | `/chat` | Auth dialog |
| โปรไฟล์ | `/portfolio` | Auth dialog |

**FAB +** → bottom sheet:
- ลงผลงาน → `/portfolio/new`
- โพสต์ชุมชน → `/community/new`
- โพสต์งาน → `/jobs?post=1`

**แจ้งเตือน** → header bell `/notifications` (Phase 1.1)

---

## ลิงก์ข้าม Platform

### Web ↔ App

| ประเภท | Web | App |
|--------|-----|-----|
| โปรไฟล์ | `https://an1hem.app/@username` | deep link → route เดียวกัน |
| ผลงาน | `/project/:id` | เหมือนกัน |
| OAuth callback | `https://an1hem.app/auth/callback` | `com.pixel100.app://auth/callback` |

### Ecosystem (ลิงก์ภายนอก ไม่ embed)

| จาก Pixel100 | ไป |
|--------------|-----|
| อัปเกรด Pro | `VITE_SO1O_APP_URL` → So1o |
| Ops | `VITE_OPS_HUB_URL` |

Session **ไม่แชร์** ข้ามโดเมน (cookie แยก) จนกว่าจะทำ SSO — ดู `docs/ecosystem-unified-account.md`

---

## Auth บนแอป (Phase 3)

```
1. User กด Login
2. supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })
   redirectTo = Capacitor ? app scheme : https://an1hem.app/auth/callback
3. App / Browser กลับมาพร้อม code
4. AuthCallbackPage → session → navigate ต่อ
```

เพิ่มใน Supabase Dashboard → Authentication → URL Configuration:
- `com.pixel100.app://auth/callback`
- `https://an1hem.app/auth/callback` (มีแล้ว)

---

## Push Notification (Phase 3)

```
Edge notify-anthem (มี in-app แล้ว)
  → บันทึก ecosystem_notifications
  → ส่ง FCM/APNs ด้วย device token
  → Capacitor Push listener
  → navigate(/chat/:id หรือ /notifications)
```

ดู `docs/ecosystem-notifications.md`

---

## Testing

### อุปกรณ์บังคับ

| Device | Viewport |
|--------|----------|
| iPhone 13/14 | 390×844 |
| iPhone SE | 375×667 |
| Pixel 7 | 412×915 |

### คำสั่ง

```bash
cd Anthem-Code
npm run dev                    # local
npm run e2e:smoke              # desktop smoke
npx playwright test --project=mobile   # mobile e2e (Phase 1.9 เพิ่ม smoke-mobile)
```

### Performance gates

| Metric | Target |
|--------|--------|
| Lighthouse Mobile | ≥ 70 |
| LCP (4G) | < 2.5s |

---

## สิ่งที่ไม่ควรทำ

1. Rewrite React Native
2. แยก repo แอปที่ fork UI คนละชุด
3. Mobile admin (ใช้ desktop / Ops-Hub)
4. Offline-first ทั้งแอป
5. ขึ้น Store ก่อน Phase 1 UX polish (review โดน reject "minimum functionality")

---

## Checklist ก่อนยื่น Store

- [ ] Phase 1 journey ผ่านบน iPhone Safari จริง
- [ ] Push notification ทำงาน
- [ ] OAuth Google/Email บนแอป
- [ ] อัปโหลดรูปจาก camera
- [ ] Stripe / top-up ผ่าน in-app browser
- [ ] Privacy policy URL ใน store listing → `/legal/privacy`
- [ ] Demo account ใน review notes
- [ ] ไม่มี crash บน cold start

---

## เอกสารที่เกี่ยวข้อง

| ไฟล์ | ใช้เมื่อ |
|------|---------|
| `docs/ux-research-review.md` | QA manual (สร้างเมื่อมี) |
| `../docs/MANUAL-TESTING.md` | iPhone Safari checklist |
| `../docs/ecosystem-unified-account.md` | บัญชีร่วม So1o |
| `../docs/ecosystem-notifications.md` | Push + in-app |
| `../docs/scale-readiness-checklist.md` | PWA cache policy |
| `../docs/setup-line.md` | LINE LIFF |

---

## Decision Log

| วันที่ | การตัดสินใจ | เหตุผล |
|--------|-------------|--------|
| 2026-06-18 | พัฒนาใน Anthem-Code + Capacitor | reuse React/Supabase |
| 2026-06-18 | FloatingNav แทน BottomNav 5 ช่อง | แชทใน nav + FAB สร้างงาน |
| 2026-06-18 | แจ้งเตือนย้ายไป header | ลดความแออัดใน bottom nav |

---

## Sprint ถัดไป (ทำต่อจากนี้)

1. **Phase 1.1** — `MobileHeader` + bell badge ใน Feed / Portfolio
2. **Phase 1.2** — `shareContent()` utility + ใช้ใน ProjectDetail
3. **Phase 1.8** — unread count บนแท็บแชท
4. **Phase 1.9** — `smoke-mobile` ใน `playwright.config.ts`
5. **Phase 2.1** — ติดตั้ง `vite-plugin-pwa`
