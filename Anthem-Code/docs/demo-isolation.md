# Demo Isolation

The reviewer demo must never use the production Supabase project.

## Deployment Rules

- Set `VITE_DEMO_MODE=true`.
- Set `VITE_DEMO_SUPABASE_URL` and `VITE_DEMO_SUPABASE_PUBLISHABLE_KEY` to a dedicated demo project.
- Keep production and demo project URLs different. The build guard rejects a match.
- Never place reviewer passwords in `VITE_*` variables. Vite embeds those values in public JavaScript.
- Send reviewer credentials through a private channel and rotate them after each review round.
- Use synthetic data only. Do not copy production profiles, messages, files, or payment records.
- Disable real payments, cashout, outbound email, LINE, and push notifications in demo.

## Before Sharing

1. Reset the demo database to a known seed.
2. Confirm sign-up is disabled or restricted.
3. Confirm every demo account has the minimum role needed.
4. Confirm admin routes are not available to ordinary reviewer accounts.
5. Open browser developer tools and verify all API requests target the demo Supabase hostname.
6. Test that production credentials do not work in demo.

## After Review

1. Rotate all demo account passwords.
2. Remove uploaded reviewer files and feedback that contains personal data.
3. Review auth logs and rate-limit events.
4. Re-seed before the next reviewer group.

