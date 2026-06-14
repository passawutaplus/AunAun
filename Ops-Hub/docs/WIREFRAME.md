# Ops Hub — Wireframe

โดเมน: **`hq.solofreelancer.com`**  
บทบาท: PM Workspace + Ecosystem monitor (Linear-style)

## Layout (App Shell)

```
┌────────────┬──────────────────────────────────────────────────────────┐
│ [S1][a1]   │  ภาพรวม — Flywheel Health · KPI · Alerts                │
│ Ops Hub    ├──────────────────────────────────────────────────────────┤
│            │                                                          │
│ ภาพรวม     │  [Monitor strip] [Flywheel 7d] [Alert queue]            │
│ มอนิเตอร์  │                                                          │
│ ติดตามระบบ │                                                          │
│────────────│                                                          │
│ Ecosystem  │                                                          │
│ Connections│                                                          │
│ User 360   │                                                          │
│ Radar      │                                                          │
│────────────│                                                          │
│ PM ทีม     │                                                          │
│ Inbox ●12  │                                                          │
│ Board …    │                                                          │
│────────────│                                                          │
│ [รวม/So1o] │                                                          │
│ user@…     │                                                          │
└────────────┴──────────────────────────────────────────────────────────┘
```

## Routes

| Route | หน้า | บทบาท |
|-------|------|--------|
| `/login` | Login | Admin email/password |
| `/` | ภาพรวม | KPI + Flywheel Health + alerts + smoke links |
| `/monitor` | มอนิเตอร์ | Infra health + usage + checklist |
| `/tracking` | ติดตามระบบ | Feature readiness % (sync monitor) |
| `/connections` | Ecosystem | Flywheel flows + funnel alerts + SSO |
| `/users` | User 360 | ค้นหาบัญชี |
| `/users/:userId` | User detail | admin_user_360 |
| `/radar` | Radar | เทรนด์ → Hub Issue |
| `/inbox` | Inbox | Triage + ecosystem_alert |
| `/board` | Board | Kanban 4 คอลัมน์ |
| `/issues` | Issues | List + search/filter |
| `/work` | Hub Work | `ops.issues` |
| `/cycles` | Cycles | Sprint |
| `/roadmap` | Roadmap | Quarter + Ecosystem board |
| `/activity` | Activity | `platform_events` realtime |

## Issue drawer

- เปลี่ยน status / priority / admin note
- **ecosystem_alert** → ปุ่ม "ไป Connections"
- อื่นๆ → **เปิดใน Admin** (deep link)
- **สร้าง Hub Issue** (promote → `ops.issues`)

## User flow

1. Login → redirect `/inbox`
2. Overview → Flywheel Health → Connections ถ้ามี stuck links
3. Radar / Roadmap → promote เป็น Hub Work
4. Activity แสดง events หลัง deploy platform_events triggers
