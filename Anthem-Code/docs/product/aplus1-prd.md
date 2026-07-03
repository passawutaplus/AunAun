# Aplus1 PRD: ผลงานจริง -> โอกาส

Updated: 2026-07-03  
Audience: Founder, product, design, engineering, Cursor  
Source research:

- `docs/research/aplus1-opportunity-research.md`
- `docs/research/aplus1-competitor-teardown.md`
- `docs/research/aplus1-mvp-strategy.md`
- `docs/research/aplus1-copy-system.md`
- `docs/research/aplus1-user-interview-guide.md`

## 1. Product Summary

Aplus1 คือแพลตฟอร์มที่ช่วยให้ครีเอเตอร์ไทยใช้ "ผลงานจริง" เป็นหลักฐานของศักยภาพ แล้วเปลี่ยนการถูกค้นพบให้กลายเป็น "โอกาส" ที่เหมาะสม เช่น งานจ้าง, collaboration, ฝึกงาน, เข้าทีม, feedback, mentor, studio roster หรือโอกาสในอนาคต

Positioning หลัก:

> ผลงานจริง พาไปเจอโอกาสใหม่

Product loop ที่ต้องพิสูจน์:

> Creator ลงผลงานพร้อมบริบท -> Hirer/Opportunity giver ค้นพบ -> เริ่มบทสนทนาโอกาสจากผลงานนั้น

ถ้า loop นี้ยังไม่ทำงาน การเพิ่ม marketplace, payment, contest, job board, ranking หรือ social feature หนัก ๆ จะยังไม่แก้ปัญหาหลัก

## 2. Problem

### Creator Problem

ครีเอเตอร์จำนวนมากมีผลงานจริง แต่ยังขาดพื้นที่ที่ช่วยให้ผลงานนั้นนำไปสู่โอกาสที่เหมาะสม

Pain points:

- ลงงานใน Instagram, Facebook, Behance หรือ portfolio ส่วนตัวแล้วคนเห็นไม่พอ
- คนเห็นงานแต่ไม่เข้าใจบทบาท, process, บริบท, ขอบเขต, หรือศักยภาพจริง
- เด็กจบใหม่/นักศึกษา/มือใหม่กลัวว่าผลงานยังไม่ดีพอ จึงไม่กล้าลง
- ฟรีแลนซ์เจอลูกค้าที่เลือกจากราคา ไม่ได้เลือกจาก style/fit
- ต้องขายตัวเองซ้ำ ๆ แทนที่จะให้ผลงานช่วยคัดคนที่สนใจจริง

### Hirer / Opportunity Giver Problem

คนจ้างหรือคนให้โอกาสอยากเห็นของจริงก่อนเริ่มคุย แต่แพลตฟอร์มส่วนใหญ่ให้สัญญาณไม่ครบ

Pain points:

- Fastwork/package marketplace เริ่มจากบริการและราคา ไม่ได้เริ่มจาก proof ของงาน
- Job board เริ่มจากตำแหน่งหรือ CV ไม่ได้เริ่มจาก output
- Portfolio/social platform เห็นภาพสวย แต่ไม่รู้บทบาทจริง ความรับผิดชอบ หรือจะคุยต่อยังไง
- เคยเจอคนพูดดี portfolio ดูดี แต่พอจ้างจริงไม่ตรงคาดหวัง
- อยาก shortlist คนจากผลงานก่อน ไม่อยาก commit ว่าจะจ้างทันที

## 3. Product Goal

เป้าหมายหลักของ MVP:

> ทำให้ผลงานหนึ่งชิ้นเริ่มบทสนทนาโอกาสที่มีบริบทได้

### Success Metrics

North Star:

- Project-qualified opportunity conversations per week

Definition:

- บทสนทนาหรือ inquiry ที่เริ่มจาก project card/project detail
- มี project id หรือ reference ชัดเจน
- มี opportunity type หรือ brief context
- ไม่นับ spam, generic hello, หรือข้อความไม่มีบริบท

Creator activation:

- สร้างบัญชีสำเร็จ
- publish project แรก
- project มี cover, category, role, และ context อย่างน้อย 2 fields
- ตั้ง opportunity status

Hirer activation:

- ดู project detail อย่างน้อย 3 ชิ้น
- save project/creator อย่างน้อย 1 รายการ หรือส่ง inquiry จาก project อย่างน้อย 1 ครั้ง

Retention signals:

- Creator ลง project ที่สองภายใน 14 วัน
- Creator กลับมาจาก notification
- Hirer กลับมาเปิด saved list
- Hirer ส่ง inquiry ครั้งที่สอง

## 4. Non-Goals For MVP

สิ่งที่ไม่ควรทำเป็นแกนหลักในรอบนี้:

- ไม่สร้าง marketplace package/pricing แบบ Fastwork
- ไม่สร้าง job board เต็มรูปแบบแบบ JobsDB
- ไม่ทำ payment escrow เต็มระบบ
- ไม่ทำ contest/challenge system หนัก ๆ
- ไม่ทำ public follower social network เป็นเป้าหมายหลัก
- ไม่ทำ ranking AI black box ก่อนมีข้อมูลคุณภาพ
- ไม่เน้น admin feature ใน scope นี้

หมายเหตุ: Feature เหล่านี้อาจมีอยู่บางส่วนในระบบเดิม แต่ PRD นี้ให้ priority กับ opportunity loop ก่อน

## 5. Target Users

### Persona A: Emerging Creator

ผู้ใช้:

- นักศึกษา, เด็กจบใหม่, junior designer, illustrator, motion/video editor, photographer, UI/UX beginner

Need:

- อยากให้คนเห็นผลงาน
- อยากได้โอกาสแรกหรือโอกาสที่ทำให้ portfolio โต
- อยากลงงานโดยไม่ถูกตัดสินว่าไม่โปรพอ

Product promise:

> เริ่มจากผลงานหนึ่งชิ้น แล้วค่อย ๆ ให้คนเห็นศักยภาพของคุณ

Critical features:

- low-friction project upload
- student/experimental-friendly copy
- opportunity status ที่ไม่บังคับว่า "รับงานจ้าง" เท่านั้น
- supportive empty state

### Persona B: Working Freelancer / Creator

ผู้ใช้:

- ฟรีแลนซ์หรือครีเอเตอร์ที่มีงานจริงและอยากได้ lead ที่ตรงกว่าเดิม

Need:

- ไม่อยากแข่งราคาล้วน
- อยากให้คนทักจากงานที่ชอบจริง
- อยากคัด brief ที่เหมาะกับ skill/style

Product promise:

> ให้คนทักจากงานที่ใช่ ไม่ใช่แค่จากราคาที่ถูก

Critical features:

- project-specific contact
- opportunity status by type
- save/follow signal
- inquiry form ที่มี brief context

### Persona C: SME / Founder / Marketing Owner

ผู้ใช้:

- เจ้าของธุรกิจ, marketer, founder, brand owner ที่ต้องหาครีเอเตอร์

Need:

- อยากเห็นผลงานจริงก่อนเริ่มคุย
- อยากรู้ว่าคนนี้ทำส่วนไหนของงาน
- อยากเก็บหลายคนไว้เทียบก่อนตัดสินใจ

Product promise:

> ค้นหาครีเอเตอร์จากผลงานจริง แล้วคุยต่อจากงานที่สนใจ

Critical features:

- browse/search by project
- project detail with role/process/outcome
- save project/creator
- contact from project

### Persona D: Agency / Studio Scout

ผู้ใช้:

- agency, studio, creative lead, team lead ที่หา collaborator, intern, part-time, full-time หรือ outsource

Need:

- อยากหา talent ใหม่
- อยากเห็น style, role, reliability signal
- อยาก shortlist ได้เร็ว

Product promise:

> ค้นหาคนจากผลงาน บทบาท และสไตล์ที่เข้ากับทีม

Critical features:

- creator profile with project grid
- filters by category/opportunity type
- save/collection/shortlist
- structured invite/inquiry

## 6. MVP Scope

### Must-Have

1. Creator profile
2. Project upload/edit/publish
3. Project context template
4. Opportunity status
5. Project-specific inquiry/contact
6. Save project/creator
7. Discovery feed/search by work/category/style
8. Basic notification for save/contact/reply
9. Shareable project page
10. Loading, empty, error, permission states

### Should-Have Soon

1. AI case-study helper with creator voice preservation
2. Private/unlisted project
3. Related/similar work
4. Opportunity inbox labels
5. Availability filters
6. Simple testimonial/review after real opportunity
7. Creator onboarding checklist

### Later

1. Payment/escrow
2. Advanced agency roster
3. Challenge/contest
4. Public ranking
5. Premium analytics
6. Portfolio import from external sites

## 7. Product Principles

1. Start from work, not job title.
2. Use "โอกาส" as top-level language; use "งาน" only when paid work is explicit.
3. Every important action should preserve project context.
4. Make early creators feel safe to start.
5. Let hirers browse and save before forcing a hire decision.
6. Avoid package/price-first UX in discovery.
7. No dead-end buttons: every CTA must give feedback or next step.
8. Every feature should improve one of: trust, discovery, contact quality, or retention.

## 8. Opportunity Types

Use a broad taxonomy so Aplus1 does not collapse into a freelance-only marketplace.

Recommended opportunity types:

- เปิดรับโอกาส
- รับงานจ้าง
- พร้อมร่วมโปรเจกต์
- มองหาฝึกงาน
- สนใจเข้าทีม
- เปิดรับ feedback / mentor
- ยังไม่รับงาน แต่คุยโอกาสได้

Implementation note:

- Top-level status can be one broad label.
- User can select multiple specific opportunity types below it.
- Project-level opportunity can override or refine profile-level status.

## 9. Core User Stories

### Creator

- As a creator, I can publish one project with enough context so someone understands my role and capability.
- As a creator, I can state what opportunities I am open to without feeling forced to say I am for hire.
- As a creator, I can receive an inquiry that references a specific project.
- As a creator, I can see basic signals that my work is being discovered.
- As a creator, I can edit or unpublish a project without breaking my profile.

### Hirer / Opportunity Giver

- As a hirer, I can browse projects before looking at profiles.
- As a hirer, I can understand the creator's role, process, tools, and outcome.
- As a hirer, I can save projects/creators for later.
- As a hirer, I can contact a creator from a specific project with a guided brief.
- As a hirer, I can compare creators without being forced to post a job first.

## 10. Required UX States

Every user-facing flow in MVP must include:

- loading state
- empty state
- success state
- recoverable error state
- permission/auth state
- offline/network error state where relevant
- mobile/tablet/desktop layout
- keyboard/focus support for forms and dialogs

## 11. Launch Criteria

Before public launch:

- 100 quality creators seeded
- 300 quality projects seeded
- 30+ projects with strong context
- 20+ creators open to paid work
- 20+ creators open to collaboration
- 20+ students/juniors open to internship/feedback
- At least 10 project-qualified opportunity conversations in beta
- Users can explain how Aplus1 differs from Fastwork/Behance in their own words

## 12. Risks And Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Looks like generic portfolio | Users do not understand why it matters | Put opportunity status and project-specific contact into core UX |
| Looks like Fastwork clone | Product competes on price | Avoid package-first and "จ้างเลย" as dominant CTA |
| Upload quality is low | Hirers lose trust | Use project context template, examples, moderation |
| Creators fear copying | Fewer uploads | Add rights copy now; add private/unlisted/watermark later |
| Hirers browse but do not contact | No business loop | Guided project inquiry and saved list reminders |
| New creators feel intimidated | Supply growth slows | Student/experimental-friendly onboarding |
| Too many opportunity types | UX confusion | Default to broad "เปิดรับโอกาส"; advanced types optional |

## 13. Product Decision Summary

Build the smallest strong version of:

> Project portfolio + opportunity status + project-specific contact + save/discovery

Do not optimize for:

- number of uploads alone
- likes alone
- generic chat starts
- job posts alone
- package purchases

Optimize for:

- project context completeness
- project detail engagement
- project saves
- project-qualified inquiries
- creator reply rate
- repeat hirer sessions

