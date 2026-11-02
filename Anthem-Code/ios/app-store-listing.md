# App Store — listing draft

Draft for App Store Connect. Reuses the Android copy (`../android/play-store-listing.md`) so the two stores say the same thing.
Primary language: Thai, with English. Limits are Apple's as remembered; confirm in App Store Connect.

## Fields

| Field | Value |
|---|---|
| Name (≤30) | SAMECOR |
| Subtitle (≤30) | พื้นที่ของคนสร้างงาน / A place for creators |
| Category | Graphics & Design (secondary: Photo & Video, if offered) |
| Support URL | https://samecor.com/help |
| Marketing URL | https://samecor.com |
| Privacy policy URL | https://samecor.com/legal/privacy |
| Contact email | support@samecor.com |
| Age rating | Answer the questionnaire; the app has user-generated content with report and block |

## Promotional text (≤170, editable without a new build)

- **TH:** โชว์ผลงาน ค้นพบครีเอเตอร์ และคุยกันได้ทันที ลงผลงานชิ้นแรกได้ฟรีวันนี้
- **EN:** Show your work, find creators and chat. Post your first project free today.

## Description

Use the full Thai and English descriptions from `../android/play-store-listing.md` (App Store allows up to 4000 characters).
Keep to what the iOS app really does at launch. Do not mention features that are off in the app.

## Keywords (≤100 characters, comma separated, no spaces)

`portfolio,creative,design,artist,illustration,photography,ผลงาน,ดีไซน์,ครีเอเตอร์,ฟรีแลนซ์`

## Screenshots to prepare

Apple asks for at least one size per device family and scales to the rest. Confirm the current required sizes in App Store Connect.

| Device | Size (portrait) | Use |
|---|---|---|
| iPhone 6.9" | 1320 × 2868 | required set |
| iPhone 6.5" | 1284 × 2778 or 1242 × 2688 | if asked |
| iPad 13" | 2064 × 2752 | only if the app supports iPad |

Reuse the 5 phone screens in `../android/store-screenshots` (1080 × 1920) as a base for the layouts, but capture from the iOS app on a real
device or simulator: Apple rejects screenshots that show another platform's UI.

## Icon

1024 × 1024 PNG, no transparency, no rounded corners (iOS rounds it). `../android/play-icon-512.png` is the base; export a full-bleed square.
