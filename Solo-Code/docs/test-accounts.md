# Test Accounts

> ⚠️ **Owner action required:** สร้างบัญชีจริง 7 ตัวด้านล่าง แล้วเติม email/password กลับมาในไฟล์นี้
> ห้าม commit credential จริงเข้า public repo — เก็บใน secret store / 1Password / Bitwarden แล้ว share ผ่าน private channel

## Role matrix

| Role | Email | Password | คาดหวัง |
|---|---|---|---|
| **Guest** | (no account) | — | เห็นเฉพาะ landing, blog, pricing, /auth, /apply |
| **Unverified** | `test+unverified@…` | `<set>` | Login ได้แต่ redirect ไป `/apply`; ไม่เห็น dashboard |
| **User A (tester approved)** | `test+usera@…` | `<set>` | เห็น dashboard เต็ม; เห็นเฉพาะ data ของตัวเอง |
| **User B (tester approved)** | `test+userb@…` | `<set>` | คนละ tenant กับ User A — ใช้ทดสอบ cross-user isolation |
| **Studio Owner** | `test+studioowner@…` | `<set>` | (ถ้ามี studio feature) — owner ของ studio |
| **Studio Member** | `test+studiomember@…` | `<set>` | (ถ้ามี studio feature) — member ใต้ owner |
| **Admin** | `test+admin@…` | `<set>` | เข้า `/admin/*` ได้; ดู audit log; assign role |

## Expected guard behavior per route

| Route | Guest | Unverified | User | Admin |
|---|---|---|---|---|
| `/` | ✅ | ✅ | ✅ | ✅ |
| `/auth` | ✅ | redirect → /apply | redirect → /dashboard | redirect → /dashboard |
| `/apply` | ✅ | ✅ | ✅ | ✅ |
| `/dashboard` | → /auth | → /apply | ✅ | ✅ |
| `/admin` | → /auth | → /apply | → /dashboard | ✅ |
| `/pricing`, `/blog`, `/cookies`, `/terms`, `/privacy` | ✅ | ✅ | ✅ | ✅ |
| `/track/$token` (valid) | ✅ | ✅ | ✅ | ✅ |
| `/track/$token` (invalid) | 404/empty | 404/empty | 404/empty | 404/empty |

## Expected RLS behavior

| Action | User A | User B | Admin |
|---|---|---|---|
| SELECT own profile | ✅ | ✅ | ✅ |
| SELECT User A's `quotations` | ✅ | ❌ empty | ✅ (admin override) |
| INSERT `quotations` for self | ✅ | ✅ | ✅ |
| UPDATE User A's `quotations` | ✅ | ❌ no rows | ✅ |
| DELETE User A's `quotations` | ✅ | ❌ no rows | ✅ |
| SELECT `hq_agents` | ❌ empty | ❌ empty | ✅ |
| SELECT `admin_audit_log` | ❌ empty | ❌ empty | ✅ |
| INSERT `user_roles` for self | ❌ | ❌ | ✅ |
| SELECT `dashboard_daily_trends` | ✅ public | ✅ public | ✅ |

## Edge function access matrix

| Function | Guest | User | Admin |
|---|---|---|---|
| `ai-design-chat` | ✅ (public for landing) | ✅ | ✅ |
| `ai-price-suggest` | ❌ 401 | ✅ | ✅ |
| `color-mentor` | ❌ 401 | ✅ | ✅ |
| `planner-ai-assist` | ❌ 401 | ✅ | ✅ |

## How to use these accounts

1. **Manual QA:** login each → walk through `qa-checklist.md` for the routes they should access + verify they CANNOT access what they shouldn't
2. **E2E:** Playwright reads credentials from env vars (`E2E_*_EMAIL/PASSWORD`). See [docs/e2e-guide.md](../../docs/e2e-guide.md)
3. **Pentest:** pentester gets all 7 — uses User A/B to test IDOR, admin to map admin surface, guest to map public surface

## Rotating credentials

หลังจบ engagement กับ external party:
1. Admin → User Management → reset password ของทุกบัญชี test
2. อัพเดท secret store
3. อัพเดท CI env vars
