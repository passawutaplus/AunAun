# Anthem Referral and Reward Skill

## Purpose

ใช้เมื่อแก้:

- referral link
- affiliate reward
- PX wallet
- mission/onboarding reward
- creator eligibility
- cashout copy/rules
- anti-abuse logic

## Reward Rules

### New User

- สมัครผ่าน referral link ที่ valid: ได้ 20px
- ทำ mission สำคัญ เช่น publish/post งานแรก: ได้เพิ่ม 100px
- reward เหล่านี้เป็น welcome px หรือ non-withdrawable bucket เว้นแต่ business rule ระบุชัด

### Referrer / Creator / Affiliate

- ได้ 50px เมื่อเพื่อนที่ชวนทำ first meaningful action สำเร็จ
- ไม่ได้ reward จากแค่ signup
- 50px เป็น earned px และนับถอนเงินได้ ถ้าเข้าเงื่อนไข cashout

### Cashout

- ขั้นต่ำ 1,000 earned px
- welcome px ไม่ถอนได้
- ต้องผ่าน KYC/Stripe Connect หรือ requirement ที่ระบบกำหนด

## Link Format

Preferred:

```text
https://.../?ref=CODE
```

Rules:

- เก็บ attribution ผ่าน signup/email confirmation/OAuth
- รับ referral เฉพาะช่วง account age ที่กำหนด เช่น 7 วันแรก
- ref code ต้องผูกกับ referrer จริง

## Anti-Abuse Rules

- one referral per referred account
- block self-referral
- require email confirmation
- referrer reward only after first meaningful action
- unique reward ledger
- advisory lock หรือ equivalent กัน concurrent duplicate claim
- retained logs for audit

## UX Copy Rules

ต้องอธิบายให้ผู้ใช้เข้าใจ:

- "เพื่อนสมัครผ่านลิงก์ คุณจะได้ 50px หลังเพื่อนโพสต์/เผยแพร่งานครั้งแรก"
- "ผู้ใช้ใหม่รับ 20px เริ่มต้น"
- "ทำภารกิจแรกครบ รับเพิ่ม 100px"
- "ถอนเงินได้เมื่อมียอด earned px ครบ 1,000px"

ห้ามใช้ copy ที่ทำให้เข้าใจว่า:

- สมัครเฉย ๆ แล้วคนชวนได้เงินทันที
- welcome px ถอนเงินสดได้
- ทุก px เป็นเงินสดทันที
- ระบบสนับสนุน spam link

## Required UI States

Referral page/card ต้องมี:

- referral code/link
- copy link button
- reward rule summary
- invited count
- activated count
- earned px from referrals
- pending reward explanation
- cashout threshold progress

Mission card ต้องมี:

- mission title
- reward amount
- status: not started / done / claimed
- claim button
- already claimed state
- explanation when not eligible

## Database/Server Guard

ทุก reward write ต้องเกิด server-side หรือ DB function:

- validate `auth.uid()`
- validate referred user ownership
- validate first action event
- validate duplicate claim
- insert ledger atomically

Client-side สามารถแสดง progress ได้ แต่ห้ามเป็น source of truth

## Tests to Add/Keep

- register through valid referral
- invalid referral code
- self-referral blocked
- duplicate referral blocked
- first action triggers referrer reward once
- welcome px not counted as cashout
- earned px counted as cashout
- concurrent claim does not double pay

## Metrics

- referral link copied
- referral signup
- referral activated
- referral reward paid
- activation rate
- abuse/block rate
- cashout request rate

## Questions Before Changing Rewards

1. เพิ่ม reward นี้จ่ายเมื่อ user active จริงหรือยัง
2. มี abuse path ไหม
3. เป็น welcome หรือ earned
4. มี budget cap ไหม
5. copy ชัดพอไหมสำหรับคนทั่วไป
6. database enforce หรือแค่ client enforce
