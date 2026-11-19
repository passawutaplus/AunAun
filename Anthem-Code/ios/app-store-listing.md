# App Store — listing draft

Draft for App Store Connect. Reuses the Android copy (`../android/play-store-listing.md`) so the two stores say the same thing.
Primary language: Thai, with English. Limits are Apple's as remembered; confirm in App Store Connect.

## Fields

| Field | Value |
|---|---|
| Name (≤30) | SAMECOR |
| Subtitle (≤30) | `Showcase|Creator|Exhibition` (27, same idea as the Play short description) |
| Category | Graphics & Design (secondary: Photo & Video, if offered) |
| Support URL | https://samecor.com/help |
| Marketing URL | https://samecor.com |
| Privacy policy URL | https://samecor.com/legal/privacy |
| Contact email | support@samecor.com |
| Age rating | Answer the questionnaire honestly: user-generated content and chat with strangers, moderated with report and block. Expect 13+ or higher; keep it in line with the Play rating |

## Promotional text (≤170, editable without a new build)

- **TH:** Community แห่งโอกาสของครีเอเตอร์ไทย - Showcase | Creator | Exhibition
- **EN:** The Creative Opportunity Platform Community - Showcase | Creator | Exhibition

(Same lines as the Google Play short description, so both stores say the same thing.)

(No "free today": it reads as if later posts cost money, and the app has no purchases.)

## Description

Use the full Thai and English descriptions from `../android/play-store-listing.md` (App Store allows up to 4000 characters).
Keep to what the iOS app really does at launch. Do not mention features that are off in the app, and remove every
mention of Android, Google Play, "beta", "coming soon" or prices from the copied text (App Review 2.3.10, 2.3.1).

## Keywords (≤100 characters, comma separated, no spaces)

`portfolio,creative,design,artist,illustration,photography,ผลงาน,ดีไซน์,ครีเอเตอร์,ฟรีแลนซ์`

## Screenshots to prepare

Apple asks for at least one size per device family and scales to the rest. Confirm the current required sizes in App Store Connect.

| Device | Size (portrait) | Use |
|---|---|---|
| iPhone 6.9" | 1320 × 2868 | required set |
| iPhone 6.5" | 1284 × 2778 or 1242 × 2688 | if asked |
| iPad 13" | 2064 × 2752 | not needed: the app is iPhone only (`TARGETED_DEVICE_FAMILY = 1`) |

Reuse the 5 phone screens in `../android/store-screenshots` (1080 × 1920) as a base for the layouts, but capture from the iOS app on a real
device or simulator: Apple rejects screenshots that show another platform's UI.

## Icon

Done: `../capacitor-shell/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png`. It is 1024 × 1024 RGB with no
transparency and square corners (iOS rounds them). It uses the same mark and background (#F8F7F2) as the Android icon,
rendered from `samecor. logo-04.svg`. App Store Connect takes the icon from the build, so there is nothing to upload.
