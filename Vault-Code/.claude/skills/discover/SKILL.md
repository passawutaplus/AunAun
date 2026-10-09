---
name: discover
description: Work on the public Discover page (CC0 museum images, color/shape/tone search, similar items) and the seeder app. Use for discover, search by color, seeding, discover_items requests.
---
# Discover
- Client: `modules/discover.js` (UI, categories, paging 30, pending-action key) and `modules/discover-search.js` (color matching, tones, shapes, facets, rankSimilar). Route `/discover`.
- Data: `discover_items`, `seed_targets`, `seeder_control` (`supabase-discover-seeder.sql`). Anon/authenticated read only `status='published'`; writes by service role only. Storage bucket `discover-media`.
- Every item needs license + attribution + source link shown to users. Only CC0 unless told.
- Seeder = separate Next.js app in `seeder/` (own package.json/node_modules, port 3010, Inngest + Claude vision). Don't touch it for UI work; never put its keys in `outputs/a-plus-vault`.
- Saving a Discover item to the Vault must create a normal vault item with source/credit preserved.
- Run `npm run check` after changes; never run the seeder or SQL without being told.
