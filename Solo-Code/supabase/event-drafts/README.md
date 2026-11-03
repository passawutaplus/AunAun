# Event drafts (scout)

One file per scout run, named `YYYY-MM-DD.sql`, written by the weekly "SAMECOR event scout"
cloud routine and applied to production by `.github/workflows/event-drafts-apply.yml` after
the PR is merged. Every statement creates a **draft** — nothing is published until an admin
opens it in `/admin/events` and presses publish.

Each event is one call:

```sql
SELECT public.scout_event_draft($j$
{
  "scout_batch": "2026-11-10",
  "title": "Bangkok Design Week 2027: Design to Last",
  "category": "exhibition",
  "starts_on": "2027-02-18",
  "ends_on": "2027-02-28",
  "time_note": "",
  "location_name": "เจริญกรุง–ตลาดน้อย และย่านอื่นทั่วกรุงเทพฯ",
  "location_note": "",
  "description": "เขียนใหม่สั้น ๆ 2–4 ประโยค ไม่คัดลอกจากต้นทาง",
  "organizer_name": "Creative Economy Agency (CEA)",
  "website_url": "https://www.bangkokdesignweek.com/en/bkkdw2027",
  "registration_url": "",
  "ticket_url": "",
  "registration_open": false,
  "fee_type": "free",
  "fee_note": "",
  "open_for_sponsors": false,
  "source_name": "Creative Economy Agency (ข่าวประกาศ)",
  "source_url": "https://www.cea.or.th/en/news-updates/Bangkok-Design-Week-2027-en/"
}
$j$::jsonb);
```

Rules the function enforces (same as the team editor): `title` ≤ 100, `description` ≤ 2000,
`location_name` / `location_note` / `source_name` ≤ 120, `organizer_name` ≤ 100,
`time_note` ≤ 60, `fee_note` ≤ 60, `category` ∈ exhibition · workshop · art_fair · talk_forum ·
open_call · other, `fee_type` ∈ free · paid · unspecified, links must be `https://` and not
shorteners. A draft is skipped (returns NULL) when the same `source_url` already exists or a
very similar title is already in the table. No images are ever copied: `cover_url` and
`gallery_urls` stay empty.
