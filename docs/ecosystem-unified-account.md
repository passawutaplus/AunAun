# So1o ↔ an1hem — บัญชีและ Pro ร่วมกัน

## โปรเจกต์ Supabase เดียว

**`rvnzjiskqliexysicfmh`** — ทั้ง So1o และ an1hem ใช้ URL + anon key ชุดเดียวกัน

| Schema | หน้าที่ |
|--------|---------|
| `public` | `profiles` (`user_id` = auth), billing, roles |
| `shared` | wallet, contracts, chat, ecosystem notifications |
| `anthem` | ฟีด, portfolio, studios, jobs |
| `so1o` | back-office (ย้ายตารางมาทีละ phase) |

รายละเอียด migration: `Solo-Code/supabase/ECOSYSTEM.md`

## บทบาทสองแอป

| แอป | บทบาท |
|-----|--------|
| **So1o** | หลังบ้าน: ใบเสนอราคา, ลูกค้า, การเงิน |
| **an1hem** | หน้าร้าน: โชว์ผลงาน, ฟีด, รับงาน |

## สมัคร Pro ครั้งเดียว

- Stripe webhook ที่ So1o อัปเดต `public.profiles.subscription_tier`
- an1hem อ่าน tier จากแถว `profiles` เดียวกัน (`user_id` = บัญชี login)
- ไม่ต้องใช้ `sync-so1o-tier` เมื่อรวมโปรเจกต์แล้ว

## Env ทั้งสองแอป

```env
VITE_SUPABASE_URL=https://rvnzjiskqliexysicfmh.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
VITE_SUPABASE_PROJECT_ID=rvnzjiskqliexysicfmh
```

So1o เพิ่ม: `VITE_ANTHEM_APP_URL`, `VITE_OPS_HUB_URL`  
an1hem เพิ่ม: `VITE_SO1O_APP_URL`, `VITE_OPS_HUB_URL`  
Ops Hub: `Ops-Hub/` → `hq.solofreelancer.com`

## หมายเหตุ session

คนละโดเมน = คนละ cookie login จนกว่าจะทำ SSO ร่วม
