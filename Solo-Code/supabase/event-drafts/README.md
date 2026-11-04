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
  "source_url": "https://www.cea.or.th/en/news-updates/Bangkok-Design-Week-2027-en/",
  "insights": {
    "who_for": ["นักออกแบบที่อยากเห็นงานออกแบบเมืองจริงในย่านเก่า", "…"],
    "takeaways": ["…"],
    "know_before": ["…"],
    "related_categories": ["Graphic / Branding", "Architecture / Interior"],
    "steps": ["…"],
    "links": [{ "kind": "download", "label": "ใบสมัคร (.pdf)", "url": "https://…" }]
  }
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

`insights` ("สรุปโดย SAMECOR" on the event page) is optional: `who_for` ≤ 5, `takeaways` ≤ 4,
`know_before` ≤ 5 short lines (≤ 140 chars, Thai, written only from the organiser's page — skip a
list rather than guess), `related_categories` ≤ 4 values from SAMECOR's work categories
(`Anthem-Code/src/data/projectTypes.ts` PROJECT_CATEGORIES). Never mention AI in these texts.

Category details (same `insights` object; the event page shows the blocks that fit the category and
hides empty ones — fill them whenever the organiser's page states them):

| key | for | limit |
| --- | --- | --- |
| `steps` | ordered steps — open call: how to apply · workshop: how to book · talk: how to register · art fair: how to buy tickets | ≤ 8 × 140 |
| `eligibility` | open call: who can apply | ≤ 5 × 140 |
| `benefits` | open call / contest: prizes or what selected applicants get | ≤ 5 × 140 |
| `bring` | workshop: what to bring / prepare | ≤ 6 × 140 |
| `speakers` | talk & forum: "ชื่อ — ตำแหน่ง / สังกัด" | ≤ 8 × 140 |
| `schedule` | talk / workshop programme, art fair rounds | ≤ 8 × 140 |
| `highlights` | art fair highlights | ≤ 6 × 140 |
| `capacity` | workshop seats, e.g. "รับ 12 คน" | ≤ 80 |
| `deadline` | open call closing date `YYYY-MM-DD` when it differs from `ends_on` | date |
| `links` | buttons `{ "kind", "label", "url" }`, kind ∈ download · form · rules · register · tickets · info | ≤ 6 |

**Keep it short:** the page shows one row of three blocks and at most **3 items per block**, each
about one line (≤ 80 characters) — merge related facts into one item instead of listing them.

**The weekly scout should fill `steps` and `links` for every open call, workshop and talk** whose page
gives them. Links must be copied exactly from the organiser's page (application forms, rule PDFs,
booking pages) — never guessed or built, `https://` only, no shorteners (if the page only gives a
shortener, link the announcement page itself as `info`). Labels are short — just what it is, ≤ 30
characters, e.g. `"ใบสมัคร (.docx)"`, `"กติกา (.pdf)"`, `"FAQ (.pdf)"`, `"จองตั๋ว"` (the buttons sit in the
event page's side rail above Organizer). Anything the page doesn't state is left out.
