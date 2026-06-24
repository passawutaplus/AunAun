# Adding a Feature — Playbook

ใช้เป็น checklist เวลาเพิ่ม feature ใหม่ ตั้งแต่ schema ถึง UI

## Step 1 — Schema (ถ้ามี data ใหม่)

1. คิด table name (`snake_case`, `public` schema)
2. ใช้ migration tool — สร้างไฟล์ใน `supabase/migrations/`
3. กฎเหล็กของทุก `CREATE TABLE` ใน `public`:
   ```sql
   CREATE TABLE public.<name> (...);
   GRANT SELECT, INSERT, UPDATE, DELETE ON public.<name> TO authenticated;
   GRANT ALL ON public.<name> TO service_role;
   -- only if intentional: GRANT SELECT ON public.<name> TO anon;
   ALTER TABLE public.<name> ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "..." ON public.<name> ...;
   ```
4. RLS — เริ่มจาก `auth.uid() = user_id` แล้วค่อยขยาย
5. รัน linter หลัง migration: `supabase--linter`

## Step 2 — Server-side (ถ้าต้อง privilege หรือ third-party)

สำหรับ logic ที่ต้อง service role / external API / aggregation:

```ts
// src/server/<feature>.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const inputSchema = z.object({ ... });

export const doSomething = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => inputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // ...
  });
```

สำหรับ user-scoped CRUD ที่ RLS จัดการได้ — เรียก Supabase ตรงจาก React Query ใน hook

## Step 3 — Feature hook

```tsx
// src/hooks/use<Feature>.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useFeatureXyz() {
  return useQuery({
    queryKey: ["feature-xyz"],
    queryFn: async () => {
      const { data, error } = await supabase.from("xyz").select("*");
      if (error) throw error;
      return data;
    },
  });
}
```

Re-export ผ่าน barrel:

```ts
// src/features/<feature>/index.ts
export { useFeatureXyz } from "@/hooks/useFeatureXyz";
```

## Step 4 — UI component

```tsx
// src/components/<domain>/FeatureXyzCard.tsx
import { useFeatureXyz } from "@/features/<feature>";

export function FeatureXyzCard() {
  const { data, isLoading, error } = useFeatureXyz();
  if (isLoading) return <Skeleton />;
  if (error) return <ErrorState />;
  return <div>...</div>;
}
```

- Loading state, empty state, error state — ทั้ง 3 ต้องมี
- Mobile-first responsive
- Semantic tokens (no hardcoded colors)
- Loading toast on mutation, success/error toast on result

## Step 5 — Route (ถ้าต้องมี page ใหม่)

ใส่ไฟล์ใน `src/routes/<name>.tsx` ตาม TanStack file-based convention. ดู [`tanstack-route-architecture`](https://tanstack.com/router/latest/docs/framework/react/guide/file-based-routing).

ทุก route ที่ user share/SEO ได้ ต้องมี `head()` พร้อม title + description ของตัวเอง

## Step 6 — Tests

- Unit test logic ใน `src/lib/__tests__/` หรือ `src/<area>/__tests__/`
- Server fn → integration test (ถ้ามี complex logic)
- ถ้าเป็น critical user flow → เพิ่ม Playwright spec ใน `e2e/flows/`

## Step 7 — Security review

- [ ] RLS policy ตรง intent
- [ ] Server fn ใช้ `requireSupabaseAuth` (เว้น intentional public)
- [ ] Input validate ด้วย Zod ทั้ง form และ server
- [ ] Output ไม่ leak ข้อมูล user อื่น
- [ ] ทดสอบกับ test accounts หลาย role (ดู `test-accounts.md`)
