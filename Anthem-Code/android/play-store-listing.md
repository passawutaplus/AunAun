# Google Play — store listing draft

Draft for review before pasting into Play Console → Grow → Store presence → Main store listing.
Default language: Thai (th-TH), with an English (en-US) translation. Play shows the listing in the reader's device language.

## App details

| Field | Value |
|---|---|
| App name (≤30) | SAMECOR |
| Category | Art & Design |
| Tags | Portfolio, Art, Design, Community |
| Contact email | support@samecor.com |
| Website | https://samecor.com |
| Privacy policy | https://samecor.com/legal/privacy |
| Account deletion URL | https://samecor.com/legal/delete-account |

## Store listing v1.1 (2026-11-10, after closed-test feedback)

Tester report (AppReady TH): description too short for search. Rewritten with natural keywords
(portfolio, artists, designers, illustrators, photographers, exhibitions, workshops, open calls) and
only features that exist in the build. Brand: Guidelines v1.0, not a job board, no commission.

### App name (≤30)

- **EN:** SAMECOR – Creative Portfolio (28)
- **TH:** SAMECOR – พอร์ตผลงานครีเอทีฟ (28)

### Short description (≤80)

- **TH (73):** โชว์พอร์ตโฟลิโอ เจอคนคอเดียวกัน ไม่พลาดนิทรรศการ เวิร์กช็อป และ Open Call
- **EN (78):** Show your portfolio, meet creators like you, and find art events & open calls.

### Full description (≤4000)

#### TH (1151 characters)

SAMECOR คือแกลเลอรีออนไลน์ของครีเอเตอร์ไทย ที่ให้ผลงานของคุณถูกเห็น และพาคุณไปเจอคนคอเดียวกัน

ศิลปิน นักออกแบบกราฟิก นักวาดภาพประกอบ ช่างภาพ นักออกแบบ 3D สถาปนิก และฟรีแลนซ์สายสร้างสรรค์ ลงผลงานได้ฟรี ทุกคนได้ยืนอยู่ใต้แสงเท่ากัน ไม่ต้องจ่ายเพื่อให้คนเห็น

ลงพอร์ตโฟลิโอให้สวย
• ลงโปรเจกต์พร้อมรูปภาพ วิดีโอ และเรื่องราวเบื้องหลังงาน
• จัดหน้าผลงานเองได้บนมือถือ เรียงส่วนต่างๆ ด้วยการกดค้าง
• มีโปรไฟล์ครีเอเตอร์พร้อมผลงานคัดสรรและสาขาที่ถนัด

ค้นพบผลงานและคนคอเดียวกัน
• Showcase: ไล่ดูผลงานตามหมวด ค้นหาด้วยคำหรือด้วยสี
• Creators: ทำเนียบครีเอเตอร์ ดูงานแล้วกดติดตามได้ทันที
• เก็บแรงบันดาลใจไว้เป็นคอลเลกชัน และแชร์ผลงานให้เพื่อนได้ในคลิกเดียว
• ทักแชทกับครีเอเตอร์จากผลงานที่ชอบ

Exhibition & Events
• รวมนิทรรศการศิลปะ เวิร์กช็อป Art Fair ทอล์ก และ Open Call ทั่วไทย คัดและตรวจลิงก์โดยทีม SAMECOR
• ปฏิทินงานรายสัปดาห์ กดสนใจเพื่อรับการเตือน และเพิ่มลง Google Calendar
• แผนที่สถานที่จัดและเส้นทางเดินไปงาน
• สรุปโดย SAMECOR: งานนี้เหมาะกับใคร จะได้อะไรกลับไป และควรรู้อะไรก่อนไป

ใช้ได้สามภาษา ไทย / English / 中文 เปลี่ยนได้ที่เมนูโปรไฟล์

SAMECOR ไม่ใช่เว็บหางานและไม่หักค่าคอมมิชชัน เราเป็นพื้นที่ให้ผลงานพูดแทนคุณ ลงผลงานชิ้นแรกได้ฟรีวันนี้

#### EN (1453 characters)

SAMECOR is an online gallery for Thai creators: a place where your work gets seen and you meet people who see the world the way you do.

Artists, graphic designers, illustrators, photographers, 3D artists, architects and creative freelancers post their work for free. Everyone gets the same light; nobody pays to be seen.

Build a portfolio that looks its best
• Publish projects with images, video and the story behind the work
• Lay out your project page on your phone; long-press to reorder sections
• A creator profile with selected works and the disciplines you practise

Discover work and people like you
• Showcase: browse work by category, search by keyword or by colour
• Creators: a directory of creators you can follow in one tap
• Save inspiration in collections and share any work with friends
• Message a creator straight from a project you like

Exhibition & Events
• Art exhibitions, workshops, art fairs, talks and open calls across Thailand, curated and link-checked by the SAMECOR team
• A weekly calendar, reminders for events you are interested in, and Add to Google Calendar
• Venue maps and walking routes to the event
• Summary by SAMECOR: who each event suits, what you will take away and what to know before you go

Available in Thai, English and Chinese; switch from the profile menu.

SAMECOR is not a job board and takes no commission. It is a space that lets your work speak for you. Post your first project for free today.

## Graphics checklist

| Asset | Spec | Status |
|---|---|---|
| App icon | 512×512 PNG, 32-bit | ✅ `public/icons/icon-512.png` |
| Feature graphic | 1024×500 JPG/PNG, no alpha | ❌ to make |
| Phone screenshots | 2–8, 16:9 or 9:16, min 320px, max 3840px | ❌ to capture from the built app |
| 7" / 10" tablet screenshots | optional | skip for v1 |

Suggested screenshot set (in this order): home hero → project feed → project page with the chat button → designer directory → designer profile → chat.

## Content rating questionnaire (IARC) — expected answers

- Category: **Social / communication** style app with user-generated content
- Users can interact / exchange content: **Yes** (chat, comments)
- Shares user location: **No** (profile city is typed by the user, not device GPS)
- Digital purchases: **No** (commerce, PX, boosts and subscriptions are switched off in the Android app — see `isAndroidApp()` in `src/lib/aplus1Launch.ts`)
- Violence / sexual content / gambling / drugs: **No** (moderated UGC; report + block available)

## Target audience

- **18+ only.** KYC already requires 18+, and an adult-only audience keeps the app out of Google Play's Families policy.

## Release notes (v1.0.0)

- **TH:** เปิดตัว SAMECOR บน Android — โชว์ผลงาน ค้นพบครีเอเตอร์ และทักแชทได้จากในแอป
- **EN:** SAMECOR is now on Android — show your work, discover creators and chat in the app.
