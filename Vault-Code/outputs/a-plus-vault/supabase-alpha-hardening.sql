-- A+ Vault private alpha hardening
-- Applied to project zkflkpbmbozrchqncpzi on 2026-07-07.

alter policy "Users can manage their own vault items" on public.vault_items to authenticated;
alter policy "Users can manage their own vault analysis" on public.vault_item_analysis to authenticated;
alter policy "Users can manage their own vault collections" on public.vault_collections to authenticated;
alter policy "Users can manage their own vault collection links" on public.vault_collection_items to authenticated;
alter policy "Users can manage their own vault projects" on public.vault_projects to authenticated;
alter policy "Users can manage their own vault boards" on public.vault_boards to authenticated;
alter policy "Users can manage their own vault board objects" on public.vault_board_objects to authenticated;
alter policy "Users can manage their own vault board shares" on public.vault_board_shares to authenticated;

update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
where id = 'vault-assets';

-- Project ↔ collection links live in vault_projects.metadata.collectionIds (jsonb).
-- No separate junction table in alpha; description uses vault_projects.description.
