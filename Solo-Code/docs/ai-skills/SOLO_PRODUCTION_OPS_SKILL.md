# Solo Production Ops Skill

## Purpose

ใช้เมื่อแก้:

- Vercel deploy
- environment variables
- Supabase migrations
- CI
- monitoring/logs
- backup/rollback
- production readiness

## Production Surfaces

- Vercel projects
- Supabase database/auth/storage
- Stripe
- GitHub Actions
- domain/SEO
- email/notification service

## Env Rules

Required separation:

- local
- demo/staging
- production

Never mix:

- test Stripe secret in production
- production Supabase in local destructive scripts
- service role in client env
- demo fallback URL in production

## Vercel Rules

- build command must be deterministic
- env vars set per project/environment
- preview deployment should be reviewed before production
- production fallback URLs must not point to localhost
- check deploy status after merge

## Supabase Rules

- migrations reviewed before applying
- destructive migration requires backup/approval
- RLS/security advisor checked
- seed/demo data must be removable
- production data scripts must be idempotent or clearly documented

## CI Rules

Minimum:

- install
- lint or tolerated lint
- typecheck
- unit tests
- build
- smoke
- security/audit report

Audit can be advisory if external dependency issue, but must be visible

## Monitoring

Track:

- payment endpoint errors
- webhook errors
- cashout failures
- auth callback failures
- Supabase RLS errors
- Vercel build failures
- client runtime errors

## Backup and Rollback

Before risky release:

- backup DB if migration risky
- note last good Vercel deployment
- keep rollback plan
- do not force-push main

If incident:

1. identify affected commit/deployment
2. rollback Vercel if needed
3. disable risky feature flag if available
4. patch forward with focused PR
5. document root cause

## Release Checklist for Solo

- [ ] typecheck passed
- [ ] build passed
- [ ] payment/cashout tests passed or manually reviewed
- [ ] env verified
- [ ] Vercel deploy success
- [ ] Supabase migration applied
- [ ] Security Advisor reviewed
- [ ] no service role in client bundle
- [ ] smoke public pages
- [ ] admin/ops critical route guarded

## Red Flags

- production deploy pending/failing after merge
- env missing in Vercel
- migration applied to wrong project
- webhook secret mismatch
- Stripe test/live mismatch
- cashout endpoint error spike
- security advisor new critical warning
