# Plan v7 status (against VAULT-FEATURES.md, checked 2026-10-06)

Legend: done = in code and tested here · partial = some of it · todo = not started · owner = needs a decision or action from the owner.
"Done" means merged to the working branch and covered by the local gate; nothing here has been tried on a real Android phone or with a live Supabase login yet.

## C1 phase 0: clean up
| Item | Status | Note |
|---|---|---|
| Fix `qa.mjs` false positive (`prompt.prompt()`) | done | The native-popup guard is now a Node scan (no ripgrep); member calls like `x.prompt()` are ignored. CI gate also builds first and installs dependencies. |
| Merge v6.1 rules into CLAUDE.md, add BRAND.md / docs/brand | partial | BRAND.md and docs/brand exist; CLAUDE.md carries the guardrails and the brand coral, v6.1 not copied word for word. |
| Tagline "Keep what inspires you." everywhere | done | welcome hero, guest hero, login card, Museum guest line. |
| Check welcome promises against the code | done | Android/desktop apps are described as early builds + waitlist; no reverse-lookup promise. |
| Discover to Museum | partial | Menu, shortcuts, manifest shortcut, welcome and in-app labels say Museum. The path stays `/discover` and internal names (`discover_items`, view `discover`, API) are unchanged on purpose. No `/museum` redirect yet. |
| Check Discover dependencies before renaming | done | Label-only change, so similar items, digest and feed are untouched. |
| Menu order: My Vault first | done | top bar and welcome footer. |
| Welcome order Keep, Find, Museum, Projects | done | plus a "Three ways in" band. |
| Remove `noindex,nofollow` at launch | owner | Do it on launch day. |

## C1 phase 1: My Vault core
| Item | Status | Note |
|---|---|---|
| `origin` (web / my files / museum) + filter | done | Derived from how the item was kept (a stored `captureContext.origin` wins). Sidebar "Kept from", search tools (phone), `origin:` operator, saved in smart collections. |
| Everything lands in the Library; "Unsorted" filter (B1) | done | One room (Library) and one filter. Unsorted = in no collection (projects and tags do not count; old triage marks are ignored; legacy `inbox` id counts as no collection). Chip with count in the Library filters, `is:unsorted` operator, savable in smart collections. Select mode on Unsorted: add to collection, tag, delete. The Inbox tab and page are gone. |
| Smart collections as full smart folders (B2-1) | done | Criteria (color, rights, site, origin, keyword, operators) fill themselves and sync through collection metadata. |
| Copy palette as tokens (B2-2) | done | CSS variables, Tailwind, Figma tokens (JSON), hex list. |
| Cross-origin duplicate check (B2-4) | partial | Exact same file or URL is caught. Near-duplicates by image hash across web / upload / Museum are not. |
| Batch edit UI (B2-5) | done | keep, tag, add to collection, add to project, delete. |
| Onboarding + empty state (B5.8) | partial | My Vault empty state shows the three ways in. There is no separate one-page onboarding, and the Museum header line is unchanged. |
| "Kept for" chips + `why:` search (B2.1-F2) | partial | Drawer, Quick Keep sheet and extension popup have chips (plus project chips and a one-line note in the first two). Keeping from the Museum and drag-and-drop uploads do not ask. `why:color` works. |
| Share to Vault on Android (B2.1-F1) | partial | Share target is POST with images, the service worker parks them in IndexedDB, Quick Keep sheet confirms, Kept + Undo. Link-only shares keep the old path. Tested in unit tests and in the browser by seeding IndexedDB; not on a real phone. Missing: install hint for Android users who have not installed the app, an explicit "waiting to send" list. |
| "New" badge on cards | done | Kept in the last 7 days and not opened yet. Opening the item (drawer or phone page) stores `captureContext.seenAt` and the badge goes; after 7 days it disappears on its own. The badge hides while the pin button shows. |
| For You / Library (B2.1-F3) | done | For You is a calm dashboard (design canvas "For You Dashboard"): a summary line (date, kept, collections, projects); main column: **Needs you** (one card, max 3 rows: unsorted first, then project gaps, most recently updated project first; Skip for now hides a row 7 days and never touches items), **Your week in color** (palette + Mon-Sun bars; bars only when too few images; hidden with no keeps in 7 days; Copy as tokens, Find in Vault, "Your year in keeps" opens the heatmap in its own view), **Recently kept** (last 6 with a picture, origin chip); side column: **Your spaces** (3 collections, 3 projects; phone shows 3 summary rows), **Top of Mind** (5 slots), **From your past**. The stat tiles, streaks on the main page and promo cards are gone. Local data only, works offline. Tabs are Library then For You; My Vault always opens on Library (owner decision 2026-10-06). **From the Museum** card is not built (flag off, needs Museum data). Checked at 1280 and 390 px in light and dark; not yet seen on a real device. |

## Later phases
| Phase | Status |
|---|---|
| 2 Museum data foundation (`museum_sources`, standard fields, level-0 pipeline) | todo, waits for owner approval of the four B6.2 rule changes |
| 3 Museum experience (feed, filters, designer's label page, rooms) | todo |
| 4 Import folder, storage plan C, offline PWA, links between items (F4) | todo |
| 5 Museum content (AI levels 1-2, eras, timeline, daily piece) | todo |
| 6 After launch (paid originals, weekly digest sending, iOS share, Museum 3D, ...) | todo |

## Decisions recorded 2026-10-06
Share-to-Discover for own uploads stays behind `DISCOVER_SHARE_ENABLED=false`; 92 Wikimedia items hidden (not deleted) until the source steps in appendix B.3 are done; originals only on the paid plan; AI budget to be raised and AI used on every image (owner still has to top up Anthropic credit and set the cap); the Museum accepts design works only.

## Owner to-do
- Top up Anthropic credit and choose the monthly cap, then run the Cooper Hewitt fill (`seeder/scripts/fill-multi.ts`, `FILL_SOURCE=chndm`).
- Decide the default tab (For You or Library) and the final list of "kept for" chips.
- Vercel: the Git integration projects build from the repo root and fail on every push; set the Root Directory or an ignored-build step so they stop eating the daily deploy quota.
- Lawyer review before opening share-to-Museum and paid originals.
