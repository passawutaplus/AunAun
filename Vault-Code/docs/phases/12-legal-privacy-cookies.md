# Phase 12 — Legal, privacy, PDPA, cookies (needs 02; finish before public launch)

You are NOT a lawyer. Everything here produces DRAFTS plus working product behavior; a Thai lawyer finalizes text. Existing draft: `outputs/a-plus-vault/legal.html` (Legal Center: privacy, terms, copyright, AUP, AI, security, export/deletion, extension privacy, subprocessors). Extend it; keep its look. Bilingual: Thai first, English second.

## 0. Case-study rules (from Savee, mymind, Pinterest, Are.na, Cosmos terms)
- Say plainly that most images belong to others and we cannot license them (Savee wording style); private storage is not a license to reuse.
- Users keep ownership; our license is limited to operating the service (store, resize, thumbnail, process for search, show to the user and people they explicitly share with).
- Real, numeric retention and deletion timelines (mymind style); a real sub-processor list with regions; a clear AI policy; copyright takedown with counter-notice and repeat-infringer rules (Pinterest style); named contact.
- Do not copy their weak spots: missing retention periods, outdated transfer mechanisms, "terminate for any reason" without notice.

## 1. Fix what is inconsistent today (first)
- One contact domain/emails everywhere (`legal.html` uses `privacy@aplus1.app`; `vault-extension/PRIVACY.md` uses `privacy@aplusvault.app`; anchors differ `#privacy` vs `#extension-privacy`). Ask the owner which; put them in one config.
- Legal text must match reality: today's `legal.html` promises deletion of "database rows, storage files, thumbnails, share links, queued AI" but the extension checklist says full account deletion is not built; AI "Lite" is rule-based. Build the behavior (section 6) or change the text.

## 2. Controller, notices, PDPA basics (Thailand)
Draft with placeholders `[LEGAL NAME] [ADDRESS] [CONTACT]` for the owner: who the controller is; contact; DPO only if counsel says it is required.
Privacy notice (Thai + English) must list, per purpose: data categories, purpose, legal basis (contract / legitimate interest / consent), mandatory vs optional, retention period, recipients and sub-processors, cross-border transfers (Supabase, Vercel, AI provider are outside Thailand: name regions and safeguards), and the user's rights (withdraw consent, access/copy, portability, object, delete, restrict, rectify, complain to the authority). Include minors (state a minimum age; counsel decides parental-consent wording).
Records: `docs/legal/ROPA.md` (processing register: purpose, data, basis, retention, recipients, transfer) as a short table.

## 3. Consent design (only for what truly needs consent)
- Needs opt-in consent, separate and withdrawable anywhere in Settings: (a) AI tagging of the user's PRIVATE images (T3, phase 05) · (b) non-essential analytics/cookies (section 4) · (c) marketing/digest email (phase 08; with unsubscribe).
- Does NOT need a consent banner (still disclosed): strictly necessary storage for what the user asked (login session, saved items, settings).
- Table `consent_events(id, user_id nullable, anon_id nullable, purpose, granted bool, policy_version, created_at)`; append-only; show current choices in Settings; re-ask when `policy_version` changes. No pre-ticked boxes, no dark patterns: "Reject" as easy as "Accept", same size and prominence, no cookie wall.

## 4. Cookies and similar storage — complete plan
**4.1 Inventory (do first, write `docs/legal/COOKIE_INVENTORY.md`).** Grep the whole product for `document.cookie`, `Set-Cookie`, `localStorage`, `sessionStorage`, `indexedDB`, `chrome.storage`, `<script src>`, `<link href>` to other origins, `fetch` to other origins, fonts, embeds, analytics, error-tracking. For each: name, set by (us / Supabase / Vercel / third party), purpose, category, duration, first/third party, where disclosed. Include: Supabase auth session (cookie or localStorage), the web app's item/state keys in localStorage, theme and viewer settings (B&W filter, etc.), extension `chrome.storage.local` (token, recent captures, queue, settings), the phase-10 `search_events.session_id`, Vercel/host analytics if any.
**4.2 Classification.** (1) Strictly necessary (login, security, CSRF, load balancing, saved items, remembered choice of consent): no consent, disclosed in the cookie notice. (2) Preferences the user set (theme, view): treat as necessary only when stored because the user chose it; otherwise ask. (3) Analytics/measurement: consent. (4) Advertising/tracking pixels: **not used** (owner decision; state it in the notice). Counsel confirms the line; when in doubt, ask.
**4.3 Defaults that avoid banners.** Prefer privacy-friendly choices so little needs consent: no ad pixels; no Google Analytics/PostHog-style identifiers; if measurement is wanted use cookie-less, aggregate-only analytics (verify the vendor's current docs before claiming that); no third-party embeds that set cookies; **self-host fonts and icons** (loading fonts from a CDN sends visitors' IPs to a third party); third-party images (saved links) load with `referrerPolicy="no-referrer"` (phase 02) and the notice says that viewing such images contacts the source site; Discover images are re-hosted so they do not.
**4.4 Phase-10 identifier.** `session_id` for `search_events` must be per-tab `sessionStorage`, random, never stored in a cookie, never linked to accounts or IP, aggregated; if it stays persistent or joinable to a person it needs analytics consent. Default `LEARN_CAPTURE` behavior must follow this.
**4.5 If any consent-requiring storage exists:** show a small banner (Thai/English) on first visit with: Accept all · Reject non-essential · Choose (granular toggles: analytics, [others]); nothing non-essential loads or is set BEFORE consent (gate script loading in code); remember the choice (localStorage key `aplus_consent_v1` + `consent_events` when logged in); "Cookie settings" link in the footer and Settings to change/withdraw at any time; respect Global Privacy Control/Do Not Track as "reject" by default when present; re-prompt only on policy version change or after a period counsel sets. No banner library without asking; build it in the existing vanilla JS style, keyboard accessible, no layout shift.
**4.6 Cookie notice page** (`/legal#cookies`, Thai + English): purpose in plain words, a table (name, provider, purpose, duration, type, category), how to change choices, browser controls, contact; generated from `COOKIE_INVENTORY.md`; update whenever the inventory changes (a test or CI check greps for new storage keys not in the inventory).
**4.7 Extension.** State exactly what it stores locally and why; it sets no cookies and loads no remote code; token stored in `chrome.storage.local`; "Disconnect" clears token, queue and recent captures. Chrome Web Store "single purpose" and permission justifications written to match phase 11.G.

## 5. Terms, copyright, acceptable use (drafts)
Terms: owner-retains-ownership + limited license; rights warranty; "images belong to their owners"; accounts personal; minimum age; suspension with notice and appeal (not "any reason"); governing law/venue: counsel decides (Thai law likely); liability limits: counsel. Copyright/takedown page: report form (work, URL of the Vault item, contact, good-faith and accuracy statements, signature), item hidden immediately (phase 09), notify owner, counter-notice path, repeat-infringer strikes, log with timestamps; counsel adds the Thai Copyright Act route if applicable. AUP: no scraping at scale, no bypassing paywalls/DRM, no CSAM (zero tolerance, report path), no harassment, no confidential client material.

## 6. Data-subject features that must actually work
- Export: one button → machine-readable JSON + original uploads (zip), generated server-side, delivered by signed link.
- Delete account: removes items, collections, projects, moodboards, share links, storage files and thumbnails, queued AI/enrichment jobs, extension captures; tokens revoked; backups purge window stated (decide with Supabase capabilities); confirmation email.
- Requests inbox: `dsar_requests(id, user_id, type access|delete|rectify|object|withdraw, status, created_at, due_at)` with a ~30-day target and reminder in the daily report (counsel confirms the legal deadline); privacy contact form creates a row.
- Trash 30 days (soft delete) then purge job (phase 09). Security logs short retention.

## 7. Breach and incident
`docs/RUNBOOK.md` gets an incident section: detect → contain (kill switch, rotate keys: service role, token secret, Anthropic key) → assess risk → notify the authority within 72 hours when required and affected users without delay when high risk (counsel confirms) → record. Template message drafts in Thai/English. Never put secrets in the extension or web bundle (existing rule).

## 8. AI and sub-processors pages
`/legal#ai`: provider, what is sent (downscaled image + title for T3; public CC0 feed images for seeding), retention and training terms per the provider's CURRENT terms (read them; do not promise "no training" unless the contract says so), user controls (opt-in toggle, per-item off), quota. `/legal#subprocessors`: Supabase, Vercel, AI provider, email provider, (analytics if any), each with purpose, data, region, link.

## 9. Launch checklist output
`docs/legal/LAUNCH_CHECKLIST.md` (≤30 lines): drafts exist (TH/EN), counsel review done, contacts live, retention implemented, export/delete tested, takedown tested end to end, consent logging tested, cookie inventory matches production (check in a clean browser profile with devtools), extension privacy matches manifest, store listing text ready.

Done when: inventory and notice match what a clean browser actually stores; nothing non-essential is set before consent (tested); consent log and settings work; export and delete work end to end; takedown hides content immediately; all drafts exist in Thai and English with placeholders for owner/lawyer; contact details and anchors are consistent.
