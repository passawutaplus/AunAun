# So1o Freelancer Management — Developer Docs

ยินดีต้อนรับ! เอกสารชุดนี้สำหรับ dev / QA / pentester นอกที่เข้ามารับงานต่อ

## Index

| Doc | สำหรับ | สรุป |
|---|---|---|
| [`ROADMAP.md`](./ROADMAP.md) | Product / Dev | Roadmap รายไตรมาส + เทียบคู่แข่ง |
| [`architecture.md`](./architecture.md) | Dev | ภาพรวม stack + data flow |
| [`folder-structure.md`](./folder-structure.md) | Dev | นิยาม 3 layer: core / features / server |
| [`conventions.md`](./conventions.md) | Dev | กฎการเขียนโค้ด |
| [`DESIGN.md`](./DESIGN.md) | Dev / Design | Design system — icons, tokens, Home layout |
| [`data-model.md`](./data-model.md) | Dev / QA | ตาราง Supabase หลัก |
| [`adding-a-feature.md`](./adding-a-feature.md) | Dev ใหม่ | Playbook migration → UI |
| [`stripe.md`](./stripe.md) | Dev / Ops | Stripe sync, lookup keys, webhooks |
| [`performance.md`](./performance.md) | Dev | React Query / code-split |
| [`security.md`](./security.md) | Security | Threat model |
| [`production-security-checklist.md`](./production-security-checklist.md) | Security | Pre-launch checklist |
| [`pentest-scope.md`](./pentest-scope.md) | Pentester | URL / scope |
| [`csp-report.md`](./csp-report.md) | Security | CSP rollout |
| [`seo-deploy.md`](./seo-deploy.md) | Ops | SEO checklist solofreelancer.com |
| [`vercel-demo-deploy.md`](./vercel-demo-deploy.md) | Ops | UX demo บน Vercel |
| [`ux-research-demo.md`](./ux-research-demo.md) | UX / Research | คู่มือ demo สั้น |
| [`ux-research-review.md`](./ux-research-review.md) | UX / Research | **เช็คลิสครบ A–T** + `/research` |
| [`docker.md`](./docker.md) | Dev / Ops | Docker SSR |
| [`ai-gemini.md`](./ai-gemini.md) | Dev / Ops | Gemini + Edge Functions |
| [`full-test-plan.md`](./full-test-plan.md) | QA | แผนเทสจัดเต็ม |
| [`../../docs/MANUAL-TESTING.md`](../../docs/MANUAL-TESTING.md) | QA | Manual QA (65 ข้อ) |
| [`../../docs/ecosystem-notifications.md`](../../docs/ecosystem-notifications.md) | Dev / QA | Email + LINE + in-app |
| [`qa-checklist.md`](./qa-checklist.md) | QA | Checklist ก่อน release |
| [`qa-onboarding.md`](./qa-onboarding.md) | QA นอก | Clone → run → bug report |
| [`test-accounts.md`](./test-accounts.md) | QA | Role matrix |
| [`e2e-playwright.md`](./e2e-playwright.md) | QA | Playwright |
| [`e2e-puppeteer.md`](./e2e-puppeteer.md) | QA / WSL | Puppeteer fallback |
| [`../supabase/README.md`](../supabase/README.md) | Dev / Ops | 136 migrations, 19 edge functions |

## Quick start (dev)

```bash
npm install
npm run dev              # → http://localhost:5173
npm run test             # vitest (60 tests)
npm run test:gate          # unit + smoke
npm run smoke:public
npm run stripe:sync        # Stripe sandbox catalog
npm run qa:full            # ecosystem full gate
npm run e2e:puppeteer:smoke
npm run e2e:smoke          # Playwright
npm run e2e:seo
```

## Tech Stack

- **Framework:** TanStack Start v1 (React 19, Vite 7, SSR)
- **State:** React Query · Zustand · Zod
- **Styling:** Tailwind v4 + shadcn/ui
- **Backend:** Supabase `zkflkpbmbozrchqncpzi` (unified with an1hem)
- **AI:** Google Gemini — Edge Functions + server functions
- **Payments:** Stripe direct (`STRIPE_USE_DIRECT=true`)
- **Auth:** Supabase Auth (email + Google OAuth)

## URLs

| บริบท | URL |
|--------|-----|
| Production | https://solofreelancer.com |
| Demo | https://solo-demo-liart.vercel.app |
| an1hem | https://an1hem.app |
| Ops Hub | https://hq.solofreelancer.com |

## Sensitive boundaries

- `src/integrations/supabase/*` — auto-generated, ห้ามแก้
- `.env` — managed
- `src/routeTree.gen.ts` — auto-generated

## Contact

[`SECURITY.md`](../SECURITY.md) — Vulnerability Disclosure Policy
