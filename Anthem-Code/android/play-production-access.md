# Google Play — Production Access answers (com.samecor.app)

Draft 2026-11-10 from what actually happened in the closed test. Paste the **EN** text into Play Console
(Dashboard → Apply for production). The **TH** line under each answer is a translation for the owner, not for pasting.
Provider drafts (AppReady TH) were used as a frame only; every claim below is checked against the repo, Play Console or Sentry.

**Before submitting:** the closed test must show 12+ opted-in testers for 14 continuous days (started 30 Oct 2026 → day 14 on 13 Nov).
Only keep the "after the report" items in Q8 that are merged and live on samecor.com on the day you submit (PRs #134, #135).

---

## Q1. How did you recruit users for your closed test?

**EN:** We used a paid closed-testing service (AppReady TH), which recruited testers on Android phones through a Google Group and ran a structured review of the app's main features. We also tested the app ourselves throughout the test with a separate test account.

**TH:** ใช้บริการผู้ทดสอบแบบเสียเงิน (AppReady TH) ซึ่งหาผู้ทดสอบผ่าน Google Group และทดสอบฟังก์ชันหลักอย่างเป็นระบบ และทีมเราทดสอบเองด้วยบัญชีทดสอบตลอดช่วง

> Add friends, family or creators only if you really invited them.

## Q2. How easy was it to recruit testers for your app?

**Suggested choice: Difficult.** Two testing services declined our first build (a Trusted Web Activity), so we rebuilt the app as a Capacitor app on a new listing before testing could start.

**TH:** แนะนำเลือก "ยาก" เพราะผู้ให้บริการสองรายไม่รับแอปเวอร์ชันแรก (TWA) จนต้องทำแอปใหม่ด้วย Capacitor และตั้งรายการใหม่ (ถ้ารู้สึกว่าไม่ยาก เลือกตามจริงได้)

## Q3. Describe the engagement you received from testers during your closed test.

**EN:** Testers stayed opted in for the full 14-day test and used the app across different Android devices and OS versions. They covered the main flows: browsing the Showcase feed and Creators directory, opening project pages, saving to collections, switching languages and exploring Exhibition & Events. During the test we shipped a new build (1.1.0, versionCode 4) and testers moved to it as a normal Play update. We also monitored real usage errors with Sentry crash reporting throughout the test.

**TH:** ผู้ทดสอบอยู่ครบ 14 วัน ใช้งานบนหลายรุ่นหลายเวอร์ชัน Android ครอบคลุมฟีด Showcase, Creators, หน้าผลงาน, คอลเลกชัน, เปลี่ยนภาษา และ Exhibition & Events ระหว่างทดสอบเราปล่อย 1.1.0 และผู้ทดสอบได้อัปเดตผ่าน Play ตามปกติ และติดตาม error จริงด้วย Sentry ตลอด

## Q4. Summarize the feedback you received from testers. Include how you collected it.

**EN:** We collected feedback in three ways: a written bilingual test report from the testing service, the in-app feedback button, and Sentry error reports. Testers found no crashes or critical bugs and the main features worked as intended. Their suggestions were: (1) a longer store description with clearer search terms, (2) clearer guidance for first-time users, (3) store screenshots that explain the features, and (4) English as the default language for an international audience. Sentry also showed a few JavaScript errors on older phones and in-app browsers.

**TH:** เก็บ feedback 3 ทาง: รายงานสองภาษาจากผู้ให้บริการ, ปุ่ม feedback ในแอป, และ Sentry ไม่พบ crash หรือบั๊กร้ายแรง ข้อเสนอคือ คำอธิบายร้านค้า, การแนะนำผู้ใช้ใหม่, screenshot ที่อธิบายฟีเจอร์ และภาษาอังกฤษเป็นค่าเริ่มต้น และ Sentry พบ error บนมือถือรุ่นเก่า/in-app browser บางส่วน

## Q5. Who is the intended audience for your app?

**EN:** Adults (18+) in Thailand's creative community: artists, graphic designers, illustrators, photographers, 3D artists, architects and creative freelancers who want to show their work and meet people with the same eye, plus people who follow art exhibitions, workshops and open calls. Brands and event organizers use it to discover creators.

**TH:** ผู้ใหญ่ (18+) ในวงการสร้างสรรค์ไทย ศิลปิน นักออกแบบ นักวาด ช่างภาพ 3D สถาปนิก ฟรีแลนซ์ ที่อยากโชว์ผลงานและเจอคนคอเดียวกัน รวมถึงคนที่ติดตามนิทรรศการ เวิร์กช็อป และ Open Call แบรนด์และผู้จัดงานใช้หาครีเอเตอร์

## Q6. Describe how your app provides value to users.

**EN:** SAMECOR is a free online gallery. Creators publish portfolio projects and a profile, and every creator gets the same visibility; nobody pays to be seen. Visitors discover work by category, keyword or colour, follow creators, save work to collections and message a creator directly. The Exhibition & Events section lists art exhibitions, workshops, fairs, talks and open calls across Thailand, curated and link-checked by our team, with reminders, Google Calendar, venue maps and short summaries of who each event suits. SAMECOR is not a job marketplace and takes no commission.

**TH:** แกลเลอรีออนไลน์ฟรี ลงผลงานและโปรไฟล์ได้ ทุกคนได้การมองเห็นเท่ากัน ค้นตามหมวด คำ หรือสี ติดตาม เก็บคอลเลกชัน ทักแชท และมี Exhibition & Events รวมงานศิลปะทั่วไทยที่ทีมคัดและตรวจลิงก์ พร้อมเตือน, Google Calendar, แผนที่ และสรุปสั้น ไม่ใช่เว็บหางานและไม่หักค่าคอม

## Q7. How many installs do you expect in your first year?

**Suggested choice: 1,000 – 10,000.** The provider's example (10,000 – 100,000) is not based on our launch plan; we are launching to the Thai creative community without paid ads first.

**TH:** แนะนำ 1,000–10,000 (ตัวอย่าง 10,000–100,000 ของ provider ไม่ได้มาจากแผนเรา)

## Q8. What changes did you make to your app based on what you learned during your closed test?

**EN:** The app loads our web app, so most fixes reached testers without a new install, and we also shipped a new build.
- **Build 1.1.0 (versionCode 4, 5 Nov 2026):** new project page, Thai / English / Chinese with English as the default for new users, Exhibition & Events with calendar, reminders, venue maps and walking routes, pull to refresh, correct Android back-button behaviour, and link sharing that works inside the app.
- **After the test report (Nov 2026):** the first-use guided tour and the cookie notice now follow the user's language, fixes for errors Sentry found on older phones and in-app browsers (missing crypto.randomUUID and storage, a crash in in-app browsers, reloading after an update), a longer store description, and new screenshots that explain each feature.
- **Policy:** the privacy policy and Data safety form now describe the optional location use for event walking routes.

**TH:** 1.1.0 (5 พ.ย.): หน้าผลงานใหม่, 3 ภาษาเริ่มที่อังกฤษ, Exhibition & Events, ดึงรีเฟรช, ปุ่มย้อนกลับ, แชร์ในแอป / หลังรายงาน: ทัวร์และแบนเนอร์คุกกี้ตามภาษา, แก้ error จาก Sentry, คำอธิบายและ screenshot ใหม่ / นโยบาย: privacy และ Data safety เรื่องตำแหน่ง

> Delete any line that is not live yet on the day you submit.

## Q9. How did you decide that your app is ready for production?

**EN:** No crashes or critical bugs were found in the closed test, and Sentry shows no crash-level issues on the current build. We fixed every actionable error report, checked the main flows ourselves on the latest build (browsing, project pages, collections, language switch, events, sharing, sign-in), and reviewed the store listing, privacy policy, Data safety form, content rating and 18+ audience setting so they match the app.

**TH:** ไม่พบ crash/บั๊กร้ายแรง, Sentry ไม่มี issue ระดับ crash, แก้ error ที่แก้ได้ครบ, ทดสอบเส้นทางหลักเองบนเวอร์ชันล่าสุด และตรวจหน้าร้าน privacy, Data safety, content rating, กลุ่มอายุ 18+ ให้ตรงกับแอป

## Q10. What did you do differently this time?

**EN:** Our first attempt was a Trusted Web Activity build on a different listing, which testing services would not accept. This time we built a Capacitor app on a new listing, used a professional testing service that gave us a structured written report, added Sentry error monitoring, and released an improved build during the test instead of waiting until the end.

**TH:** ครั้งแรกเป็น TWA ในรายการอื่นที่ผู้ให้บริการไม่รับ ครั้งนี้ทำแอป Capacitor รายการใหม่ ใช้ผู้ให้บริการที่มีรายงานเป็นลายลักษณ์อักษร เพิ่ม Sentry และปล่อยเวอร์ชันปรับปรุงระหว่างทดสอบ

> If the form does not show this question (first application), skip it.

---

## Store assets ready for the same day

- Listing text: `android/play-store-listing.md` → "Store listing v1.1"
- Screenshots (1080×1920): `store-assets/play-screenshots/v1.1/th/` (Thai listing) and `/en/` (English listing), 6 each, in order 01–06
