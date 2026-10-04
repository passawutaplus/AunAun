# Phase 01 — Safe URL importer `POST /api/import-url`

Auth required. Request `{url}`.
Success: `{success:true,data:{url,canonicalUrl,title,description,imageUrl|null,imageWidth|null,imageHeight|null,domain,siteName,faviconUrl|null,contentType:"image"|"webpage"}}`
Failure: `{success:false,code:INVALID_URL|UNSAFE_URL|FETCH_FAILED|UNSUPPORTED_CONTENT|RATE_LIMITED,message}`

## Security (arbitrary-URL fetch = high risk)
- http/https only; reject file:, data:, javascript:, ftp:, embedded credentials, ports ≠ 80/443.
- Resolve DNS yourself; reject if ANY IP is private/reserved (v4+v6): 127/8, 10/8, 172.16/12, 192.168/16, 169.254/16 (cloud metadata), 100.64/10, 0/8, ::1, fc00::/7, fe80::/10, IPv4-mapped v6. Block localhost, *.local, *.internal.
- Follow redirects manually, max 5, re-validate scheme+DNS/IP every hop.
- 8 s total timeout; stream body, hard cap ~2 MB; parse only text/html|xhtml; image/* = direct image.
- Clear User-Agent; never forward user cookies/headers.
- Validator + safe-fetch in its own module with unit tests (private IP, redirect→private, DNS→private, oversized, wrong type, too many redirects).
- Per-user rate limit with the existing `lib/rate-limit.mjs`; check it works across serverless instances (if it is in-memory, say so and propose a shared store; ask).

## Extraction (resolve relative URLs against the FINAL url)
- canonical: link rel=canonical → final URL
- title: og:title → twitter:title → <title> → domain
- description: og:description → meta description
- siteName: og:site_name → domain
- image: og:image(+secure_url/url) → twitter:image → JSON-LD (Article/NewsArticle/BlogPosting/ImageObject) → link rel=image_src → best <img> (src, data-src, data-lazy-src, data-original, largest srcset; skip icons/sprites/pixels/data:/tiny) → null
- favicon: rel=icon/shortcut icon/apple-touch-icon → /favicon.ico
- dimensions: og:image:width/height else probe image header (e.g. probe-image-size) with same SSRF rules + short timeout. NEVER trust <img width/height>.
- Direct image URL → contentType "image" with dimensions.

## Failure behavior
Blocked/non-200/timeout/no image → success:true with partial data, imageUrl null. Only invalid/unsafe URLs → success:false.

## Architecture
Implement as `api/import-url.js` (`createHandler`, per-user rate limit via `lib/rate-limit.mjs`, auth via `resolveAuthContext`) with the safe-fetch + extractors in `lib/import/*.mjs` (pure, tested with `node --test`). The same safe-fetch is reused by phase 05.E to download thumbnails of saved links. Small extractors in a pipeline behind one interface (generic OG, JSON-LD, img fallback; platform extractors later). Cache by normalized URL in the existing DB (not memory), TTL ~24h (ask before creating table).
Tests: HTML fixtures — OG-only, twitter-only, JSON-LD-only, lazy img, relative URLs, no image.

Done when: valid pages return metadata; localhost, 169.254.169.254, redirect→private, DNS→private are rejected; tests pass.
