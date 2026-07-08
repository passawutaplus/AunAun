# Vercel Preview Deploy

Status on 2026-07-07:

- `npm run check` passes.
- `npm run alpha:smoke` passes.
- `npm run build` passes and writes the static demo to `dist`.
- Vercel team checked: `team_8pKBsu4WiiF7aNv9s8gGyZIT`.
- No existing Vercel project named `aplus-vault` was found.
- The available Vercel connector only returned the CLI instruction and did not create/deploy the project.

## Deploy From Cursor Or Local Terminal

Run from the repo root:

```bash
vercel link --yes --project aplus-vault --scope passawutaplus-9338s-projects
vercel deploy --yes --scope passawutaplus-9338s-projects
```

If the CLI asks for settings, use:

- Framework: Other
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `echo no install needed`

The same values are already in `vercel.json`.

## After Preview Is Ready

1. Open the preview URL.
2. Check homepage and `Build your Vault`.
3. Use demo login `creative@aplus.local / aplusvault`.
4. Open save modal.
5. Save a link with quick keywords and visual category.
6. Confirm the object appears at the top under pinned items.
7. Open object detail, source credit, share popup, Collections, Projects, and Moodboards.
8. Add the preview URL to Supabase Auth redirect URLs before testing real Google login.
