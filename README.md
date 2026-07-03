# AunAun Ecosystem

Monorepo for three related applications:

- `Solo-Code` — freelancer operations, billing, client portals, and back-office tools
- `Anthem-Code` — **Aplus1** creative community and portfolio (`https://aplus1.app`)
- `Ops-Hub` — administration and ecosystem monitoring

Documentation index: [docs/README.md](docs/README.md)

## Local setup

Each application is installed and run independently:

```bash
cd Solo-Code
cp .env.example .env
npm install
npm run dev
```

Repeat the same steps inside `Anthem-Code` and `Ops-Hub`. Keep real credentials in
local `.env` files or the deployment platform's environment settings. Never commit
service-role keys, Stripe secret keys, or access tokens.

## Production safety

- Apply all new Supabase migrations before deploying application changes.
- The canonical shared database migration history lives under `Solo-Code/supabase/migrations`.
- Mock payment RPCs are disabled for normal users by the latest migrations.
- Demo environments can explicitly enable mock payment RPCs with the SQL files in
  each application's `supabase/manual` directory.
- For Aplus1 release: [Anthem-Code/docs/release-gate-aplus1.md](Anthem-Code/docs/release-gate-aplus1.md),
  [Anthem-Code/docs/demo-isolation.md](Anthem-Code/docs/demo-isolation.md),
  [Anthem-Code/docs/store-readiness.md](Anthem-Code/docs/store-readiness.md).
