# So1o (Solo-Code)

Freelancer ops app: projects, billing/quotations, client portals, labs, admin. Production: https://solofreelancer.com (demo: https://solo-demo-liart.vercel.app).
Stack: TanStack Start + React + Tailwind v4 + Supabase + Stripe. Part of the AunAun-fresh monorepo.
Work only inside `Solo-Code/`; ignore `../Vault-Code`, `../Anthem-Code`, `../Ops-Hub` unless asked.
Exception: `supabase/migrations/` here is the canonical DB history for the WHOLE ecosystem (Anthem and Vault share the DB).

## Read on demand only
- `docs/README.md` - index of all dev docs
- `docs/architecture.md`, `docs/folder-structure.md`, `docs/conventions.md` - before structural changes
- `docs/adding-a-feature.md` - migration -> UI playbook
- `docs/data-model.md`, `docs/stripe.md`, `docs/security.md` - only for those areas
- `../docs/ai-skills/` - shared coding/security/release rules

## Map
- `src/routes/` file-based routes (`routeTree.gen.ts` is generated); `src/routes/api/public/` webhooks/cron
- `src/server/` server fns + `queries/`; `src/features/` domain barrels; `src/core/` shared by >=2 features
- `src/integrations/supabase/` auto-generated, DO NOT EDIT
- `supabase/migrations/` + `supabase/functions/`; `e2e/` Playwright; `scripts/` ops scripts

## Commands
- `npm run typecheck && npm run lint && npm test` after changes
- `npm run dev` -> http://localhost:5173 (Windows PowerShell: use `npm.cmd` if blocked)

## Rules
- New migrations applied BEFORE deploying app changes; never commit `.env`/service-role/Stripe secrets
- Deploy flow: `../.cursor/rules/deploy-workflow.mdc`
