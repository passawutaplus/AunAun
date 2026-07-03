# Unified Supabase — So1o + Aplus1

โปรเจกต์เดียว: **`zkflkpbmbozrchqncpzi`** (supabase-blue-park)

> Canonical app URL: **https://aplus1.app** · Legacy `an1hem.app` redirect ยังรองรับใน OAuth

## Schema layout

| Schema | ใครใช้ | ตัวอย่างตาราง |
|--------|--------|----------------|
| `public` | ทั้งคู่ | `profiles` (key = `user_id`), `user_roles`, `subscriptions`, `user_credits` |
| `shared` | ทั้งคู่ | `wallets`, `contracts`, `conversations`, `messages`, `shared.notifications` |
| `anthem` | Aplus1 | `projects`, `studios`, `job_posts`, `follows`, `collections`, … |
| `so1o` | So1o | `notifications` (legacy), ตาราง back-office ย้ายมาทีละ phase |
| `ops` | Ops Hub | `ops.issues`, PM workspace tables |

## Migrations (ลำดับสำคัญ)

1. `20260606120000_ecosystem_schemas.sql` — สร้าง schema
2. `20260606120100_profiles_unified_anthem_columns.sql` — รวมคอลัมน์ profile
3. `20260606120200_ecosystem_notifications.sql` — แยก So1o / ecosystem notifications
4. **`supabase/manual/apply-anthem-ecosystem.sql`** — ตาราง Aplus1 ทั้งชุด (รันครั้งเดียว)
5. `20260606140000_seed_anthem_catalog.sql` — seed ชุมชน demo
6. `scripts/ecosystem/inhouse-workspace.sql` — In-House MVP
7. `scripts/ecosystem/stripe-payments.sql` — PX wallet + Stripe RPCs

สร้าง bundle ใหม่:

```bash
node scripts/bundle-anthem-for-unified.mjs
```

Push:

```bash
export SUPABASE_ACCESS_TOKEN=sbp_...
./scripts/supabase-push-via-api.sh
```

## แอปฝั่ง client

- **So1o** — `db: { schema: 'public' }` (ค่าเริ่มต้น)
- **Aplus1** — `Anthem-Code/src/integrations/supabase/db.ts` route ตารางอัตโนมัติ
- **Ops Hub** — `Ops-Hub/` · `https://hq.solofreelancer.com`
- **profiles** — ใช้ `user_id` (= `auth.uid()`), ไม่ใช่ `id` แถวภายใน

## Edge Functions

อยู่ใน `Solo-Code/supabase/functions/` (19 ตัว) — ดูตารางเต็มใน [README.md](./README.md)

### Deploy checklist

```bash
export SUPABASE_ACCESS_TOKEN=sbp_...

# Notify + LINE
supabase functions deploy \
  notify-anthem notify-anthem-chat notify-anthem-collab notify-hire-request \
  job-match-dispatch line-connect line-webhook line-queue-process \
  --project-ref zkflkpbmbozrchqncpzi

# Anthem AI + ecosystem
supabase functions deploy embed-project similar-images generate-contract \
  anthem-assistant anthem-portfolio-assist ecosystem-ai-usage \
  --project-ref zkflkpbmbozrchqncpzi

# Gemini (หรือใช้ supabase-setup-project.sh)
supabase functions deploy ai-design-chat planner-ai-assist ai-price-suggest color-mentor \
  --project-ref zkflkpbmbozrchqncpzi

supabase secrets set GEMINI_API_KEY=... ANTHEM_APP_URL=https://aplus1.app
```

> `line-link-account` deprecated — ใช้ `line-connect` แทน

## โปรเจกต์เก่า (ปิดแล้ว)

- So1o `jdqrrzaleapablabphmw`
- an1hem `uutbvwyoivqojozrangi`

## เอกสารที่เกี่ยวข้อง

- [../../docs/ecosystem-notifications.md](../../docs/ecosystem-notifications.md)
- [../../docs/ECOSYSTEM_ROADMAP.md](../../docs/ECOSYSTEM_ROADMAP.md)
- [OAUTH.md](./OAUTH.md)
