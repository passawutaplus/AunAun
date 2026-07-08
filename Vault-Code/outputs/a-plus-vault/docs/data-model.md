# A+ Vault Data Model

## Entities

### vault_items

The central object table. Every image, video, link, and note is a row.

Key fields:

- `id`
- `user_id`
- `type`: `image`, `video`, `link`, or `note`
- `title`
- `note`
- `source_url`
- `asset_url`
- `thumbnail_url`
- `preview_url`
- `status`
- `pinned_at`
- `capture_context`
- `client_payload`
- `created_at`
- `updated_at`

Rules:

- New items default to Vault Library.
- `created_at` is used for newest-first ordering below pinned items.
- `source_url` should be saved whenever possible for credit/reference.

### vault_item_analysis

AI Lite and metadata output for each object.

Key fields:

- `item_id`
- `tags`
- `colors`
- `ocr_text`
- `summary`
- `metadata`

MVP behavior:

- Image and video objects should have primary colors/preview data and keywords.
- Link objects use URL metadata first.
- Video objects store video URL/poster first; transcript comes later.

### vault_collections

Custom user groupings.

Key fields:

- `id`
- `user_id`
- `name`
- `system`
- `created_at`

Rules:

- `Vault Library` is a system collection concept, not a removable custom collection.
- Custom collections can be renamed or deleted.
- Deleting a collection does not delete objects.

### vault_collection_items

Join table between objects and collections.

Rules:

- An item can be in many custom collections.
- Removing a collection link does not remove the item from Vault Library.

### vault_projects

Job-level workspace.

Key fields:

- `id`
- `user_id`
- `name`
- `description`
- `metadata.collectionIds` — explicit links to custom collections used in this project
- `created_at`

Rules:

- A project gathers **explicitly linked** collections and moodboards.
- Linking a collection to a project does not move or duplicate Vault objects.
- `metadata.collectionIds` is separate from `vault_collection_items` (which tracks which objects belong to which collection).
- A project does not replace Vault Library.

### vault_boards

Standalone moodboard metadata (Phase 1). Boards are not owned exclusively by projects.

Key fields:

- `id`
- `user_id`
- `project_id` (nullable — link via “Add to Project”)
- `name`
- `layout_mode`: `smart_grid` | `freeform`
- `grid_preset`: `balanced` | `masonry` | `editorial` | `hero_support` | `contact`
- `gap`, `padding`
- `visibility` (Phase 1: `private` only in UI)
- `version` (conflict / autosave marker)
- `objects_snapshot` (Phase 1 client source of truth)
- `created_at`, `updated_at`

Migration: `supabase-moodboard-phase1.sql` drops `project_id NOT NULL` and adds layout columns.

Client store: `state.moodboards` / `aplus-vault-moodboards` (separate from `project.boards` nesting).

### vault_board_objects

Canvas objects inside a moodboard (relational write-through for integrity / delete warnings).

Key fields:

- `id`
- `board_id`
- `item_id` (nullable; SET NULL when Vault object deleted → “Reference unavailable”)
- `kind`: `item`, `text`, or `palette`
- `x`, `y`, `w`, `h`
- `sort_order` (Smart Grid order)
- `text_content`, `colors`, `style`

Rules:

- `kind=item` references a Vault object by id only (no embedded asset bytes/URLs).
- `kind=text` and `kind=palette` are board-only objects.
- Removing an object from a board does not delete the Vault library item.
- Canvas layout can move without mutating the original Vault item.

## Access Rules

- All rows are private by `user_id`.
- Extension saves must be authenticated before writing production data.
- Storage files should stay private and be served through signed URLs.
