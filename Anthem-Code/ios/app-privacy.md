# App Store Connect — App Privacy draft

Derived from `../android/data-safety.md` (same data, same web code). Apple groups answers differently, so the
mapping is below. Wrong answers are a policy violation; re-check against the code before submitting.

**Tracking:** No. The app does not combine data with other companies' data for advertising and shares nothing with data brokers.
(If analytics consent or ads are added later, revisit this first.)

| Apple data type | Collected | Linked to the user | Purpose | Notes |
|---|---|---|---|---|
| Contact info → Name | Yes | Yes | App functionality | display name |
| Contact info → Email address | Yes | Yes | App functionality, developer communications | sign-up |
| Contact info → Physical address | Yes | Yes | App functionality | optional profile location, typed by the user |
| User content → Photos or videos | Yes | Yes | App functionality | project images and videos, avatar |
| User content → Other user content | Yes | Yes | App functionality | projects, comments, bio |
| User content → Customer support | Yes | Yes | App functionality | in-app feedback |
| Messages → Other in-app messages | Yes | Yes | App functionality | chat (Apple lists this under User content in some versions) |
| Identifiers → User ID | Yes | Yes | App functionality | account id, username |
| Usage data → Product interaction | Yes | Yes | Analytics | page views, likes, saves; only with analytics consent |
| Usage data → Search history | Yes | Yes | Analytics, App functionality | recent searches |
| Diagnostics → Crash data | Yes | No | Analytics | Sentry; error message, stack, page, device type |
| Diagnostics → Other diagnostic data | Yes | No | Analytics | in-app feedback diagnostics |

**Not collected in the app:** identity documents, phone number, bank details (KYC is hidden in the app), location, contacts, health data, purchases.

## To confirm before submitting

1. Whether analytics events are linked to the user id or anonymous (changes "Linked to the user" on the usage rows).
2. If push notifications are added for iOS, add Identifiers → Device ID (APNs token), purpose App functionality.
3. If Sign in with Apple or Google sign-in is turned on, add what that provider returns.
4. Privacy policy URL: https://samecor.com/legal/privacy. Check it mentions the iOS app and the list above.
