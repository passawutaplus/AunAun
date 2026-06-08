# Ops Hub — Wireframe

โดเมน: **`hq.solofreelancer.com`**  
บทบาท: PM Workspace + Ecosystem monitor (Linear-style)

## Layout (App Shell)

```
┌────────────┬──────────────────────────────────────────────────────────┐
│ [S1][a1]   │  Inbox (12)                              [Filter] [↻]     │
│ Ops Hub    ├──────────────────────────────────────────────────────────┤
│            │  [!] TKT-0042  So1o   Login หลัง OAuth ไม่เสถียร            │
│ Overview   │  [ ] FS-018    So1o   Export PDF หลายหน้า                 │
│ Inbox ●12  │  [!] RPT-009   an1hem รายงานเนื้อหาไม่เหมาะสม               │
│ Board      ├──────────────────────────────────────────────────────────┤
│ Issues     │  Activity: user.signup · project.published · ...           │
│ Hub Work   │                                                          │
│ Cycles     │                                                          │
│ Roadmap    │                                                          │
│ Activity   │                                                          │
│────────────│                                                          │
│ [รวม]      │                                                          │
│ [So1o]     │                                                          │
│ [an1hem]   │                                                          │
│ user@...   │                                                          │
│ [ออก]      │                                                          │
└────────────┴──────────────────────────────────────────────────────────┘
```

## Routes

| Route | หน้า | บทบาท |
|-------|------|--------|
| `/login` | Login | Admin email/password |
| `/` | Overview | KPI + alerts + deep links (เดิม) |
| `/inbox` | Inbox | Triage queue — priority + อายุ |
| `/board` | Board | Kanban 4 คอลัมน์ + drag-drop |
| `/issues` | Issues | List + search/filter |
| `/work` | Hub Work | `ops.issues` ภายใน |
| `/cycles` | Cycles | Sprint ปัจจุบัน + burndown ง่าย |
| `/roadmap` | Roadmap | Quarter timeline |
| `/activity` | Activity | `platform_events` feed |

## Board columns

| Column | support_tickets | feature_suggestions | app_feedback | user_reports |
|--------|-----------------|---------------------|--------------|--------------|
| Triage | new | new | new | open |
| In Progress | in_progress | reviewing | reviewing | reviewing |
| In Review | qa | planned | — | — |
| Done | resolved/closed | shipped | resolved | resolved/dismissed |

## Issue drawer (คลิกรายการ)

- เปลี่ยน status / priority / admin note
- ปุ่ม **เปิดใน Admin** (deep link)
- ปุ่ม **สร้าง Hub Issue** (promote → `ops.issues`)

## View switcher (sidebar)

| View | กรอง |
|------|------|
| รวม | ทุกแอป + ecosystem |
| So1o | tickets, feature_suggestions |
| an1hem | feedback, reports |

## User flow

1. Login → redirect `/inbox`
2. ดู Triage ใน Inbox → คลิกเปิด drawer → ย้ายสถานะหรือ promote
3. Board ลากการ์ดเปลี่ยน column
4. Hub Work สร้างงานภายใน / Cycles / Roadmap
5. Overview ยังใช้ monitor KPI + deep link compliance (KYC, AML, cashout)
