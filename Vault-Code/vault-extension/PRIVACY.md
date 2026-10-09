# A+ Vault Capture Extension — Privacy Disclosure

Last updated: 2026-10-04 (version 0.2.0). Draft for owner/legal review before the Web Store listing.

## What this extension does

A+ Vault Capture helps you save creative references from websites into your private A+ Vault library. It acts only when you choose to: it never crawls, never collects browsing history and never reads the pixels of images on other sites.

## What is sent, and only after you choose

- right-click **+ Keep in Vault**, **+ Keep all images on page**, **Snapshot to Vault**
- popup **Keep this page**, **Keep in Vault**, **Keep all images**, **Snapshot**
- the keyboard shortcut **Alt+Shift+K** (quick keep)

For each capture the extension may send: page URL and title, the image/video/link URL you chose, your optional title, note, #tags and collection, **source and credit data found on the page** (author, site name, licence link: saved as information, never as a licence grant), and, for Snapshot only, the cropped image. **Keep all** sends image URLs, not the image files.
Saved items are private to you by default. Images belong to their owners.

## Where data goes

`https://aplus-vault.vercel.app/api/vault/*` (production), `https://aplus-vault-demo.vercel.app` (demo), `http://127.0.0.1:5177` / `http://localhost:5177` (local development). Nothing is sent to any other server and there are no analytics or advertising trackers.

## Stored on your device (Chrome local storage)

Your connection token, settings (quick keep), recent captures (previews), the offline retry queue (up to 50 items; large snapshots are stored as thumbnails only or skipped), your last collection, and a list of image keys you already kept. Use **Disconnect** or remove the extension to clear it.

## Permissions

| Permission | Why |
|---|---|
| `contextMenus` | Show the Keep entries on right click |
| `activeTab` | Read the current tab only when you capture (also lets us scan the page for Keep all) |
| `storage` | Settings, recent captures, retry queue |
| `scripting` | Inject the picker, snapshot overlay and credit reader on demand |
| `alarms` | Retry the offline queue every few minutes |
| Host access: Vault origins only | Talk to the A+ Vault API and pair your login automatically |

The extension does not request the `tabs` permission.

## What we do not do

No background browsing history, no hidden page scraping, no bulk image downloading, no service-role or database secrets in the extension, no automatic publishing, no remote fonts or scripts.

## Your controls

You choose what to save, you can undo a save right away, disconnect at any time, and export or delete your data in the web app Profile.
Privacy policy: https://aplus-vault.vercel.app/legal.html#extension-privacy

## Contact

privacy@aplus1.app (the same address as `legal.html`; the owner confirms it before launch).
