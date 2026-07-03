# Aplus1 Feature Spec For Cursor

Updated: 2026-07-03  
Audience: Cursor / engineering implementation  
Scope: non-admin product loop from research to build-ready tasks

## 1. Implementation Objective

Implement and polish the core Aplus1 loop:

> Project with context -> discovery -> save/contact -> project-qualified opportunity conversation

Cursor should prioritize code changes that make this loop reliable, understandable, measurable, and safe.

## 2. Existing Code Areas To Inspect First

Likely implementation targets in the current project:

- `latest-aunaun-zip/AunAun-main/Anthem-Code/src/pages/Index.tsx`
- `latest-aunaun-zip/AunAun-main/Anthem-Code/src/pages/FeedPage.tsx`
- `latest-aunaun-zip/AunAun-main/Anthem-Code/src/pages/ExploreProjectsPage.tsx`
- `latest-aunaun-zip/AunAun-main/Anthem-Code/src/pages/ProjectDetailPage.tsx`
- `latest-aunaun-zip/AunAun-main/Anthem-Code/src/pages/ProjectEditorPage.tsx`
- `latest-aunaun-zip/AunAun-main/Anthem-Code/src/pages/PortfolioManagePage.tsx`
- `latest-aunaun-zip/AunAun-main/Anthem-Code/src/pages/PortfolioProfilePage.tsx`
- `latest-aunaun-zip/AunAun-main/Anthem-Code/src/pages/PublicProfilePage.tsx`
- `latest-aunaun-zip/AunAun-main/Anthem-Code/src/pages/CollectionsPage.tsx`
- `latest-aunaun-zip/AunAun-main/Anthem-Code/src/pages/CollectionDetailPage.tsx`
- `latest-aunaun-zip/AunAun-main/Anthem-Code/src/pages/ChatInboxPage.tsx`
- `latest-aunaun-zip/AunAun-main/Anthem-Code/src/pages/JobsPage.tsx`
- `latest-aunaun-zip/AunAun-main/Anthem-Code/src/pages/JobDetailPage.tsx`
- `latest-aunaun-zip/AunAun-main/Anthem-Code/src/hooks/useProjects.ts`
- `latest-aunaun-zip/AunAun-main/Anthem-Code/src/hooks/useExploreProjects.ts`
- `latest-aunaun-zip/AunAun-main/Anthem-Code/src/hooks/useProjectInteractions.ts`
- `latest-aunaun-zip/AunAun-main/Anthem-Code/src/hooks/useCollections.ts`
- `latest-aunaun-zip/AunAun-main/Anthem-Code/src/hooks/useChat.ts`
- `latest-aunaun-zip/AunAun-main/Anthem-Code/src/hooks/useJobs.ts`
- `latest-aunaun-zip/AunAun-main/Anthem-Code/src/hooks/useCollabRequests.ts`
- `latest-aunaun-zip/AunAun-main/Anthem-Code/src/hooks/useHiringRequests.ts`
- `latest-aunaun-zip/AunAun-main/Anthem-Code/src/hooks/useNotifications.ts`

Before editing, Cursor should verify actual table names, component names, and current routes. Do not assume this spec is a database schema dump.

## 3. Priority Order

### P0: Must Fix / Must Build First

1. Project context template
2. Opportunity status on profile/project
3. Project-specific contact/inquiry
4. Save/collection consistency
5. Chat context persistence and permission safety
6. Jobs/opportunity submit feedback
7. No infinite loading on critical routes

### P1: Important Before Public Launch

1. Discovery filters by category/opportunity type
2. Better onboarding checklist
3. Better empty/error states
4. Analytics events for product loop
5. Responsive dialog/action layout

### P2: Later Polish

1. AI case-study helper
2. Private/unlisted project
3. Related projects
4. Testimonials
5. Roster/shortlist notes

## 4. Feature 1: Opportunity Status

### Product Intent

Let creators express what kind of opportunities they are open to without forcing them into a narrow "รับงานจ้าง" label.

### UX Copy

Top-level default:

- เปิดรับโอกาส

Specific types:

- รับงานจ้าง
- พร้อมร่วมโปรเจกต์
- มองหาฝึกงาน
- สนใจเข้าทีม
- เปิดรับ feedback / mentor
- ยังไม่รับงาน แต่คุยโอกาสได้

### Data Requirements

Recommended model:

- profile-level opportunity status
- profile-level opportunity type array
- optional project-level opportunity type array

Suggested fields if missing:

```sql
-- Verify table names before applying.
alter table public.profiles
  add column if not exists opportunity_status text default 'open_to_opportunities',
  add column if not exists opportunity_types text[] default '{}';

alter table public.projects
  add column if not exists opportunity_types text[] default '{}',
  add column if not exists opportunity_note text;
```

Recommended enum values:

- `open_to_opportunities`
- `paid_work`
- `collaboration`
- `internship`
- `join_team`
- `feedback_mentor`
- `soft_open`
- `not_available`

### UI Requirements

Show status on:

- public profile header
- project detail creator block
- project editor sidebar or publish step
- portfolio manage checklist

### Acceptance Criteria

- User can set and edit opportunity status.
- Status appears publicly after save.
- If no status is set, default is "เปิดรับโอกาส" only where appropriate; do not misrepresent unavailable users.
- Multiple types render as chips.
- Search/filter can later use the same values.

## 5. Feature 2: Project Context Template

### Product Intent

Make each project a proof object, not just an image gallery.

### Required Publish Fields

- title
- cover image
- category
- creator role
- visibility

### Recommended Context Fields

- brief/problem: โจทย์ของงานนี้
- role: บทบาทของฉัน
- process: วิธีคิด / process
- deliverables: สิ่งที่ส่งมอบ
- tools: เครื่องมือที่ใช้
- duration: ระยะเวลา
- outcome: ผลลัพธ์ / สิ่งที่ได้เรียนรู้
- opportunity note: โอกาสที่เกี่ยวข้องกับงานนี้

### Data Requirements

Suggested fields if missing:

```sql
-- Verify existing project table shape before applying.
alter table public.projects
  add column if not exists brief text,
  add column if not exists creator_role text,
  add column if not exists process_note text,
  add column if not exists deliverables text,
  add column if not exists tools text[] default '{}',
  add column if not exists duration_label text,
  add column if not exists outcome_note text,
  add column if not exists visibility text default 'public',
  add column if not exists published_at timestamptz;
```

### UI Requirements

Project editor should have:

- clear sections
- autosave/draft if already supported
- inline validation
- preview mode
- publish confirmation

Project detail should:

- hide empty optional fields
- show role/process/outcome in readable sections
- show CTA near project context

### Acceptance Criteria

- Draft can be saved without all publish fields.
- Publish requires required fields.
- Missing required fields are shown inline.
- Project detail looks clean even if only required fields exist.
- Context completion can be measured.

## 6. Feature 3: Project-Specific Inquiry

### Product Intent

The CTA should not create a generic message. It should preserve why the hirer is contacting the creator.

### Primary CTA

Use:

- คุยต่อจากผลงานนี้

Avoid as primary in discovery:

- Hire
- จ้างเลย
- Invite to Job

### Inquiry Form

Required:

- project id
- recipient creator id
- opportunity type
- message

Optional:

- budget range
- timeline
- contact preference
- attachments

### Data Requirements

Recommended table if current request/chat model does not preserve project context:

```sql
create table if not exists public.opportunity_inquiries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  opportunity_type text not null,
  message text not null,
  budget_min numeric,
  budget_max numeric,
  timeline text,
  conversation_id uuid,
  created_at timestamptz not null default now()
);

alter table public.opportunity_inquiries enable row level security;
```

RLS intent:

- sender can insert/read own inquiries
- recipient can read inquiries sent to them
- no third-party read

### Chat Integration

When inquiry is submitted:

1. Create or reuse conversation between sender and recipient.
2. Store linked project reference.
3. Insert first message with inquiry content.
4. Notify recipient.
5. Navigate sender to conversation or show success with "เปิดแชท".

### Acceptance Criteria

- Inquiry cannot be sent without project reference.
- Duplicate rapid submissions are blocked.
- Sender sees success state.
- Recipient sees project context in chat.
- Refreshing chat keeps context.
- Non-member cannot access conversation.

## 7. Feature 4: Save / Collection Consistency

### Product Intent

Saving is the low-pressure bridge between discovery and future opportunity.

### Requirements

- Save project from card.
- Save project from detail.
- Save creator from profile/detail.
- Add to collection.
- Create collection inline.
- Recently created collection is immediately available everywhere.

### Known Risk From Prior Testing

Collection creation succeeded, but project detail save later showed "ยังไม่มีคอลเลกชัน". This indicates cache invalidation, stale query, user mismatch, or RLS mismatch.

### Cursor Tasks

1. Inspect `useCollections.ts`.
2. Find query keys/cache invalidation.
3. Ensure create collection invalidates/refetches collection list.
4. Ensure project detail uses same collection source as collections page.
5. Confirm RLS allows owner to read newly created collection.
6. Add toast and optimistic update where safe.

### Acceptance Criteria

- Create collection -> immediately save project into it without refresh.
- Saved state remains after refresh.
- Remove save updates UI everywhere.
- Empty state appears only when user truly has no collections.

## 8. Feature 5: Discovery Filters

### Product Intent

Help hirers discover by work/style/opportunity, not just by people or generic feed.

### Initial Filters

- category
- opportunity type
- creator level optional: student/junior/pro/team
- sort: latest, relevant, popular, recently active

### UI Requirements

- Desktop: visible filters with compact controls.
- Tablet/mobile: filter sheet.
- Chips show active filters.
- No-results state suggests removing filters.

### Acceptance Criteria

- Filter state is shareable via URL params where practical.
- Empty state is helpful.
- Loading does not blank the whole page unnecessarily.
- Filters work with keyboard and screen reader labels.

## 9. Feature 6: Jobs / Opportunity Posts

### Product Intent

Jobs should support opportunities without overpowering the project-first product.

### Required Form Behavior

- Validate deadline as future date.
- Validate budget min <= max.
- Require title, opportunity type, category, description.
- Submit shows success or error.
- Prevent double submit.

### UX Requirements

- Dialog scrolls internally.
- Submit button remains reachable on 1366x768.
- On mobile, form becomes full-screen sheet or has safe sticky footer.

### Acceptance Criteria

- User can complete post with keyboard.
- User gets clear success message and route/next action.
- Failed insert/update shows actionable message.
- No silent failure.

## 10. Feature 7: Chat Context And Safety

### Product Intent

Chat should feel like an opportunity inbox, not a detached message list.

### Conversation List Requirements

Show:

- participant
- linked project title if exists
- opportunity type
- last message
- unread state
- timestamp

### Conversation Detail Requirements

Show:

- compact linked project card
- original inquiry details
- message thread
- attachment constraints
- report/block

### Safety Requirements

- Only conversation members can read messages.
- Attachments are private/signed if sensitive.
- CV/private files are not public URLs.
- Unauthorized access returns friendly denied state.

### Acceptance Criteria

- User A cannot open User B private conversation by URL guessing.
- Chat messages remain after refresh.
- Missing table/RPC errors fail gracefully, not with app-breaking console floods.
- Attachments show type/size validation.

## 11. Feature 8: Product Analytics

### Product Intent

Measure whether the loop works.

### Events To Track

Recommended event names:

- `project_publish_started`
- `project_published`
- `project_context_completed`
- `opportunity_status_set`
- `project_detail_viewed`
- `project_saved`
- `creator_saved`
- `project_inquiry_started`
- `project_inquiry_sent`
- `chat_reply_sent`
- `job_post_created`

### Event Properties

- user id
- project id where relevant
- category
- opportunity type
- source route
- device type
- timestamp

### Acceptance Criteria

- Events are non-blocking.
- Analytics failures do not break user flow.
- PII is not sent unnecessarily.
- Can calculate North Star metric from stored events/inquiries.

## 12. Feature 9: Copy System Implementation

### Replace Mixed Labels

Use Thai-first labels consistently:

- `Close` -> `ปิด`
- `Invite to Job` -> `ชวนคุยโอกาส` or context-specific Thai
- `Hire` -> `คุยต่อจากผลงานนี้` in discovery

### CTA Mapping

| Context | Primary CTA |
|---|---|
| Landing creator | เริ่มลงผลงาน |
| Project card | ดูผลงาน |
| Project detail | คุยต่อจากผลงานนี้ |
| Profile | ชวนคุยโอกาส |
| Save | เก็บไว้ |
| Project editor publish | เผยแพร่ผลงาน |
| Draft | บันทึกฉบับร่าง |

### Acceptance Criteria

- No mixed Thai/English in core user actions unless English term is intentionally common.
- CTA reflects actual action.
- Buttons never route unexpectedly without visible intent.

## 13. Accessibility Requirements

Must pass:

- All form fields have labels.
- Date/budget fields have clear accessible names.
- Dialog close buttons have Thai aria-label.
- Touch targets >= 44px on mobile/tablet.
- Keyboard user can open, fill, submit, and close dialogs.
- Focus returns to trigger after modal close.
- Error messages are associated with fields.

## 14. Performance Requirements

Targets:

- Project feed should not fetch huge unbounded payloads.
- Project images should be lazy-loaded and size-appropriate.
- Detail pages should avoid duplicate profile/project queries where possible.
- Chat should paginate messages.
- Search/filter should debounce text input.

Acceptance criteria:

- No route has infinite spinner beyond 10 seconds without fallback.
- Main discovery route remains usable on 1366x768 desktop.
- Large image uploads are compressed or constrained before display where practical.

## 15. Security Requirements

Cursor must verify:

- Supabase anon key only on client, no service role in frontend.
- RLS for projects, collections, chats, inquiries, attachments.
- Project edit/delete requires owner.
- Private chats and CV files are not public-readable.
- Non-admin cannot access admin routes or admin data.
- Inputs are validated client-side and server/database-side where important.
- Rate limit or abuse guard for inquiry/chat/job post spam if supported.

## 16. Testing Plan

### Unit / Component Tests

- Opportunity status selector renders and saves selected values.
- Project publish validation catches missing required fields.
- Budget/deadline validation works.
- Save collection state updates after create.

### Integration Tests

- Creator publishes project -> public detail visible.
- Hirer saves project -> saved list shows project.
- Hirer sends inquiry from project -> chat has project context.
- Creator replies -> hirer sees reply after refresh.
- Non-owner cannot edit project.

### Playwright / E2E

Desktop first:

- 1440x900
- 1366x768

Then:

- tablet 1024x768
- mobile 390x844

Critical E2E flows:

1. New creator onboarding and first project publish.
2. Project detail contact flow.
3. Save collection flow.
4. Chat send/refresh flow.
5. Jobs/opportunity post validation and submit feedback.
6. Permission checks for cross-user project/chat access.

## 17. Cursor Implementation Prompt

Use this when handing to Cursor:

```text
Implement the Aplus1 opportunity loop from docs/product:

1. Read:
- docs/product/aplus1-prd.md
- docs/product/aplus1-ux-flow.md
- docs/product/aplus1-feature-spec-cursor.md
- docs/research/aplus1-mvp-strategy.md
- docs/research/aplus1-copy-system.md

2. Prioritize P0:
- opportunity status
- project context template
- project-specific inquiry/contact
- save/collection consistency
- chat context and privacy
- jobs/opportunity submit feedback
- infinite loading fallbacks

3. Keep the product positioning:
- "ผลงานจริง -> โอกาส"
- Thai-first copy
- do not turn discovery into package-first marketplace UX

4. For every change:
- preserve existing data and routes
- verify RLS/schema before migration
- add focused tests for critical flows
- run build and relevant tests
- include screenshots for desktop/mobile when UI changes
```

## 18. Definition Of Done

A release is done only when:

- Creator can publish a contextual project.
- Hirer can find, save, and contact from that project.
- Inquiry creates or opens a conversation with project context.
- Creator can reply.
- The whole flow works after refresh.
- Cross-user permission checks pass.
- Mobile/tablet/desktop layouts are usable.
- Build passes.
- Core test checklist is updated.

