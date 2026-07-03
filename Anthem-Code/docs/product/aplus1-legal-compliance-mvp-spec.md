# Aplus1 Legal & Compliance MVP Spec For Cursor

Updated: 2026-07-03  
Audience: Founder, Cursor, product, engineering, admin/compliance  
Source: Gemini legal research report supplied by founder + Aplus1 product direction docs  
Status: Legal research and product risk mapping only

## Important Disclaimer

This document is not final legal advice. It is an implementation-ready compliance product spec based on legal research and risk mapping. All legal documents, legal positioning, regulatory filings, privacy notices, consent language, and enforcement workflows must be reviewed by:

- a qualified Thai lawyer
- a PDPA consultant
- relevant counsel for any future target jurisdictions outside Thailand

Cursor should implement the technical compliance controls, logs, UI acknowledgements, reporting tools, and admin workflows. Cursor should not draft final enforceable legal documents without lawyer review.

## Product Legal Positioning

Aplus1 should launch as:

> Creative Discovery and Portfolio Platform

Avoid describing Aplus1 as:

- job board
- recruitment agency
- freelance marketplace
- guaranteed hiring platform
- matching service
- placement service
- employer
- broker
- payment escrow provider

Preferred language:

- ผลงานจริงพาไปเจอโอกาสใหม่
- Creative discovery
- Portfolio-to-opportunity
- Contact from project
- Open to opportunities

Avoid language:

- guaranteed job
- guaranteed hiring
- candidate placement
- apply through Aplus1 as recruiter
- Aplus1 matches you with employers
- Aplus1 guarantees payment or work quality

## 1. Founder Legal Summary

### Top Legal Risks

1. Recruitment / employment agency risk  
   Aplus1 may trigger regulated recruitment/placement rules if it acts like an agency, actively matches candidates to employers, charges placement commissions, represents hirers or creators, ranks candidates for hiring, or guarantees hiring outcomes.

2. Copyright and user-generated content risk  
   Creators may upload work they do not own, agency/client work without permission, copyrighted assets, AI-generated work with unclear rights, or stolen portfolio images. Aplus1 needs clear upload warranties, report tools, takedown workflow, repeat infringer handling, and admin hide tools.

3. PDPA and privacy risk  
   Aplus1 collects personal data, portfolio data, contact data, cookies, analytics, messages, report data, and potentially sensitive student/minor data. The MVP needs privacy notice acknowledgement, cookie consent, consent logs, deletion/export request workflows, and third-party processor inventory.

4. Minor/student creator risk  
   If students or younger creators join, age and parental consent handling becomes important. The Gemini report flags Thai PDPA issues for users under 10 and minors from 10 to under 20, subject to Thai Civil and Commercial Code exceptions. Use conservative age/guardian acknowledgement until reviewed.

5. Digital platform / consumer protection risk  
   If Aplus1 qualifies as a regulated Digital Platform Service in Thailand, ETDA notification obligations may apply. If Aplus1 later handles marketplace transactions, subscriptions tied to services, commissions, or direct marketing, OCPB/direct marketing and tax/invoicing risks increase.

6. Content moderation and illegal content risk  
   Aplus1 hosts public content and messages. It needs the ability to receive reports, hide content quickly, suspend accounts, record admin actions, and respond to official notices.

7. Payment and escrow risk  
   Payment handling, escrow, commissions, dispute resolution, refunds, tax invoices, and project guarantees introduce high complexity. Delay until legal review.

### What Aplus1 Should Avoid

Avoid in MVP:

- processing project payments
- taking a percentage of creator-client deals
- escrow or wallet flows for client work
- calling itself a marketplace for freelance services
- promising job placement, hiring, work quality, payment, or client outcomes
- active recruiter-style matching
- formal candidate scoring or ranking for hirers
- acting as a party to creator-hirer contracts
- collecting unnecessary sensitive data
- allowing uploads without ownership/permission confirmation
- running ads/analytics cookies before consent

### What Aplus1 Can Safely Launch With

Conservative MVP:

- public creator profiles
- portfolio/project uploads
- project context fields
- "open to opportunities" status
- project-specific contact/inquiry form
- save/collection
- chat/inbox if access-controlled
- content report button
- copyright report form
- admin hide/suspend tools
- Terms + Privacy + age acknowledgement at signup
- cookie banner with categories
- account deletion request
- data export request
- consent logs and policy versions

## 2. Legal MVP Scope

### Safe For MVP

These features are comparatively safe if implemented with clear disclaimers, consent logs, and moderation.

| Feature | Safeguards |
|---|---|
| Creator profile | Terms acceptance, privacy notice, public profile visibility controls |
| Portfolio/project upload | Ownership confirmation, client permission reminder, report button |
| Project context fields | Avoid collecting unnecessary sensitive data |
| Opportunity status | Use broad "open to opportunities"; avoid job placement promise |
| Contact from project | Disclaimer that Aplus1 is not party to the relationship |
| Save/collections | Private by default unless explicitly public |
| Basic chat/inquiry | Access control, abuse report, message retention policy |
| Cookie banner | Strictly necessary vs analytics/marketing opt-in |
| Report project/profile | Admin workflow and audit log |
| Copyright report | Takedown workflow and repeat-infringer tracking |
| Admin hide/ban | Reason codes, audit trail, reversible where appropriate |
| Account deletion request | Queued workflow and retention exceptions |
| Data export request | Queued workflow and identity verification |

### Risky But Possible With Safeguards

| Feature | Risk | Minimum Safeguards |
|---|---|---|
| Public opportunity posts | Can look like job board | Use "opportunity post", no placement guarantee, user-to-user contact |
| Hirer invitations | Can look like recruitment matching | Make it user-initiated, project-specific, no Aplus1 recommendation language |
| Creator recommendations | Can look like candidate ranking | Use "discover similar work", not "best candidate" |
| AI project helper | IP/authenticity concerns | AI disclosure option, user warrants rights, no auto-claim authorship |
| Public comments | Defamation/abuse risk | Report, hide, community guidelines, audit log |
| External sharing previews | Privacy/IP risk | Respect project visibility, no private data in OG metadata |
| Analytics | PDPA/cookie risk | Consent gating and data minimization |
| Email notifications | marketing consent risk | transactional vs marketing separation, unsubscribe |

### Delay Until Legal Review

| Feature | Reason |
|---|---|
| Payment escrow | Financial, tax, dispute, regulatory risk |
| Commission on project value | Marketplace/employment/consumer/tax risk |
| Guaranteed matching | Recruitment/placement risk |
| Candidate ranking for employers | Recruitment and fairness risk |
| Aplus1-managed contracts | Platform may become party/intermediary |
| Formal job placement service | Employment agency licensing risk |
| Automated background checks | Privacy/sensitive data risk |
| Identity/KYC beyond basic needs | Privacy/security/retention risk |
| Paid ads targeting minors | privacy and consumer protection risk |
| Cross-border enterprise hiring workflow | multi-jurisdiction employment/privacy risk |

## 3. Product Requirements

### 3.1 Terms Acceptance

- Priority: P0
- User story: As a user, I must accept the current Terms before creating an account or using logged-in features so Aplus1 has a clear record of agreement.
- UI placement:
  - signup page
  - first login after policy update
  - settings > legal
- Acceptance criteria:
  - Signup cannot complete without Terms acceptance.
  - Acceptance records policy version, timestamp, user id, IP hash, user agent, locale.
  - If Terms version changes materially, user must re-acknowledge before posting/contacting.
  - User can view current and past accepted policy versions from settings.
- Database fields:
  - `user_consents.user_id`
  - `user_consents.policy_version_id`
  - `user_consents.consent_type = 'terms'`
  - `user_consents.accepted_at`
  - `user_consents.ip_hash`
  - `user_consents.user_agent`
  - `user_consents.locale`
- Admin visibility:
  - compliance dashboard can search user consent history.
  - admin cannot edit consent records; only append corrective notes through audit log.

### 3.2 Privacy Acknowledgement

- Priority: P0
- User story: As a user, I must acknowledge the Privacy Notice so I understand how Aplus1 collects and uses my data.
- UI placement:
  - signup page
  - first login after privacy update
  - settings > privacy
- Acceptance criteria:
  - Signup cannot complete without privacy acknowledgement.
  - Acknowledgement is separate from marketing consent.
  - Privacy Notice link opens in new tab or modal.
  - Policy version is logged.
- Database fields:
  - `user_consents.consent_type = 'privacy_notice'`
  - `policy_versions.policy_type = 'privacy'`
- Admin visibility:
  - searchable by user, policy version, date range.

### 3.3 Age / Parental Consent Checkbox

- Priority: P0
- User story: As a student or young creator, I can confirm I meet age requirements or have guardian consent where required.
- UI placement:
  - signup
  - profile onboarding if birth year/student status is requested later
- Acceptance criteria:
  - User must check age/consent confirmation before signup.
  - MVP should avoid collecting exact birth date unless legally necessary.
  - If user self-identifies as under required threshold, show guardian consent guidance and block public publishing until reviewed by legal/product.
  - Copy must be reviewed by Thai counsel.
- Database fields:
  - `profiles.age_consent_status`
  - `profiles.age_band` nullable, optional values: `under_10`, `10_to_under_20`, `20_plus`, `prefer_not_to_say`
  - `user_consents.consent_type = 'age_parental_ack'`
  - `user_consents.metadata.guardian_confirmed`
- Admin visibility:
  - compliance dashboard shows age consent status only.
  - avoid exposing exact age unless needed.

### 3.4 Cookie Consent

- Priority: P0
- User story: As a visitor, I can choose which non-essential cookies/trackers Aplus1 may use.
- UI placement:
  - bottom banner on first visit
  - cookie settings page
  - footer link
- Acceptance criteria:
  - Strictly necessary cookies are always on.
  - Analytics and marketing are opt-in.
  - Reject all must be as easy as accept all.
  - User can change preference later.
  - Do not load analytics/marketing scripts before consent.
- Database fields:
  - `cookie_consents.anonymous_id`
  - `cookie_consents.user_id`
  - `cookie_consents.necessary = true`
  - `cookie_consents.analytics`
  - `cookie_consents.marketing`
  - `cookie_consents.preferences`
  - `cookie_consents.policy_version_id`
  - `cookie_consents.created_at`
- Admin visibility:
  - aggregate counts only by default.
  - individual logs visible only to compliance admins.

### 3.5 Project Ownership Confirmation

- Priority: P0
- User story: As a creator, I confirm I own or have permission to publish the project and assets I upload.
- UI placement:
  - project editor publish step
  - upload dialog for each asset batch
- Acceptance criteria:
  - Publish is blocked until ownership confirmation is checked.
  - Confirmation copy includes client/agency permission reminder.
  - Confirmation version and timestamp are stored per project.
  - Editing an old project after policy update may require re-confirmation.
- Database fields:
  - `projects.ownership_confirmed_at`
  - `projects.ownership_confirmation_version`
  - `projects.client_permission_confirmed`
  - `projects.ai_generated_disclosed`
  - `projects.rights_note`
- Admin visibility:
  - moderation view shows confirmation status and timestamps.

### 3.6 Report Project / Profile

- Priority: P0
- User story: As any user or visitor, I can report content that is unsafe, misleading, spammy, abusive, infringing, or otherwise problematic.
- UI placement:
  - project detail overflow/menu
  - profile overflow/menu
  - comment/message menu where relevant
- Acceptance criteria:
  - Report form supports project, profile, comment, message, job/opportunity post.
  - User can submit with category, description, optional evidence URL/file.
  - Anonymous reports allowed for copyright? General abuse may require logged-in user for spam control.
  - Reporter receives confirmation.
  - Admin queue receives report immediately.
- Database fields:
  - `content_reports.reporter_id`
  - `content_reports.subject_type`
  - `content_reports.subject_id`
  - `content_reports.reason`
  - `content_reports.description`
  - `content_reports.status`
  - `content_reports.priority`
  - `content_reports.created_at`
- Admin visibility:
  - report queue with filters and action buttons.

### 3.7 Copyright Report

- Priority: P0
- User story: As a rights holder, I can submit a copyright/takedown report with enough detail for Aplus1 to review and disable access when appropriate.
- UI placement:
  - footer legal link
  - project report modal
  - `/legal/copyright-report`
- Acceptance criteria:
  - Form captures claimant contact, copyrighted work, allegedly infringing URL/project, good-faith statement, authority statement, signature/name.
  - Admin can hide content from the report view.
  - System records timing from report receipt to action.
  - Creator receives notice when content is hidden unless legal/safety reasons require otherwise.
  - Repeat infringement count can be tracked.
- Database fields:
  - `copyright_reports.claimant_name`
  - `copyright_reports.claimant_email`
  - `copyright_reports.claimant_role`
  - `copyright_reports.original_work_description`
  - `copyright_reports.original_work_url`
  - `copyright_reports.infringing_subject_type`
  - `copyright_reports.infringing_subject_id`
  - `copyright_reports.infringing_url`
  - `copyright_reports.good_faith_confirmed`
  - `copyright_reports.authority_confirmed`
  - `copyright_reports.signature_text`
  - `copyright_reports.status`
  - `copyright_reports.action_taken_at`
- Admin visibility:
  - copyright queue, SLA timer, hide/restore buttons, notes.

### 3.8 Admin Hide / Ban

- Priority: P0
- User story: As a compliance admin, I can quickly hide risky content or suspend users while preserving an audit trail.
- UI placement:
  - admin > moderation
  - admin > user profile
  - admin > project detail
- Acceptance criteria:
  - Admin can hide/unhide project.
  - Admin can suspend/unsuspend user.
  - Admin must choose reason code and optional note.
  - Every action writes `moderation_actions` and `admin_audit_logs`.
  - Public users see friendly unavailable state, not raw error.
- Database fields:
  - `projects.moderation_status`
  - `profiles.account_status`
  - `moderation_actions.*`
  - `admin_audit_logs.*`
- Admin visibility:
  - visible only to authorized admins.
  - separate compliance/admin roles if possible.

### 3.9 Account Deletion

- Priority: P1 for MVP launch; P0 if public launch includes broad users
- User story: As a user, I can request account deletion and understand what data may be retained for legal/security reasons.
- UI placement:
  - settings > account > danger zone
- Acceptance criteria:
  - User sees clear warning.
  - User must confirm by typing a phrase or checking confirmation.
  - Request enters queue, not instant destructive delete.
  - Admin/compliance can approve, reject with reason, or mark completed.
  - Public profile/projects become hidden after request is accepted.
- Database fields:
  - `deletion_requests.user_id`
  - `deletion_requests.status`
  - `deletion_requests.requested_at`
  - `deletion_requests.scheduled_delete_at`
  - `deletion_requests.completed_at`
  - `deletion_requests.retention_reason`
- Admin visibility:
  - privacy request dashboard.

### 3.10 Data Export

- Priority: P1
- User story: As a user, I can request a copy of my personal data.
- UI placement:
  - settings > privacy
- Acceptance criteria:
  - User can request export.
  - System records request.
  - Export includes profile, projects metadata, consents, reports by user where legally appropriate, inquiries/messages where appropriate.
  - Export link expires.
  - Admin can mark fulfilled.
- Database fields:
  - `data_exports.user_id`
  - `data_exports.status`
  - `data_exports.requested_at`
  - `data_exports.export_path`
  - `data_exports.expires_at`
- Admin visibility:
  - privacy request dashboard.

### 3.11 Consent Logs

- Priority: P0
- User story: As the platform operator, Aplus1 can prove which legal notices a user accepted and when.
- UI placement:
  - invisible infrastructure
  - user settings > legal history
  - admin compliance dashboard
- Acceptance criteria:
  - Consent logs are append-only.
  - Logs include policy version.
  - Users can view their own consent history.
  - Admins cannot edit existing logs.
- Database fields:
  - `user_consents.*`
- Admin visibility:
  - compliance admins only.

### 3.12 Policy Versioning

- Priority: P0
- User story: As the platform, Aplus1 can publish new policy versions and know which users accepted each version.
- UI placement:
  - admin > compliance > policy versions
  - public legal pages
- Acceptance criteria:
  - Policy records include type, version, effective date, URL/content hash.
  - Only one active policy per type.
  - Material update can trigger re-acknowledgement.
  - Current policy links are used in signup and footer.
- Database fields:
  - `policy_versions.policy_type`
  - `policy_versions.version`
  - `policy_versions.title`
  - `policy_versions.url`
  - `policy_versions.content_hash`
  - `policy_versions.effective_at`
  - `policy_versions.requires_reconsent`
- Admin visibility:
  - compliance admins can create draft/publish policy metadata.

## 4. Admin Requirements

### 4.1 Compliance Dashboard

- Purpose: One landing page for legal/compliance health.
- Table fields:
  - aggregate counts from reports, consents, policy versions, deletion/export queues.
- Filters:
  - date range, status, priority, assigned admin.
- Admin actions:
  - open report queue, open privacy requests, open policy versions.
- MVP version:
  - counts, urgent queues, SLA timers.
- Future version:
  - risk scoring, automatic escalations, DPA inventory.

### 4.2 User Consent Logs

- Purpose: Prove Terms/Privacy/Age/Cookie acknowledgement history.
- Table fields:
  - `user_consents`, `cookie_consents`, `policy_versions`.
- Filters:
  - user, consent type, policy version, date range.
- Admin actions:
  - view only, export for legal review, add audit note.
- MVP version:
  - searchable read-only table.
- Future version:
  - re-consent campaigns and legal hold.

### 4.3 Project Moderation

- Purpose: Review and act on risky projects.
- Table fields:
  - `projects`, `project_assets`, `content_reports`, `copyright_reports`, `moderation_actions`.
- Filters:
  - status, report count, category, creator, date, visibility.
- Admin actions:
  - hide, restore, mark reviewed, suspend creator, add note.
- MVP version:
  - hide/restore with reason and audit log.
- Future version:
  - moderation assignment, batch review, appeal flow.

### 4.4 Copyright Reports

- Purpose: Handle takedown reports and preserve safe-harbor evidence.
- Table fields:
  - `copyright_reports`, `moderation_actions`, `projects`, `project_assets`.
- Filters:
  - new, in review, hidden, rejected, resolved, repeat creator.
- Admin actions:
  - hide content, notify creator, request more information, mark resolved, repeat-infringer flag.
- MVP version:
  - report queue with SLA timer and hide action.
- Future version:
  - counter-notice workflow, external legal export package.

### 4.5 Content Reports

- Purpose: Handle abuse, spam, impersonation, harmful content, misleading content.
- Table fields:
  - `content_reports`, `moderation_actions`.
- Filters:
  - reason, subject type, status, priority.
- Admin actions:
  - dismiss, hide subject, suspend user, escalate.
- MVP version:
  - queue + hide/suspend.
- Future version:
  - reporter trust scoring, duplicate clustering.

### 4.6 User Suspension

- Purpose: Suspend abusive or legally risky accounts.
- Table fields:
  - `profiles.account_status`, `moderation_actions`.
- Filters:
  - active, suspended, banned, deletion requested, report count.
- Admin actions:
  - suspend, unsuspend, ban, add note, hide all public content.
- MVP version:
  - manual suspension and public content hiding.
- Future version:
  - timed suspensions, appeal system.

### 4.7 Privacy Requests

- Purpose: Manage access, correction, deletion, export requests.
- Table fields:
  - `privacy_requests`, `deletion_requests`, `data_exports`.
- Filters:
  - request type, status, due date, user.
- Admin actions:
  - approve, reject with reason, mark completed, assign.
- MVP version:
  - queued requests and manual fulfillment.
- Future version:
  - automated export package and SLA alerts.

### 4.8 Data Deletion / Export Requests

- Purpose: Track erasure and portability operations separately from general privacy requests.
- Table fields:
  - `deletion_requests`, `data_exports`.
- Filters:
  - status, requested date, scheduled date, completed date.
- Admin actions:
  - verify identity, approve, schedule, complete, hold.
- MVP version:
  - soft-delete/hide + manual finalization.
- Future version:
  - automated deletion workflow with retention exceptions.

### 4.9 Policy Version History

- Purpose: Track what Terms/Privacy/Cookie/Community policy was active when a user consented.
- Table fields:
  - `policy_versions`.
- Filters:
  - policy type, active/draft/archived, effective date.
- Admin actions:
  - create metadata, publish version, require reconsent.
- MVP version:
  - metadata only, legal content lives as markdown/public page.
- Future version:
  - WYSIWYG policy editor, approval workflow.

### 4.10 Admin Audit Log

- Purpose: Record all sensitive admin activity.
- Table fields:
  - `admin_audit_logs`.
- Filters:
  - admin, action, target type, date range.
- Admin actions:
  - view/export only.
- MVP version:
  - append-only log for moderation, privacy, policy changes.
- Future version:
  - anomaly alerts and admin role reviews.

## 5. Supabase Schema

Important implementation note:

- Supabase already has `auth.users`.
- Do not store passwords in public tables.
- Use public `profiles` for user-facing profile metadata.
- Use RLS for every table containing user data.
- Service-role operations must only run server-side/admin-side.

### 5.1 `profiles`

Purpose: public and private profile metadata linked to `auth.users`.

Key fields:

- `id uuid primary key references auth.users(id)`
- `display_name text`
- `username text unique`
- `bio text`
- `avatar_url text`
- `profile_type text`
- `account_status text default 'active'`
- `opportunity_status text`
- `opportunity_types text[] default '{}'`
- `age_consent_status text`
- `age_band text`
- `deleted_at timestamptz`
- `created_at timestamptz default now()`
- `updated_at timestamptz`

Relationships:

- one user has one profile.
- profile owns projects, reports, inquiries.

RLS:

- public can read active public profile fields.
- owner can read/update own full profile.
- admin can read/update moderation fields.

Retention notes:

- on deletion request, public fields should be anonymized or hidden after legal retention review.

### 5.2 `projects`

Purpose: creator portfolio projects.

Key fields:

- `id uuid primary key`
- `owner_id uuid references auth.users(id)`
- `title text`
- `description text`
- `category text`
- `visibility text default 'public'`
- `moderation_status text default 'visible'`
- `brief text`
- `creator_role text`
- `process_note text`
- `deliverables text`
- `tools text[] default '{}'`
- `duration_label text`
- `outcome_note text`
- `opportunity_types text[] default '{}'`
- `ownership_confirmed_at timestamptz`
- `ownership_confirmation_version text`
- `client_permission_confirmed boolean default false`
- `ai_generated_disclosed boolean default false`
- `rights_note text`
- `created_at timestamptz default now()`
- `updated_at timestamptz`
- `deleted_at timestamptz`

RLS:

- public can read public + visible projects.
- owner can read/update own non-deleted projects.
- admin can hide/restore.

Retention:

- soft-delete first; hard delete assets after retention window.

### 5.3 `project_assets`

Purpose: images/files associated with projects.

Key fields:

- `id uuid primary key`
- `project_id uuid references projects(id) on delete cascade`
- `owner_id uuid references auth.users(id)`
- `storage_bucket text`
- `storage_path text`
- `asset_type text`
- `mime_type text`
- `file_size bigint`
- `alt_text text`
- `sort_order int`
- `rights_confirmed boolean default false`
- `created_at timestamptz default now()`

RLS:

- public can read metadata for visible public projects.
- storage access follows project visibility.
- owner/admin can manage.

Retention:

- delete or archive when project is deleted, subject to legal hold.

### 5.4 `user_consents`

Purpose: append-only consent/acknowledgement log.

Key fields:

- `id uuid primary key`
- `user_id uuid references auth.users(id)`
- `policy_version_id uuid references policy_versions(id)`
- `consent_type text`
- `accepted boolean default true`
- `accepted_at timestamptz default now()`
- `ip_hash text`
- `user_agent text`
- `locale text`
- `metadata jsonb default '{}'`

RLS:

- user can read own consent logs.
- inserts allowed for authenticated user through controlled function/API.
- no updates/deletes by user.
- admin read-only.

Retention:

- retain as legal evidence even after account deletion where legally permitted; detach/anonymize user if required.

### 5.5 `policy_versions`

Purpose: versioned legal policy metadata.

Key fields:

- `id uuid primary key`
- `policy_type text`
- `version text`
- `title text`
- `url text`
- `content_hash text`
- `status text default 'draft'`
- `effective_at timestamptz`
- `requires_reconsent boolean default false`
- `created_by uuid references auth.users(id)`
- `created_at timestamptz default now()`

RLS:

- public can read active policy metadata.
- admins can manage.

Retention:

- never hard delete published versions.

### 5.6 `cookie_consents`

Purpose: visitor/user cookie preference history.

Key fields:

- `id uuid primary key`
- `anonymous_id text`
- `user_id uuid references auth.users(id)`
- `policy_version_id uuid references policy_versions(id)`
- `necessary boolean default true`
- `analytics boolean default false`
- `marketing boolean default false`
- `preferences boolean default false`
- `created_at timestamptz default now()`
- `ip_hash text`
- `user_agent text`

RLS:

- authenticated user can read own records.
- anonymous insert through controlled endpoint/RPC.
- admins aggregate/read as needed.

Retention:

- keep latest active preference plus historical logs for proof, reviewed by PDPA consultant.

### 5.7 `content_reports`

Purpose: general content safety/moderation reports.

Key fields:

- `id uuid primary key`
- `reporter_id uuid references auth.users(id)`
- `subject_type text`
- `subject_id uuid`
- `reason text`
- `description text`
- `evidence_url text`
- `status text default 'new'`
- `priority text default 'normal'`
- `assigned_admin_id uuid`
- `created_at timestamptz default now()`
- `resolved_at timestamptz`

RLS:

- reporters can create and read own report status.
- admins can read/update all.
- subject owners should not see reporter identity by default.

Retention:

- keep for abuse history/legal defense.

### 5.8 `copyright_reports`

Purpose: copyright/takedown notices.

Key fields:

- `id uuid primary key`
- `claimant_name text`
- `claimant_email text`
- `claimant_role text`
- `claimant_address text`
- `original_work_description text`
- `original_work_url text`
- `infringing_subject_type text`
- `infringing_subject_id uuid`
- `infringing_url text`
- `good_faith_confirmed boolean`
- `authority_confirmed boolean`
- `accuracy_confirmed boolean`
- `signature_text text`
- `status text default 'new'`
- `action_taken text`
- `action_taken_at timestamptz`
- `created_at timestamptz default now()`

RLS:

- public/anonymous insert through rate-limited endpoint.
- claimant status lookup through secure token optional.
- admins read/update.

Retention:

- retain takedown history and evidence.

### 5.9 `moderation_actions`

Purpose: record actual moderation actions.

Key fields:

- `id uuid primary key`
- `admin_id uuid references auth.users(id)`
- `target_type text`
- `target_id uuid`
- `action text`
- `reason_code text`
- `note text`
- `source_report_type text`
- `source_report_id uuid`
- `created_at timestamptz default now()`

RLS:

- admin only.
- append-only; no delete.

Retention:

- retain for legal defense and accountability.

### 5.10 `privacy_requests`

Purpose: general PDPA/privacy request intake.

Key fields:

- `id uuid primary key`
- `user_id uuid references auth.users(id)`
- `request_type text`
- `description text`
- `status text default 'new'`
- `identity_verified_at timestamptz`
- `assigned_admin_id uuid`
- `created_at timestamptz default now()`
- `completed_at timestamptz`
- `admin_note text`

RLS:

- user can create/read own.
- admins can update.

Retention:

- retain request history.

### 5.11 `deletion_requests`

Purpose: account deletion/erasure workflow.

Key fields:

- `id uuid primary key`
- `user_id uuid references auth.users(id)`
- `status text default 'new'`
- `requested_at timestamptz default now()`
- `scheduled_delete_at timestamptz`
- `completed_at timestamptz`
- `retention_reason text`
- `admin_note text`

RLS:

- user can create/read own.
- admins update.

Retention:

- request record may need retention after deletion.

### 5.12 `data_exports`

Purpose: data portability/export workflow.

Key fields:

- `id uuid primary key`
- `user_id uuid references auth.users(id)`
- `status text default 'new'`
- `requested_at timestamptz default now()`
- `generated_at timestamptz`
- `export_bucket text`
- `export_path text`
- `expires_at timestamptz`
- `admin_note text`

RLS:

- user can create/read own.
- signed URL generation must be server-side.
- admins update.

Retention:

- export file expires and is deleted after short window.

### 5.13 `inquiries`

Purpose: project-specific contact/opportunity inquiries.

Key fields:

- `id uuid primary key`
- `project_id uuid references projects(id)`
- `sender_id uuid references auth.users(id)`
- `recipient_id uuid references auth.users(id)`
- `opportunity_type text`
- `message text`
- `budget_min numeric`
- `budget_max numeric`
- `timeline text`
- `platform_disclaimer_ack boolean default false`
- `created_at timestamptz default now()`
- `conversation_id uuid`

RLS:

- sender and recipient can read.
- sender can create.
- no public read.
- admins can read only for support/legal with audit.

Retention:

- retain according to privacy policy; delete/anonymize after deletion request subject to legal hold.

### 5.14 `admin_audit_logs`

Purpose: append-only record of sensitive admin operations.

Key fields:

- `id uuid primary key`
- `admin_id uuid references auth.users(id)`
- `action text`
- `target_type text`
- `target_id uuid`
- `before jsonb`
- `after jsonb`
- `reason text`
- `ip_hash text`
- `user_agent text`
- `created_at timestamptz default now()`

RLS:

- admin read.
- insert via server/admin function only.
- no update/delete.

Retention:

- long-term retention for accountability.

## 6. Legal UX Copy Drafts

These drafts are product copy only and must be reviewed by Thai counsel/PDPA consultant.

### Terms Checkbox

Thai:

> ฉันอ่านและยอมรับข้อกำหนดการใช้งานของ Aplus1 แล้ว โดยเข้าใจว่า Aplus1 เป็นแพลตฟอร์มสำหรับค้นพบผลงานและเริ่มบทสนทนาเรื่องโอกาส ไม่ใช่นายจ้าง ตัวแทนจัดหางาน หรือผู้รับประกันการจ้างงาน

English:

> I have read and agree to Aplus1's Terms of Service. I understand that Aplus1 is a creative discovery and portfolio platform, not an employer, recruitment agency, or guarantee of hiring.

### Privacy Checkbox

Thai:

> ฉันรับทราบประกาศความเป็นส่วนตัวของ Aplus1 และเข้าใจว่า Aplus1 จะใช้ข้อมูลของฉันเพื่อให้บริการบัญชี โปรไฟล์ ผลงาน การติดต่อ และความปลอดภัยของแพลตฟอร์ม

English:

> I acknowledge Aplus1's Privacy Notice and understand that Aplus1 uses my data to provide account, profile, portfolio, contact, and platform safety features.

### Age / Consent Checkbox

Thai:

> ฉันยืนยันว่าฉันมีอายุและสิทธิ์เพียงพอในการใช้บริการนี้ หรือได้รับความยินยอมจากผู้ปกครองตามที่กฎหมายกำหนด

English:

> I confirm that I am old enough to use this service on my own, or that I have parental/guardian consent where required by law.

### Cookie Banner

Thai:

> Aplus1 ใช้คุกกี้ที่จำเป็นเพื่อให้เว็บไซต์ทำงาน และขออนุญาตใช้คุกกี้เพิ่มเติมเพื่อวิเคราะห์การใช้งานและปรับปรุงประสบการณ์ คุณเลือกได้ว่าจะยอมรับหรือปฏิเสธคุกกี้ที่ไม่จำเป็น

Buttons:

- ยอมรับทั้งหมด
- ปฏิเสธคุกกี้ที่ไม่จำเป็น
- ตั้งค่าคุกกี้

English:

> Aplus1 uses necessary cookies to make the site work. With your permission, we also use optional cookies for analytics and improving the experience. You can accept or reject non-essential cookies.

Buttons:

- Accept all
- Reject non-essential
- Cookie settings

### Project Ownership Confirmation

Thai:

> ฉันยืนยันว่าฉันเป็นเจ้าของผลงานนี้ หรือมีสิทธิ์/ได้รับอนุญาตให้นำผลงานและไฟล์ทั้งหมดมาเผยแพร่บน Aplus1

English:

> I confirm that I own this work or have the rights/permission to publish this project and its files on Aplus1.

### Client Permission Reminder

Thai:

> ถ้างานนี้ทำให้ลูกค้า บริษัท เอเจนซี่ หรือทีมอื่น กรุณาตรวจสอบว่าคุณได้รับอนุญาตให้นำมาเผยแพร่แล้ว และไม่เปิดเผยข้อมูลลับของลูกค้า

English:

> If this work was made for a client, company, agency, or team, please make sure you have permission to publish it and that you are not revealing confidential information.

### AI-Generated Work Disclosure

Thai:

> ถ้ามีการใช้ AI ในผลงานนี้ คุณสามารถระบุไว้เพื่อให้ผู้ชมเข้าใจบทบาท วิธีคิด และกระบวนการทำงานของคุณอย่างโปร่งใส

English:

> If AI was used in this work, you can disclose it so viewers understand your role, thinking, and creative process clearly.

### Contact From Project Disclaimer

Thai:

> การคุยต่อจากผลงานนี้เป็นการติดต่อระหว่างผู้ใช้โดยตรง Aplus1 ไม่ใช่คู่สัญญา นายจ้าง หรือตัวแทนจัดหางาน และไม่ได้รับประกันผลลัพธ์ของโอกาสนี้

English:

> Contact from this project is a direct conversation between users. Aplus1 is not a party to the agreement, employer, or recruitment agent, and does not guarantee the outcome of any opportunity.

### No Guarantee Of Opportunities

Thai:

> Aplus1 ช่วยให้ผลงานของคุณถูกค้นพบและเริ่มบทสนทนาได้ง่ายขึ้น แต่ไม่สามารถรับประกันจำนวนงาน การจ้างงาน รายได้ หรือผลลัพธ์ของโอกาสใด ๆ

English:

> Aplus1 helps your work become discoverable and easier to discuss, but we cannot guarantee jobs, hiring, income, or any specific opportunity outcome.

### Report Project

Thai:

> รายงานผลงานนี้ หากคุณคิดว่าผลงานละเมิดสิทธิ์ ไม่เหมาะสม เป็นสแปม แอบอ้าง หรือมีข้อมูลที่อาจทำให้ผู้อื่นเสียหาย ทีมงานจะตรวจสอบตามนโยบายของแพลตฟอร์ม

English:

> Report this project if you believe it infringes rights, is inappropriate, spam, impersonation, or may harm others. Our team will review it under platform policy.

### Copyright Report

Thai:

> หากคุณเป็นเจ้าของสิทธิ์หรือได้รับมอบอำนาจจากเจ้าของสิทธิ์ คุณสามารถส่งคำร้องให้ตรวจสอบผลงานที่อาจละเมิดลิขสิทธิ์ได้ กรุณาให้ข้อมูลที่ชัดเจนเพื่อให้ทีมงานตรวจสอบได้รวดเร็ว

English:

> If you are the rights holder or authorized to act for the rights holder, you can submit a copyright report for content that may infringe your rights. Please provide clear details so our team can review it quickly.

### Account Deletion Warning

Thai:

> การลบบัญชีจะทำให้โปรไฟล์และผลงานของคุณไม่แสดงต่อสาธารณะ และข้อมูลบางส่วนอาจถูกลบถาวรหลังจากดำเนินการเสร็จ ข้อมูลบางรายการอาจถูกเก็บไว้เท่าที่จำเป็นตามกฎหมาย ความปลอดภัย หรือการป้องกันการละเมิด

English:

> Deleting your account will remove your public profile and projects from view, and some data may be permanently deleted after processing. Some records may be retained where necessary for legal, safety, or abuse-prevention reasons.

## 7. Cursor Implementation Prompt

Paste this into Cursor:

```text
You are implementing the Legal & Compliance MVP for Aplus1.

Read first:
- docs/product/aplus1-legal-compliance-mvp-spec.md
- docs/product/aplus1-prd.md
- docs/product/aplus1-ux-flow.md
- docs/product/aplus1-feature-spec-cursor.md

Product positioning:
- Launch Aplus1 as a "Creative Discovery and Portfolio Platform".
- Use "ผลงานจริง -> โอกาส" and "open to opportunities" language.
- Avoid job board, recruitment agency, freelance marketplace, guaranteed hiring, matching service, placement service, escrow, commission language.

Build first (P0):
1. Terms + Privacy + Age/guardian acknowledgement during signup and re-consent after policy updates.
2. Cookie consent with necessary/analytics/marketing categories; block analytics/marketing before opt-in.
3. Project ownership confirmation on publish.
4. Client permission reminder and optional AI-generated disclosure on project editor.
5. Report project/profile/comment/message flow.
6. Copyright report route/form.
7. Admin moderation tools: hide/unhide content, suspend/unsuspend user.
8. Consent logs and policy versioning.
9. Admin audit log for all sensitive admin actions.
10. Privacy request intake: account deletion request and data export request.

Routes/pages to add or verify:
- /legal/terms
- /legal/privacy
- /legal/cookies
- /legal/community-guidelines
- /legal/copyright-report
- /settings/privacy
- /settings/account
- /admin/compliance
- /admin/compliance/consents
- /admin/compliance/policies
- /admin/moderation/projects
- /admin/moderation/reports
- /admin/moderation/copyright
- /admin/privacy-requests
- /admin/audit-log

Components to add or verify:
- LegalConsentCheckboxes
- CookieConsentBanner
- CookieSettingsDialog
- ProjectOwnershipConfirmation
- ClientPermissionReminder
- AiGeneratedDisclosureToggle
- ReportContentDialog
- CopyrightReportForm
- AccountDeletionRequestDialog
- DataExportRequestButton
- PolicyVersionGate
- AdminModerationActionDialog
- AdminAuditLogTable

Database tables to add or verify:
- profiles legal/compliance fields
- projects legal/compliance fields
- project_assets
- user_consents
- policy_versions
- cookie_consents
- content_reports
- copyright_reports
- moderation_actions
- privacy_requests
- deletion_requests
- data_exports
- inquiries platform_disclaimer_ack
- admin_audit_logs

Validation rules:
- Signup requires Terms, Privacy, Age/guardian acknowledgement.
- Project publish requires ownership confirmation.
- Copyright report requires claimant contact, infringing URL/subject, good-faith confirmation, authority confirmation, signature text.
- General report requires subject type/id and reason.
- Deletion request requires strong confirmation.
- Data export request requires authenticated user.
- Admin moderation action requires reason code.

RLS/security notes:
- Use auth.users as identity source; do not create password fields.
- Users can read own consent/privacy/export/deletion records.
- Consent and audit logs are append-only.
- Public can only read active public policy versions and visible public projects/profiles.
- Only project owner can edit project.
- Only admins can see report queues, audit logs, and moderation actions.
- Anonymous copyright reports should go through rate-limited server/RPC path.
- Service-role operations must be server-side only.
- Do not expose admin actions or private reports through client-readable public policies.

Tests:
- New signup cannot complete without legal acknowledgements.
- Re-consent gate appears when active policy requires reconsent.
- Analytics script does not load before analytics cookie consent.
- Project cannot publish without ownership confirmation.
- Report form creates content_reports row.
- Copyright form creates copyright_reports row.
- Admin can hide project and audit log is created.
- Non-admin cannot access admin compliance routes/data.
- User can request account deletion.
- User can request data export.
- User A cannot read User B privacy requests, reports, inquiries, or exports.

Do not build yet:
- payment escrow
- commission on project value
- guaranteed matching
- formal job placement workflow
- candidate ranking/scoring for employers
- Aplus1-managed contracts
- automated legal conclusions
- broad KYC/background checks

Before finishing:
- Run build and focused tests.
- Add screenshots for new legal/signup/project/admin screens.
- Include any migration SQL and RLS policies in the handoff.
- Mark all legal copy as draft pending Thai lawyer + PDPA consultant review.
```

## 8. Review Checklist For Thai Lawyer / PDPA Consultant

Ask Thai lawyer:

- Does the MVP cross into regulated employment/recruitment agency activity?
- Is "Creative Discovery and Portfolio Platform" positioning sufficient?
- Are Terms liability limits, disclaimers, and user warranties enforceable?
- Does the copyright/takedown workflow satisfy Thai requirements?
- Does ETDA Digital Platform Service notification apply before launch?
- Would future SaaS subscription, ads, or commissions trigger OCPB/direct marketing/tax obligations?

Ask PDPA consultant:

- Is the age/guardian consent flow sufficient for student creators?
- Are consent logs and policy versioning adequate?
- Are cookie categories and opt-in behavior sufficient?
- Are Supabase, Vercel, analytics, and email providers covered by DPAs/cross-border transfer safeguards?
- Are deletion/export workflows and retention periods adequate?
- Are admin access logs and role permissions sufficient?

## 9. References To Verify With Counsel

Primary legal areas from the supplied research report:

- Thailand Personal Data Protection Act B.E. 2562 (2019)
- Royal Decree on Digital Platform Service Businesses B.E. 2565 (2022)
- Copyright Act amendments including Copyright Act (No. 5) B.E. 2565 (2022)
- Employment and Job-Seeker Protection Act B.E. 2528 (1985)
- Computer Crime Act B.E. 2550 (2007), as amended
- Direct Sales and Direct Marketing Act B.E. 2545 (2002)

Implementation should be conservative until legal counsel confirms exact obligations.

## 10. Implementation Status vs Aplus1 Codebase

Audited: 2026-07-03 against `Anthem-Code/` and https://aplus1.app

Legend: ✅ done · 🟡 partial · ❌ not yet · ⚠️ needs lawyer/ops action

### Product positioning & copy

| Item | Status | Notes |
|---|---|---|
| Creative Discovery positioning (not job board/agency) | 🟡 | Terms §7 updated; signup checkboxes clarify role; product copy uses 「คุยต่อจากผลงานนี้」 |
| Inquiry platform disclaimer | ✅ | `HireDialog` shows disclaimer; matches spec copy |
| No guarantee of hiring/income | ✅ | Terms §7 + §13 |

### P0 legal UX (spec §3)

| Requirement | Status | Current implementation |
|---|---|---|
| 3.1 Terms acceptance | 🟡 | 3 separate signup checkboxes (`LegalSignupConsents`); **no DB consent log** yet |
| 3.2 Privacy acknowledgement | 🟡 | Separate checkbox at signup; **no server-side log** |
| 3.3 Age / parental consent | 🟡 | Checkbox added 2026-07-03; Terms §3 aligned; **no `age_band` / `user_consents`** |
| 3.4 Cookie consent | 🟡 | Banner + preferences (`CookieConsent`, localStorage); analytics gated via `isCategoryAllowed`; **no `cookie_consents` table**; no marketing category |
| 3.5 Project ownership confirmation | ✅ | Attestation checkbox + `rights_attested_at` / `rights_attestation_version` on publish |
| 3.6 Report project/profile | ✅ | `ReportDialog` → `user_reports`; admin queue at `/admin/reports` |
| 3.7 Copyright report | 🟡 | Report reason `copyright` + Terms N&T; **no dedicated `/legal/copyright-report` form** |
| 3.8 Admin hide/ban | ✅ | `useAdminApplyModeration`, `moderation_actions`, `/admin/moderation` |
| 3.9 Account deletion | 🟡 | Mailto + So1o redirect in settings; **no `deletion_requests` queue** |
| 3.10 Data export | 🟡 | Mailto templates on `/legal/rights`; **no self-serve export** |
| 3.11 Consent logs | ❌ | Tables `user_consents`, append-only audit not migrated |
| 3.12 Policy versioning | ❌ | Static pages + `LEGAL_ATTESTATION_VERSION`; **no `policy_versions` / re-consent gate** |

### Legal pages & routes

| Route | Status |
|---|---|
| `/legal/terms` | ✅ |
| `/legal/privacy` | ✅ |
| `/legal/cookies` | ✅ |
| `/legal/rights` | ✅ (PDPA rights) |
| `/legal/ip` | ✅ (attestation + IP policy) |
| `/legal/community` | ✅ |
| `/legal/copyright-report` | ❌ (use report flow or email for now) |

### Admin compliance (spec §4)

| Dashboard | Status | Notes |
|---|---|---|
| Compliance dashboard | ❌ | Use `/admin/reports`, `/admin/moderation`, `/admin/audit` separately |
| Consent logs admin | ❌ | |
| Privacy request queue | ❌ | Manual via DPO email |
| Policy version admin | ❌ | |

### Production / ops (non-code)

| Item | Status |
|---|---|
| ETDA DPS brief notification | ⚠️ Founder/legal — prepare before public launch |
| Thai lawyer review of Terms/Privacy/copy | ⚠️ All legal text marked draft |
| PDPA consultant — DPA with Supabase/Vercel/analytics | ⚠️ |
| Production legal pages load | ⚠️ 2026-07-03: `/legal/terms` showed CSS preload error — redeploy after build; legal CSS moved to main bundle |

### Recommended next engineering sprint (priority order)

1. Supabase migration: `policy_versions`, `user_consents`, `cookie_consents` + RPC insert on signup
2. `PolicyVersionGate` — block publish/contact after material policy update
3. `/legal/copyright-report` dedicated form → `copyright_reports` table
4. `/admin/compliance` read-only dashboard (counts + queues)
5. In-app deletion/export request → `deletion_requests` / `data_exports`

### Changes applied 2026-07-03 (this audit)

- Added `docs/product/aplus1-legal-compliance-mvp-spec.md` (this file)
- Signup: split Terms / Privacy / Age consents with recruitment-safe copy
- Terms §3 + §7: Creative Discovery positioning + no agency guarantee
- `HireDialog`: platform disclaimer on project inquiry
- Legal nav: added community guidelines link
- Moved `legal.css` into main bundle to reduce lazy-route CSS preload failures

### Changes applied 2026-07-03 (compliance sprint + UX)

- SQL: `scripts/ecosystem/aplus1-legal-compliance.sql` — tables + RPCs (ต้อง push Supabase)
- `/legal/copyright-report` — ฟอร์ม 3 ขั้น ภาษาไทยเข้าใจง่าย
- `/admin/compliance` + `/admin/compliance/copyright` + `/admin/compliance/privacy`
- ตั้งค่า → PDPA: ดาวน์โหลด JSON + ขอลบบัญชี in-app
- Consent log ตอนสมัคร/คุกกie/login (graceful ถ้า migration ยังไม่รัน)
- Signup UX: การ์ด 3 ข้อ + progress 1/3
- `PolicyReconsentGate` เมื่อนโยบายเปลี่ยน (requires_reconsent=true)
