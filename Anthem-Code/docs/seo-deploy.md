# SEO — ก่อน Deploy Production

Checklist สำหรับ `1px.app` (1PX / an1hem community)

## สถานะในโค้ด

| รายการ | สถานะ |
|--------|--------|
| `<html lang="th">` | ✅ `index.html` + `SeoHead` |
| Meta title / description หน้าหลัก | ✅ `index.html` + `SeoHead` per page |
| Open Graph + Twitter card | ✅ static + SPA update |
| JSON-LD WebSite | ✅ `SeoHead` บนหน้า home |
| `robots.txt` | ✅ `public/robots.txt` |
| `sitemap.xml` | ✅ `public/sitemap.xml` via `npm run sitemap:gen` |
| Canonical URL (absolute) | ✅ `index.html` + `SeoHead` |
| `noindex` สำหรับ private pages | ✅ `SeoHead noindex` |

### หน้าที่อยู่ใน sitemap (index ได้)

- `/`, `/jobs`, `/advertise`
- `/legal/privacy`, `/legal/terms`, `/legal/cookies`, `/legal/rights`
- Demo catalog: `/project/*`, `/u/*`, `/s/*`

### หน้าที่ **ไม่** index (robots + noindex)

- `/admin`, `/auth`, `/chat`, `/settings`, `/notifications`
- `/portfolio/manage`, `/earnings`, `/verify`

---

## Checklist ก่อน Deploy (ทำด้วยมือ)

### 1. Environment

```bash
# Anthem-Code/.env (production)
VITE_SITE_URL=https://1px.app
```

### 2. Regenerate sitemap ก่อน deploy

```bash
cd Anthem-Code
VITE_SITE_URL=https://1px.app npm run sitemap:gen
```

### 3. หลัง Deploy — automated smoke

```bash
BASE_URL=https://1px.app ./Anthem-Code/scripts/smoke-public.sh
```

- [ ] HTTP 200 ทุก URL (ครอบคลุมโดย `smoke:public`)
- [ ] `robots.txt` / `sitemap.xml` content ถูกต้อง (ครอบคลุมโดย `smoke:public`)
- [ ] ไม่มี `/admin` หรือ `/auth` ใน sitemap

### 4. Google Search Console

- [ ] Property: `https://1px.app`
- [ ] Submit sitemap: `https://1px.app/sitemap.xml`

### 5. Social preview

- [ ] [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [ ] หน้า `/`, `/jobs` แสดงรูป + title + description ครบ

---

## คำสั่ง health check ใน repo

```bash
cd Anthem-Code
npm exec vitest run          # unit + sitemap-lib + SeoHead
npm run smoke:public         # curl smoke — robots/sitemap content
npm run sitemap:gen          # regenerate public/sitemap.xml
npm run e2e:seo              # Playwright SEO smoke
```

```bash
# Ecosystem gate
./scripts/test-ecosystem.sh

# Optional — Lighthouse performance + SEO
node scripts/performance/run-performance.mjs
```

### สิ่งที่ automated tests ครอบคลุมแล้ว

| รายการ | คำสั่ง |
|--------|--------|
| `robots.txt` Disallow + Sitemap | `npm run smoke:public` |
| `sitemap.xml` content / exclusions | `npm run smoke:public` |
| Sitemap generator logic | `vitest` (`scripts/__tests__/sitemap-lib.test.mjs`) |
| `buildTitle`, `truncateDescription`, `absoluteUrl` | `vitest` (`seo.test.ts`) |
| Canonical + noindex via SeoHead | `vitest` (`SeoHead.test.tsx`) |
| SPA meta หลัง hydration | `npm run e2e:seo` |
| Lighthouse SEO score ≥ 80 | `run-performance.mjs` (optional) |

---

## ปรับปรุงในอนาคต (optional)

- Dynamic sitemap จาก Supabase (projects/profiles จริง แทน demo catalog)
- Host รูป OG บน `1px.app`
- `hreflang` ถ้ามีหน้าภาษาอังกฤษ
