# Deploy UX Demo บน Vercel

## ตอบคำถาม: ล็อกอิน + เก็บข้อมูลจริงได้ไหม?

**ได้** — เดโม่ชี้ไป Supabase project เดียวกับ production (`zkflkpbmbozrchqncpzi`):

- Auth จริง (signup / login / Google OAuth)
- ข้อมูลแยกตาม user (RLS)
- AI, Quotation, Pipeline บันทึกจริง

ตั้งค่าให้ปลอดภัยสำหรับ research:

- `VITE_EARLY_ACCESS=false` — สมัครได้เลย
- `VITE_DEMO_MODE=true` — แสดงแบนเนอร์ UX Research
- Stripe `pk_test_...` — ไม่มีการเรียกเก็บเงินจริง

---

## 1. Deploy ครั้งแรก

```bash
# ติดตั้ง Vercel CLI (ถ้ายังไม่มี)
npm i -g vercel

# จากโฟลเดอร์โปรเจกต์
cd Solo-Code
vercel link
vercel --yes
```

หรือเชื่อม GitHub repo ใน [Vercel Dashboard](https://vercel.com) → auto-deploy ทุก push

---

## 2. Environment Variables (Vercel Dashboard → Settings → Environment Variables)

ตั้งค่า **Preview** และ **Production** (หรือเฉพาะ Preview สำหรับ demo):

| Variable | ค่า | หมายเหตุ |
|----------|-----|----------|
| `VITE_SUPABASE_URL` | `https://zkflkpbmbozrchqncpzi.supabase.co` | client |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | anon key จาก Supabase | client |
| `VITE_SUPABASE_PROJECT_ID` | `zkflkpbmbozrchqncpzi` | client |
| `SUPABASE_URL` | เหมือนด้านบน | server |
| `SUPABASE_PUBLISHABLE_KEY` | anon key | server |
| `SUPABASE_SERVICE_ROLE_KEY` | service role | **secret** — server only |
| `GEMINI_API_KEY` | Google AI key | server + edge |
| `VITE_EARLY_ACCESS` | `false` | เปิดสมัครสาธารณะ |
| `VITE_DEMO_MODE` | `true` | แบนเนอร์ UX research |
| `VITE_PAYMENTS_CLIENT_TOKEN` | `pk_test_...` | Stripe sandbox |
| `STRIPE_SANDBOX_API_KEY` | `sk_test_...` | server |
| `STRIPE_USE_DIRECT` | `true` | |
| `VITE_SITE_URL` | `https://your-app.vercel.app` | **หลัง deploy รอบแรก** — ใส่ URL จริง |

---

## 3. Supabase Auth — เพิ่ม Redirect URL

[Supabase Dashboard](https://supabase.com/dashboard/project/zkflkpbmbozrchqncpzi/auth/url-configuration)

**Site URL** (ชั่วคราวสำหรับ demo):

```
https://your-app.vercel.app
```

**Redirect URLs** — เพิ่ม:

```
https://your-app.vercel.app/**
https://*.vercel.app/**
http://localhost:8080/**
```

---

## 4. หลัง deploy — ส่งให้ UX team

1. Preview URL จาก Vercel
2. ไฟล์ [`docs/ux-research-demo.md`](./ux-research-demo.md)
3. แนะนำ login ด้วย Google (เร็วสุด)

---

## 5. Build บน Vercel

โปรเจกต์ใช้ TanStack Start SSR:

- `npm run build` → `dist/client` (static) + `dist/server` (SSR)
- `api/server.mjs` + `vercel.json` รับ request ทั้งหมด

ถ้า build fail — ดู logs ใน Vercel Dashboard → Deployments → Build Logs
