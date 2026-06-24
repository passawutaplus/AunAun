# SEO — ก่อน Deploy Production

Checklist สำหรับ `solofreelancer.com` (So1o Freelancer / My Desk)

## สถานะในโค้ด (อัตomatic)

| รายการ | สถานะ |
|--------|--------|
| `<html lang="th">` | ✅ `src/routes/__root.tsx` |
| Meta title / description หน้าหลัก | ✅ `/` + default ใน root |
| Open Graph + Twitter card | ✅ ทุกหน้าสาธารณะ + default `og:image` |
| JSON-LD (Organization, WebSite, SoftwareApplication) | ✅ root + landing |
| `robots.txt` | ✅ `/robots.txt` — block app/private routes |
| `sitemap.xml` | ✅ `/sitemap.xml` — เฉพาะหน้า index ได้ |
| Google Search Console verification | ✅ meta tag ใน root |
| `noindex` สำหรับ dashboard / admin / token pages | ✅ |
| PWA manifest + icons | ✅ `/manifest.json` |
| `llms.txt` | ✅ สำหรับ AI crawlers |

### หน้าที่อยู่ใน sitemap (index ได้)

- `/`, `/blog`, `/pricing`, `/creative-partner`
- `/help` และคู่มือย่อยทั้งหมด (`/help/getting-started`, `/help/brief`, `/help/quotations`, `/help/payments`, `/help/tax`, `/help/branding`, `/help/plans`, `/help/line`)
- `/privacy`, `/terms`, `/cookies`, `/refund`
- `/blog/{slug}` — จาก Supabase articles

### SEO helpers ในโค้ด

| ไฟล์ | บทบาท |
|------|--------|
| `src/lib/seoHead.ts` | `buildPublicPageHead()` — canonical, OG, Twitter, JSON-LD |
| `src/lib/helpSeo.ts` | meta ศูนย์ช่วยเหลือ + FAQPage schema |
| `src/lib/sitemap.ts` | รายการ URL สาธารณะ ( derive คู่มือจาก `helpSeo`) |

### หน้าที่ **ไม่** index (robots + noindex)

- `/dashboard`, `/admin`, `/apply`, `/labs`, `/survey`
- `/auth`, `/auth/forgot`, `/reset-password`
- Token pages: `/brief/*`, `/track/*`, `/planner/*`, ฯลฯ

---

## Checklist ก่อน Deploy (ทำด้วยมือ)

### 1. DNS & HTTPS

- [ ] `solofreelancer.com` และ `www.solofreelancer.com` ชี้ VPS
- [ ] Deploy ด้วย HTTPS (`./scripts/deploy-ecosystem.sh --https`)
- [ ] Redirect `www` → non-www (หรือกลับกัน — **เลือกแบบเดียว** ให้ตรง canonical ในโค้ด: `https://solofreelancer.com`)

### 2. Environment

```bash
# Solo-Code/.env (production)
VITE_SITE_URL=https://solofreelancer.com
```

ใช้สำหรับ OAuth callback และ canonical URLs

### 3. หลัง Deploy — ตรวจ URL สำคัญ

รัน automated smoke แทน manual curl ส่วนใหญ่:

```bash
BASE_URL=https://solofreelancer.com ./Solo-Code/scripts/smoke-public.sh
BASE_URL=https://1px.app ./Anthem-Code/scripts/smoke-public.sh
```

Manual เฉพาะที่ยังไม่ automate:

```bash
curl -sI https://solofreelancer.com/ | head -5
```

- [ ] HTTP 200 ทุก URL (ครอบคลุมโดย `smoke:public`)
- [ ] `sitemap.xml` มีบทความ blog ล่าสุด (ถ้ามีใน DB) — ตรวจด้วย URL Inspection
- [ ] ไม่มี `/dashboard` หรือ `/admin` ใน sitemap (ครอบคลุมโดย `smoke:public`)

### 4. Google Search Console

- [ ] Property: `https://solofreelancer.com` (หรือ domain property)
- [ ] Verify ด้วย meta tag (มีใน root แล้ว) หรือ DNS
- [ ] Submit sitemap: `https://solofreelancer.com/sitemap.xml`
- [ ] ขอ index หน้า `/` และ `/pricing` ครั้งแรก (URL Inspection)

### 5. Social preview

ทดสอบแชร์ลิงก์:

- [ ] [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [ ] [Twitter Card Validator](https://cards-dev.twitter.com/validator) (หรือ X preview)
- [ ] หน้า `/`, `/pricing`, `/blog/{slug}` แสดงรูป + title + description ครบ

### 6. Performance (Core Web Vitals)

- [ ] [PageSpeed Insights](https://pagespeed.web.dev/) หน้า landing
- [ ] LCP logo preload มีอยู่แล้วใน `/`
- [ ] รูป OG โหลดได้จาก URL ภายนอก (หรือย้ายมา host บน domain เราในอนาคต)
- [ ] Lighthouse SEO ≥ 80 (optional): `node scripts/performance/run-performance.mjs`

### 7. Supabase Auth URLs

Dashboard → Authentication → URL Configuration:

- Site URL: `https://solofreelancer.com`
- Redirect URLs: `https://solofreelancer.com/**`

---

## คำสั่ง health check ใน repo

```bash
cd Solo-Code
npm exec vitest run          # unit tests (รวม sitemap helpers)
npm run smoke:public         # curl smoke — robots/sitemap content + noindex /auth
npm run build                # production SSR build
npm run lint -- src/         # lint แอป (ไม่รวม supabase/functions)
npm run e2e:seo              # Playwright SEO smoke (meta, OG, JSON-LD)
```

```bash
cd Anthem-Code
npm exec vitest run          # unit tests (รวม seo.ts + SeoHead noindex)
npm run smoke:public         # curl smoke — robots/sitemap content
npm run e2e:seo              # Playwright SEO smoke (SPA meta หลัง hydration)
```

```bash
# Ecosystem gate (CI)
./scripts/test-ecosystem.sh

# Solo full SEO content (local dev — ไม่พึ่ง production deploy)
bash scripts/solo-smoke-seo-build.sh

# Production curl (ข้าม sitemap content ถ้า deploy ยังไม่ทัน)
SMOKE_SKIP_SITEMAP_CONTENT=1 BASE_URL=https://solofreelancer.com npm run smoke:public

# Optional pre-release — Lighthouse performance + SEO (threshold: perf ≥70, seo ≥80)
node scripts/performance/run-performance.mjs
# ปรับ SEO threshold: LH_SEO_MIN=85 node scripts/performance/run-performance.mjs
```

### สิ่งที่ automated tests ครอบคลุมแล้ว

| รายการ | คำสั่ง |
|--------|--------|
| `robots.txt` Disallow rules + Sitemap URL | `npm run smoke:public` (ทั้ง So1o และ 1PX) |
| `sitemap.xml` มีหน้าสาธารณะ / ไม่มี private routes | `npm run smoke:public` |
| `/auth` มี `noindex` (So1o) | `npm run smoke:public` |
| `llms.txt` content (So1o) | `npm run smoke:public` |
| Sitemap route exclusions (unit) | `vitest` ใน Solo-Code |
| `seoHead` / `helpSeo` helpers | `vitest` ใน Solo-Code |
| `buildTitle`, `truncateDescription`, `absoluteUrl` | `vitest` ใน Anthem-Code |
| SSR meta / JSON-LD (So1o) | `npm run e2e:seo` |
| SPA meta หลัง hydration (1PX) | `npm run e2e:seo` |
| Lighthouse SEO score ≥ 80 | `run-performance.mjs` (optional) |

---

## ปรับปรุงในอนาคต (optional)

- Host รูป OG บน `solofreelancer.com` แทน GCP external URL
- เพิ่ม `hreflang` ถ้ามีหน้าภาษาอังกฤษ
- Blog: ตรวจ `published_at` ก่อนใส่ sitemap (เฉพาะบทความ publish แล้ว)
- Structured data `FAQPage` ในหน้า pricing
