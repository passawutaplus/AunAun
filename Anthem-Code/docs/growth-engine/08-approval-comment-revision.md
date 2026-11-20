# 08 · Approval, Comment-to-Revision & Notifications

## Owner inbox: exactly three groups

1. **Approve Today** — campaign card: cover, platforms with per-platform approval state, first slot, Sources / Rights / QC / Budget checks.
2. **Needs Decision** — unverified sources, missing consent, risky comments, budget/credit, setup gaps, comments the revision agent could not act on, Pause All on.
3. **Growth Insights** — weekly Keep / Improve / Stop / Test Next (max 3). Metrics without data show `UNAVAILABLE`.

## Approval model

- Approve **all**, approve **selected platforms**, request changes (comment), reject.
- Each approval stores *(platform, version, approved_hash, approver, time)*. Only the owner can approve (`AI_CANNOT_APPROVE` in TS, `OWNER_ONLY` in SQL).
- A platform is publishable only while its approved hash equals its hash in the latest version. Change anything a platform shows (image, copy, CTA, slot) → new hash → approval no longer valid → back to "รอ approve". Unchanged platforms keep their approval.
- Campaign status becomes `APPROVED` only when every platform is approved. Partially approved campaigns can still schedule the approved platforms.
- `Revise` is an instruction to edit, never an approval. Silence is never approval.

## Comment scopes

| Scope | Target | Example | Revision touches |
|---|---|---|---|
| `CAMPAIGN` | whole campaign | "ภาพรวมดูโฆษณาเกิน ขอเป็น editorial gallery" | all unlocked frames |
| `IMAGE_FRAME` | one frame (later: normalised [0,1] hotspot) | "ภาพ 2 แน่นไป ลดข้อความ 30% อย่าแก้ภาพ 3" | that frame + derived assets |
| `COPY_CHANNEL` | one platform's copy | "Threads ดูเป็นแบรนด์ไป ขอเหมือนคุยกัน" | that copy only |
| `SEO_SECTION` | one H2 section or meta | "H2 นี้เพิ่ม checklist" | that section |
| `FEED` | 3×3 grid | "อย่าให้โพสต์พื้นดำ 3 ชิ้นติดกัน" | tile order |

Comment statuses: `OPEN · IN_PROGRESS · RESOLVED_BY_AI · NEEDS_OWNER_DECISION · REOPENED`.

## Locks

Any component (frame, copy, SEO section, feed) can be locked from the dashboard. "อย่าแก้ภาพ 3" in a comment also locks frame 3. A revision **never** changes a locked component (its hash stays byte-for-byte the same) and lists it under "Kept (locked)". Derived components (e.g. the Pinterest pin built from frames 3–5) are re-rendered when their source changes, unless they are locked.

## Revision contract

1. Owner writes a comment, picks scope/target, presses **Revise**.
2. A revision request records scope, targets, comment and the current version.
3. The agent parses intent → affected components, honours locks.
4. Clear, low-risk edits run automatically. Ambiguous instructions, or comments that only point at locked parts, go back to the owner (`NEEDS_OWNER_DECISION`); no new version.
5. New immutable version vN+1 + change summary (Modified / Kept / Recheck / Needs approval).
6. QC re-runs. Hard QC failure → `NEEDS_VERIFY`; otherwise → `AWAITING_APPROVAL`.
7. Dashboard shows Before/After per changed component, kept-locked list, and per-platform hash before → after.
8. Jobs for changed platforms are revoked; the owner approves vN+1.
9. The publisher only dispatches approved hashes.

Demo (spec §19), verified by tests and the dashboard: comment "ภาพ 2 แน่นไป ลดข้อความ 30% อย่าแก้ภาพ 3" on v1 → v2 where frame 2 body text goes 134 → 91 characters (−32%), frame 3 is locked and unchanged, only Instagram needs re-approval; Facebook keeps its v1 approval because its hash did not change.

## Phase 1 mock parser

`planRevision()` understands: reduce text N%, "don't touch frame N", casual tone, add checklist, rebalance dark tiles, editorial gallery direction. Anything else → `NEEDS_OWNER_DECISION` with a hint. Phase 2 replaces the parser and edits with Claude returning a `revision_plan` JSON; the contract and tests stay.

## Notifications (D4, updated 2026-11-20)

**Every** Growth Engine notification goes to the existing LINE admin group **"Noti SAMECOR"**, and nowhere else (no email, no other channel).

| Kind (`ge_notifications.kind`) | When | Urgent | Example text (one line) |
|---|---|---|---|
| `approval_waiting` | campaign enters `AWAITING_APPROVAL` (each version) | | รอ approve: Portfolio First Impression v2 (IG) |
| `needs_decision` | owner decision item, comment the agent could not act on, `NEEDS_VERIFY` | | ต้องตัดสินใจ: Creator spotlight: ยังไม่มี consent |
| `revision_ready` | new version v2+ | | แก้เสร็จแล้ว: Portfolio First Impression v2 รอดูอีกรอบ |
| `job_scheduled` | job scheduled | | ลงคิวแล้ว: … · FB, Threads · เริ่ม Mon 23 Nov 12:00 |
| `job_exported` | manual export ready | | พร้อมโพสต์เอง: … · FB |
| `job_published` | live URL confirmed | | โพสต์แล้ว: … · FB |
| `publish_failed` | failed or unknown result | ✓ | โพสต์ไม่ผ่าน: … · IG · token หมดอายุ |
| `token_issue` | connection `ACTION_REQUIRED` | ✓ | บัญชี Meta ต้องเชื่อมใหม่ |
| `budget_threshold` | 70 / 90 / 100% of the owner's cap (once per cycle) | 100% | AI credit ใช้ไป 70% ของเพดาน |
| `blocked_budget` | credit exhausted (once per cycle) | ✓ | AI credit หมดรอบนี้ งาน AI หยุดรอรอบใหม่ (ไม่ซื้อเพิ่ม) |
| `pause_all` | Pause All on / off | ✓ | Pause All เปิดแล้ว: หยุดโพสต์ + หยุด AI |
| `weekly_insights` | weekly memo created | | สรุปสัปดาห์มาแล้ว · 3 เรื่องให้ตัดสินใจ |

### Delivery rules

- **Short Thai**, one line per item; every item is followed by its link into `/admin/growth` (campaign page, `?decision=`, `?panel=cost`, `?insights=`). Paths are enforced in SQL (`item_path LIKE '/admin/growth%'`).
- **Grouping:** events inside `notify_batch_seconds` (default 3 min) become **one** message: header `SAMECOR Growth · N เรื่อง`, urgent items first, at most 8 items + "+ อีก N เรื่อง" with a link to the overview.
- **Urgent** items flush the batch at once (header starts with `ด่วน ·`).
- **Dedupe:** a unique `dedupe_key` per event (e.g. one approval notice per version, budget level once per cycle).
- **Quota guard:** past `notify_max_batches_per_day` (default 24) messages in a Bangkok day, the window becomes 1 hour; urgent still goes at once.
- Messages hold titles and links only: no personal data, no tokens, no budget amounts.

### Design

```
event (trigger / engine) → ge_notify(kind, text, path, dedupe) → ge_notifications (pending)
cron 1/min → ge_flush_notifications() → ge_notification_batches (one per burst)
   notify_mode = 'mock' → status MOCK, shown in the dashboard, never sent      ← Phase 1
   notify_mode = 'line' → status READY → admin_line_outbox (kind 'growth')     ← Phase 1b, owner's OK
                          → line-admin-notify pushes to Noti SAMECOR → SENT / FAILED
```

TypeScript twin: `src/lib/growth/notify.ts` (`makeNotification`, `enqueueNotification`, `shouldFlush`, `flushNotifications`, `formatBatchTh`, `NotificationSender`). Phase 1 ships only `MockLineSender` (keeps messages in memory; `senderFor('line')` throws). The dashboard's **LINE · Noti SAMECOR** panel shows how many items wait, and the exact text of the last grouped message. Real sending reuses the existing `line-admin-notify` edge function and secrets (`LINE_SAMECOR_ADMIN_*`); nothing new is exposed to the browser.
