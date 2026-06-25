# Demo Catalog — 20 ครีเอเตอร์ (ชุมชนตัวอย่าง)

ข้อมูล demo สำหรับดูภาพรวมเว็บแบบใช้งานจริง — **ลบทีหลังได้** ผ่าน `scripts/sql/purge-demo-users.sql` + ลบ auth users `@demo.pixel100.com`

## รัน seed

```bash
cd Anthem-Code
# ต้องมี SUPABASE_ACCESS_TOKEN + service role ใน Solo-Code/.env
npm run seed:demo-full
```

หรือ one-shot จาก repo root: `./scripts/prepare-demo.sh`

### ลำดับ migration (อัตโนมัติใน seed:demo-full)

1. `20260604240000_public_feed_stats.sql` — Hero stats RPC
2. `20260604130100_seed_community_catalog.sql` — baseline SQL (สำรอง)
3. `20260604200000_seed_art_design_enriched.sql` — social graph เสริม
4. `20260604250000_seed_20_users_full_activity.sql` — wallets, comments, collections, notifications
5. REST: `run-seed.mjs` + `seed-demo-activity.mjs` + community + chats

## เข้าสู่ระบบ

| ฟิลด์ | ค่า |
|--------|-----|
| อีเมล | `{username}@demo.pixel100.com` |
| รหัสผ่าน | `pixel100-demo-seed` (หรือ `DEMO_SEED_PASSWORD`) |

### Personas สำหรับ UX review

| Username | บทบาท |
|----------|--------|
| `phatsawut` | ครีเอเตอร์ใหม่ — Welcome PX, checklist |
| `napatsara` | ครีเอเตอร์ยอดนิยม — 2 ผลงาน, engagement สูง |
| `chatchai` | ผู้จ้าง — งาน, hiring, แชตจ้างงาน |

### Username ทั้ง 20 คน

`phatsawut`, `napatsara`, `pimchanok`, `wannakorn`, `thanya`, `chatchai`, `atittaya`, `ploypailin`, `thanakorn`, `anucha`, `parichat`, `jessada`, `supatra`, `wathanyu`, `kritsana`, `siriporn`, `kittipong`, `manatsanan`, `nattawut`, `phattranit`

UUID: `00000000-0000-0000-0000-00000000a000` … `a013` (index 0..19)

## สิ่งที่ seed สร้าง (ชุด 20)

| รายการ | จำนวนโดยประมาณ |
|--------|----------------|
| ครีเอเตอร์ + auth | 20 |
| ผลงาน Published | 21 (napatsara มี 2) |
| สตูดิโอ | 10 |
| ประกาศงาน | 15 |
| ติดตาม (follows) | ~120 |
| ไลค์ | ~140 |
| คอมเมนต์ | ~32 |
| คำขอคอลแลป | ~16 |
| คำขอจ้าง | ~14 |
| คอลเลกชัน + รายการ | 12 |
| Inspire boards + items | 10 + 10 |
| ของขวัญ (gift tx) | ~18 |
| สมัครงาน | 10 |
| แชต + ข้อความ | 8 ห้อง |
| แจ้งเตือน | ~28 |
| Community posts | 24 |
| กระเป๋า + welcome PX | 20 |

รูปภาพ: **Unsplash** (art/design) + **Dicebear** (avatar)

## โหมดทดสอบบนเว็บ

```env
VITE_DEMO_MODE=true
```

ดู `docs/ux-demo-guide.md`

## ลบข้อมูล demo

`scripts/sql/purge-demo-users.sql` แล้วลบ users ใน Dashboard → Authentication
