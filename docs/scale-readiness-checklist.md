# Scale Readiness Checklist — So1o + an1hem

อัปเดต: มิถุนายน 2569  
ขอบเขต: **So1o Freelancer (My Desk)** + **an1hem Showcase** — แชร์ Supabase โปรเจกต์เดียว (`rvnzjiskqliexysicfmh`)  
เป้าหมาย: พร้อมรับ **100 concurrent users** แล้วมีแผนชัดสำหรับ **1,000 concurrent users**

เอกสารที่เกี่ยวข้อง:

- [`Solo-Code/docs/architecture.md`](../Solo-Code/docs/architecture.md)
- [`Anthem-Code/docs/architecture.md`](../Anthem-Code/docs/architecture.md)
- [`Solo-Code/docs/performance.md`](../Solo-Code/docs/performance.md)
- [`Anthem-Code/docs/performance.md`](../Anthem-Code/docs/performance.md)
- [`docs/ecosystem-hosting.md`](./ecosystem-hosting.md)
- [`docs/deploy-vps.md`](./deploy-vps.md)
- [`docs/ECOSYSTEM_ROADMAP.md`](./ECOSYSTEM_ROADMAP.md)

---

## 0. นิยามและ SLO

### คำศัพท์

| คำ | ความหมาย |
|---|---|
| **CCU** | Concurrent users — ผู้ใช้ที่ active พร้อมกัน (session + request ภายใน ~5 นาที) |
| **RPS** | Requests per second ช่วง peak |
| **Hot path** | flow ที่หนักที่สุด: AI stream, chat realtime, upload media, admin dashboard |
| **SPOF** | Single point of failure — จุดเดียวที่ล่มแล้วทั้งระบบล่ม |

### SLO เป้าหมาย

| Metric | 100 CCU | 1,000 CCU |
|---|---|---|
| p95 PostgREST read | < 300 ms | < 500 ms |
| p95 SSR TTFB (So1o) | < 800 ms | < 1.2 s |
| p95 AI stream เริ่มตอบ | < 3 s | < 5 s (อาจมี queue) |
| Realtime message delivery | < 1 s | < 2 s |
| Error rate (5xx) | < 0.1% | < 0.5% |
| Uptime (monthly) | 99.5% | 99.9% |

### Traffic mix สมมติ (ใช้ load test)

| ประเภท | สัดส่วน | ตัวอย่าง |
|---|---|---|
| Browse / read | ~70% | feed, profile, dashboard list |
| Write ปกติ | ~20% | สร้าง quotation, ส่งข้อความ, อัปเดต job |
| Realtime | ~5% | chat, subscription sync, track page |
| Heavy | ~5% | AI stream, upload ใหญ่, webhook burst |

---

## 1. สถาปัตยกรรมปัจจุบัน (baseline)

```
Browser (So1o / an1hem)
  ├─► Supabase PostgREST + Realtime + Auth + Storage  (RLS)
  └─► So1o TanStack Start server
        ├─ createServerFn (privileged)
        ├─ /api/assistant/stream
        ├─ /api/public/payments/webhook
        ├─ /api/public/cron/*
        └─ Stripe / Gemini / email enqueue

Supabase Edge Functions (legacy + ecosystem)
  ├─ AI: anthem-assistant, ai-design-chat, color-mentor, ...
  ├─ LINE: line-webhook, line-queue-process, line-connect
  └─ Async: notify-hire-request, job-match-dispatch
```

| แอป | รูปแบบ deploy | หมายเหตุ |
|---|---|---|
| **So1o** | TanStack Start SSR — Vercel / Cloudflare Worker / VPS Node | มี server routes + AI streaming |
| **an1hem** | Vite static SPA — nginx / Cloudflare Pages | เรียก Supabase จาก browser โดยตรง |
| **Supabase** | Managed Postgres + Realtime + Storage | SPOF ของทั้ง ecosystem |

---

## 2. Shared Infrastructure (ทั้ง 2 เว็บ)

### 2.1 Supabase Plan & Compute

#### Tier 100 CCU

- [ ] ใช้ **Supabase Pro** ($25/mo) ขึ้นต่ำ
- [ ] เปิด **Supavisor (connection pooler)** — transaction mode สำหรับ server-side, session mode สำหรับ Realtime
- [ ] ตั้ง **Database password rotation** schedule (ทุก 90 วัน)
- [ ] เปิด **Daily backup** (รวมใน Pro) และทดสอบ restore 1 ครั้ง
- [ ] เปิด **pg_stat_statements** ใน Dashboard → ดู slow query รายสัปดาห์
- [ ] ตั้ง **Statement timeout** ที่เหมาะสม (เช่น 15–30s สำหรับ report หนัก)
- [ ] ตรวจ **Auth URL Configuration** ครบทุกโดเมน production (ดู [`ecosystem-hosting.md`](./ecosystem-hosting.md))

#### Tier 1,000 CCU

- [ ] อัปเกรด **Supabase Team** + **compute size** ตาม load test
- [ ] ใช้ pooler **ทุก server-side connection** — ห้ามเปิด direct connection จาก SSR หลาย instance
- [ ] พิจารณา **Read Replica** สำหรับ feed / stats ที่อ่านบ่อย (an1hem public pages)
- [ ] ตั้ง **connection limit alerts** (ใกล้ 80% ของ plan)
- [ ] มี **staging project** แยกสำหรับทดสอบ migration ก่อน production
- [ ] Migration gate: `Solo-Code/scripts/supabase-push-via-api.sh` ทีละไฟล์ — ห้าม push หลาย migration พร้อมกันตอน peak

### 2.2 Database — Schema, Index, Query

- [ ] **RLS ครบทุกตาราง user data** — audit ตาม [`Solo-Code/docs/security.md`](../Solo-Code/docs/security.md) และ [`Anthem-Code/docs/security.md`](../Anthem-Code/docs/security.md)
- [ ] **Index audit** — ทุก column ที่ใช้ใน `.eq()`, `.in()`, `.order()`, foreign key
- [ ] ห้าม `select("*")` ใน production query (ยกเว้นจำเป็น) — ตาม performance rules ทั้ง 2 แอป
- [ ] ทุก list query มี `.limit(n)` + pagination / cursor
- [ ] ตรวจ **N+1** — batch ด้วย `.in("id", ids)` แทน loop query
- [ ] Join ผ่าน PostgREST nested select แทน 2 round-trip
- [ ] ตาราง log ใหญ่ (`admin_audit_log`, `gift_transactions`, email queue) — วางแผน **partition หรือ archive** ที่ 1,000 CCU
- [ ] `SECURITY DEFINER` RPC (`has_role`, wallet, admin_*) — review ว่า validate input ครบ
- [ ] รัน **EXPLAIN ANALYZE** บน hot queries: conversations list, feed projects, dashboard jobs, notifications

### 2.3 Auth & Session

- [ ] Google OAuth provider เปิด + redirect URLs ครบ (HTTPS production)
- [ ] HIBP leaked-password check เปิด (an1hem security doc)
- [ ] Email verification required ก่อนเข้า protected routes
- [ ] Session refresh ไม่ spam — ตรวจ Supabase Auth logs ช่วง peak
- [ ] ที่ 1,000 CCU: วางแผน **2FA + session management** (อยู่ใน So1o ROADMAP Q2 2027)
- [ ] Rate limit ที่ Supabase Auth (built-in) — monitor failed login spikes

### 2.4 Storage (2 กระเป๋าแยก)

| กระเป๋า | แอป | Quota config |
|---|---|---|
| So1o My Desk | So1o | `Solo-Code/src/lib/storageQuotas.ts` |
| `project-media` (shared bucket) | an1hem | `Anthem-Code/src/lib/storageQuotas.ts` |

- [ ] Enforcement quota ฝั่ง upload ทำงาน (Anthem + So1o)
- [ ] Client-side compress ก่อน upload (`Solo-Code/src/lib/imageCompress.ts`, Anthem upload flow)
- [ ] ที่ 400 Pro users × ~300 MB → วางแผน overage (comment ใน storageQuotas แล้ว)
- [ ] ที่ 1,000 CCU: **CDN หน้า public media** — Supabase transform URL หรือ Cloudflare หน้า bucket
- [ ] ตั้ง **Storage bandwidth alert** ใน Supabase Dashboard
- [ ] Lifecycle policy สำหรับ temp upload / draft ที่ไม่ใช้แล้ว

### 2.5 Async Queue (Email + LINE)

- [ ] งาน transactional ใช้ `enqueue_email` RPC — ไม่ส่ง SMTP sync ใน request path
- [ ] LINE notifications ผ่าน `line-enqueue.ts` → queue → `line-queue-process`
- [ ] Email dispatcher (`process-email-queue`) มี retry + rate-limit backoff
- [ ] Monitor queue depth — alert เมื่อค้าง > N นาที
- [ ] ที่ 1,000 CCU: แยก worker concurrency สำหรับ email vs LINE
- [ ] Idempotency key สำหรับ webhook-triggered enqueue (Stripe, hire request)

### 2.6 AI / Gemini (Shared credits)

Shared ecosystem credits: `ecosystem-ai-usage`, Edge Function `anthem-assistant`

- [ ] ทุก AI entry point debit credits ก่อนเรียก model
- [ ] Idempotency key สำหรับ stream (`assistant-stream:${userId}:${requestId}`)
- [ ] Rate limit 429 เมื่อ Gemini quota หมด — มี fallback message ที่เป็นมิตร
- [ ] **ไม่ generate งานหนัก sync ใน user request** — daily trends ใช้ cron + cache แล้ว (ดี)
- [ ] ที่ 100 CCU: monitor Gemini 429 รายวัน
- [ ] ที่ 1,000 CCU: **global concurrent stream cap** + optional queue UI ("รอคิว...")
- [ ] แยก budget Gemini API key (prod vs staging)
- [ ] Log token usage ต่อ feature สำหรับ cost forecast

### 2.7 Security & Rate Limiting

- [ ] `service_role` ไม่ปรากฏใน client bundle — `grep -r "service_role" dist/` ก่อน deploy
- [ ] Webhook verify signature ก่อน process (`/api/public/payments/webhook`)
- [ ] Cron routes ใช้ `authorizeCronBearer` (`cronAuth.server.ts`)
- [ ] CSP / security headers เปิด (`Solo-Code/src/start.ts`)
- [ ] WAF / rate limit ที่ edge (Cloudflare) สำหรับ `/api/*` และ auth endpoints
- [ ] Pentest scope อ่านแล้ว — logical rate-limit test อยู่ใน scope ([`pentest-scope.md`](../Solo-Code/docs/pentest-scope.md))

### 2.8 Monitoring & Ops

- [ ] **Sentry** (หรือเทียบเท่า) ทั้ง So1o SSR + client — อยู่ใน ROADMAP Q3 2026
- [ ] Uptime monitor แยก 3 URL ([`ecosystem-hosting.md`](./ecosystem-hosting.md)):
  - `https://www.solofreelancer.com`
  - `https://an1hem.app`
  - `https://hq.solofreelancer.com` (Ops Hub — optional แต่แนะนำ)
- [ ] `./scripts/health-check.sh` ใน cron ทุก 5 นาที
- [ ] Supabase Dashboard alerts: CPU, connections, disk, Realtime connections
- [ ] Stripe webhook delivery monitor
- [ ] Runbook incident อัปเดต ([`ecosystem-hosting.md`](./ecosystem-hosting.md) § Runbook)
- [ ] ที่ 1,000 CCU: **Status page** public (ROADMAP Q2 2027)
- [ ] On-call rotation + escalation path

---

## 3. So1o Freelancer — Scale Checklist

**Stack:** React 19 + TanStack Start SSR + Supabase client + server functions  
**Deploy:** Vercel (`vercel.json` — 60s, 1GB) หรือ VPS Docker หรือ Cloudflare Worker

### 3.1 Frontend & Caching

- [ ] React Query defaults ตั้งใน router — staleTime 60s, refetchOnWindowFocus false ([`performance.md`](../Solo-Code/docs/performance.md))
- [ ] Route auto code-splitting — ห้าม `export function` จาก route file
- [ ] Static assets hashed → `max-age=31536000, immutable`
- [ ] HTML → `max-age=0, must-revalidate`
- [ ] LCP image preload บน landing
- [ ] PWA service worker ไม่ cache API responses ผิดพลาด
- [ ] ที่ 1,000 CCU: CDN หน้า static ทั้ง `dist/client`

### 3.2 Server Routes & Functions

| Route / Function | ประเภท | Scale note |
|---|---|---|
| `/api/assistant/stream` | AI SSE | Bottleneck หลัก — cap concurrent |
| `/api/public/payments/webhook` | Stripe | ต้อง respond เร็ว, idempotent |
| `/api/public/cron/deadline-reminders` | Cron | bearer auth |
| `/api/public/cron/fetch-daily-trends` | Cron + cache | ไม่ให้ user trigger |
| `/api/payments/checkout` | Stripe | rate limit |
| `/api/payments/connect/onboard` | Stripe Connect | ต่ำ volume |
| `/api/payments/cashout/process` | Admin/privileged | ต่ำ volume |
| `createServerFn` ต่างๆ | Privileged | reuse supabase client |

- [ ] ทุก server fn ใช้ `requireSupabaseAuth` เป็นค่า default
- [ ] `supabaseAdmin` เฉพาะหลัง trust check
- [ ] Error response ใช้ `generic_error` — ไม่ leak DB message
- [ ] AI stream: refund credits เมื่อ Gemini fail mid-stream
- [ ] ที่ 1,000 CCU: deploy SSR **≥2 instance** หลัง LB หรือใช้ Vercel/CF auto-scale

### 3.3 Realtime Subscriptions (So1o)

| ไฟล์ | Channel pattern | Action |
|---|---|---|
| `src/hooks/useSubscription.tsx` | `subscription-rt-*` per mount | ✅ unique channel — เก็บ pattern |
| `src/routes/track.$token.tsx` | `track-${job.id}` | ✅ per job — ปิดเมื่อ leave page |
| `src/hooks/useChat.tsx` | chat channels | ตรวจ 1 channel ต่อ conversation |
| `src/components/NotificationBell.tsx` | notifications | รวมเป็น 1 channel ต่อ user |
| `src/components/support/SupportFab.tsx` | support chat | cleanup on unmount |
| `src/store/dashboardJobs.tsx` | dashboard jobs | ตรวจว่าจำเป็นหรือใช้ invalidate แทน |
| `src/store/dashboardTasks.tsx` | tasks | เหมือนกัน |
| `src/store/dashboardJobTasks.tsx` | job tasks | เหมือนกัน |
| `src/components/dashboard/ContentPlannerTab.tsx` | planner | filter ด้วย user/workspace id |
| `src/hooks/inhouse/*` | inhouse workspace | เปิดเฉพาะเมื่ออยู่ inhouse mode |
| `src/components/admin/*` | admin panels | ⚠️ หนัก — จำกัดที่ 1,000 CCU |

- [ ] ทุก hook: `removeChannel` ใน `useEffect` cleanup
- [ ] ไม่ subscribe Realtime บน landing / public pages
- [ ] Admin: พิจารณา polling 30–60s แทน wildcard postgres_changes ที่ 1,000 CCU

### 3.4 Feature-Specific (So1o)

#### Dashboard & CRM

- [ ] Job list paginated — ไม่โหลดทั้งหมดครั้งเดียว
- [ ] Quotation / client list มี limit
- [ ] Free tier job cap enforced (`planLimits.ts` — 3 jobs/month)
- [ ] Tax / finance aggregates — ใช้ server fn หรือ RPC แทน client-side loop

#### Public token pages

- [ ] `/track/:token`, `/brief/:token`, `/planner/:token` — ไม่ต้อง auth แต่ RLS + opaque token
- [ ] Rate limit ต่อ IP ป้องกัน token brute-force (เสี่ยงต่ำ แต่ควรมีที่ edge)

#### AI features

- [ ] Mentor / business / copy / legal presets — credits ตาม tier
- [ ] Daily trends: อ่านจาก cache เท่านั้น (`dailyTrends.server.ts`)
- [ ] Background warm-up ไม่ block UI (`useDailyTrendsPrefetch.ts`)

#### In-House (shipped MVP)

- [ ] เมื่อเปิดจริง: workspace-scoped Realtime, seat limits, shared storage 10 GB/seat

#### Email & LINE

- [ ] Follow-up quotation email ผ่าน queue (`followUpEmail.functions.ts`)
- [ ] LINE LIFF `/line-link` — ไม่ block main thread
- [ ] Deadline reminders cron — ทดสอบ burst 100+ emails

### 3.5 So1o Deploy Checklist

#### 100 CCU

- [ ] Vercel Pro หรือ VPS 1 node (4 vCPU / 8 GB) + nginx
- [ ] Env secrets ครบ (ดู `Solo-Code/.env.example`)
- [ ] `vercel.json` maxDuration 60s พอสำหรับ AI
- [ ] Health check `/` ผ่าน

#### 1,000 CCU

- [ ] ≥2 SSR instance + LB **หรือ** fully serverless edge
- [ ] แยก host จาก an1hem ([`ecosystem-hosting.md`](./ecosystem-hosting.md))
- [ ] Auto-restart unhealthy container (`docker-compose.yml` healthcheck มีแล้ว)
- [ ] Zero-downtime deploy strategy (rolling update)

---

## 4. an1hem Showcase — Scale Checklist

**Stack:** React 18 + Vite SPA + Supabase client โดยตรง  
**Deploy:** static nginx / Cloudflare Pages — **scale ง่ายที่สุด**

### 4.1 Frontend & Caching

- [ ] React Query staleTime 60s default (`App.tsx`)
- [ ] Admin / legal / earnings / advertise → `React.lazy()` ใน `App.tsx`
- [ ] ทุก `<img>` มี width + height (CLS)
- [ ] WebP + lazy loading below fold
- [ ] ที่ 1,000 CCU: **Cloudflare Pages / CDN** — ไม่ serve static จาก VPS เดียว

### 4.2 Read-Heavy Pages (Hot path)

| หน้า | Query pattern | Scale action |
|---|---|---|
| Home feed | projects list + order | index + limit + cache |
| Profile / portfolio | projects by user | pagination |
| Project detail | single + comments | select เฉพาะ column |
| Jobs panel | job_posts | filter + limit |
| Inspire boards | collections | cache 5 min staleTime |

- [ ] Feed query มี composite index `(published, created_at DESC)` หรือเทียบเท่า
- [ ] ที่ 1,000 CCU: **materialized view** หรือ edge cache สำหรับ public feed (TTL 30–60s)
- [ ] Profile stats ไม่ aggregate ฝั่ง client จาก raw rows หลายพัน

### 4.3 Realtime Subscriptions (an1hem)

| ไฟล์ | Channel | ความเสี่ยง |
|---|---|---|
| `src/hooks/useChat.ts` | `conv-rt-${userId}`, `msg-rt-${conversationId}` | ต่ำ — ดี |
| `src/core/notifications/index.ts` | notifications | ต่ำ |
| `src/core/subscription/useSubscription.ts` | subscription | ต่ำ |
| `src/hooks/useHiringRequests.ts` | `hiring-rt` | กลาง — ควร filter user |
| `src/hooks/useProjectComments.ts` | per project | ต่ำ |
| `src/hooks/useJobMatchNotifications.ts` | job match | ต่ำ |
| `src/hooks/admin/useAdminRealtime.ts` | **หลาย table wildcard** | ⚠️ สูงมาก |
| `src/hooks/admin/useAdminData.ts` | admin stats | กลาง |
| `src/hooks/admin/useAdminAlerts.ts` | alerts | กลาง |

- [ ] Chat: 1 channel ต่อ user สำหรับ conversation list (มีแล้ว)
- [ ] เปิด message channel **เฉพาะเมื่ออยู่ใน ChatThreadView**
- [ ] `useHiringRequests` — เพิ่ม filter `user_id` (ECOSYSTEM_ROADMAP: realtime user_id filter — ตรวจว่าทำครบ)
- [ ] **Admin realtime** — ที่ 100 CCU: ใช้ได้; ที่ 1,000 CCU: **เปลี่ยนเป็น polling** หรือแยก channel ต่อ table + debounce invalidate

### 4.4 Write Paths (an1hem)

- [ ] ส่งข้อความ chat: insert message + update `conversations.last_message_at` — monitor write QPS
- [ ] Upload chat attachment → `anthem/chat/${conversationId}/` — ตรวจ quota
- [ ] Like / follow / gift — idempotent หรือ unique constraint ป้องกัน double-click
- [ ] Publish project — enforce free cap (published/draft limits ใน ECOSYSTEM_ROADMAP)
- [ ] Hire request → trigger `notify-hire-request` edge fn → email + LINE queue

### 4.5 Edge Functions (an1hem)

| Function | Auth | Scale note |
|---|---|---|
| `anthem-assistant` | JWT + credits | rate limit 429 |
| `generate-contract` | auth + debit | ไม่บ่อย |
| `similar-images` | auth | CPU/API heavy — cap |
| `embed-project` | owner/admin | background job |
| `job-match-dispatch` | internal pg_net | queue-friendly |
| `sync-so1o-tier` | internal | **legacy** — ไม่ต้อง deploy (unified project) |

- [ ] Deploy ครบ: `supabase functions deploy ...` (ดู ECOSYSTEM_ROADMAP)
- [ ] ทุก function validate JWT — missing env → 500 ไม่ skip
- [ ] Zod validate input ทุก function

### 4.6 Wallet / Gifts / Payments (an1hem)

- [ ] Wallet RLS — owner + admin only (security doc)
- [ ] Gift transactions — index `(sender_id, created_at)`, `(recipient_id, created_at)`
- [ ] ที่ 1,000 CCU: AML/KYC admin queries paginated — ไม่โหลดทั้งตาราง

### 4.7 an1hem Deploy Checklist

#### 100 CCU

- [ ] Static deploy บน Cloudflare Pages หรือ nginx บน VPS
- [ ] `VITE_SUPABASE_*` + `VITE_SO1O_APP_URL` ถูกต้อง
- [ ] CORS / CSP อนุญาต Supabase domain

#### 1,000 CCU

- [ ] **แยก host** จาก So1o VPS ([`deploy-anthem-production.sh`](../scripts/deploy-anthem-production.sh))
- [ ] CDN cache สำหรับ `index.html` short TTL + assets immutable
- [ ] ไม่ bind an1hem uptime กับ So1o container

---

## 5. Supabase Edge Functions — Inventory รวม

Deploy จากโปรเจกต์ unified (`Solo-Code/supabase/functions/` + `Anthem-Code/supabase/functions/`)

### AI / Gemini

- [ ] `anthem-assistant`
- [ ] `ai-design-chat` — มี IP rate limit
- [ ] `ai-price-suggest`
- [ ] `color-mentor`
- [ ] `planner-ai-assist`
- [ ] `ecosystem-ai-usage` — shared quota API

### LINE

- [ ] `line-webhook` — verify signature
- [ ] `line-connect`
- [ ] `line-connect`
- [ ] `line-queue-process` — worker concurrency

### Ecosystem / Notify

- [ ] `notify-hire-request` — enqueue email + LINE
- [ ] `job-match-dispatch` — pg_net trigger
- [ ] `notify-anthem`, `notify-anthem-chat`, `notify-anthem-collab` — email + LINE dispatch
- [ ] ~~`sync-so1o-tier`~~ — legacy, skip on unified project

### Media / ML

- [ ] `similar-images`
- [ ] `embed-project`
- [ ] `generate-contract`

- [ ] ทุก function ใช้ shared `_shared/gemini.ts` error mapping (429 → rate_limited)
- [ ] Cold start monitor — ที่ 1,000 CCU พิจารณา **keep-warm** สำหรับ line-webhook เท่านั้น

---

## 6. Load Testing Plan

### เครื่องมือ

- [ ] **k6** หรือ **Artillery** สำหรับ HTTP
- [ ] **Supabase load** — simulate PostgREST ด้วย service role ใน staging เท่านั้น
- [ ] Realtime — script เปิด WebSocket N connections แล้ววัด latency

### Scenarios

#### Scenario A — an1hem Browse (weight 40%)

```
1. GET static assets (CDN cache hit rate)
2. POST /auth/v1/token?grant_type=password (login)
3. GET projects?published=eq.true&limit=20
4. GET profiles?id=eq.{id}
5. GET project detail + comments limit 50
```

#### Scenario B — So1o Dashboard (weight 35%)

```
1. Login
2. GET dashboard_jobs limit 50
3. GET clients limit 50
4. GET quotations limit 20
5. POST quotation (write)
6. GET finance summary (server fn ถ้ามี)
```

#### Scenario C — Realtime Chat (weight 15%)

```
1. Login 2 users
2. Open WebSocket channel msg-rt-{conversationId}
3. Alternate INSERT messages 10 ครั้ง
4. Measure delivery latency p95
```

#### Scenario D — AI Stream (weight 10%)

```
1. Login Pro user
2. POST /api/assistant/stream (So1o)
3. Measure TTFB + complete stream
4. Verify credit debit idempotent  on retry
```

### Gates ก่อนประกาศ "พร้อม"

| Gate | 100 CCU | 1,000 CCU |
|---|---|---|
| Scenario A p95 | < 500 ms | < 800 ms |
| Scenario B p95 | < 600 ms | < 1 s |
| Scenario C delivery p95 | < 1 s | < 2 s |
| Scenario D TTFB p95 | < 3 s | < 5 s |
| Error rate ทุก scenario | < 0.1% | < 0.5% |
| Supabase connections peak | < 60% plan | < 70% plan |

---

## 7. Cost & Capacity Planning

### 100 CCU (ประมาณการ)

| รายการ | ประมาณ |
|---|---|
| Supabase Pro | ~$25/mo |
| Vercel Pro / VPS | ~$20–50/mo |
| Cloudflare (free/pro) | $0–20/mo |
| Gemini API | ขึ้นกับ AI usage — ตั้ง budget cap |
| Stripe | % transaction |
| **รวม infra** | **~฿2,000–4,000/mo** |

### 1,000 CCU (ประมาณการ)

| รายการ | ประมาณ |
|---|---|
| Supabase Team + compute | ~$100–300/mo |
| Multi-instance SSR / Vercel | ~$50–200/mo |
| CDN + WAF | ~$20–100/mo |
| Gemini API | **รายการใหญ่** — ต้อง cap + monitor |
| Storage overage | วางแผนตาม quota/user |
| Monitoring (Sentry, uptime) | ~$30–100/mo |
| **รวม infra** | **~฿15,000–40,000/mo** |

- [ ] ตั้ง **Gemini budget alert** ที่ Google Cloud Console
- [ ] ตั้ง **Supabase spend cap** / billing alert
- [ ] Review margin: Pro 249฿/mo vs storage 2GB + AI credits

---

## 8. Rollout Phases

### Phase 1 — พร้อม 100 CCU (เป้า 1–2 สัปดาห์)

- [ ] Supabase Pro + pooler + index audit
- [ ] Deploy an1hem บน CDN (แยกจาก So1o ถ้ายังไม่แยก)
- [ ] Sentry + uptime monitors
- [ ] Load test Scenario A–D ที่ 100 virtual users
- [ ] แก้ slow query Top 5
- [ ] Review admin Realtime scope

### Phase 2 — Hardening (เป้า 1 เดือน)

- [ ] Staging project + migration gate
- [ ] WAF rate limits ที่ edge
- [ ] Queue depth alerting
- [ ] Runbook + incident drill 1 ครั้ง
- [ ] Storage CDN สำหรับ public media

### Phase 3 — พร้อม 1,000 CCU (เป้า 1–2 เดือน)

- [ ] Supabase Team upgrade
- [ ] So1o SSR multi-instance
- [ ] Feed cache / materialized view (an1hem)
- [ ] AI global concurrent cap + queue UX
- [ ] Admin polling mode
- [ ] Load test 1,000 virtual users
- [ ] Status page public

---

## 9. Pre-Launch Sign-off

### Engineering

- [ ] Load test gates ผ่าน tier เป้าหมาย
- [ ] ไม่มี slow query > 1s บน hot path
- [ ] Realtime cleanup ทุก hook — ไม่ leak channel
- [ ] `service_role` grep clean
- [ ] Edge functions deployed + smoke test

### Product / Ops

- [ ] Status communication plan (ถ้า Supabase down)
- [ ] Support channel พร้อมรับ spike ticket
- [ ] AI credit limits สื่อสารใน UI ชัดเจน
- [ ] Free tier limits ทดสอบแล้ว (jobs, storage, publish cap)

### Legal / Compliance

- [ ] PDPA export/delete ยังทำงาน under load
- [ ] AML admin (an1hem) ไม่ expose PII เกินจำเป็น

---

## 10. Quick Reference — จุดคอขวดที่จะเจอก่อน

| ลำดับ | Bottleneck | แอป | แก้เร็ว |
|---|---|---|---|
| 1 | Gemini AI streaming | So1o + an1hem | credits + concurrent cap |
| 2 | Realtime invalidate storm | an1hem chat/admin | debounce + optimistic UI |
| 3 | Postgres connections | ทั้งคู่ | Supavisor + pooler |
| 4 | Admin wildcard Realtime | an1hem | polling แทน |
| 5 | Storage bandwidth | ทั้งคู่ | CDN + compress |
| 6 | Single VPS SSR | So1o | แยก host / serverless |
| 7 | Supabase SPOF | ทั้งคู่ | backup + status comms (แยก project ไม่ทำตอนนี้) |

---

## Changelog

| วันที่ | การเปลี่ยนแปลง |
|---|---|
| 2026-06-13 | สร้างเอกสารครั้งแรก — ครอบคลุม So1o + an1hem, tier 100 / 1,000 CCU |
