# Demo Catalog — 50 ครีเอเตอร์ (ชุมชนตัวอย่าง)

ข้อมูล demo สำหรับดูภาพรวมเว็บแบบใช้งานจริง — **ลบทีหลังได้** ผ่าน `scripts/sql/purge-demo-users.sql` + ลบ auth users `@demo.an1hem.app`

## รัน seed

```bash
npm run db:push
# หรือรัน SQL ตาม scripts/sql/README.md
```

### ลำดับ migration

1. `20260604130100_seed_community_catalog.sql` — 20 users แรก
2. `20260604200000_seed_art_design_enriched.sql` — ภาพ Unsplash, social, ads
3. `20260604250000_seed_50_users_full_activity.sql` — **+30 users, กิจกรรมครบ**

## เข้าสู่ระบบ

| ฟิลด์ | ค่า |
|--------|-----|
| อีเมล | `{username}@demo.an1hem.app` |
| รหัสผ่าน | กำหนดด้วย `DEMO_SEED_PASSWORD` และส่งให้ผู้รีวิวเป็นการส่วนตัว |

### Username ทั้ง 50 คน

`phatsawut`, `napatsara`, `pimchanok`, `wannakorn`, `thanya`, `chatchai`, `atittaya`, `ploypailin`, `thanakorn`, `anucha`, `parichat`, `jessada`, `supatra`, `wathanyu`, `kritsana`, `siriporn`, `kittipong`, `manatsanan`, `nattawut`, `phattranit`, `arinya`, `boonlert`, `chanida`, `decha`, `ekkachai`, `fahsaeng`, `gamelan`, `hathairat`, `ithipol`, `jirawat`, `kanya`, `lalita`, `mekkhala`, `niran`, `orathai`, `prapas`, `rattana`, `sombat`, `thawee`, `udaiphon`, `vichai`, `walai`, `xanadu`, `yupa`, `zakari`, `narong`, `pensri`, `santisuk`, `theerapong`, `wilawan`

UUID: `00000000-0000-0000-0000-00000000a000` … `a031` (index 0..49)

## สิ่งที่ seed สร้าง (รวมชุด 50)

| รายการ | จำนวนโดยประมาณ |
|--------|----------------|
| ครีเอเตอร์ + auth | 50 |
| ผลงาน Published | 70 (คนละ 1–2 โปรเจกต์) |
| สตูดิโอ | 15 |
| ประกาศงาน | 25 |
| ติดตาม (follows) | ~300 คู่ |
| ไลค์ | ~350 |
| คอมเมนต์ | 80 |
| คำขอคอลแลป | 40 |
| คำขอจ้าง | 35 |
| คอลเลกชัน + รายการ | 30 |
| Inspire boards | 25 |
| ของขวัญ (gift tx) | 45 |
| สมัครงาน | 25 |
| แชต + ข้อความ | 15 ห้อง |
| แจ้งเตือน | 40 |
| กระเป๋า + เติม px | 50 |

รูปภาพ: **Unsplash** (art/design) + **Dicebear** (avatar)

## โหมดทดสอบบนเว็บ

```env
VITE_DEMO_MODE=true
```

ดู `docs/ux-demo-guide.md`

## ลบข้อมูล demo

`scripts/sql/purge-demo-users.sql` แล้วลบ users ใน Dashboard → Authentication
