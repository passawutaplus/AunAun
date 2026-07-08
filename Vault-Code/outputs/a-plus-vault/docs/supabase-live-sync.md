# Supabase Live Sync

The app now includes a direct Supabase adapter:

- email/password Auth through Supabase Auth REST
- email/password signup through Supabase Auth REST
- session restore from localStorage
- OAuth callback consumption on app boot, with access tokens removed from the URL after storage
- Vault item sync through PostgREST
- image data URL upload to private `vault-assets` Storage
- signed URL generation when loading remote assets
- custom collection create/rename/delete sync
- item-to-collection membership sync through `vault_collection_items`
- local-first fallback when there is no Supabase session

## Current Safety Mode

`outputs/a-plus-vault/supabase-config.js` is still set to:

```js
mode: 'supabase-ready'
```

In this mode:

- demo login still works locally with `creative@aplus.local / aplusvault`
- real email/password login is attempted only when the password is not the demo password
- real account creation is attempted when the user clicks `Create account`
- Google login stays local unless `mode` is changed

## To Enable Real Google Login

1. Configure Google provider in Supabase Auth.
2. Add the deployed app URL to Supabase Auth redirect URLs.
3. Change config to:

```js
mode: 'supabase-live'
```

Then the Google button redirects to Supabase OAuth.
When Supabase redirects back with an OAuth hash, the app stores the session before rendering the workspace and removes the token from the address bar.

## Important Production Notes

- Keep the publishable key in the browser only.
- Never put service role keys in the web app or extension.
- Keep Storage private and use signed URLs.
- Current Supabase hardening uses `TO authenticated` RLS policies on every `vault_*` table.
- The `vault-assets` bucket is private and allows JPG, PNG, WebP, MP4, and WebM up to 10MB for alpha capture.
- Move heavier upload/metadata/OCR work into server routes or Edge Functions before public launch.

## Applied Alpha Hardening

The SQL in `supabase-alpha-hardening.sql` has been applied to project `zkflkpbmbozrchqncpzi`.
Keep this file as the replayable record for Cursor or future migration work.
