# Security Checklist

ใช้ checklist นี้ก่อนแก้หรือรีวิวงานที่แตะ auth, Supabase, wallet, referral, payment, upload, admin, deploy

## Secrets

- [ ] ไม่มี Supabase service role key ใน client code
- [ ] ไม่มี Stripe secret key ใน client code
- [ ] ไม่มี Supabase access token ใน repo
- [ ] ไม่มี API key จริงใน docs, screenshot, seed, tests
- [ ] `.env` และ local config ไม่ถูก commit
- [ ] bundle guard ตรวจคำว่า `service_role` ใน build output

## Supabase / RLS

- [ ] table ที่มี user data เปิด RLS
- [ ] policy แยก select/insert/update/delete ตาม ownership
- [ ] admin policy ไม่เปิดกว้างเกิน
- [ ] RPC validate `auth.uid()`
- [ ] RPC ที่ใช้ `SECURITY DEFINER` check ownership/input เอง
- [ ] ไม่มี client query ที่อ่าน wallet/user private data ของคนอื่นได้
- [ ] storage bucket แยก public/private ถูกต้อง

## Auth

- [ ] redirect URL sanitize แล้ว
- [ ] ไม่รับ `//evil.com` หรือ external redirect
- [ ] email confirmation / OAuth callback ทำงาน
- [ ] logout แล้ว refresh ยัง logged out
- [ ] guest action ไม่ mutate data
- [ ] auth prompt ไม่ทำให้ user หลงว่า action สำเร็จแล้ว

## Referral / Affiliate

- [ ] one referral per referred account
- [ ] self-referral blocked
- [ ] referrer reward จ่ายหลัง referred user ทำ first meaningful action เท่านั้น
- [ ] email/account must be confirmed ก่อน reward สำคัญ
- [ ] duplicate claim blocked ด้วย unique constraints/advisory lock
- [ ] reward ledger audit ได้
- [ ] welcome px ไม่ withdrawable
- [ ] earned px เท่านั้นที่นับ cashout
- [ ] campaign budget/risk scoring ต้องเพิ่มก่อน scale ใหญ่

## Wallet / PX / Cashout

- [ ] แยก bucket: welcome, earned, purchased
- [ ] cashout minimum enforce ที่ database/server
- [ ] cashout ไม่รวม welcome px
- [ ] transaction idempotent
- [ ] concurrent request ไม่ double spend
- [ ] ledger immutable หรือมี audit trail
- [ ] error ไม่ reveal internal DB detail

## Stripe / Payment

- [ ] endpoint มี rate limit
- [ ] webhook verify signature
- [ ] transfer/payment idempotency key
- [ ] amount validate server-side
- [ ] currency/min/max validate
- [ ] ไม่ trust amount จาก client
- [ ] failed payment/cashout มี recoverable status

## Upload / Content

- [ ] file type whitelist
- [ ] file size limit
- [ ] private/public bucket ถูกต้อง
- [ ] image alt หรือ metadata ไม่รั่วข้อมูลส่วนตัว
- [ ] report evidence upload ไม่ public ถ้าไม่จำเป็น
- [ ] XSS sanitize text/rendered markdown

## Community Safety

- [ ] report project/profile/comment/chat/job ได้
- [ ] duplicate report ถูกจัดการ
- [ ] profanity/spam detection ไม่ block false positive หนักเกิน
- [ ] admin review status มี audit
- [ ] user ไม่เห็น report ของคนอื่น

## Admin

- [ ] `/admin` guard ด้วย role จริง ไม่ใช่ client-only
- [ ] batch action validate role
- [ ] export CSV จำกัดข้อมูลที่จำเป็น
- [ ] admin notifications ไม่ leak private data

## CI / Release Security

- [ ] npm audit high+ ถูก review
- [ ] vulnerability ที่แก้ทันทีไม่ได้ถูกบันทึกเป็น risk
- [ ] production build ผ่าน
- [ ] smoke test public pages ผ่าน
- [ ] Supabase Security Advisor ไม่มี error สำคัญก่อน launch

## Red Flags

ถ้าเจอข้อใดข้อหนึ่ง หยุดและแก้ก่อน:

- service role ใน browser bundle
- user A อ่าน wallet/user private data ของ user B ได้
- cashout รวม welcome px
- referral reward จ่ายแค่สมัครแต่ไม่มี action
- endpoint รับ amount จาก client ตรง ๆ
- admin page เข้าได้โดย user ธรรมดา
