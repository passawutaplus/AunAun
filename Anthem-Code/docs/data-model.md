# Data Model

ปัจจุบันใช้ multi-schema บน unified project `rvnzjiskqliexysicfmh` — `shared`, `anthem`, `so1o` (Phase 2 ย้ายครบแล้วส่วนใหญ่ — ดู `schema-reorganize.md`)

## Target placement

### `shared` (Anthem + So1o ใช้ร่วม)
- `profiles` (+ `subscription_tier`, `subscription_seats` — So1o Pro ปลดล็อกทั้งสองแอป)
- `subscriptions`, `user_credits` (billing ผ่าน So1o, อ่านร่วมกัน)
- `user_roles`
- `wallets`, `wallet_topups`, `cashout_requests`
- `gifts`, `gift_transactions`
- `contracts`, `admin_audit_log`
- `conversations`, `messages`
- `shared.notifications` / `ecosystem_notifications` — in-app notifications (shipped)

### `anthem` (Anthem only)
- **Portfolio:** `projects`, `project_likes`, `project_comments`, `project_views`, `project_bookmarks`
- **Curation:** `collections`, `collection_items`, `inspire_boards`, `inspire_items`
- **Social:** `follows`, `image_likes`, `image_shares`
- **Hiring:** `collab_requests`, `hiring_requests`
- **Studios:** `studios`, `studio_members`, `studio_formation_requests`, `studio_formation_invites`
- **Jobs:** `job_posts`, `job_applications`, `job_match_notifications`
- **Ads:** `ad_applications`, `ad_campaigns`, `ad_events`

### `so1o` (Phase 2 import)
- `quotes`, `quote_items`, `invoices`, `invoice_items`, `payments`
- `clients_extended`, `tasks`, `milestones`, `time_entries`, `expenses`

## Key relationships

```text
profiles (1) ─< projects (N)
projects (1) ─< project_likes/comments/views/bookmarks (N)
projects (1) ─< collection_items (N) >─ collections (1)
profiles (1) ─< follows >─ profiles (1)
studios (1) ─< studio_members (N) >─ profiles (1)
studios (1) ─< job_posts (N) ─< job_applications (N) >─ profiles (1)
profiles (1) ─< conversations >─ profiles (1) ─< messages (N)
profiles (1) ─< wallets (1) ─< wallet_topups / cashout_requests (N)
```

## Auth

ห้าม FK ไป `auth.users` ตรงๆ — ใช้ `profiles.id` (มี trigger sync จาก auth)

## Roles

อยู่ใน `user_roles` (แยก table) + เช็คผ่าน `has_role(uid, 'admin')` ฟังก์ชัน SECURITY DEFINER

## Moderation & Feedback (Report/Feedback system)

- **`user_reports`** — รายงานผู้ใช้/โปรเจกต์/คอมเมนต์/สตูดิโอ
  - คอลัมน์: `target_type`, `target_id`, `target_owner_id`, `reporter_id`, `reason`, `details`, `evidence_url`, `evidence_files` (jsonb: `[{url,type,name,size}]`), `status` (`open|reviewing|resolved|dismissed`), `admin_note`, `resolved_by`, `resolved_at`
  - Index: `idx_user_reports_status_created`, unique partial เพื่อกัน report ซ้ำที่ยังเปิดอยู่ของคู่ reporter+target
  - RLS: เจ้าของอ่านของตัวเอง / admin อ่าน-เขียนทั้งหมด
- **`app_feedback`** — ฟีดแบ็กให้คะแนน 1-5 ดาว + ข้อความ + ฟีเจอร์ + `project_id`
  - คอลัมน์: `user_id`, `rating`, `message`, `feature`, `project_id`, `status`, `admin_note`, `resolved_by`, `resolved_at`
- **Storage bucket `report-evidence`** (private): ผู้ใช้อัปโหลดเข้า path ของตัวเอง, อ่านได้เฉพาะเจ้าของ + admin
- **Rate limit RPCs**: `create_report` (5/10min ต่อ user, 1/1hr ต่อ target), `submit_feedback` (1/1min, 10/1hr)
- ทั้งสองตารางอยู่ใน `supabase_realtime` publication เพื่อให้แอดมินเห็น real-time
