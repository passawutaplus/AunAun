# Test Accounts & Role Matrix

ใช้สำหรับ QA และ pentester ตรวจสิทธิ์ทุกหน้า/ทุก action ในระบบ

## บัญชีทดสอบ (ต้องสร้างก่อนส่งให้ external)

> **User action required** — สร้างใน Supabase Dashboard → Authentication → Users หรือใช้ demo accounts ใน [`demo-catalog.md`](./demo-catalog.md)

| Role            | Email (suggested)            | Password | user_roles.role | Notes |
| --------------- | ---------------------------- | -------- | --------------- | ----- |
| Guest           | _(no account)_               | —        | —               | Anonymous browser |
| Unverified      | `qa-unverified@example.com`  | _set_    | `user`          | Don't click verify link |
| User A (verified) | `qa-user-a@example.com`    | _set_    | `user`          | สำหรับเทส cross-user isolation |
| User B (verified) | `qa-user-b@example.com`    | _set_    | `user`          | ปฏิสัมพันธ์กับ User A (follow, hire, gift, chat) |
| Studio Owner    | `qa-studio@example.com`      | _set_    | `user` + owns studio | สร้าง studio + invite members |
| Studio Member   | `qa-studio-member@example.com` | _set_  | `user` + studio member | สำหรับเทส role ภายใน studio |
| Admin           | `qa-admin@example.com`       | _set_    | `admin`         | เข้า `/admin/*` ได้ |

วิธี grant admin: รัน SQL ใน Supabase SQL Editor:
```sql
insert into public.user_roles (user_id, role)
values ('<auth.users.id>', 'admin');
```

## Role Matrix — สิ่งที่แต่ละ role "ต้อง" ทำได้/ไม่ได้

ครอบคลุมหน้า/feature สำคัญ → ใช้เป็น checklist ตรวจ RLS + UI guard

### 🌐 Public routes (ไม่ต้อง login)

| Route                       | Guest | User | Admin | หมายเหตุ |
| --------------------------- | :---: | :--: | :---: | -------- |
| `/`                         |  ✅   |  ✅  |   ✅  | Feed |
| `/portfolio/:username`      |  ✅   |  ✅  |   ✅  | Public profile |
| `/project/:id` (Published)  |  ✅   |  ✅  |   ✅  |  |
| `/project/:id` (Draft)      |  ❌   |  owner only | ✅  | RLS check |
| `/studio/:slug`             |  ✅   |  ✅  |   ✅  |  |
| `/jobs`                     |  ✅   |  ✅  |   ✅  | open jobs เท่านั้น |
| `/advertise`                |  ✅   |  ✅  |   ✅  |  |
| `/legal/*`                  |  ✅   |  ✅  |   ✅  |  |
| `/auth`                     |  ✅   |  ✅ (redirect) | ✅ (redirect) | |

### 🔐 Auth-required routes

| Route                       | Guest | Unverified | User | Admin | หมายเหตุ |
| --------------------------- | :---: | :--------: | :--: | :---: | -------- |
| `/portfolio/manage`         |  →auth | gate      |  ✅  |   ✅  |  |
| `/project/new` / `/project/:id/edit` | →auth | gate |  ✅ (own) | ✅ |  |
| `/chat`                     |  →auth | gate      |  ✅  |   ✅  |  |
| `/notifications`            |  →auth | gate      |  ✅  |   ✅  |  |
| `/settings`                 |  →auth | gate      |  ✅  |   ✅  |  |
| `/earnings`                 |  →auth | gate      |  ✅  |   ✅  | เห็นเฉพาะของตัวเอง |
| `/contracts/*`              |  →auth | gate      |  ✅  |   ✅  |  |
| `/studio/create`            |  →auth | gate      |  ✅  |   ✅  |  |
| `/studio/:slug/manage`      |  →auth | gate      | admin/owner ของ studio | ✅ |  |

### 👑 Admin-only routes (`/admin/*`)

ทุก path ใต้ `/admin/*` ต้องผ่าน `AdminGuard`. Non-admin = redirect `/`.

| Route                          | Guest | User | Admin |
| ------------------------------ | :---: | :--: | :---: |
| `/admin` (overview)            |  →auth |  ↩ /  |  ✅  |
| `/admin/users`                 |  →auth |  ↩ /  |  ✅  |
| `/admin/projects`              |  →auth |  ↩ /  |  ✅  |
| `/admin/studios`               |  →auth |  ↩ /  |  ✅  |
| `/admin/jobs`                  |  →auth |  ↩ /  |  ✅  |
| `/admin/hiring`                |  →auth |  ↩ /  |  ✅  |
| `/admin/collabs`               |  →auth |  ↩ /  |  ✅  |
| `/admin/ads`                   |  →auth |  ↩ /  |  ✅  |
| `/admin/gifts`                 |  →auth |  ↩ /  |  ✅  |
| `/admin/collections`           |  →auth |  ↩ /  |  ✅  |
| `/admin/chats`                 |  →auth |  ↩ /  |  ✅  |
| `/admin/comments`              |  →auth |  ↩ /  |  ✅  |
| `/admin/notifications`         |  →auth |  ↩ /  |  ✅  |
| `/admin/storage`               |  →auth |  ↩ /  |  ✅  |
| `/admin/system`                |  →auth |  ↩ /  |  ✅  |
| `/admin/audit`                 |  →auth |  ↩ /  |  ✅  |

### 📊 Data access (RLS) — ต้องเทสด้วย SQL/curl

| Table                  | Guest read | Own read | Others read | Insert | Update others | Delete others |
| ---------------------- | :--------: | :------: | :---------: | :----: | :-----------: | :-----------: |
| `profiles`             |     ✅     |    ✅    |     ✅      | self   |      ❌       |      n/a      |
| `projects` (Published) |     ✅     |    ✅    |     ✅      | self   |      ❌       |      ❌       |
| `projects` (Draft)     |     ❌     |    ✅    |     ❌      | —      |      ❌       |      ❌       |
| `wallets`              |     ❌     |    ✅    |     ❌      | system |      ❌       |      ❌       |
| `gift_transactions`    |     ❌     | participants |  ❌    | system |      ❌       |      ❌       |
| `cashout_requests`     |     ❌     |    ✅    |     ❌      | system |   admin only  |      ❌       |
| `messages`             |     ❌     | participants |  ❌    | participants | ❌        |      ❌       |
| `conversations`        |     ❌     | participants |  ❌    | participants | participants | ❌      |
| `user_roles`           |     ❌     |    ✅    |     ❌      | admin  |   admin only  |   admin only  |
| `admin_audit_log`      |     ❌     |    ❌    |  admin only | admin  |      ❌       |      ❌       |
| `ad_campaigns` (active)|     ✅     |    ✅    |     ✅      | system |   admin only  |   admin only  |
| `ad_events`            |     ❌     | admin    |  admin only | auth   |      ❌       |      ❌       |

### ⚙️ Edge function access

| Function              | Auth required | Notes |
| --------------------- | :-----------: | ----- |
| `generate-contract`   | ✅            | JWT verified in code |
| `similar-images`      | ✅            | |
| `embed-project`       | ✅ + owner    | ตรวจ owner_id ใน code |
| `job-match-dispatch`  | ✅ + admin    | admin role ตรวจใน code |

## เครื่องมือ QA แนะนำ

- **Browser DevTools** → Network: ตรวจ `Authorization` header + response
- **curl/Postman**: เรียก PostgREST ตรง ๆ ด้วย token ของแต่ละ role เทียบผล
- **Burp/ZAP**: intercept + replay request ของ User A ด้วย token User B
- **SQL จาก Cloud SQL editor**: ทดสอบ policy ตรง ๆ ด้วย `set role authenticated; set request.jwt.claim.sub = '<uuid>';`

## ผลลัพธ์ที่คาดหวัง

ทุก action ที่ "❌" ในตาราง ต้อง **block ที่ระดับฐานข้อมูล (RLS)** ไม่ใช่แค่ UI hide
ถ้า bypass UI ได้ (เช่น curl ตรง) ถือว่าเป็น **High/Critical finding**
