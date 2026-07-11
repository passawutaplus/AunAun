# SEO — ก่อน Deploy Production

Checklist สำหรับ **aplus1.app** (Aplus1 community)

## สถานะในโค้ด (อัปเดต)

| รายการ | สถานะ |
|--------|--------|
| `<html lang="th">` | ✅ `index.html` + `SeoHead` |
| Meta title / description | ✅ `SeoHead` ต่อหน้า |
| Open Graph + Twitter card | ✅ static + SPA update |
| JSON-LD (WebSite, Organization, Person, ProfilePage, CreativeWork, JobPosting, BreadcrumbList) | ✅ |
| Breadcrumb UI | ✅ `SeoBreadcrumb` |
| `robots.txt` | ✅ Disallow private + Sitemap links |
| `sitemap.xml` + `sitemap-index.xml` + type sitemaps | ✅ `npm run sitemap:gen` |
| Canonical (strip query) | ✅ |
| `noindex` private / search / thin profile / closed jobs | ✅ |
| Bot meta preview (crawler UA) | ✅ `middleware.js` + `/api/seo-preview` |
| GA4 (opt-in) | ✅ `VITE_GA_MEASUREMENT_ID` + cookie analytics |
| Admin SEO checklist | ✅ `/admin/seo` |
| hreflang EN | ⏳ Thai-first ยังไม่แยกภาษา |
| Full SSR | ⏳ ใช้ bot preview แทน Next.js SSR |

### หน้าที่อยู่ใน sitemap (index ได้)

- `/` + legal pages
- ผลงานเผยแพร่ `/project/*`
- โปรไฟล์ `/u/*` และ `/@username` (ข้ามโปรไฟล์ว่างเมื่อดึง live)
- ชุดงานสาธารณะ `/series/:id`
- Explore paths (ถ้าใส่ใน generator)
- Full-product: `/jobs`, `/jobs/:id` (open), `/community`, `/s/*`

### หน้าที่ **ไม่** index (robots + noindex)

- `/admin`, `/auth`, `/chat`, `/settings`, `/notifications`
- `/portfolio/manage`, `/portfolio/saved`, `/earnings`, `/verify`, `/referrals`
- `/contracts`, `/inspire`, `/collections`, `/me/*`, `/api/*`
- Search/filter query URLs, thin profiles, closed jobs

---

## Checklist ก่อน Deploy

### 1. Environment

```bash
# Anthem-Code/.env (production)
VITE_SITE_URL=https://aplus1.app
# optional
VITE_GA_MEASUREMENT_ID=G-XXXXXXXX
```

### 2. Regenerate sitemap

```bash
cd Anthem-Code
VITE_SITE_URL=https://aplus1.app npm run sitemap:gen
```

### 3. Smoke

```bash
BASE_URL=https://aplus1.app ./Anthem-Code/scripts/smoke-public.sh
npm run e2e:seo
```

### 4. Google Search Console

- [ ] Property: `https://aplus1.app`
- [ ] Submit: `https://aplus1.app/sitemap-index.xml` (หรือ `sitemap.xml`)
- [ ] URL inspection หน้า `/`, โปรไฟล์, ผลงานตัวอย่าง

### 5. Social preview

- [ ] [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) — ทดสอบ deep link (bot ควรได้ meta จาก `/api/seo-preview`)
- [ ] LinkedIn / Twitter card validator

---

## คำสั่ง health check

```bash
cd Anthem-Code
npm exec vitest run src/lib/__tests__/seo.test.ts scripts/__tests__/sitemap-lib.test.mjs
npm run smoke:public
npm run sitemap:gen
npm run e2e:seo
```

## สิ่งที่ยังทำมือ / อนาคต

- เชื่อม GSC + ติดตาม index coverage
- `hreflang` เมื่อมีหน้า EN
- Crawlable `?page=` สำหรับ infinite scroll (ถ้าต้องการ ranking ลึกใน feed)
- Host OG image บน `aplus1.app` แทน R2/Lovable CDN
