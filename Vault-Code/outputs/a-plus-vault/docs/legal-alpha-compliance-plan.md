# A+ Vault Legal, Privacy, Copyright, and Compliance Plan

This is a product compliance plan for the alpha demo. It is not legal advice and must be reviewed by qualified counsel before public launch, paid plans, public collections, team workspaces, or mobile apps.

## Product Trust Rules

1. Private by default.
2. Users retain ownership of user content.
3. A+ Vault receives only the limited license needed to operate the service.
4. Saving a reference does not grant usage rights.
5. Preserve source, attribution, and capture context whenever possible.
6. Collect only what is needed for explicit user action.
7. Do not collect browsing history in the background.
8. Do not expose service-role keys or AI secrets in the extension.
9. Public sharing must be explicit and reversible.
10. AI processing must be disclosed and controllable.

## Current Alpha Coverage

| Area | Current state | Next action |
|---|---|---|
| Public legal notice | `legal.html` contains alpha Privacy, Terms, Copyright, AUP, AI, Security, Data Rights, and Subprocessor sections. | Counsel review before public beta. |
| Private by default | Main app has no public discovery and index page has `noindex,nofollow`. | Add explicit share scopes before public collection features. |
| Source and credit | Detail panel stores and displays source URL, captured date, and private reference note. | Add creator/author capture when available. |
| Extension privacy | Extension is user-action based with `activeTab`, `contextMenus`, `storage`, `scripting`, and targeted host permissions. | Publish a Chrome Web Store privacy disclosure before listing. |
| Copyright process | Legal center includes report and takedown workflow draft. | Add report forms, case log, repeat-infringer policy, and counter-notice tracking. |
| Data rights | Profile links to export/deletion guidance; object delete exists. | Add one-click export JSON and account deletion flow. |
| AI disclosure | Legal center includes AI alpha notice; AI Lite is local/demo style. | Add AI settings before third-party AI processing. |
| Security | Supabase RLS schema and hardening scripts exist; no service role key in extension. | Add private storage buckets, signed URLs, malware scanning, and admin access logs. |

## P0 - Before Alpha Tester Expansion

- Keep public discovery disabled.
- Keep `noindex,nofollow` for app demo pages.
- Add visible Privacy, Terms, Copyright, AI, Security, and Data Rights links.
- Make extension save only from explicit user action.
- Store source URL and capture method where available.
- Preserve "Private reference only" on objects.
- Add local export JSON and "clear local vault data" actions.
- Confirm no service-role key exists in client or extension code.

## P1 - Before Public Beta

- Add full privacy notice with controller contact, data categories, purposes, legal basis, recipients, retention, rights, cookies, AI, and cross-border transfer.
- Add copyright report form, counter-notice workflow, moderation log, and repeat-infringer policy.
- Add ROPA, data map, vendor inventory, retention schedule, and incident response plan.
- Add cookie/analytics consent if non-essential analytics or marketing pixels are added.
- Add production capture API with authenticated server-side validation.

## P2 - Before Subscription

- Lawyer-reviewed Terms of Service.
- Clear billing, auto-renewal, cancellation, downgrade, refund, storage overage, and tax disclosures.
- Payment processor review and DPA/vendor review.
- Trademark review for A+ Vault and A Vaultory.

## P3 - Before Public Collections or Team Workspaces

- Public share scope controls: private, anyone with link, public.
- Search engine indexing off by default.
- Report content, privacy report, copyright report, appeal flow.
- Team DPA, role permissions, audit logs, admin access reason logging.
- Separate public assets from private vault assets.

## P4 - Before Mobile Apps

- Apple Privacy Labels and Google Data Safety review.
- In-app account deletion.
- Photo/share permission explanations.
- Third-party SDK audit.
- Mobile-specific privacy and security testing.

## Implementation Rule for Future Features

Before implementing any feature, record:

- Personal data processed
- Why it is necessary
- Legal basis to assess
- Recipients/subprocessors
- Retention
- User control
- Security controls
- Deletion/failure behavior
- Public/private impact
- Copyright risk
- AI involvement
- Cross-border transfer
- Required policy update
