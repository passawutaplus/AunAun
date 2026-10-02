# A+ Vault — Discover Seeder

แอป Next.js แยก (port 3010) ที่ดึงภาพ CC0 จากพิพิธภัณฑ์เข้า `discover_items` ให้หน้า Discover (`/`) ของ Vault
ไม่มีหน้าสาธารณะ — มีแค่ `/admin/seeder` (super admin) และ `/api/inngest`

```
Met / AIC  →  adapter.fetchBatch  →  license gate (cc0)  →  download  →  pHash dedupe (≤6)
           →  quality (ด้านยาว ≥ 1000px)  →  Claude vision (moderation + tags ใน call เดียว)
           →  WebP 400/800/1600 + blurhash  →  Storage `discover-media`  →  publish
```

## ไฟล์หลัก

| ที่ | หน้าที่ |
|---|---|
| `../outputs/a-plus-vault/supabase-discover-seeder.sql` | ตาราง `discover_items`, `seed_targets`, `seeder_control`, RLS, bucket, seed หมวดเริ่มต้น |
| `src/seeder/adapters/` | `met.ts`, `aic.ts`, `cma.ts` (Cleveland), `si.ts` (Smithsonian, ต้องมี `SMITHSONIAN_API_KEY`) — `SourceAdapter.fetchBatch(query, cursor, size)` |
| `src/seeder/pipeline.ts` | ขั้นตอนต่อ 1 ภาพ (reject พร้อมเหตุผลเสมอ) |
| `src/inngest/batch.ts` | 1 function ต่อ 1 batch — throttle/concurrency ต่อ source, retry 4 ครั้ง |
| `src/inngest/scheduler.ts` | cron 03:00 Asia/Bangkok + ปุ่ม Run now |
| `src/app/admin/seeder/` | ความคืบหน้า, reject reasons, pause/run, แก้ target, hide/restore |

## Env (`.env.local` — ห้าม commit)

ดู `.env.example` — ต้องมี `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`
service role ใช้เฉพาะฝั่ง server ของแอปนี้ ห้ามใส่ใน `outputs/a-plus-vault` หรือ extension

## เปิดใช้ครั้งแรก

1. Apply migration `supabase-discover-seeder.sql` ใน Supabase project `zkflkpbmbozrchqncpzi` (ตามขั้นตอน migration ของ repo)
2. ตั้ง env ด้านบน
3. Supabase Auth → URL Configuration → เพิ่ม redirect `https://<seeder-domain>/auth/callback` (ใช้ Google login ใน admin)
4. Deploy เป็น Vercel project ใหม่ (root = `Vault-Code/seeder`) แล้วลงทะเบียน `https://<seeder-domain>/api/inngest` ใน Inngest Cloud
   - ยังไม่อยู่ใน `scripts/deploy-vercel.sh` — เพิ่มก่อนใช้ workflow deploy ปกติ
5. เปิด `/admin/seeder` → Run now ทีละหมวดดูผลก่อน → Resume (ค่าเริ่มต้น `paused = true`)
6. AIC: IIIF ตอบ 403 (Cloudflare) จากเครื่อง dev — แถว AIC ปิดไว้ (`enabled = false`) เปิดจาก admin หลังลองจาก Vercel แล้วผ่าน

## Local

```bash
npm install
npm run dev            # http://localhost:3010
npm run inngest:dev    # Inngest dev server — ใส่ INNGEST_DEV=1 ใน .env.local แทน event/signing key
npm test               # unit tests (ไม่แตะ DB/เครือข่าย)
npm run seeder:dry -- met poster   # ดึง metadata จริงจาก API แต่ไม่เขียน DB
```

## นโยบายเนื้อหา

- Allowlist license = `cc0` เท่านั้น (`src/seeder/config.ts`) และ DB check บังคับซ้ำตอน `status = 'published'`
- ทุกแถวต้องมี `license`, `license_url`, `attribution`, `source_url` (https) — หน้า Discover แสดงเครดิตใน detail และติดไปกับ item ที่ Keep
- Moderation บล็อก nudity รวมถึงงานศิลปะ (`BLOCK_ARTISTIC_NUDITY = true`) เพราะ Discover เปิดให้ guest
- AI ตอบผิด schema → reject `ai_invalid_output` (ไม่ค้าง pending) ลองใหม่ได้ด้วยการลบแถวแล้วรันหมวดนั้นอีกครั้ง
- Takedown: admin กด Hide → `status = 'hidden'` หายจาก Discover ทันที (ไฟล์ใน Storage ยังอยู่)

## ขั้น 7: Unsplash / Pexels — ผลประเมิน (ต.ค. 2026)

**สรุป: ไม่เพิ่มเป็น adapter ของ seeder** เพราะขัดเงื่อนไข API ทั้งสองเจ้าโดยตรง

| เงื่อนไข | Unsplash ([API Guidelines](https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines)) | Pexels ([API docs](https://www.pexels.com/api/documentation/), [Terms](https://www.pexels.com/terms-of-service/)) |
|---|---|---|
| ดึงอัตโนมัติจำนวนมาก | ห้าม — API ใช้กับ "non-automated, authentic experiences" | ห้าม bulk / systematic copying ถ้าไม่ได้รับอนุญาต |
| ทำ feed ให้คนเลื่อนดู | ห้าม replicate core experience ([รายละเอียด](https://help.unsplash.com/en/articles/2511257-guideline-replicating-unsplash)) | ห้าม compile content เป็นบริการที่คล้าย/แข่ง หรือเลียน look & feel |
| ย่อรูปเก็บเอง (WebP) | ห้าม — ต้อง hotlink `photo.urls` | ไม่บังคับ hotlink แต่การ rehost ทั้งชุด = systematic copying |
| ส่งรูปให้ AI | ไม่ระบุตรง ๆ | ห้าม automated extraction เพื่อ ML (เสี่ยง) |
| เครดิต | ช่างภาพ + Unsplash + ลิงก์ `?utm_source=a_plus_vault&utm_medium=referral` | ลิงก์ Pexels ชัดเจน + "Photo by X on Pexels" |
| ตอนผู้ใช้ใช้งานรูป | ยิง `photo.links.download_location` | — |

ทางที่ถูกเงื่อนไขถ้าต้องการภาพถ่ายร่วมสมัย:

1. **Picker ที่ผู้ใช้สั่งเอง** (แบบ Ghost/Trello) — ช่องค้นหา Unsplash/Pexels ในหน้า Keep หรือ moodboard: ผู้ใช้ค้นและเลือกเอง, แสดงผ่าน hotlink, เครดิตครบ, ยิง `download_location` ตอน Keep, เก็บ `delivery_mode = 'hotlink'` ใน `vault_items` ของผู้ใช้ — **ไม่เข้า `discover_items`** และไม่ผ่าน AI. ต้องขอ production access จาก Unsplash (ส่ง screenshot การแสดงเครดิต) และเรียก API ผ่าน server proxy เพื่อไม่เปิดเผย Access Key
2. **ขยาย Discover ด้วยแหล่ง CC0 อื่น** ที่เข้ากับ pipeline เดิม (rehost ได้): Cleveland Museum of Art Open Access, Smithsonian Open Access, Rijksmuseum, National Gallery of Art — เพิ่มเป็น adapter ใหม่ + ขยาย check `source` ใน migration

ถ้าจะทำข้อ 1 ภายหลัง ต้องตัดสินใจเรื่องนี้ก่อน: แยก flow ออกจาก seeder ทั้งหมด (ไม่ใช้ `discover_items`) ดังนั้น constraint `published` ของ `discover_items` (บังคับ `rehosted` + cc0) ไม่ต้องแก้
