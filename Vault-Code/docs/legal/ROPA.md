# Record of processing (draft for the owner and counsel)

Controller: **[LEGAL NAME] [ADDRESS] [CONTACT]**. Retention numbers below are what the code does today; counsel confirms them.

| Purpose | Data | Legal basis (counsel to confirm) | Retention | Recipients / processors | Transfer |
|---|---|---|---|---|---|
| Provide the Vault (save, organise, search, sync) | account email, profile, items, notes, files, collections, projects, moodboards | contract | until you delete; trash 30 days; Vault data deleted on request within 30 days | Supabase (database, storage), Vercel (hosting) | outside Thailand: Supabase region [CONFIRM], Vercel [CONFIRM] |
| Enrichment of saved images (palette, tags) | image copy, title, note (server-side) | contract / legitimate interest | with the item | Supabase, Vercel | as above |
| AI tagging of private images (optional) | downscaled image + title | **consent** (off by default) | not stored by us beyond the tags; provider retention per its current terms [CONFIRM] | AI provider [CONFIRM] | provider region [CONFIRM] |
| Weekly digest email (optional) | email, saved-tag profile | **consent** | until you unsubscribe | email provider [CONFIRM] | [CONFIRM] |
| Discover (public feed) | open-licence images, no personal data | legitimate interest | until removed | Supabase, Vercel | as above |
| Abuse and takedown handling | reporter email, report text, item id | legal obligation / legitimate interest | 3 years [CONFIRM] | admins | none |
| Security logs | IP and request metadata at the host | legitimate interest | host default (short) | Vercel | [CONFIRM] |
| Usage signals on Discover (view/save/skip) | item id + tag ids only, no user id | legitimate interest (aggregate, unlinkable) | 90 days | Supabase | as above |
| Unknown search words | single words, no user id | legitimate interest (aggregate) | until reviewed | Supabase | as above |
| Consent log | user id, purpose, choice, policy version, time | legal obligation (proof) | kept after Vault data deletion as proof [CONFIRM] | Supabase | as above |
| Data requests | email, request text | legal obligation | 3 years [CONFIRM] | admins | none |
