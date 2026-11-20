# 08 · Approval & Comment-to-Revision

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
