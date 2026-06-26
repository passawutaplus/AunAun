# Aplus1 — Creative Social App

โปรไฟล์เดียว เชื่อมต่อทุกโอกาสของครีเอทีฟ — creative social app คู่กับ So1o (back-office)

| | |
|---|---|
| **Production** | https://aplus1.app |
| **Demo** | https://aplus1-demo.vercel.app |
| **Supabase** | `zkflkpbmbozrchqncpzi` (canonical backend ใน Solo-Code) |

## Quick start

```bash
npm install
npm run dev
```

เปิด http://localhost:8080

## Tech stack

- React 18 + Vite 5 + TypeScript 5
- Tailwind CSS v3 + shadcn/ui + Lucide
- React Query (server state) + Zustand (client state)
- Supabase (unified project with So1o)

## Project structure

```text
src/
├── core/        ← shared กับ So1o (auth, profile, wallet, notifications)
├── features/    ← Aplus1 business domains (projects, jobs, chat, ...)
├── server/      ← pure supabase queries/mutations
├── lib/         ← utilities, email-templates/, notifyAnthem.ts
├── hooks/       ← generic UI hooks
├── components/  ← presentational
├── pages/       ← routes
└── integrations/supabase  ← auto-generated, ห้ามแก้
```

## เอกสารสำหรับ dev

อ่าน [`docs/README.md`](./docs/README.md) ก่อนเริ่มงาน

## Deploy

```bash
# Demo (VITE_DEMO_MODE=true)
npm run deploy:demo

# Production (aplus1.app)
node scripts/redeploy-production.mjs
# หรือจาก repo root:
../scripts/deploy-vercel.sh production 1px
```
