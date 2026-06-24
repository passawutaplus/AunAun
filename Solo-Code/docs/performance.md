# Performance Playbook

เป้าหมาย: Desktop PageSpeed > 90, Mobile > 70

ดูรายงานล่าสุด: [performance-report.md](../../docs/performance-report.md)

## React Query defaults

ตั้งใน `src/router.tsx`:

```ts
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,            // 1 นาที — กัน refetch ซ้ำ
      gcTime: 300_000,              // 5 นาที — cache อยู่นาน
      refetchOnWindowFocus: false,  // ไม่ refetch ตอน switch tab
      retry: 1,                     // retry แค่ 1 ครั้ง
    },
  },
})
```

`defaultPreloadStaleTime: 0` — สำคัญสำหรับ TanStack Router preload cache

## Code splitting

TanStack Start v1 **auto-split** ทุก route component แล้วผ่าน Vite plugin (`autoCodeSplitting: true` by default). ไม่ต้อง `React.lazy` แทรกเอง — แค่ห้าม `export` component function จาก route file

ห้าม:
```tsx
export function MyPage() { ... }  // ❌ ทำลาย code split
```

ใช้:
```tsx
function MyPage() { ... }  // ✅ split อัตโนมัติ
```

## Image performance

- **Static images:** import ผ่าน Vite (hashed filename, long cache 1 ปี)
- **User uploads:** compress client-side ก่อนอัปโหลด (ใช้ `src/lib/imageCompress.ts`) — prefer WebP
- **LCP image:** preload ผ่าน route `head().links`:
  ```tsx
  links: [{ rel: "preload", as: "image", href: "/hero.webp", fetchpriority: "high" }]
  ```
- **Lazy loading:** `<img loading="lazy" />` for below-fold

## Bundle hygiene

- ห้าม import library ใหญ่ใน root route (`__root.tsx`) — ทำให้โหลดในทุกหน้า
- Tree-shake friendly: import เฉพาะที่ใช้ (`import { X } from 'lib'` ดีกว่า `import lib`)
- Lucide icons: import เฉพาะ icon ที่ใช้

## HTTP caching

ใน `src/start.ts` security middleware ตั้ง:
- Hashed assets (`/assets/*`, `*.js`, `*.css`, fonts) → `max-age=31536000, immutable`
- HTML → `max-age=0, must-revalidate`
- `sitemap.xml` / `robots.txt` → `max-age=3600`

## Realtime cost control

- Subscribe เฉพาะ channel ที่ user เห็นจริง
- Unsubscribe ใน cleanup ของ `useEffect`
- ห้าม subscribe ที่ `__root.tsx` (ทุก route จะ subscribe)

## AI cost control

- Default model: `gemini-2.0-flash-lite` (override via `GEMINI_MODEL_FAST` / `GEMINI_MODEL`)
- คำตอบ AI cap ที่ 800 คำ/ครั้ง
- Context caching เปิดเมื่อ > 32k tokens
- ใช้ `supabase/functions/_shared/ai-quota.ts` คุม rate limit
