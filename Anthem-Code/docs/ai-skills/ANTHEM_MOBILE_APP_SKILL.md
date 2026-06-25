# Anthem Mobile App Skill

## Purpose

ใช้เมื่อเตรียม Anthem เป็น Android/iOS app หรือปรับ web ให้ app-ready

## Strategy

เริ่มจาก web/PWA readiness ก่อน แล้วค่อย wrap หรือทำ native shell:

1. Web demo stable
2. Mobile web UX ผ่าน usability
3. Auth/referral/deep link พร้อม
4. Push notification strategy
5. Android internal test
6. iOS TestFlight
7. Store submission

## App Store Product Definition

Anthem app ควรขาย message เดียว:

> Community สำหรับครีเอเตอร์ไทยในการโชว์งาน ค้นหาโอกาส และเติบโตผ่านผลงานจริง

อย่า pitch ว่าเป็นแค่ reward app หรือหาเงินฟรี

## Mobile Web Requirements

- responsive 360-430px
- safe area support
- bottom nav stable
- auth flow บน mobile ไม่หลง
- editor/upload ใช้ได้
- chat keyboard ไม่บัง input
- modal scroll ได้
- toast ไม่บัง CTA
- touch targets >= 44px

## App-Specific Requirements

### Auth

- Google/OAuth redirect ต้องรองรับ app scheme หรือ universal link
- email magic link ต้องกลับเข้า app ได้
- logout clear session จริง

### Deep Links

ควรเตรียม:

- `/`
- `/project/:id`
- `/@username`
- `/portfolio`
- `/notifications`
- `/chat/:id`
- `/?ref=CODE`

### Notifications

Prioritize:

- hire/collab request
- comment/follow/gift
- chat message
- reward claim
- referral activated

อย่าส่ง push เยอะจนดู spam

### Upload

- photo permission copy ชัด
- image compression
- upload progress
- retry failure

## Store Readiness

ต้องเตรียม:

- app name
- icon
- screenshots
- short description
- full description
- privacy policy URL
- terms URL
- support contact
- data safety form
- content moderation policy
- account deletion path

## Policy Risks

- reward/cashout ต้องอธิบายโปร่งใส
- หลีกเลี่ยง gambling-like copy
- user-generated content ต้องมี report/block/moderation
- referral/affiliate ต้องมี anti-abuse
- payment/cashout อาจต้อง review policy เพิ่ม

## UX Before App Store

ต้องผ่าน:

- first impression mobile
- signup/login
- first post
- referral understanding
- report flow
- notification permission timing
- profile/project sharing

## App Launch Checklist

- [ ] mobile usability score >= 4 average
- [ ] no blocker in first post flow
- [ ] auth redirect tested
- [ ] referral link persists through signup
- [ ] report/block available
- [ ] privacy/account deletion documented
- [ ] app screenshots represent real UI
- [ ] demo/test account ready for review

## Do Not

- อย่า submit app ถ้า web onboarding ยังสับสน
- อย่าเปิด push notification ก่อนมี preference
- อย่าใช้ reward copy ที่เหมือนหลอกให้หาเงินง่าย
- อย่าลืม account deletion requirement
