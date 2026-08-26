# Aplus1 Web Audit Checklist

เช็คลิสต์รวมสำหรับพัฒนาเว็บ Aplus1 ไปเช็คไป — **ไม่ใช่ลิสต์ 300 ข้อ**  
ใช้จัดระดับสิ่งที่เจอ ไม่ใช่ไล่ติ๊กทุกข้อจากภายนอก

Production: https://aplus1.app · Demo: https://aplus1-demo.vercel.app

คู่มือคนละชั้น:

| เอกสาร | ใช้เมื่อ |
|--------|----------|
| **ไฟล์นี้** | คุณภาพเว็บทั้งก้อน (UI→deploy) + คะแนน + ของที่ต้องแก้ |
| [qa-checklist.md](./qa-checklist.md) | QA มือก่อน release (browser / viewport / form) |
| [ux-research-review.md](./ux-research-review.md) | วิจัยผู้ใช้ระบบ A–W |
| [seo-deploy.md](./seo-deploy.md) | SEO ก่อนขึ้น production |
| [release-gate-aplus1.md](./release-gate-aplus1.md) | เกตก่อน production (DB / payment / rollback) |
| [performance.md](./performance.md) | กฎเขียนโค้ดเรื่องความเร็ว |

แหล่งที่ merge แล้วตัดข้อที่ไม่เข้า Aplus1:

- [Front-End Checklist](https://github.com/thedaviddias/Front-End-Checklist)
- [Website Launch Checklist](https://github.com/MarketingPipeline/Website-Launch-Checklist)
- [OWASP Web Checklist](https://github.com/0xRadi/OWASP-Web-Checklist) — **เฉพาะเกตป้องกัน** ไม่ทำขั้นตอนโจมตี
- [Web Launch Checklist](https://weblaunchchecklist.josephgiancola.com/)
- Checklist Design (Login / Feed / Onboarding / Empty / 404 / Search)
- skill ภายใน: `UX_UI_RULES`, `SECURITY_CHECKLIST`, `RELEASE_CHECKLIST`

ตัดทิ้งตั้งใจ: print CSS, IE, Flash, ที่อยู่ร้านค้า, RTL/hreflang จนกว่ามี EN, mutation testing, PoC โจมตี

---

## วิธีใช้

1. เลือกหมวดที่งานแตะ — ไม่ต้องทั้งต้นไม้ทุก PR
2. ตรวจเกตในหมวดนั้น แล้วติดสีตามหลักฐาน (โค้ด + หน้าจอ + Lighthouse)
3. ส่งผลแบบ scorecard ด้านล่าง ไม่ส่งลิสต์ยาว
4. ปิดงานเมื่อ **ไม่มี 🔴** ในหมวดที่แตะ และ 🟠 ถูกแก้หรือจดเหตุผล

### ระดับ

| | ความหมาย | ทำเมื่อไหร่ |
|---|---|---|
| 🔴 Critical | พัง ranking, a11y พื้นฐาน, หรือความปลอดภัย | ก่อน merge / ก่อนขึ้น prod |
| 🟠 High | ผู้ใช้ติดหรือ brand พังชัด | sprint ปัจจุบัน |
| 🟡 Medium | ควรมีก่อน public launch | backlog มีเจ้าของ |
| 🔵 Low | ดีถ้ามี ไม่บล็อกเปิด | เวลาว่าง |
| 🟢 Good | ผ่านแล้ว — อย่าทำให้พังตอนแก้ข้ออื่น | เก็บไว้ |

### รันเมื่อไหร่

| จังหวะ | หมวดที่ต้องไล่ |
|--------|----------------|
| PR หน้าเว็บ | UI/Visual + UX ของหน้านั้น + a11y เบื้องต้น |
| PR auth / upload / admin / money | Security ทั้งหมวด |
| ก่อน demo reviewer | UX + Mobile + Functional |
| ก่อน production | ทั้งต้นไม้ + Lighthouse ใหม่ + [release-gate](./release-gate-aplus1.md) |

ตัวอย่างคำสั่งหลักฐาน:

```bash
cd Anthem-Code
npm run smoke:public
npm run e2e:seo
# Lighthouse: scripts/run-performance.mjs (อย่าใช้ไฟล์ .tmp-lh-desktop.json เก่า)
```

---

## ต้นไม้เกต

ข้อที่ **เพิ่มจากโครงเดิม** ทำเครื่องหมาย `★`

### UI / Visual

- [ ] Spacing — จังหวะ 8px scale, ไม่ชนกัน ไม่โล่งเกินจนดูว่าง
- [ ] Typography — อ่านได้บนมือถือ, ไม่พึ่ง placeholder เป็น label
- [ ] Hierarchy — รู้ title / context / ปุ่มหลัก ใน 3 วินาที
- [ ] Consistency — สี มุมปุ่ม โทนเดียวกันทั้งหน้า
- [ ] Responsive — 360px ไม่ล้น, 1280px ไม่แตกแถวแปลก
- [ ] ★ Thai-first copy — หัวข้อ/CTA ภาษาไทย ไม่ใช่ประโยคอังกฤษลอย
- [ ] **"AI-looking UI" detection** — ถ้าเจอให้ 🟠:
  - หัวข้ออังกฤษกลางหน้าไทย, emoji ใน heading, sparkles ตกแต่งเปล่า
  - ม่วง/gradient ลอยไม่มีแบรนด์, glow ปุ่มเกิน, copy กลาง ๆ แบบ template
  - ปุ่มข้ามเป็น CTA หลักทั้งที่ยังไม่ได้ value

### UX

- [ ] Navigation — รู้ว่าอยู่ไหน ไปไหนต่อใน 10 วินาที
- [ ] Onboarding — มี skip จริง, มี progress, first action คือลงงาน/ตั้งโปรไฟล์ ไม่ใช่ข้าม
- [ ] ★ Overlay stacking — cookie / onboarding / toast ไม่ซ้อนกันบังเนื้อหา (โดยเฉพาะมือถือ)
- [ ] Empty states — บอกว่าทำไมว่าง + next action; แยกจาก error
- [ ] Loading states — skeleton, ไม่ flash ว่างก่อนข้อมูลมา
- [ ] Error states — บอกทำต่อได้, ไม่โชว์ stack/DB
- [ ] Success states — toast/inline ชัด, ไม่บังปุ่มสำคัญ
- [ ] Mobile UX — bottom nav, คีย์บอร์ด, modal scroll, นิ้วโป้งถึง CTA
- [ ] ★ Guest action — like/hire/follow เปิด auth ชัด ไม่หลงว่าสำเร็จแล้ว

### Accessibility

- [ ] WCAG AA พื้นฐาน — `lang`, viewport, charset, heading ลำดับ
- [ ] Contrast — ข้อความ ≥ 4.5:1 (อย่าใช้สีแบรนด์ส้มเป็นตัวหนังสือบาง)
- [ ] Keyboard — tab ครบ, focus ring เห็น, ไม่ติดใน modal
- [ ] ★ Skip link — Tab แรกถึง “ข้ามไปเนื้อหาหลัก” ได้จริง (ไม่โดน overlay ชิง)
- [ ] ARIA — ปุ่มไอคอนมีชื่อ, dialog มี title, live region สำหรับ error/toast
- [ ] Form labels — ผูก `label` กับ field, error อยู่ใกล้ช่อง
- [ ] Screen reader — อย่างน้อย 1 รอบ NVDA หรือ VoiceOver ก่อน public
- [ ] ★ Reduced motion / touch target ≥ 44px / ไม่ปิด pinch-zoom

### SEO

- [ ] Metadata — title + description ไม่ซ้ำทุกหน้า
- [ ] OG + Twitter — แท็กครบ, รูป 1200×630, **ไม่ใช่ไฟล์ leftover จาก Lovable**
- [ ] Sitemap — `/sitemap-index.xml` ครอบคลุมหน้า index ได้
- [ ] robots.txt — Disallow ของ private, ชี้ sitemap
- [ ] Canonical — absolute, ตัด query
- [ ] Structured data — JSON-LD ตรงประเภทหน้า
- [ ] ★ HTTP status — หน้าไม่มีจริงต้อง **404 จริง** ไม่ใช่ SPA 200 (soft 404)
- [ ] ★ Bot preview — crawler ได้ meta จาก `/api/seo-preview`
- [ ] ★ Search Console — ส่ง sitemap แล้ว (มือ)

### Performance

- [ ] LCP &lt; 2.5s
- [ ] CLS &lt; 0.1
- [ ] INP / TBT ดี (ปุ่มตอบใน ~200ms)
- [ ] ★ Fonts — ≤ 2–3 ครอบครัวบน critical path, ไม่โหลด 10+ Google Fonts ทุกหน้า
- [ ] Images — ขนาดถูก, lazy ใต้พับ, กว้าง×สูงกัน CLS, LCP ไม่ lazy
- [ ] JS bundle — ไม่ส่งหน้า admin/chat มาหน้าแรก, วัด unused JS
- [ ] Lazy loading — ใต้พับ / import-on-interaction

เป้า Lighthouse (จาก [qa-checklist.md](./qa-checklist.md)): mobile ≥ 70, desktop ≥ 90

### Security *(ป้องกัน — ห้ามเขียน exploit / PoC โจมตี)*

- [ ] Auth — PKCE, redirect sanitize, logout แล้ว refresh ยังออก, forgot password
- [ ] RLS — table มี user data เปิด RLS, admin ใช้ `has_role` ไม่ใช่ซ่อนปุ่ม
- [ ] API — ไม่ trust amount จาก client, rate limit เส้นช้า
- [ ] Secrets — ไม่มี service_role / Stripe secret ใน bundle
- [ ] Uploads — whitelist MIME + ขนาด, bucket public/private ถูก
- [ ] Permissions — `/admin` กันที่เซิร์ฟเวอร์/RPC
- [ ] ★ Headers — HTTPS, HSTS, CSP (ไม่เปิด CDN สุ่ม), XFO, nosniff, Referrer, Permissions-Policy
- [ ] ★ Session — ไม่เก็บ token ใน localStorage ถ้าเลี่ยงได้; cookie มี Secure / HttpOnly / SameSite

### Privacy ★ *(หมวดใหม่ — ไม่มีในโครงแรก)*

- [ ] Cookie banner ก่อน analytics; ปฏิเสธได้
- [ ] ลิงก์ข้อกำหนด + นโยบายความเป็นส่วนตัวจากหน้า auth และ footer
- [ ] ลบบัญชี / ลบข้อมูลส่วนตัวมีทาง

### Functional QA

- [ ] Buttons — กดได้, disabled ตอน submit, hover/focus เห็น
- [ ] Forms — validation ใกล้ช่อง, แสดงรหัสผ่าน, ไม่บล็อก paste
- [ ] Links — ไม่พัง, external มี `rel="noopener"`
- [ ] Search — ช่องค้นหา, คำค้นค้าง, ★ **บอกจำนวนผล**, empty มีทางออก
- [ ] Filters — เห็นว่ากรองอะไรอยู่, ล้างได้
- [ ] CRUD — สร้าง/แก้/ลบงานหรือโปรไฟล์แล้วข้อมูลตรง, มี undo หรือยืนยันตอนลบ

### Production

- [ ] 404 — หน้าแบรนด์ + ทางกลับบ้าน; ★ สถานะ HTTP ตรง
- [ ] 500 — ErrorBoundary + หน้า error ไม่โชว์ internals
- [ ] Favicon — `<link rel="icon">` + PWA icons ใน `/icons` มีไฟล์จริง
- [ ] Analytics — GA4 หลัง consent + `VITE_GA_MEASUREMENT_ID`
- [ ] Monitoring — Sentry เปิดบน production
- [ ] Backup — path restore ทดสอบแล้ว ([backup-restore.md](../../docs/backup-restore.md))
- [ ] Deployment — `VITE_DEMO_MODE=false` บน prod, smoke หลังขึ้น
- [ ] ★ Offline fallback (`offline.html` / SW) — มีและไม่แคช HTML เก่าพัง

---

## Snapshot — 14 ส.ค. 2026

ดูจากโค้ด `Anthem-Code/`, ภาพ `.tmp-checklist-audit`, Lighthouse desktop ของ aplus1.app **10 ก.ค. 2026** (เก่ากว่าภาพประมาณ 1 เดือน)

ขอบเขตรอบนั้น: guest feed, login/signup, onboarding, search empty, 404, skip link, cookie, mobile — **ยังไม่เดิน hire/chat/cashout ครบ**

```
🔴 CRITICAL — 2
🟠 HIGH     — 9
🟡 MEDIUM   — 14
🔵 LOW      — 6
```

| หมวด | คะแนน | โน้ต |
|------|------:|------|
| UI/UX | 74% | Hierarchy ดี; copy อังกฤษ + overlay ดึงลง |
| Accessibility | 71% | Label มี; contrast ส้มบนขาวไม่ผ่าน AA |
| SEO | 68% | Meta ครบ; Lighthouse SEO 100 ทำให้เข้าใจผิด |
| Performance | 58% | Lighthouse 66; **LCP 4.3s** |
| Security | 73% | Headers/admin ดี; token ใน localStorage |
| Mobile | 80% | Login/feed ใช้ได้ |
| Functionality | 86% | Search/filter/login ทำงานในภาพที่จับ |
| Production | 75% | UI 404 มี; HTTP ยัง 200 |

Lighthouse 10 ก.ค.: Performance 66 · Accessibility 91 · Best Practices 93 · SEO 100

### Top 10 ที่ต้องแก้

### Top 10 things to fix (อัปเดต Aug 2026)

1. ✅ LCP — ตัด Google Fonts 12 ครอบครัวออกจาก `index.html`; brand/editor โหลด async
2. ✅ Soft 404 (bots) — `seo-preview` คืน HTTP 404 เมื่อ path ไม่รู้จัก / โปรเจกต์หาย; SPA ใส่ `noindex` บน NotFound
3. ✅ Contrast — `--primary` ลด lightness เป็น 42% (AA text-on-white)
4. ✅ OG image — เปลี่ยนจาก Lovable เป็น `/icons/icon-512.png`
5. ✅ Overlay ซ้อน — survey ไม่บังคับบน DEV ทุกครั้ง; รอ cookie ก่อน (เดิมมีแล้ว)
6. ✅ Onboarding → ลงงานแรก — หลังบันทึกพาไป `/portfolio/new` + CTA toast
7. 🟡 Session token ใน localStorage — SPA + PKCE; ปิด “จดจำฉัน” ใช้ sessionStorage; ยังไม่มี httpOnly BFF
8. ✅ CSP — ตัด `unpkg.com`; ffmpeg ใช้ self-hosted เท่านั้น (`unsafe-inline` style ยังต้องมีสำหรับ Tailwind)
9. ✅ Skip link — ย้ายเป็นลูกแรกของ shell + z-index เหนือ overlay
10. ✅ Search แสดงจำนวนผลลัพธ์ — toolbar + grids

### ที่ผ่านแล้ว (อย่าทำให้พัง)

HTTPS / HSTS / X-Frame-Options · `lang="th"` · canonical + robots แยก private · sitemap + `llms.txt` · login (Google, แสดงรหัส, จดจำ, ลืมรหัส, ข้อกำหนด) · search empty มีปุ่มล้างตัวกรอง · หน้า 404 แบรนด์ · cookie consent ก่อน GA · `AdminGuard` + `has_role` · upload จำกัดชนิด/ขนาด · `prefers-reduced-motion` · `offline.html` + `sw.js` · ErrorBoundary

### ยังตรวจไม่ครบ (❔)

Screen reader จริง · zoom 400% · RLS probe ข้ามยูเซอร์บน live · CRUD หลัง login · success ของ publish/hire · Lighthouse มือถือรอบใหม่ · ไฟล์ `/icons/*` ใน workspace รอบสำรวจไม่เจอ

อัปเดตคะแนนเมื่อมี Lighthouse ใหม่หรือปิด Top 10 ได้ — อย่าแก้ตัวเลขโดยไม่มีหลักฐาน

---

## เทมเพลตตอบเมื่อ AI ตรวจ

```
Aplus1 Web Audit
━━━━━━━━━━━━━━━━━━━━
หลักฐาน: (URL / screenshot / ไฟล์)
ขอบเขต: (หน้าไหน)

🔴 CRITICAL — n
🟠 HIGH     — n
🟡 MEDIUM   — n
🔵 LOW      — n

UI/UX          nn%
Accessibility  nn%
SEO            nn%
Performance    nn%
Security       nn%
Mobile         nn%
Functionality  nn%
Production     nn%

Top 10 things to fix
1. ❌ ...
```
