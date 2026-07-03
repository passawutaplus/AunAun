# Performance Test Report

อัปเดต: 13 มิถุนายน 2026  
เป้าหมาย: พร้อมใช้งานจริง ~100 CCU (demo tier ทดสอบที่ 20 VU)

## URLs ที่ทดสอบ

| แอป | URL |
|-----|-----|
| Aplus1 | https://aplus1-demo.vercel.app |
| So1o | https://solo-demo-liart.vercel.app |

## สรุปผล

### Bundle (Aplus1) — หลังแก้ code-split

| Metric | ก่อน | หลัง | Gate |
|--------|------|------|------|
| Main chunk (`index-*.js`) | ~1,118 KB | **468 KB** | <500 KB ✓ |
| Chat route | ใน main bundle | แยก 61 KB | lazy ✓ |
| Vendor chunks | รวมใน main | supabase/radix/recharts แยก | ✓ |

การแก้:
- `ChatInboxPage` → `React.lazy()`
- `vite.config.ts` → `manualChunks` (supabase, radix, recharts, tanstack, lucide)

### HTTP timing (curl, warm)

| หน้า | TTFB | ผ่าน (<1.2s) |
|------|------|-------------|
| 1PX `/` | ~586–995ms | ✓ |
| 1PX `/jobs` | ~779ms | ✓ |
| 1PX `/research` | ~586ms | ✓ |
| So1o `/` (cold) | ~2.7–5.3s | ✗ cold start |
| So1o `/` (warm) | ~706–820ms | ✓ |
| So1o `/pricing` | ~1.0s | ✓ |
| So1o `/help` | ~680ms | ✓ |

**หมายเหตุ So1o:** Vercel serverless cold start ทำให้ request แรกช้า — request ถัดไปผ่าน gate

### k6 load (20 VU peak, 3 นาที)

| Scenario | p95 duration | error rate | ผ่าน |
|----------|-------------|------------|------|
| 1PX browse + PostgREST | <410ms | <5% | ✓ |
| So1o browse | <155ms | <5% | ✓ |

### Lighthouse

ไม่รันได้ใน WSL (ไม่มี Chrome headless) — ใช้ [PageSpeed Insights](https://pagespeed.web.dev/) manual:
- https://pagespeed.web.dev/analysis?url=https://aplus1-demo.vercel.app
- https://pagespeed.web.dev/analysis?url=https://solo-demo-liart.vercel.app

## สคริปต์ใน repo

```bash
# วิเคราะห์ bundle หลัง build
cd Anthem-Code && npm run build
node ../scripts/performance/analyze-bundle.mjs dist

# HTTP + Lighthouse (ถ้ามี Chrome)
node scripts/performance/run-performance.mjs

# k6 (ติดตั้ง k6 ก่อน)
k6 run -e SUPABASE_ANON_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY scripts/performance/k6-1px-browse.js
k6 run scripts/performance/k6-so1o-browse.js
```

## Gate สรุป — พร้อม demo / soft launch

| Gate | สถานะ |
|------|--------|
| 1PX main bundle <500KB | ✓ |
| HTTP TTFB warm <1.2s | ✓ |
| k6 20 VU p95 <800ms | ✓ |
| k6 error <5% | ✓ |
| So1o cold start <1.2s | ✗ (Vercel — ใช้ warm instance / Fluid Compute) |
| Lighthouse mobile >70 | ต้องวัด manual |

## แนะนำก่อน production เต็มรูปแบบ

1. **Redeploy 1PX** หลัง bundle fix → `cd Anthem-Code && npm run deploy:demo && npx vercel deploy --prod`
2. **So1o cold start** — เปิด Vercel Fluid Compute หรือ prewarm `/` ด้วย cron
3. **100 CCU gate** — รัน k6 ที่ 50–100 VU บน staging ก่อนประกาศ
4. **Supabase** — monitor connection pool ที่ Dashboard → Reports
