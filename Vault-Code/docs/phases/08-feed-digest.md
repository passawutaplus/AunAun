# Phase 08 — Automated feed & digest

- **Daily rotation job**: choose which published items lead Discover; variety across discipline/source; avoid repeating items to a returning user (simple recency/shuffle).
- **Weekly digest**: for opted-in users, short digest of new items matching their saved tags/palettes. Template-based (AI intro optional, under the budget guard). Email via the provider the owner approves, with unsubscribe link. **Dry-run mode** writes the digest to DB/log only; ask before sending any real email.
- **Serendipity (from mymind):** a small daily row in My Vault "From your past" (3 items saved > 30 days ago, not opened recently, weighted random; dismissable; computed locally, no AI). The weekly digest may include the same picks for opted-in users. Digest email is marketing-type communication: opt-in consent + unsubscribe (phase 12).
- Never include items failing the license gate. Needs published items (phase 05).

Done when: feed order changes daily with no manual work; dry-run digest is correct for a test user.
