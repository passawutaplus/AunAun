# Pixel100 — Portfolio Hub

ชุมชนฟรีแลนซ์ครีเอทีฟไทย — ทุกคนคือ 1 pixel รวมกันเป็นภาพใหญ่ (คู่กับ So1o Freelancer Management)

| | |
|---|---|
| **Canonical** | https://pixel100.com (ยังไม่จดโดเมน) |
| **Demo** | https://1px-demo.vercel.app |
| **Legacy production** | https://an1hem.app (redirect ภายหลัง) |
| **Supabase** | `rvnzjiskqliexysicfmh` (canonical backend ใน Solo-Code) |

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
├── features/    ← 1PX business domains (projects, jobs, chat, ...)
├── server/      ← pure supabase queries/mutations
├── lib/         ← utilities, email-templates/, notifyAnthem.ts
├── hooks/       ← generic UI hooks
├── components/  ← presentational
├── pages/       ← routes
└── integrations/supabase  ← auto-generated, ห้ามแก้
```

## เอกสารสำหรับ dev

อ่าน [`docs/README.md`](./docs/README.md) ก่อนเริ่มงาน

Notifications: [ecosystem-notifications.md](../docs/ecosystem-notifications.md)

## คำสั่งที่ใช้บ่อย

```bash
npm run dev              # dev server (:8080)
npm run build            # production build
npm run test             # vitest
npm run email:preview    # preview notification emails
npm run smoke:public     # curl smoke
```

## กฎสำคัญ

- ห้าม import `@/integrations/supabase/client` ใน component/page — ใช้ hook จาก `@/features/*` หรือ `@/core/*`
- ห้ามแก้ `src/integrations/supabase/{client,types}.ts` และ `.env` (auto-gen)
- Migrations: เพิ่มใน `Solo-Code/supabase/migrations/` แล้ว push จาก Solo-Code
