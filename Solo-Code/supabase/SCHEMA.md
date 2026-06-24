# So1o Supabase Schema — Domain Map

โปรเจกต์: **`rvnzjiskqliexysicfmh`** · migrations: **136 ไฟล์** ใน `migrations/`

## งานลูกค้า (Pipeline)

| ตาราง | บทบาท |
|--------|--------|
| `quotations` | ดีลหลัก — 1 card = 1 row |
| `job_trackers` | ส่งมอบ + สลิป (`quotation_id`) |
| `job_slips` | สลิปรอตรวจ |
| `job_events` | Timeline งาน |
| `smart_briefs` | บรีฟลูกค้า |

คอลัมน์ Pipeline/Contract บน `quotations`: `contract_accepted`, `contract_signed_at`, `contract_signer_ip`

คอลัมน์ Document Signatures (`20260618120000_document_signatures`):

| ตาราง | คอลัมน์ |
|--------|--------|
| `profiles` | `signature_url`, `esign_acknowledged_at` |
| `quotations` | `signature_mode` (`none\|embedded\|online\|wet`), `include_freelancer_signature`, `sign_share_token`, `client_signer_name`, `client_signature_url`, `client_signed_at`, `client_sign_method`, `client_signer_ip`, `client_signer_user_agent`, `signed_document_url`, `signature_consent_version` |

RPC: `resolve_quotation_id_by_sign_token`, `get_quotation_sign_payload_by_token`, `sign_quotation_by_token` — ลูกค้าเซ็นผ่าน `/sign/:token` (public, anon)

## การเงิน & ภาษี

| ตาราง | บทบาท |
|--------|--------|
| `finance_incomes` | รายได้ |
| `finance_work_expenses` | ค่าใช้จ่ายงาน |
| `finance_personal_expenses` | ค่าใช้จ่ายส่วนตัว |
| `finance_subscriptions` | Subscription |
| `finance_tax_scenarios` | สถานการณ์ภาษี |

## Shared Squad (Phase 2)

| ตาราง | บทบาท |
|--------|--------|
| `shared_projects` | โปรเจกต์ร่วม |
| `project_members` | สมาชิก + % หารรายได้ |
| `project_tasks` | Team kanban |

## In-House Co-working (MVP)

| ตาราง | บทบาท |
|--------|--------|
| `inhouse_orgs` | Org + seat_limit |
| `inhouse_org_members` | สมาชิก + role |
| `inhouse_workspaces` | ห้อง co-working |
| `inhouse_tasks` | Kanban / To-do |
| `inhouse_channels` / `inhouse_messages` | Chat |
| `inhouse_activity_events` | Monitor |
| `inhouse_invites` | ลิงก์เชิญ |
| `inhouse_canvases` | Whiteboard (Excalidraw) |

Migration: `20260612120000_inhouse_workspace.sql` · `20260613100000_inhouse_invite_pending.sql` · scripts: `scripts/ecosystem/inhouse-workspace.sql`

## Support

| ตาราง | บทบาท |
|--------|--------|
| `support_tickets` | Issue tracking |
| `ticket_attachments` | ไฟล์แนบ |
| `ticket_events` | ประวัติ |

## ผู้ใช้ & ระบบ

| ตาราง | บทบาท |
|--------|--------|
| `profiles` | โปรไฟล์ผู้ใช้ |
| `user_roles` | admin / user |
| `notifications` | แจ้งเตือนในแอป |
| `subscriptions` | tier / billing |
| `user_credits` | เครดิต |

## Migrations ล่าสุด (2026-06)

```
20260604150000_support_tickets.sql
20260605100000_quotations_contract.sql
20260605110000_shared_projects_phase2.sql
20260605120000_pipeline_supabase_organization.sql
```

## Deploy & ตรวจสอบ

```bash
export SUPABASE_ACCESS_TOKEN=<token>
./scripts/supabase-push-via-api.sh    # push migration ใหม่
./scripts/supabase-setup-project.sh   # auth redirect + edge functions
```

ตรวจในแอป: `/admin` → **Supabase**

ดูรายละเอียดโฟลเดอร์: [`supabase/README.md`](./README.md)
