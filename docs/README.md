# AunAun Ecosystem — Documentation Index

Updated: 2026-07-03

Monorepo สำหรับ **Aplus1** (`Anthem-Code`), **So1o** (`Solo-Code`), **Ops Hub** (`Ops-Hub`) — แชร์ Supabase `zkflkpbmbozrchqncpzi`

## เริ่มต้นที่ไหน

| บทบาท | อ่านก่อน |
|--------|----------|
| Dev ใหม่ (ทั้ง ecosystem) | [WORKSPACE.md](./WORKSPACE.md) → [ai-skills/README.md](./ai-skills/README.md) |
| Dev Aplus1 | [Anthem-Code/docs/README.md](../Anthem-Code/docs/README.md) → [MASTER_CURSOR_BRIEF.md](../Anthem-Code/docs/MASTER_CURSOR_BRIEF.md) |
| Dev So1o | [Solo-Code/docs/README.md](../Solo-Code/docs/README.md) |
| Deploy | [.cursor/rules/deploy-workflow.mdc](../.cursor/rules/deploy-workflow.mdc) → [ecosystem-deploy-policy.md](./ecosystem-deploy-policy.md) |
| UX reviewer | [demo-pack.md](./demo-pack.md) |
| QA ก่อน release | [MANUAL-TESTING.md](./MANUAL-TESTING.md) + qa-checklist ต่อแอป (ด้านล่าง) |

## AI Skills (memory pack สำหรับ Cursor)

[ai-skills/README.md](./ai-skills/README.md) — อ่านก่อนแก้โค้ดที่กระทบ product, security, payment, deploy

| Shared | Anthem | Solo |
|--------|--------|------|
| PRODUCT_CONTEXT | ANTHEM_PRODUCT_SKILL | SOLO_PRODUCT_SKILL |
| CODING_RULES | ANTHEM_UX_RESEARCH_SKILL | SOLO_UX_WORKFLOW_SKILL |
| SECURITY_CHECKLIST | ANTHEM_REFERRAL_REWARD_SKILL | SOLO_PAYMENT_SECURITY_SKILL |
| UX_UI_RULES | ANTHEM_COMMUNITY_SAFETY_SKILL | SOLO_INHOUSE_SKILL |
| RELEASE_CHECKLIST | ANTHEM_MOBILE_APP_SKILL | SOLO_PRODUCTION_OPS_SKILL |
| SCALING_READINESS_SKILL | ANTHEM_MARKETING_SKILL | SOLO_SCALE_AND_RELIABILITY_SKILL |
| CURSOR_LOOP_PLAYBOOK | ANTHEM_COMMUNITY_SCALING_SKILL | |

## Ecosystem & Platform

| Doc | สรุป |
|-----|------|
| [ecosystem-deploy-policy.md](./ecosystem-deploy-policy.md) | Demo vs production, migration gate |
| [ecosystem-hosting.md](./ecosystem-hosting.md) | Vercel topology, fault isolation |
| [ecosystem-notifications.md](./ecosystem-notifications.md) | Email + LINE + in-app |
| [ecosystem-unified-account.md](./ecosystem-unified-account.md) | บัญชีรวม cross-app |
| [ECOSYSTEM_ROADMAP.md](./ECOSYSTEM_ROADMAP.md) | Flywheel Anthem ↔ So1o (Phase 4+) |
| [vercel-projects.md](./vercel-projects.md) | Vercel project names + URLs |
| [deploy-vps.md](./deploy-vps.md) | Self-host Docker (ทางเลือก) |
| [backup-restore.md](./backup-restore.md) | DB backup & restore |
| [firewall.md](./firewall.md) | Edge security |
| [setup-line.md](./setup-line.md) | LINE LIFF integration |
| [microcopy-style-guide.md](./microcopy-style-guide.md) | Copy ภาษาไทย ecosystem |

## QA & Testing

| Doc | ขอบเขต |
|-----|--------|
| [MANUAL-TESTING.md](./MANUAL-TESTING.md) | QA มือ ecosystem (ทั้งสองแอป) |
| [Anthem-Code/docs/qa-checklist.md](../Anthem-Code/docs/qa-checklist.md) | Checklist ก่อน release Aplus1 |
| [Solo-Code/docs/qa-checklist.md](../Solo-Code/docs/qa-checklist.md) | Checklist ก่อน release So1o |
| [Anthem-Code/docs/full-test-plan.md](../Anthem-Code/docs/full-test-plan.md) | แผนเทส Aplus1 |
| [Solo-Code/docs/full-test-plan.md](../Solo-Code/docs/full-test-plan.md) | แผนเทส So1o |
| [Anthem-Code/docs/ux-research-review.md](../Anthem-Code/docs/ux-research-review.md) | UX checklist A–T (Aplus1) |
| [Solo-Code/docs/ux-research-review.md](../Solo-Code/docs/ux-research-review.md) | UX checklist A–T (So1o) |
| [demo-pack.md](./demo-pack.md) | ส่งให้ UX reviewer + local demo setup |
| [e2e-guide.md](./e2e-guide.md) | Playwright + Puppeteer (Aplus1 + So1o) |
| [scale-readiness-checklist.md](./scale-readiness-checklist.md) | CCU / SLO / capacity |
| [performance-report.md](./performance-report.md) | ผลทดสอบ bundle & HTTP (มิ.ย. 2026) |

## Release gates

| App | Doc |
|-----|-----|
| Aplus1 | [Anthem-Code/docs/release-gate-aplus1.md](../Anthem-Code/docs/release-gate-aplus1.md) |
| So1o | [Solo-Code/docs/production-security-checklist.md](../Solo-Code/docs/production-security-checklist.md) |

## Archive (เอกสาร one-time / snapshot)

[archive/](./archive/) — migration notes, snapshots, handoffs ที่จบแล้ว
