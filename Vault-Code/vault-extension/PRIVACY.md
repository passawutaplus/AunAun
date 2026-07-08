# A+ Vault Capture Extension — Privacy Disclosure

Last updated: 2026-07-08

## What this extension does

A+ Vault Capture helps you save creative references from websites into your private A+ Vault library.

## Data collected

The extension only acts after you explicitly choose:

- right-click **+ Keep in Vault**
- right-click **+ Snapshot to Vault**
- popup **Snapshot current view**
- popup **Keep in Vault**

For each capture, the extension may send:

- page URL and title
- selected image/video/link URL
- optional title, note, and collection choice
- cropped snapshot image for snapshot capture

## Where data goes

- **Production demo:** `https://aplus-vault.vercel.app/api/vault/*`
- **Local development:** `http://127.0.0.1:5177/api/vault/*`

The extension stores your API token and recent capture previews in Chrome local storage on your device only.

## What we do not do

- No background browsing history collection
- No hidden page scraping
- No service-role or database secrets in the extension
- No automatic publishing of saved references

## Permissions used

| Permission | Why |
|------------|-----|
| `contextMenus` | Show + Keep in Vault on right click |
| `activeTab` | Read the current tab only when you capture |
| `tabs` | Open Vault after save when configured |
| `storage` | Save popup settings and recent captures |
| `scripting` | Inject snapshot overlay on demand |
| Host access | Talk to A+ Vault API and preview remote images |

## Your controls

- You choose what to save
- You can clear extension settings in the popup
- You can export or clear Vault data in the web app Profile
- Privacy policy: https://aplus-vault.vercel.app/legal#privacy

## Contact

privacy@aplusvault.app
