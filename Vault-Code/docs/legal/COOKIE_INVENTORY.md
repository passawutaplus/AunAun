# Cookie and storage inventory (A+ Vault web app + extension)

Updated 2026-10-04. **Cookies set by us: none.** The app uses browser storage (localStorage / sessionStorage / Cache Storage) only for what the user asked for. No analytics, no advertising pixels, no third-party fonts or embeds (fonts are self-hosted, enforced by `scripts/qa-security.mjs`). A test (`scripts/__tests__/legal.test.mjs`) fails when a new `aplus-vault-*` key appears in the code but not in this table.

Categories: **N** = strictly necessary / user-requested (no consent), **P** = preference the user set (necessary because the user chose it), **C** = consent required (none today).

| Key / item | Where | Set by | Purpose | Category | Duration |
|---|---|---|---|---|---|
| `aplus-vault-supabase-session` | localStorage | us (Supabase Auth client) | keeps you logged in | N | until sign out / token expiry |
| `aplus-vault-user` | localStorage | us | local profile (display name, provider) | N | until sign out |
| `aplus-vault-items` | localStorage | us | your saved items (local-first copy) | N | until you delete / clear |
| `aplus-vault-collections` | localStorage | us | your collections | N | same |
| `aplus-vault-projects` | localStorage | us | your projects | N | same |
| `aplus-vault-moodboards` | localStorage | us | your moodboards | N | same |
| `aplus-vault-imported-captures` | localStorage | us | which extension captures were already imported | N | same |
| `aplus-vault-trash` | localStorage | us | deleted items kept 30 days for restore | N | 30 days |
| `aplus-vault-api-token` | localStorage | us | extension sync token shown to you | N | until sign out |
| `aplus-vault-ext-paired` | localStorage | us | remembers the extension was paired | N | until sign out |
| `aplus-vault-theme` | localStorage | us | light/dark choice | P | until changed |
| `aplus-vault-library-view` | localStorage | us | grid size/view choice | P | until changed |
| `aplus-vault-right-width`, `aplus-vault-mb-source-w`, `aplus-vault-mb-inspector-w` | localStorage | us | panel widths you dragged | P | until changed |
| `aplus-vault-viewer-bw` | localStorage | us | black-and-white viewer toggle | P | until changed |
| `aplus-vault-quick-note`, `aplus-vault-quick-note-on`, `aplus-vault-quick-note-open` | localStorage | us | your quick notes and panel state | N | until you delete |
| `aplus-vault-saved-searches` | localStorage | us | searches you saved | N | until you delete |
| `aplus-vault-resurface-hidden` | localStorage | us | "From your past" hidden for today | P | 1 day |
| `aplus-vault-opened` | localStorage | us | which items you opened (local only; "From your past") | N | rolling 500 items |
| `aplus-vault-discover-seen` | localStorage | us | Discover images you already saw (local only; shows new ones first) | P | 14 days |
| `aplus-vault-sid` | sessionStorage | us | random per-tab id for anonymous Discover search statistics (never in a cookie, never the user id; dropped when Do-Not-Track / Global Privacy Control is on) | N | tab session |
| `aplus-vault-keep-target` | localStorage | us | collection chosen for "+ Keep" | P | until changed |
| `aplus-vault-pending-action` | sessionStorage | us | resumes a Keep after login | N | tab session |
| `aplus-vault-shared` | sessionStorage | us | link shared into the app, waiting for login | N | tab session |
| `aplus-vault-sw` | sessionStorage | us | service worker update flag | N | tab session |
| `aplus_consent_v1` | localStorage | us | your privacy choices | N | until changed |
| Cache Storage (service worker) | browser cache | us | offline page + app icons only | N | until a new version |
| Extension `chrome.storage.local` | extension | us | token, settings, recent captures, retry queue, kept-image keys | N | until Disconnect / uninstall |

Third parties contacted by the page: **none for scripts, fonts or analytics.** Images of links you save load from the source site with `referrerpolicy="no-referrer"` (viewing them contacts that site). Supabase (data), Vercel (hosting) and the AI provider are processors, listed in `legal.html#subprocessors`.
