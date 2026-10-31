# Google Play — store listing draft

Draft for review before pasting into Play Console → Grow → Store presence → Main store listing.
Default language: Thai (th-TH), with an English (en-US) translation.

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

## Short description (≤80 characters)

- **TH:** พื้นที่ของคนสร้างงาน — โชว์ผลงาน ค้นพบครีเอเตอร์ และคุยกันได้ทันที
- **EN:** A place for people who create — show your work, find creators, chat.

## Full description (≤4000 characters)

### TH

SAMECOR คือพื้นที่ของคนสร้างงาน

ศิลปิน นักออกแบบ นักวาดภาพประกอบ ช่างภาพ นักสร้างงาน 3D และเมกเกอร์ มารวมตัวกันที่นี่ เพื่อให้ผลงานถูกค้นพบ และให้คนที่ใช่ได้เจอกัน

• โชว์ผลงานให้สวยที่สุด — ลงโปรเจกต์พร้อมรูปภาพ วิดีโอ และเรื่องราวเบื้องหลังงาน
• ค้นพบครีเอเตอร์ — ไล่ดูผลงานตามหมวด ค้นหาด้วยคำหรือด้วยสี
• รู้จักคนเบื้องหลังงาน — ทำเนียบครีเอเตอร์ พร้อมโปรไฟล์ ผลงานคัดสรร และสาขาที่ถนัด
• คุยกันได้ทันที — ทักแชทจากผลงานที่ชอบ จะถามเรื่องงาน ชวนร่วมงาน หรือชวนทำโปรเจกต์ก็ได้
• เก็บแรงบันดาลใจ — บันทึกผลงานที่ชอบไว้เป็นคอลเลกชัน
• ติดตามคนที่ชอบ — ไม่พลาดผลงานใหม่

โอกาสเกิดจากการถูกค้นพบ ลงผลงานชิ้นแรกได้ฟรีวันนี้

### EN

SAMECOR is a place for people who create.

Artists, designers, illustrators, photographers, 3D artists and makers come together here so their work gets discovered — and the right people find each other.

• Show your work at its best — publish projects with images, video and the story behind them
• Discover creators — browse by category, search by keyword or by colour
• Meet the people behind the work — a creator directory with profiles, selected works and disciplines
• Start a conversation — message a creator straight from a project you like: ask about the work, collaborate, or invite them to a project
• Save inspiration — keep the work you love in collections
• Follow the creators you like — never miss new work

Opportunity starts with being discovered. Publish your first project for free today.

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
