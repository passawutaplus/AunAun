# A+ Vault SEO & Deploy

Updated: 2026-07-08

## Indexing policy (alpha)

| Route | robots meta | sitemap | robots.txt |
|-------|-------------|---------|------------|
| `/` | `noindex,nofollow` | excluded | allowed but app is noindex |
| `/vault` | `noindex,nofollow` | excluded | `Disallow` |
| `/demo` | `noindex,nofollow` | excluded | `Disallow` |
| `/legal` | `index,follow` + canonical | included | `Allow` |
| `/api/*` | n/a | excluded | `Disallow` |

Private workspace and demo guide stay out of search. Legal/trust pages are the only public SEO surface during alpha.

## Generated assets

Run:

```bash
npm run sitemap:gen
```

Writes to `outputs/a-plus-vault/`:

- `robots.txt`
- `sitemap.xml`
- `llms.txt`

`npm run build` runs `sitemap:gen` first, then copies assets to `dist/`.

### Environment

```bash
SITE_URL=https://aplus-vault.vercel.app npm run sitemap:gen
```

Also accepts `VAULT_SITE_URL` or `VITE_SITE_URL`.

## Verification

```bash
npm run test:gate
BASE_URL=https://aplus-vault.vercel.app npm run smoke:public
```

Smoke checks:

- `/robots.txt` — disallows `/vault`, `/demo`, `/api/`, links sitemap
- `/sitemap.xml` — includes `/legal` only
- `/llms.txt` — product summary for AI crawlers
- `/legal` — indexable (no `noindex`)
- `/`, `/demo` — remain `noindex`

## Before public launch

1. Add marketing landing route if `/` becomes public homepage
2. Regenerate sitemap with new public routes
3. Revisit `noindex` on app shell only after launch strategy is approved
4. Submit sitemap in Google Search Console when custom domain is live
