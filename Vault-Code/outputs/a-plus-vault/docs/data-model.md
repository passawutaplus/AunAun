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
- `created_at`

Rules:

- A project gathers selected collections and moodboards.
- A project does not replace Vault Library.

### vault_boards

Moodboard metadata.

Key fields:

- `id`
- `user_id`
- `project_id`
- `name`
- `created_at`
- `updated_at`

### vault_board_objects

Canvas objects inside a moodboard.

Key fields:

- `id`
- `board_id`
- `item_id`
- `kind`: `item`, `text`, or `palette`
- `x`, `y`, `w`, `h`
- `data`

Rules:

- `kind=item` references a Vault object.
- `kind=text` and `kind=palette` are board-only objects.
- Canvas objects can move without changing the original Vault item.

## Access Rules

- All rows are private by `user_id`.
- Extension saves must be authenticated before writing production data.
- Storage files should stay private and be served through signed URLs.
