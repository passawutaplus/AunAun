# AunAun Ecosystem

Monorepo for the SAMECOR product and the tools around it:

- `Anthem-Code` — **SAMECOR**, the creative community and portfolio app (`https://samecor.com`).
  The Android app (`com.samecor.app`) is a Capacitor shell in `Anthem-Code/capacitor-shell`.
- `Solo-Code` — So1o freelancer operations and back office. Also holds the shared Supabase
  backend: migrations in `Solo-Code/supabase/migrations`, edge functions in `Solo-Code/supabase/functions`.
- `Ops-Hub` — administration and ecosystem monitoring.
- `Vault-Code` — A+ Vault, inspiration vault with browser extension and Museum/Discover feed (see `Vault-Code/README.md`).

Documentation index: [docs/README.md](docs/README.md)

## Local setup

Each application is installed and run independently:

```bash
cd Anthem-Code
cp .env.example .env
npm install
npm run dev
```

Repeat the same steps inside `Solo-Code` and `Ops-Hub`. Keep real credentials in
local `.env` files or the deployment platform's environment settings. Never commit
service-role keys, payment secret keys, or access tokens.

## Production safety

- Apply all new Supabase migrations before deploying application changes.
- The canonical shared database migration history lives under `Solo-Code/supabase/migrations`.
- Mock payment RPCs are disabled for normal users by the latest migrations.
- Demo environments can explicitly enable mock payment RPCs with the SQL files in
  each application's `supabase/manual` directory.
- SAMECOR release checklists: [Anthem-Code/docs/release-gate-aplus1.md](Anthem-Code/docs/release-gate-aplus1.md),
  [Anthem-Code/docs/demo-isolation.md](Anthem-Code/docs/demo-isolation.md),
  [Anthem-Code/docs/store-readiness.md](Anthem-Code/docs/store-readiness.md).
