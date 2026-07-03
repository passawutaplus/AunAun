# Aplus1 — Developer Docs

Entry point สำหรับ dev ใหม่:

0. **[`MASTER_CURSOR_BRIEF.md`](./MASTER_CURSOR_BRIEF.md)** — product north star (ผลงานจริง → โอกาส) + ลำดับอ่าน spec
1. [`architecture.md`](./architecture.md) — data flow + notify pipeline
2. [`folder-structure.md`](./folder-structure.md) — folder layout
3. [`conventions.md`](./conventions.md) — code style
4. [`data-model.md`](./data-model.md) — tables (shared/anthem/so1o)
5. [`adding-a-feature.md`](./adding-a-feature.md) — step-by-step + `notifyAnthem()`
6. [`performance.md`](./performance.md) — performance rules
7. [`schema-reorganize.md`](./schema-reorganize.md) — schema migration plan

## Product foundation (2026-07)

| Doc | สรุป |
|-----|------|
| [`MASTER_CURSOR_BRIEF.md`](./MASTER_CURSOR_BRIEF.md) | อ่านก่อน — thesis, P0, กติกา Cursor |
| [`product/aplus1-prd.md`](./product/aplus1-prd.md) | PRD, persona, metrics, launch criteria |
| [`product/aplus1-ux-flow.md`](./product/aplus1-ux-flow.md) | UX flows creator/hirer |
| [`product/aplus1-feature-spec-cursor.md`](./product/aplus1-feature-spec-cursor.md) | Engineering spec + acceptance criteria |
| [`research/aplus1-opportunity-research.md`](./research/aplus1-opportunity-research.md) | วิจัยตลาด + positioning |
| [`research/aplus1-copy-system.md`](./research/aplus1-copy-system.md) | ภาษาไทย, CTA, 「โอกาส」vs「งาน」 |

## Ecosystem / platform

| Doc | สรุป |
|-----|------|
| [`../../docs/ecosystem-notifications.md`](../../docs/ecosystem-notifications.md) | Email + LINE + in-app |
| [`aml-compliance.md`](./aml-compliance.md) | PX wallet, KYC, cashout |
| [`admin-pending.md`](./admin-pending.md) | Admin feature status |
| [`marketing-migration.md`](./marketing-migration.md) | Marketing admin module + DB |
| [`brand-rollout-handoff.md`](./brand-rollout-handoff.md) | โลโก้ + อีเมล (เมื่อได้ asset จริง) |
| [`demo-catalog.md`](./demo-catalog.md) | Demo accounts |
| [`brand-icons-thesvg.md`](./brand-icons-thesvg.md) | โลโกแบรนด์เครื่องมือ (theSVG.org) |
| [`../supabase/README.md`](../supabase/README.md) | Canonical backend (Solo-Code) |

## QA / Testing

| Doc | ใช้เมื่อ |
|-----|---------|
| [`../../docs/README.md`](../../docs/README.md) | Ecosystem docs index |
| [`full-test-plan.md`](./full-test-plan.md) | แผนเทสจัดเต็ม |
| [`../../docs/MANUAL-TESTING.md`](../../docs/MANUAL-TESTING.md) | Manual QA |
| [`qa-checklist.md`](./qa-checklist.md) | Checklist ก่อน release |
| [`qa-onboarding.md`](./qa-onboarding.md) | Onboarding QA |
| [`test-accounts.md`](./test-accounts.md) | Role matrix |
| [`e2e-guide.md`](../../docs/e2e-guide.md) | Playwright + Puppeteer |
| [`release-gate-aplus1.md`](./release-gate-aplus1.md) | **Release gate** ก่อน production |
| [`brand-rollout-handoff.md`](./brand-rollout-handoff.md) | โลโก้ + อีเมล rollout |
| [`ux-research-review.md`](./ux-research-review.md) | **เช็คลิส UX/UI ครบทุกระบบ (A–T)** |
| [`seo-deploy.md`](./seo-deploy.md) | SEO checklist aplus1.app |

```bash
npm install
npm run dev              # → http://localhost:8080
npm run test             # vitest (129 tests)
npm run test:gate
npm run smoke:public
npm run email:preview    # notification email previews
npm run e2e:puppeteer:smoke
npm run e2e:puppeteer:chat
```

## URLs

| บริบท | URL |
|--------|-----|
| Production | https://aplus1.app |
| Demo | https://aplus1-demo.vercel.app |
| So1o | https://solofreelancer.com |

## Tech stack

- React 18 + Vite 5 + TypeScript 5
- Tailwind CSS v3 + shadcn/ui + Lucide
- React Query + Zustand
- Supabase `zkflkpbmbozrchqncpzi` (unified with So1o)
- React Email templates (`src/lib/email-templates/`)

Env vars (.env auto-generated — อย่าแก้):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SITE_URL` → `https://aplus1.app` (production)

## หา code ไม่เจอ?

- Routes → `src/pages/`
- Business logic → `src/features/<domain>/`
- Shared with So1o → `src/core/`
- Supabase queries → `src/server/`
- Email templates → `src/lib/email-templates/`
- Notify helper → `src/lib/notifyAnthem.ts`
