# So1o (Solo-Code) — Handoff & Bug Audit

ตรวจเมื่อ **7 ต.ค. 2569** · repo `passawutaplus/AunAun` @ `2d81cce` · ขอบเขต: `Solo-Code/` (+ ฐานข้อมูล Supabase ที่ใช้ร่วมกัน)
เอกสารนี้ไว้ให้ Claude Code / dev คนต่อไปอ่านก่อนลงมือ: สถานะ, ปัญหาที่เจอ, สิ่งที่แก้แล้ว, และ backlog เรียงตามความสำคัญ

> สถานะการแก้: ทุกอย่างอยู่ใน working tree **ยังไม่ commit/push** และ migration ใหม่ **ยังไม่ได้รันกับ production**

---

## 0. ต้องทำก่อนอย่างอื่น (P0)

| # | งาน | ทำไม | ใครทำ |
|---|-----|------|-------|
| 1 | **Rotate Supabase service-role key** ของโปรเจกต์ `zkflkpbmbozrchqncpzi` | มี JWT `role: service_role` ของโปรเจกต์นี้ถูก commit ใน `.env.vps.example` (commit `ea336eb`, 26 มิ.ย. 2569) ใน repo ที่เป็น **public** ข้ามRLS ได้ทั้งฐานข้อมูล ยังไม่ได้ทดสอบว่ายังใช้ได้ แต่ ref ตรงกับโปรเจกต์จริงและหมดอายุปี 2036 ให้ถือว่ารั่วแล้ว | เจ้าของโปรเจกต์ (Supabase dashboard) |
| 2 | **Apply migration** `supabase/migrations/20261007100000_revoke_server_only_rpcs.sql` | ปิดช่องโหว่ RPC ที่ anon key เรียกได้ (ดู §3.1) แล้วรันคิวรีตรวจท้ายไฟล์ ต้องได้ 0 แถว | เจ้าของโปรเจกต์ / Claude Code (ต้องขออนุมัติ) |
| 3 | เปิด **Leaked password protection** ใน Supabase Auth | advisor เตือนว่าปิดอยู่ | เจ้าของโปรเจกต์ |

หลัง rotate: อัปเดตค่าใหม่ใน Vercel/Cloudflare env, Edge Function secrets, `.env` ของ VPS, CI ที่ใช้ key เดิม การลบ key ออกจากประวัติ git ไม่พอและไม่จำเป็นถ้า rotate แล้ว

---

## 1. ภาพรวมโปรเจกต์

Monorepo `AunAun` (Supabase ตัวเดียว `zkflkpbmbozrchqncpzi` ใช้ร่วมกันทุกแอป):

| โฟลเดอร์ | ผลิตภัณฑ์ | หมายเหตุ |
|---|---|---|
| `Solo-Code` | So1o Freelancer (solofreelancer.com) | ฟรีแลนซ์ไทย: ลูกค้า ใบเสนอราคา งาน การเงิน/ภาษี Brief Labs In-House |
| `Anthem-Code` | Aplus1 (aplus1.app) | พอร์ตโฟลิโอ+ชุมชน, จ่ายเงินผ่าน Omise (ไม่ใช้ Stripe ของ Solo) |
| `Vault-Code` | A+ Vault | งานล่าสุดเกือบทั้งหมดของ repo อยู่ที่นี่ (เพิ่งเพิ่มใน README หลัก) |
| `Ops-Hub` | Admin / monitor | |

**Migration เป็นของกลาง** อยู่ที่ `Solo-Code/supabase/migrations` (235 ไฟล์) ทั้ง Aplus1 และ Vault เขียนลงที่นี่ จึงมี commit ที่แตะ `Solo-Code/` แต่ไม่ใช่งาน Solo

**ฟีเจอร์ Solo ไม่ขยับตั้งแต่ 18 ก.ค. 2569** (commit ล่าสุดที่แตะโค้ดแอป ไม่นับ migration)

### Stack
TanStack Start v1 (React 19, Vite 7, SSR; deploy Cloudflare Worker/Vercel/Docker) · React Query + Zustand + Zod · Tailwind v4 + shadcn · Supabase (Postgres/RLS/Auth/Storage, Edge Functions 30 ตัว) · Gemini (AI) · Stripe (เฉพาะ Solo) · LINE + อีเมล (PGMQ)

### โครงสร้างสำคัญ
```
Solo-Code/src
  routes/        67 ไฟล์ (file-based): dashboard, labs.*, inhouse.*, public token pages
                 (brief|track|pay|sign|planner|vision|supplier).$token, api/* (payments, cron, assistant)
  components/    dashboard/{home,overview,finance,planner,my-data,settings}, admin, inhouse, labs ...
  server/        createServerFn (*.functions.ts) งานที่ต้องสิทธิ์สูง
  lib/           ธุรกิจ/AI/Stripe/email (898 ไฟล์ ts/tsx ทั้ง src)
  integrations/supabase/  generated — ห้ามแก้ (types.ts, client*.ts)
supabase/functions  30 edge functions (+ _shared)
```

### กติกาที่ต้องรู้ก่อนแก้
- Components ไม่เรียก Supabase ตรง → ผ่าน hook; งานสิทธิ์สูงอยู่ใน `createServerFn`; webhook/cron อยู่ `routes/api/public/*`
- ห้ามแก้: `src/integrations/supabase/*`, `src/routeTree.gen.ts`
- `client.server` (service role) ใช้ได้เฉพาะ `*.functions.ts` / `*.server.ts` (ESLint บังคับ)
- Migration: **ห้ามแก้ไฟล์เก่าที่รันแล้ว** (ยกเว้นไฟล์ที่ไม่ตรงกับของจริงบน remote แบบ §3.4) และต้อง apply ก่อน deploy แอป
- Stripe ของ Solo ใช้กับ Solo เท่านั้น ห้ามให้ฟีเจอร์ใหม่ของ Aplus1 เรียก `/api/payments/*`
- เอกสารต้นทาง: `docs/architecture.md`, `docs/adding-a-feature.md`, `docs/stripe.md`, `../docs/ecosystem-deploy-policy.md`, `../docs/ai-skills/SOLO_*`

### คำสั่ง
```bash
cd Solo-Code && npm ci && cp .env.example .env
npm run dev          # :5173
npm run typecheck && npm test
npx vite build --config vite.docker.config.ts   # = build:docker
npm run e2e:smoke    # Playwright (ยังไม่ได้รันในการตรวจนี้)
```

---

## 2. ผลการตรวจ (หลังแก้)

| รายการ | ผล |
|---|---|
| `tsc --noEmit` | ผ่าน 0 error |
| `vitest run` | 25 ไฟล์ / 129 เทสต์ ผ่านหมด |
| `vite build` (docker config) | ผ่าน |
| `npm audit --omit=dev` | จาก 30 (critical 1, high 18) → **27 (critical 0, high 16)** |
| ESLint | 1,435 errors / 173 warnings (เดิม 9,220 — ส่วนใหญ่เป็นไฟล์ generated) แยกใน §4.3 |
| Supabase security advisors | 1 ERROR, 4 กลุ่ม WARN, 1 INFO (§3.3) |
| ไม่ได้ทำ | e2e (Playwright/Puppeteer), เปิดเว็บ production จริง, lint ของ Anthem/Vault/Ops-Hub |

> ระหว่างตรวจ ผมอ่านฐานข้อมูล production ผ่าน Supabase connector แบบ **อ่านอย่างเดียว** (list projects, security advisors, SELECT จาก `pg_proc`) ไม่มีการเขียนหรือเรียก RPC ใดๆ

---

## 3. ปัญหาที่พบ

### 3.1 [CRITICAL] RPC ฝั่ง server เปิดให้ anon key เรียกได้ — มี migration แก้แล้ว (ยังไม่ apply)
ฟังก์ชัน `SECURITY DEFINER` เหล่านี้รับ `_user_id` จาก caller, **ไม่เช็ก `auth.uid()`/role ภายใน**, และ `EXECUTE` ถูก grant ให้ `anon` + `authenticated` → เรียกผ่าน `/rest/v1/rpc/<name>` ได้ด้วย anon key ที่อยู่ใน bundle ฝั่งเบราว์เซอร์อยู่แล้ว

| ฟังก์ชัน | ผลที่เป็นไปได้ |
|---|---|
| `add_ai_credits_atomic(_user_id,_environment,_credits,_stripe_session_id,_price_id)` | **เติมเครดิต AI ให้ user ใดก็ได้โดยไม่จ่ายเงิน** (ใส่ session id ปลอม) — เสียค่า Gemini จริง |
| `debit_ai_credits`, `check_and_increment_ai_usage`, `claim_design_drill_reroll`, `claim_meeting_free_slot` | ใช้โควตา/เครดิตของคนอื่นจนหมด |
| `get_ai_usage_summary`, `get_design_drill_reroll_status` | อ่านข้อมูลการใช้ของคนอื่น |
| `enqueue_line_notification`, `notify_kyc_user`, `notify_job_application_event` | ส่งแจ้งเตือน/LINE ปลอมถึง user ใดก็ได้ (phishing, KYC ปลอม) |
| `sync_user_tier` | สั่ง sync tier ของ user อื่น |

ผู้เรียกจริงทั้งหมดที่หาเจอใน repo ใช้ service-role client หรือเป็น `SECURITY DEFINER` อื่น (ตรวจแล้ว) การ revoke จึงไม่กระทบแอป: ดู `20261007100000_revoke_server_only_rpcs.sql`

**ยังเหลือ (ต้องแก้ในตัวฟังก์ชัน ไม่ใช่แค่ revoke เพราะ Anthem เรียกจากเบราว์เซอร์):**
- `notify_collab_end_event`, `notify_hire_cancel_event` → ใส่เช็ก `auth.uid()` เป็นคู่สัญญาจริง (migration นี้ตัด anon ออกแล้ว แต่ `authenticated` ยังส่งถึงใครก็ได้)
- `recommend_from_likes(_user_id)` → ใช้ `auth.uid()` แทน parameter (ตอนนี้ดูประวัติไลก์ของคนอื่นได้)
- `assert_connect_payouts_ready(_user_id)` → ตรวจว่าควรเปิดให้ client หรือไม่

### 3.2 [CRITICAL] Service-role key ใน public repo — ดู §0 ข้อ 1
ผมแทนค่าใน `.env.vps.example` เป็น placeholder แล้ว (key เดิมยังอยู่ในประวัติ git) ไฟล์ `.gitignore` มี `!.env.*.example` ซึ่งปล่อยไฟล์ลักษณะนี้หลุดเข้า repo ได้ง่าย
ข้อเสนอ: เพิ่ม secret scanning (gitleaks) ใน `.github/workflows/quality.yml`

### 3.3 ผล Supabase security advisors (production)
| ระดับ | รายการ | แนะนำ |
|---|---|---|
| ERROR | `public.profiles_public` เป็น SECURITY DEFINER view | ตรวจว่าตั้งใจให้ข้าม RLS ไหม ถ้าไม่ใช่ → `security_invoker = true` |
| WARN | 182 ฟังก์ชัน definer ที่ `anon` เรียกได้ (177 ชื่อ) / 262 ที่ `authenticated` เรียกได้ | ไล่ตามแนวทาง §3.1: ที่ไม่ใช่ public API → revoke จาก anon ก่อน; กลุ่ม `admin_*`/`vault_admin_*` มีเช็กภายในแล้ว (ตรวจตัวอย่าง) แต่ควร revoke จาก anon ด้วย |
| WARN | 5 ฟังก์ชัน `search_path` ไม่ล็อก (เช่น `creator_submissions_rate_guard`, `hiring_org_guard_status`) | `ALTER FUNCTION ... SET search_path = ''` |
| WARN | extension `vector`, `pg_trgm` อยู่ใน schema public | ย้ายไป `extensions` (ระวัง dependency) |
| WARN | Leaked password protection ปิด | เปิดใน Auth settings |
| INFO | 105 ตารางเปิด RLS แต่ไม่มี policy (= ปฏิเสธทั้งหมด) | ปกติถ้าใช้ผ่าน service role เท่านั้น เช่น `user_ai_*`, `ai_tier_config`; ไล่ตรวจว่าไม่มีตารางที่ควรมี policy |

หมายเหตุ: ผลตรวจ Postgres ฝั่ง remote ตรงกับ heuristic ใน migration ว่า `forum_attachments` ไม่ได้ถูกแจ้งว่า RLS ปิด (แปลว่าบน remote เปิดแล้ว แต่ไม่มีใน repo — §3.4)

### 3.4 Migration history ผิดพลาด (แก้บางส่วนแล้ว)
- `20260713180000_aplus1_forum_attachments.sql`: ใช้ `''image''` (quote ซ้อน) นอก string → **syntax error ถ้ารันบน DB ใหม่/branch** (หมายเหตุในไฟล์บอกว่า "applied remotely" จึงเป็นสำเนาที่ escape ผิด) **แก้ quote แล้ว** แต่ไฟล์ยังขาด `ENABLE ROW LEVEL SECURITY`, policies และ index ที่ remote น่าจะมี → ควร dump จาก remote มาเติมให้ repo ทำซ้ำได้ (ใช้ `supabase db dump` / `list_tables`)
- `qa_fix_admin_list_profiles_safe.sql`, `qa_fix_job_trackers_insert_rls.sql` อยู่ใน `migrations/` แต่ชื่อไม่ขึ้นต้น timestamp → Supabase CLI จะข้าม/เตือน ควรย้ายไป `supabase/manual/` หรือตั้งชื่อใหม่ (ตรวจก่อนว่ารันบน remote แล้วหรือยัง)
- `20260620100000_payment_policy_2026.sql`: mock payment RPC ถูกคุมด้วย `payment_settings.mock_topup_enabled` — ตรวจค่านี้บน production ว่าเป็น false

### 3.5 Dependency vulnerabilities (ที่เหลือ 16 high / 9 moderate / 2 low)
แก้แล้ว (ลง lockfile เท่านั้น ไม่แตะ `package.json`): `seroval`/`seroval-plugins` 1.5.2→1.6.8 (**critical** ที่ใช้ตอน SSR serialize), `@tiptap/*` ทั้งชุด 3.23→3.31.4 (+ `prosemirror-view` ที่มี XSS ตอน paste, `prosemirror-model`)
ที่เหลือส่วนใหญ่เป็นสาย build/dev tooling (`@tanstack/router-plugin`→`chokidar`/`braces`, `miniflare`→`undici`/`sharp`, `ws`, `browserslist`, `js-yaml`)
**อย่ารัน `npm audit fix` เฉยๆ**: ผมลองแล้วมันดัน TanStack Start/Router ขึ้นหลายไมเนอร์ + `@lovable.dev/vite-tanstack-config` 1.4→1.8 ทำให้ `tsc` พัง 32 จุด (`errorComponent` type ใน `sign|supplier|track|vision.$token.tsx` ฯลฯ) และ build ล้ม (ส่วน build ล้มน่าจะมาจาก `@tiptap/core` ถูกยกตัวเดียวจนไม่ตรงกับ `@tiptap/react` ซึ่งตอนนี้แก้โดยอัปเดตทั้งชุดแล้ว) และ build log เตือนว่า `createServerFn().inputValidator()` ถูก deprecate ในเวอร์ชันใหม่ ถ้าจะอัป TanStack ให้ทำเป็นงานแยก มีเทสต์และ e2e คุม

### 3.6 จุดเสี่ยงอื่นที่เจอ (ยังไม่ได้แก้)
| ไฟล์ | ปัญหา | แนวทาง |
|---|---|---|
| `src/lib/cronAuth.server.ts` | cron route ยอมรับ `SUPABASE_SERVICE_ROLE_KEY` เป็น Bearer เป็น fallback ("during migration") → service key ถูกส่งผ่าน cron/HTTP ทั้งที่ควรแยก | ย้ายตัวเรียก cron ทั้งหมดไปใช้ `CRON_SECRET` แล้วลบ fallback; เปรียบเทียบ secret ด้วย `crypto.timingSafeEqual` (ตอนนี้คืนผลเร็วเมื่อความยาวต่าง) |
| `src/lib/rateLimit.server.ts` | rate limit เก็บใน `Map` ในหน่วยความจำ ใช้ได้เฉพาะต่อ instance (serverless/Worker หลาย isolate = ไม่คุมจริง) กับ route จ่ายเงิน/checkout สาธารณะ | ใช้ Supabase table/Upstash/Cloudflare rate-limit binding |
| `routes/api/public/payments/client-checkout.ts` | `environment` (`sandbox`/`live`) รับจาก body ของ client สาธารณะ | กำหนด environment จาก env ฝั่ง server เท่านั้น |
| `webhook.ts` (Stripe) | ตรวจ signature เอง (HMAC + timestamp 300 วิ) ผ่านการอ่านโค้ด แต่ไม่ได้ทดสอบ | เพิ่ม unit test เคสลายเซ็นผิด/เก่า/ซ้ำ (idempotency) |
| React hooks deps (20 warnings) | ที่ควรดูก่อน: `routes/pay.$token.tsx:78` (`load`), `track.$token.checkout.tsx:106` (`navigate`), `quotations/QuotationEditor.tsx:117`, `SettingsPanel.tsx:65` (`q.dueDate`/`q.lateFeePercent`), `ShareTrackerDialog.tsx:80`, `briefs/BriefsTab.tsx:576`, `store/quotations.tsx:441,637`, `hooks/finance/useFinanceExpenses.ts:104,108` | อาจเป็น stale closure จริง ตรวจทีละจุด อย่าเติม deps ตามอัตโนมัติ (อาจเกิด loop) |

---

## 4. สิ่งที่แก้แล้ว (working tree)

| ไฟล์ | การแก้ |
|---|---|
| `.env.vps.example` | แทนที่ service-role JWT ด้วย `your_service_role_key` |
| `supabase/migrations/20261007100000_revoke_server_only_rpcs.sql` | **ใหม่** — revoke RPC server-only จาก anon/authenticated (§3.1) |
| `supabase/migrations/20260713180000_aplus1_forum_attachments.sql` | แก้ `''x''` → `'x'` ให้เป็น SQL ที่ valid |
| `package-lock.json` | อัป seroval, tiptap ทั้งชุด, prosemirror-view/model (ไม่แตะ `package.json`) |
| `src/lib/stripe.server.ts` | เปลี่ยนชื่อ `useDirectStripe` → `shouldUseDirectStripe` (ไม่ใช่ hook; ESLint `rules-of-hooks` ฟ้องผิด) |
| `src/components/sign/SignaturePadField.tsx` | ternary ที่ใช้เป็น statement → `if/else` |
| `supabase/functions/similar-images/index.ts` | ลบ escape ที่ไม่จำเป็นใน regex |
| `eslint.config.js`, `.prettierignore` | ไม่ lint/format ไฟล์ generated (`types.ts`, `routeTree.gen.ts`) |
| `docs/README.md`, `supabase/README.md`, `../README.md` | ตัวเลขจริง (235 migrations / 30 functions / 129 tests) + เพิ่ม Vault-Code |

หลังแก้: `tsc` 0 error · เทสต์ 129/129 · build ผ่าน

### 4.3 สถานะ ESLint ที่ยังเหลือ (ไม่ใช่บั๊กส่วนใหญ่)
- 1,231 prettier: อยู่ 180 ไฟล์ — หลักๆ `routes/lovable/email/auth/webhook.ts` (107, บรรทัดว่างซ้อน), `lib/email/anthem-vendor/templates/*` (**ไฟล์ vendored/generated** ให้ ignore มากกว่าฟอร์แมต), `quotations/ClientPackDialog.tsx` (94) → รัน `npx prettier --write` เฉพาะไฟล์ของตัวเอง
- 195 `no-explicit-any` (error) กระจุกที่ admin/briefs/meetings/webhook/functions
- 64 `no-restricted-imports` (warning): import `client.server` ในไฟล์ `*.server.ts`/`lib/*Server.ts` ที่ rule อนุญาตเฉพาะ `*.functions.ts` — ปรับ pattern ให้ครอบ `*.server.ts` ถ้าตั้งใจ
- 4 `no-fallthrough` ใน `auth/webhook.ts` = ฟ้องผิด (case ซ้อนกัน คั่นด้วยบรรทัดว่าง) หายเมื่อฟอร์แมต
- 2 `no-control-regex` (`lib/security.ts:13`, `lib/articleHelpers.ts:47`) = ตั้งใจ (sanitize) ใส่ `eslint-disable-next-line` พร้อมเหตุผล
- 2 `ban-ts-comment` ใน `supabase/functions/ai-design-chat/index.ts:220,236` (Deno ไม่ผ่าน tsc ของแอป)
- CI (`.github/workflows/quality.yml`) รัน lint — ถ้า CI บังคับให้ผ่านจริง ตอนนี้ lint ยังแดง ตรวจว่า job ถูก `continue-on-error` หรือไม่

---

## 5. Backlog เรียงลำดับ

**P0** — §0 (rotate key, apply migration, leaked-password protection)
**P1 (ความปลอดภัย/เงิน)**
1. แก้ `notify_*_event` / `recommend_from_likes` ให้ใช้ `auth.uid()`; revoke anon จากฟังก์ชัน definer ที่เหลือตาม advisor
2. ลบ service-key fallback ใน `cronAuth`; ทำ rate limit แบบกระจาย; fix `client-checkout` environment
3. `profiles_public` security-definer view; search_path 5 ฟังก์ชัน
4. ทำ migration `forum_attachments` ให้ครบ + ย้ายไฟล์ `qa_fix_*.sql`
5. เพิ่ม gitleaks ใน CI
**P2 (คุณภาพ)**
6. ไล่ hooks-deps 20 จุด (§3.6) · ลด `any` ใน payments/webhook ก่อน · ฟอร์แมตไฟล์ตัวเอง · ทำ CI lint ให้เขียว
7. อัป TanStack Start/Router เป็นงานแยก (แก้ 16 high ที่เหลือ) + e2e คุม
8. รัน e2e smoke + `qa:full` ที่ยังไม่ได้รัน; เพิ่มเทสต์ webhook/cron auth/credits (ทั้ง src มีเทสต์ 25 ไฟล์ต่อ ~900 ไฟล์)
**P3 (ฟีเจอร์ — ตาม `docs/ROADMAP.md`, อัปเดตล่าสุด มิ.ย. 2569)**
- มีแล้ว: onboarding, Help, อีเมลแจ้งลูกค้า/เตือนชำระ (cron), Sentry, portal+ลงนามออนไลน์, In-House MVP, มีโค้ด PromptPay
- Q4: payment link/QR มัดจำ (ตรวจความครบของ PromptPay ที่มีอยู่ก่อน), export ชุดภาษีให้นักบัญชี, public changelog (ไม่มี route), 2FA/session (ไม่พบในโค้ด), SSO กับ Aplus1, Brief→CRM+Quote อัตโนมัติ, time tracking→คำนวณราคา (มีโค้ด timer บางส่วน ต้องตรวจ)
- อัปเดต `ROADMAP.md` ให้ตรงสถานะจริง

---

## 5.5 รอบจัดระเบียบ + UX (อาการกระตุก/กะพริบ)

วัดด้วย Playwright + Chromium (CPU throttle 4x สำหรับมือถือ, PerformanceObserver: layout-shift/longtask, rAF frame time)

| จุด | ก่อน | หลัง | สาเหตุ → วิธีแก้ |
|---|---|---|---|
| Home (มือถือ) CLS | 0.58–0.94 | ~0 | skeleton บทความสูงไม่เท่าการ์ดจริง → skeleton ใช้ grid/สัดส่วนเดียวกับ `ArticleCard` (`HomeInsightsSection`) |
| `/auth` เลื่อนหน้า | ~17 fps | 60 fps | `filter: blur(90px)` บน `.ambient-blobs` (+ keyframes ที่ไม่เคยมีอยู่) → ลบออกใน `styles.css` |
| Dark mode กะพริบขาว | class `dark` ใส่หลัง hydrate | ใส่ก่อน paint | inline `THEME_BOOTSTRAP` ใน `__root.tsx` + `suppressHydrationWarning` |
| `/sign/$token` CLS | 0.195 | 0 | not-found state ใช้ `min-h-[60vh]`; โหลดซ้ำแบบ silent |
| `/pay/$token` | spinner เต็มหน้าตอน refresh, เสี่ยงจ่ายซ้ำหลัง `?paid=1` | refresh แบบ silent, poll รอ webhook, ปุ่มถูก disable | latest-wins guard + polling สูงสุด 8 ครั้ง |
| QuickNote | พิมพ์หาย/ไม่ save ตอน unmount | save debounce 600ms, flush ตอน unmount, ไม่เขียนทับตอน dirty | refs + cleanup (มีเทสต์ 4 ตัว) |

**ลดโค้ดซ้ำ:** `AuthBannerSection` + `DashboardBannerSection` → `BannerSlidesManager` ที่ config ได้ (ลดเกือบเท่าตัว, เทสต์ 6 ตัว); ลบ `ScratchpadWidget` ที่ไม่มีใครใช้; `?? []` ที่ไม่เสถียรใน deps ของ useMemo (finance hooks, quotations) → useMemo; เทสต์กัน drift ของไฟล์ที่ copy ไป edge functions (`edgeSharedParity.test.ts`). jscpd: ซ้ำ ~0.49%.

**ข้อควรระวัง:** inline theme script ต้องการ CSP ที่อนุญาต inline script (ถ้า nginx ตั้ง `script-src 'self'` ล้วนจะถูกบล็อก → เพิ่ม nonce/hash หรือย้ายเป็นไฟล์ static). `scripts/docker-serve.mjs` ไม่เสิร์ฟ `dist/client` จึงวัด perf ผ่านมันตรงๆ ไม่ได้.

**ยังไม่ได้ทำ:** วัดหน้า dashboard หลังล็อกอิน; น้ำหนัก JS ของหน้า Home (long tasks มือถือ ~2.4s ที่ 4x throttle, LCP ~1.6s desktop); รูป 6 รูปบน Home ไม่มี width/height.

Verify หลังรอบนี้: tsc สะอาด, vitest 142/142 ผ่าน.

---

## 6. ข้อเสนอสำหรับ `CLAUDE.md` ของ Solo-Code (วางไว้ที่ root ของ repo ได้เลย)

```md
# Solo-Code
- Read docs/SOLO-HANDOFF.md first. Shared Supabase + migrations: never edit applied migrations; apply before deploy.
- Never edit src/integrations/supabase/* or src/routeTree.gen.ts.
- Privileged work only in createServerFn / *.server.ts. New SECURITY DEFINER SQL functions: check auth.uid() inside
  and REVOKE EXECUTE FROM PUBLIC, anon (and authenticated if server-only) in the same migration.
- Verify before finishing: npm run typecheck && npm test && npx vite build --config vite.docker.config.ts
- Do not run `npm audit fix` blindly (breaks TanStack types); update @tiptap/* together.
- Stripe here is Solo-only; Aplus1 payments use Omise.
```
