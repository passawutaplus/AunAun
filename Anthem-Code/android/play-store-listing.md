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

- **TH (78):** แกลเลอรีของคนคอเดียวกัน แขวนผลงานฟรี ไม่พลาดนิทรรศการ เวิร์กช็อป และ Open Call
- **EN (77):** A gallery with an open door. Show your work, find art events across Thailand.

### Full description (≤4000)

Voice: warm and quiet, opens with the brand line "ทุกคนควรได้ยืนอยู่ใต้แสงสักครั้ง" (Business Model doc), short story-led sections instead of a feature list.

#### TH (989 characters)

ทุกคนควรได้ยืนอยู่ใต้แสงสักครั้ง

SAMECOR คือแกลเลอรีออนไลน์ที่เปิดประตูไว้ให้ครีเอเตอร์ไทยทุกคน ไม่ว่าคุณจะเป็นศิลปิน นักออกแบบกราฟิก นักวาดภาพประกอบ ช่างภาพ นักออกแบบ 3D สถาปนิก หรือฟรีแลนซ์สายสร้างสรรค์ ที่นี่ผลงานของคุณได้แสงเท่ากับทุกคน ไม่ต้องจ่ายเพื่อให้ใครเห็น

แขวนผลงานให้สวยอย่างที่มันควรเป็น
ลงโปรเจกต์พร้อมภาพ วิดีโอ และเรื่องเล่าเบื้องหลัง จัดหน้าเองได้จากมือถือ แล้วปล่อยให้งานพูดแทนตัวคุณ

เจอคนที่มองโลกแบบเดียวกัน
เดินชมผลงานใน Showcase ตามหมวด ค้นด้วยคำ หรือแม้แต่ด้วยสี เจอใครที่ใช่ก็กดติดตาม เก็บงานที่ชอบไว้ในคอลเลกชัน หรือทักคุยได้ทันที

ไม่พลาดงานศิลปะดีๆ รอบตัว
Exhibition & Events รวมนิทรรศการ เวิร์กช็อป Art Fair ทอล์ก และ Open Call ทั่วไทย ที่ทีมเราคัดและตรวจลิงก์ทุกสัปดาห์ กดสนใจเพื่อรับการเตือน เพิ่มลง Google Calendar ดูแผนที่และเส้นทางเดิน พร้อมสรุปสั้นๆ ว่างานนี้เหมาะกับใคร และควรรู้อะไรก่อนไป

ใช้ได้ทั้งภาษาไทย English และ 中文

SAMECOR ไม่ใช่เว็บหางาน และไม่หักค่าคอมมิชชันจากใคร เราแค่อยากให้ผลงานดีๆ ได้เจอคนที่ใช่

แขวนผลงานชิ้นแรกของคุณได้ฟรี วันนี้

#### EN (1165 characters)

Everyone deserves a moment in the light.

SAMECOR is an online gallery with an open door for Thai creators. Artists, graphic designers, illustrators, photographers, 3D artists, architects and creative freelancers all get the same light here. Nobody pays to be seen.

Hang your work the way it deserves
Publish projects with images, video and the story behind them. Lay out the page right from your phone, then let the work speak for you.

Find people who see the world like you do
Wander the Showcase by category, by keyword, or even by colour. Follow the creators who move you, keep favourite pieces in collections, and start a conversation when something clicks.

Never miss what's on
Exhibition & Events gathers exhibitions, workshops, art fairs, talks and open calls across Thailand, picked and link-checked by our team every week. Get reminders, add events to Google Calendar, follow the walking route, and read a short summary of who each event is for and what to know before you go.

In Thai, English and Chinese.

SAMECOR is not a job board and takes no commission. We simply want good work to find the right people.

Hang your first piece today. It's free.

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
