# A+ Vault API Contract

The current MVP runs locally in the browser, but the UI follows this future Supabase-backed resource shape.

## Items

POST /api/vault/items

Creates an item from one of three payloads:

- multipart/form-data: type=image, file, optional title, note, sourceUrl
- application/json: type=link, sourceUrl, optional title, note
- application/json: type=note, title, note

GET /api/vault/items?type=&q=&collectionId=

Returns private items for the current user only.

PATCH /api/vault/items/:id

Updates title, note, or collection assignment.

DELETE /api/vault/items/:id

Deletes the item, analysis row, collection links, and related private storage files.

## Analysis

POST /api/vault/items/:id/analyze

Runs AI Lite for image colors, tags, OCR text, source metadata, and summary.

## Collections

POST /api/vault/collections creates a private collection.
POST /api/vault/collections/:id/items adds an item to a collection.

## Extension-ready Save Flow

A future browser extension should call POST /api/vault/items with type, sourceUrl, title, note, and optional extensionContext containing selectionText, pageTitle, and imageUrl.

## Chrome Extension v0.1 Capture Endpoint

POST /api/vault/capture

Used by `vault-extension/` for the local alpha capture flow.

Headers:

```text
Authorization: Bearer <token>
Content-Type: application/json
```

Payload:

```json
{
  "type": "image | link | text | page",
  "title": "string | null",
  "note": "string | null",
  "sourceUrl": "string | null",
  "assetUrl": "string | null",
  "projectId": "string | null",
  "collectionId": "string | null",
  "captureContext": {
    "method": "extension_image | extension_link | extension_selection | extension_page",
    "pageTitle": "string | null",
    "pageUrl": "string | null",
    "selectionText": "string | null",
    "imageUrl": "string | null",
    "linkUrl": "string | null"
  }
}
```

Local alpha behavior:

- Requires a non-empty bearer token.
- Maps `text` to Vault `note`.
- Maps `page` to Vault `link`.
- Assigns `Vault Library` when no collection is provided.
- Stores captures in `outputs/a-plus-vault/data/vault-captures.json`.
- The web app imports unseen captures through `GET /api/vault/captures`.

Production behavior should authenticate the user, validate URLs, rate limit captures, and write to Supabase without exposing service keys to the extension.

GET /api/vault/captures

Local alpha import endpoint used by the static web app.

Response:

```json
{
  "success": true,
  "items": []
}
```


## Projects and Moodboards

POST /api/vault/projects creates a project workspace.
GET /api/vault/projects returns private projects for the current user.
POST /api/vault/projects/:projectId/boards creates a moodboard.
PATCH /api/vault/boards/:boardId saves board name and canvas objects.
POST /api/vault/boards/:boardId/share creates a share token or private client-review link.

Board object shape:

- kind=item: references an existing vault item by itemId
- kind=text: stores editable text, color, size, x/y/w/h
- kind=palette: stores reusable color swatches

The important rule: vault_items remain the central library. Moodboards reference vault item IDs instead of duplicating the original asset.
