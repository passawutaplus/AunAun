# Architecture

```text
┌──────────────────────────────────────────────┐
│  src/pages/*           (route components)     │
│  src/components/*      (UI, presentational)   │
└─────────────┬────────────────────────────────┘
              │ uses
┌─────────────▼────────────────────────────────┐
│  src/features/<domain>/   (React Query hooks) │
│  src/core/<area>/         (shared w/ So1o)    │
└─────────────┬────────────────────────────────┘
              │ calls
┌─────────────▼────────────────────────────────┐
│  src/server/queries/    (pure async fns)      │
│  src/server/mutations/  (pure async fns)      │
└─────────────┬────────────────────────────────┘
              │ uses
┌─────────────▼────────────────────────────────┐
│  src/integrations/supabase/client.ts          │
│  (only allowed import sites: server/ + core/) │
└─────────────┬────────────────────────────────┘
              │
        Supabase (zkflkpbmbozrchqncpzi)
        - Postgres + RLS (public, shared, anthem schemas)
        - Realtime
        - Storage (bucket: project-media)
        - Edge Functions (deployed from Solo-Code)
```

## Notification pipeline

```text
User action (gift, hire, chat, …)
  → notifyAnthem.ts / direct edge invoke
  → Solo-Code edge: notify-anthem* / notify-hire-request
  → dispatchAnthemNotification
      ├─ enqueueAnthemEmail → transactional_emails queue
      └─ enqueueLineNotification → LINE queue → line-queue-process
  → in-app row: shared.notifications
```

ดูรายละเอียด: [ecosystem-notifications.md](../../docs/ecosystem-notifications.md)

## กฎเหล็ก

1. **Component ห้าม import `@/integrations/supabase/client` ตรงๆ** — ต้องผ่าน hook ใน `features/` หรือ `core/`
2. **Hook ใน `features/` ห้ามทำ business logic ลึก** — เรียก `server/queries/*` แล้ว wrap ด้วย React Query
3. **`server/` ต้อง pure** — ไม่มี React, ไม่มี toast, return promise/data ตรงๆ
4. **`core/` = ของที่ So1o เอาไปใช้ได้ทันที** — ห้ามมี import จาก `features/anthem`

## State boundaries

- **Server state** → React Query (with `staleTime: 60s` default)
- **Client UI state** → useState / useReducer
- **Cross-component client state** → Zustand store ใน `src/stores/`
- **URL state** → react-router params/search
