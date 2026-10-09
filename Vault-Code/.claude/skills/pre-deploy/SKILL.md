---
name: pre-deploy
description: Pre-deploy / pre-PR checklist for A+ Vault on Vercel. Use for deploy, ship, publish, push, release, or "check before push".
---
# Pre-deploy
1. `npm run test:gate` (sitemap + check + unit + alpha smoke + build). Fix failures only in files we changed.
2. No leftover console.log/TODO/test data. No `.env*`, tokens, or service-role keys in code or commits.
3. App shell stays `noindex` unless told otherwise; check robots.txt/sitemap generation and `vercel.json` rewrites (/vault, /moodboards, /discover) intact.
4. Images/assets added: keep small (webp, <~500KB).
5. Never edit `dist/`. Don't commit `outputs/a-plus-vault/data/`.
6. Summarize changes in 3 lines + suggest a commit message. Do NOT push or deploy unless told. (`npm run deploy:demo` runs gate + deploy + smoke; `smoke:api` writes to DB.)
