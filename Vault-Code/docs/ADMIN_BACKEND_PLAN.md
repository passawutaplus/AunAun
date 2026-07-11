# A+ Vault Admin (in-app)

Admin lives **inside Vault Settings**, not Ops Hub.

- Super admin email: `passawut.a.plus@gmail.com` only
- Entry: Profile menu → Setting
- Sections: KPI, recent feedback, recent captures, purge captures >30d
- Auth: Supabase JWT email check via `is_vault_super_admin()` + client gate

## Feedback

- Settings → Give Feedback
- Rating 1–5 + optional note (Solo-style)
- Table: `vault_feedback` (RLS: own rows)
- Admin reads all via `vault_admin_list_feedback`

## RPCs

- `vault_admin_overview`
- `vault_admin_list_feedback`
- `vault_admin_list_captures`
- `vault_admin_purge_captures`
