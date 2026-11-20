# 07 · Platform Publishing Rules

## Phase 1–3: manual export only (D3)

The publisher never posts. For each due, approved job it produces an **export draft** (final images + caption + alt text + link + checklist), sets the job to `EXPORTED_FOR_MANUAL_POST`, and the owner posts by hand and pastes the live URL (→ `PUBLISHED`, `reconcile_status = CONFIRMED`). In mock mode the export is simulated (`simulated = true`) and nothing leaves the system. Silence never counts as posted; there is no fake success.

## Per-platform character

| Platform | Format | Copy | Avoid |
|---|---|---|---|
| Instagram feed | 4:5 carousel 5–7, real work as hero | Short; caption supports the visuals; link in bio/story | Text-wall covers on every tile, hashtag spam |
| Facebook Page | 1 visual + useful explanation | Clear opener + takeaways; direct link where useful | Pasting the IG caption + hashtags |
| Threads | Text-first, question or observation | Sounds like a designer talking | Corporate announcements only |
| Pinterest | 2:3 checklist/tutorial pin | Keyword-rich but natural; links to the real guide | Tiny text, repeated link spam |
| Blog (samecor.com) | Original article + diagrams | Search intent first, sources, internal links | Mass AI articles |
| TikTok / Reels | 9:16, 15–45 s, hook in 2 s | Captions; native audio rights | Carousel turned into a slideshow |
| Lemon8 / Pantip | Manual only | Practical, transparent about SAMECOR | Thread farming, link drops |

IG feed captions do not carry clickable links; use profile/story links and per-channel UTMs.

## Adapter contract (later phases)

`validateAccountConnection · getCapabilities · validatePost · publish(post, idempotencyKey) · getPublishStatus · getMetrics → value | NotAvailable · getComments → batch | NotAvailable · exportManualDraft`. First real adapter: Meta (FB Page + IG Professional), one media type at a time. TikTok only after Direct Post audit. Unsupported = export.

## Preflight (all must pass, else no dispatch)

`pause_all` off · campaign status publishable · job status `SCHEDULED` · no publication with the same idempotency key · platform approval valid for the job's hash · job hash = latest variant hash · slot due · (later) connection scopes, media rules, final URL + UTM, source consent, budget.

Implemented in `preflight()` / `dispatchDueJobs()` (TS) and `ge_publish_job_guard` (SQL).

## Reliability

- `idempotency_key = campaign_id:platform:vN:<UTC slot>`; unique in jobs and in publications. One live job per campaign + platform + slot.
- Lock before dispatch (`ge_claim_due_publish_job` uses `SKIP LOCKED` + lease).
- Retry only transient errors (max 2, backoff + jitter). 4xx permission/content errors → pause that provider + alert.
- Timeout / unknown result → `PUBLISH_STATUS_UNKNOWN`; reconcile with the platform before any retry (SQL refuses other moves).
- Expired token → `ACTION_REQUIRED` on the connection; other channels keep running. No credential scraping.
- Comment after scheduling → new version → jobs for changed platforms `REVOKED` automatically.
- Pause All blocks every new dispatch; it never deletes jobs.

## Schedule (Asia/Bangkok, stored as UTC)

Publisher tick every 15 minutes publishes only jobs whose approved slot is due. Editorial windows (e.g. Mon 12:00, Wed 12:00, Thu 18:30) are hypotheses to test, kept in the editorial playbook. Never use a local-time string as a job id.
