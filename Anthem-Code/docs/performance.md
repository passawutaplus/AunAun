# Performance Rules

## React Query

- `staleTime` default = `60_000` (ตั้งใน `App.tsx`)
- Static/profile data → `staleTime: 5 * 60_000`
- ใส่ `enabled: !!user` ทุก query ที่ต้อง auth
- ใช้ `queryKey` ที่ stable — array ของ primitive เท่านั้น

## Supabase queries

- `select("col1, col2")` เสมอ — **ห้าม** `select("*")` เว้นแต่จำเป็น
- Batch ด้วย `.in("id", ids)` แทน loop
- ถ้าต้อง join → `select("...,profile:profiles(id,display_name)")` แทน 2 queries
- ใส่ `.limit(n)` ทุก list

## Bundle size

- `ChatInboxPage` → `React.lazy()` (June 2026 fix — main chunk 468 KB)
- `vite.config.ts` → `manualChunks` (supabase, radix, recharts, tanstack, lucide)
- หน้า admin / legal / earnings / advertise → `React.lazy()` ใน `App.tsx`
- Mock data (`src/data/mock*.ts`) ตอนนี้ถูก bundle อยู่ — TODO: แยก type ออกจาก data แล้ว lazy-load data เฉพาะตอน dev/empty state
- รูป asset ใหญ่ → import เป็น `?url` หรือใช้ `<img loading="lazy">`

## Images

- WebP เสมอเมื่อทำได้
- ทุก `<img>` ต้องมี `width` + `height` (CLS)
- LCP image: `<link rel="preload" as="image" fetchpriority="high">`

## Realtime

- 1 user = 1 channel max — รวม subscription
- Cleanup ใน `useEffect` return

## DB

- Index ทุก column ที่ใช้ใน `.eq()` / `.in()` / `.order()`
- ตรวจ N+1 — ถ้า map array แล้วเรียก query → batch
