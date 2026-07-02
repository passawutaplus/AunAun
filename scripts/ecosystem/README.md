# Ecosystem setup (So1o + an1hem)

## Quick start

```bash
node scripts/ecosystem/setup.mjs
```

Then apply SQL on Supabase (see below) and deploy apps per `docs/deploy-vps.md`.

## How Pro works (unified project `zkflkpbmbozrchqncpzi`)

1. User pays on **So1o** → webhook updates `public.profiles.subscription_tier`
2. an1hem reads the same row via `user_id` — no cross-project sync
3. Legacy `sync-so1o-tier` only if an1hem still used a separate project

## SQL files

| File | ใช้เมื่อ |
|------|---------|
| `ecosystem-phase1.sql` | ecosystem links, tier, storage caps |
| `inhouse-workspace.sql` | In-House MVP (org, kanban, chat, canvas) |
| `inhouse-invite-pending.sql` | pending invites inbox |
| `stripe-payments.sql` | PX wallet + Stripe RPCs |
| `seed-catalog.sql` | demo community seed |
| `anthem-migration.sql` | เก่า — ใช้ `Solo-Code/supabase/manual/apply-anthem-ecosystem.sql` แทน |
| `chat-phase2.sql` | chat pins, group members, message policies |
| `chat-instant-flow.sql` | system/profile message types + profile_user_id for instant chat |
| `hire-collab-instant-validation.sql` | relax freelancer hire insert validation (studio hire stays strict) |
| `projects-video-urls.sql` | `projects.video_urls` for portfolio video uploads |
| `anthem-projects-id-defaults.sql` | Fix `anthem.projects` id PK + defaults (publish → detail page) |
| `frontend-production-gap.sql` | avatar_pool, analytics RPCs, collab_requests, group RPC, portfolio RLS |
| `chat-cv-private-storage.sql` | private chat/CV storage (after anthem-media-storage-rls) |
| `ux-retest-schema-gap.sql` | project_comments threading, collection_items, job_match_notifications, RPC stubs |
| `ux-research-feedback.sql` | UX research session form (`/research/feedback`) — `ux_research_submissions` + `submit_ux_research` RPC |

หลังรัน `seed-catalog.sql` ฟีด/ดีไซเนอร์/สตูดิโอ/งานจะดึงจาก Supabase เท่านั้น (ไม่มี mock ฝั่ง client แล้ว)

### รัน seed บน an1hem

1. Supabase Dashboard → **SQL Editor** → วาง `seed-catalog.sql` → Run (idempotent)
2. ตรวจ: `SELECT count(*) FROM projects WHERE status = 'Published';` ควรได้ ~20

หรือใส่ **service_role JWT** ใน `scripts/ecosystem/.env.seed.local` แล้ว:

```bash
cd Anthem-Code && node scripts/run-seed.mjs
```

### Avatar pool (Magnific หรือ Gemini)

สคริปต์ `generate-avatar-pool.mjs` สร้างรูป avatar ล่วงหน้า อัปโหลด Supabase Storage แล้วบันทึกใน `avatar_pool` — seed จะแจกให้ demo profiles อัตโนมัติ

ใส่ใน `scripts/ecosystem/.env.seed.local`:

```bash
MAGNIFIC_API_KEY=your_magnific_api_key   # จาก magnific.com → Settings → API Keys
SUPABASE_URL=https://....supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
# optional
AVATAR_POOL_COUNT=80
MAGNIFIC_IMAGE_MODEL=hyperflux             # hyperflux | flux-2-klein | flux-2-turbo
```

รัน:

```bash
node scripts/ecosystem/generate-avatar-pool.mjs
```

ถ้าไม่มี `MAGNIFIC_API_KEY` จะ fallback ไป Gemini (`GEMINI_API_KEY`) — บังคับ provider ได้ด้วย `--provider=gemini` หรือ `--provider=magnific`

## Long term

Merge both apps onto one Supabase project — see `docs/ecosystem-unified-account.md`.
