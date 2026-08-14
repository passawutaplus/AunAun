# Aplus1 Future Commerce & Community Layers — Roadmap

**Status:** Deferred planning pack (ไม่ใช่ MVP เปิดเว็บ)  
**Captured:** 2026-07-31  
**Audience:** Product + Cursor เมื่อเริ่มฟีเจอร์ใหม่ในชุดนี้  
**North star ที่ยังยึด:** `ผลงานจริง → โอกาส` — ชั้นด้านล่างเป็นส่วนขยายหลังเว็บ/แอปนิ่ง ไม่แย่ง opportunity loop

---

## วิธีใช้เอกสารนี้

| ถ้าจะทำ… | ไปหัวข้อ |
|----------|----------|
| ลำดับเปิดฟีเจอร์ทั้งก้อน | [1. ลำดับความสำคัญ (Timeline)](#1-ลำดับความสำคัญ-timeline) |
| บอร์ดประกาศงาน / โอกาส | [2. บอร์ดประกาศงาน (Opportunity board)](#2-บอร์ดประกาศงาน-opportunity-board) |
| ร้านขายสินค้าอาร์ต | [3. Art Shop — ร้านสินค้าอาร์ต](#3-art-shop--ร้านสินค้าอาร์ต) |
| ประมูล | [4. Art Auction — ประมูลงานศิลปะ](#4-art-auction--ประมูลงานศิลปะ) |
| ไลฟ์หาเพื่อนทำงาน | [5. Live — ไลฟ์กลุ่มทำงานศิลปะ](#5-live--ไลฟ์กลุ่มทำงานศิลปะ) |
| คอร์สเรียน | [6. Courses — คอร์สออกแบบและศิลปะ](#6-courses--คอร์สออกแบบและศิลปะ) |
| แอดมิน 1–2 คน + AI | [7. Ops — แอดมินน้อยคน + AI ผู้ช่วย](#7-ops--แอดมินน้อยคน--ai-ผู้ช่วย) |
| แยก Package / Hire / Shop | [8. ขอบเขตโดเมน (อย่าปน)](#8-ขอบเขตโดเมน-อย่าปน) |
| สิ่งที่ตกลงแล้ว | [9. Decision log](#9-decision-log) |
| ของที่มีในโค้ดแล้ว | [10. Code pointers](#10-code-pointers) |

เอกสาร MVP ปัจจุบัน: `aplus1-prd.md`, `aplus1-feature-spec-cursor.md`, `MASTER_CURSOR_BRIEF.md`

---

## 1. ลำดับความสำคัญ (Timeline)

เป้าหมายช่วงนี้: **เปิดเว็บ → ทำแอป (สิ้นปีนี้/ต้นปีหน้าถ้าทัน)**  
ชั้น commerce/community ด้านล่างเปิดทีละชั้นหลังพื้นฐานนิ่ง

| Phase | เมื่อไหร่ (คร่าวๆ) | ฟีเจอร์ | หมายเหตุ |
|-------|-------------------|---------|----------|
| **Now** | เปิดเว็บ + ช่วงแรกหลังเปิด | Opportunity loop + ของที่มี (พอร์ต, แชท, hire, packages) | ตาม PRD |
| **P1** | หลังเปิดเว็บได้สักระยะ | **บอร์ดประกาศงาน** (มีโค้ดแล้ว ยังไม่ดันใช้เต็ม) | เปิดใช้ก่อน ลงลึกทีหลัง |
| **P2** | หลังแอปพร้อม (~ปีหน้า) | **Art Shop** | รายละเอียดเต็มในหัวข้อ 3 |
| **P3** | หลัง Shop นิ่ง | **ประมูล** | ไม่ลงลึกตอนออกแบบ Shop |
| **P4** | หลัง/คู่ขนานช้าๆ หลัง Shop–Auction | **ไลฟ์** เจาะกลุ่มทำงานศิลปะ / หาเพื่อนทำงาน | ไม่ใช่ไลฟ์ขายของทั่วไปอย่างเดียว |
| **P5** | ไกล | **คอร์ส** ออกแบบ–ศิลปะ | เก็บไอเดีย ค่อยว่ากัน |

```
เว็บเปิด → [ใช้บอร์ดประกาศงาน] → แอป
                ↓
         Art Shop (สินค้า)
                ↓
            ประมูล
                ↓
         ไลฟ์ collab / ทำงาน
                ↓
              คอร์ส
```

**กฎ:** อย่าเริ่ม Shop ก่อนบอร์ดประกาศงานถูกเปิดใช้และมี feedback พื้นฐาน · อย่าเริ่มประมูลก่อน Shop มีออเดอร์+tracking+moderation พื้นฐาน

---

## 2. บอร์ดประกาศงาน (Opportunity board)

### 2.1 บทบาท

- ช่องทาง **เปิดรับหลายคน / ประกาศโอกาส** เมื่อยังไม่มีคนในใจ  
- **ไม่ใช่** JobsDB เต็มรูปแบบ (ตาม PRD: หลีกเลี่ยง job board หนัก)  
- คู่กับลูปหลัก: คุยจากผลงานเมื่อมีคนในใจแล้ว

### 2.2 สถานะตอนนี้

- มี UI/flow ในโค้ดแล้ว (เช่น `/jobs`, `PostOpportunityForm`, admin jobs)  
- **ยังไม่ดันเป็นพื้นผิวหลักตอนเปิดเว็บทันที**  
- แผน: เปิดใช้หลังเว็บนิ่งสักระยะ → เก็บ feedback → ค่อยลงลึก (matching, noti, UX) อีกที

### 2.3 เมื่อเริ่มลงลึก (ภายหลัง)

โฟกัสที่ควรกลับมาทำ:

- Submit success/error + validation ให้แน่น  
- Copy ไม่ให้ดูเหมือนเอเจนซ์จัดหางาน  
- เชื่อม discovery จากผลงาน / โปรไฟล์  
- Report + moderation ตาม legal MVP  
- Metric: ประกาศ → สมัคร/คุยที่มีคุณภาพ

### 2.4 อ่านเพิ่ม

- `aplus1-prd.md` — opportunity types, เลี่ยง job board clone  
- `aplus1-ux-flow.md` — opportunity posts  
- `aplus1-feature-spec-cursor.md` — jobs/opportunity submit feedback

---

## 3. Art Shop — ร้านสินค้าอาร์ต

### 3.1 Positioning

ร้านขาย **สินค้างานอาร์ต** ที่ผูกพอร์ตครีเอเตอร์บน Aplus1

- ภาพวาด, ภาพพิมพ์, digital print, คราฟ, แกะสลัก, edition อาร์ตอื่นๆ  
- **ไม่ใช่** ขายของทั่วไปแบบ marketplace รวมมิตร  
- **ไม่ใช่** รับจ้างวาด / commission / บริการออกแบบ → ไป Package หรือ Hire

จุดต่างคู่แข่ง: proof-first (ผลงาน+KYC) + art-only + แชทสรุปออเดอร์ + ส่งเองมี tracking — ไม่ใช่ price-first แบบ Fastwork/Shopee

### 3.2 แยกจาก Package (บังคับ)

| | **Art Shop (Product)** | **Package (Service)** |
|--|------------------------|------------------------|
| ขายอะไร | ชิ้นงาน / edition | แพ็กบริการ |
| ตัวอย่าง | พิมพ์ลิมิเต็ด, คราฟ | ออกแบบโลโก้, วาดตามบรีฟ |
| สถานะสินค้า | `ready` \| `preorder` | ไม่ใช้ ready/preorder แบบสต็อก |
| Gate ก่อนลง | Published ≥1 **และ** KYC ใช้ได้ | อ้างอิงผลงาน ≥1 ตอน publish |
| ปิดดีล | สนใจสั่ง → แชท → ออเดอร์ → ส่ง+tracking | สอบถาม/จ้างบริการ |

UX: แท็บ/เมนูแยกชัด เช่น **แพ็กเกจบริการ** vs **ร้านสินค้าอาร์ต**

### 3.3 Seller gate (มาตรฐาน L0)

ลงสินค้าได้เมื่อครบ **ทั้งสองข้อ**:

1. มีผลงาน `projects.status = Published` อย่างน้อย 1  
2. KYC **approved และยังไม่หมดอายุ** (`is_verified` + `isKycExpired` / `resolveKycExpiresAt`)

- บังคับทั้ง UI checklist และ server/RLS  
- พรีออเดอร์ **ไม่ยกเว้น** L0  
- ถ้าเหลือ Published = 0 หรือ KYC หมดอายุ → พักรับออเดอร์ใหม่ (ออเดอร์ค้างทำต่อตามนโยบาย)

### 3.4 Fulfillment ต่อ listing

| ค่า | ความหมาย |
|-----|----------|
| `ready` | พร้อมขาย / พร้อมส่ง (หรือ digital พร้อมหลังยืนยัน) |
| `preorder` | พรีออเดอร์ **สินค้า** (พิมพ์รอบใหม่, limited ฯลฯ) — **ไม่ใช่** พรีจ้างวาด |

พรีออเดอร์ควรมีอย่างน้อย: ช่วงเวลาส่งโดยประมาณ, จำนวนรับจอง (ถ้ามี), เงื่อนไขยกเลิก/คืน (เมื่อมีเพย์เมนต์)

### 3.5 User journeys

**Seller:** พอร์ต+KYC → เปิดร้าน → ลงสินค้า (หมวดอาร์ต, ราคา, ready/preorder, อ้างอิงผลงานแนะนำ) → รับสนใจ/ออเดอร์ → แชทตกลง → แพ็กส่ง → อัป tracking → เสร็จ

**Buyer:** เจอที่โปรไฟล์/ร้าน → ดูรายละเอียด+ผลงานอ้างอิง → สนใจสั่ง → แชท → ยืนยันออเดอร์ → ติดตามพัสดุ → completed / disputed

### 3.6 Order lifecycle (แนะนำ)

```
inquiry → agreed → [awaiting_payment] → confirmed
  → preparing | in_production (preorder)
  → shipped → delivered → completed
  ↘ cancelled | refunded | disputed
```

แอดมินไม่ดูทุกออเดอร์ — ดูเฉพาะค้างส่ง, ไม่มี tracking, disputed, anomaly

### 3.7 Art-only enforcement

1. Taxonomy จำกัด (painting, print, digital_print, craft, sculpture, …)  
2. Seller attestation  
3. L0 gate  
4. AI pre-check (คะแนน art vs “น่าจะจ้างบริการ”)  
5. Auto-publish ถ้าคะแนนสูง / คิวมนุษย์ถ้ากลาง–ต่ำ  
6. User report + admin pause/reject  

Listing แรกหลัง KYC ใหม่ → บังคับคิวมนุษย์ N ชิ้นแรก (ลดความเสี่ยง)

### 3.8 Payments (เฟส)

| Phase | เงิน | หมายเหตุ |
|-------|------|----------|
| A | คุยในแชท / โอนนอกระบบ + ออเดอร์+tracking ในแพลตฟอร์ม | เปิดตัวเร็ว; disclaimer + report สำคัญ |
| B | Checkout ในแพลตฟอร์ม (Omise/Stripe ตามทิศ Aplus1 ตอนนั้น) | บังคับ billing/บัญชีเพิ่ม (แนว hire readiness) |
| C | Hold/release เบาๆ | หลัง ops นิ่ง |

### 3.9 โมดูลข้อมูล (conceptual)

- `art_shops`, `art_listings`, `art_orders`, `art_order_shipments`  
- reuse: conversations, notifications, KYC, projects, report/moderation  
- **อย่า** reuse ตาราง `creator_services` เป็นสินค้า

### 3.10 Shop build phases

| | สิ่งที่เปิด |
|--|------------|
| P0 | L0 gate, listing CRUD, shop บนโปรไฟล์, chat→order, tracking อัปเอง, taxonomy, report |
| P1 | Admin Shop Ops คิว, auto-publish threshold, pause rules, preorder fields ครบ |
| P2 | เพย์เมนต์ในแพลตฟอร์ม + refund พื้นฐาน |
| P3 | Explore shop, reviews สินค้า, soft escrow |

### 3.11 Metrics

- % seller ที่ผ่าน L0 แล้วลงขายจริง  
- % listing auto-published vs human review  
- ออเดอร์ถึง `shipped` พร้อม tracking  
- Report “ไม่ใช่งานอาร์ต” / dispute rate  

---

## 4. Art Auction — ประมูลงานศิลปะ

> **ลงรายละเอียดเต็มเมื่อ Shop นิ่งแล้ว** — ส่วนนี้เป็นโครงและบทเรียนจากตลาดเท่านั้น

### 4.1 ทำไมอยู่หลัง Shop

ประมูลใช้โครงสร้างเดียวกับออเดอร์/ส่งของ/KYC/moderation ของ Shop  
ถ้ายังไม่มีร้าน การประมูลจะกลายเป็นระบบขนานที่ดูแลยาก

### 4.2 สองโลกที่คนเรียกว่าประมูล

| แบบเฟสบุ๊ค / Live คอมเมนต์ | แบบแพลตฟอร์ม (Artsy, บ้านประมูลออนไลน์) |
|------------------------------|----------------------------------------|
| กติกาในโพสต์, บิดในคอมเมนต์ | กติกาในระบบ, ledger บิด |
| คนขายไล่ราคาเอง | นาฬิกา + increment + soft close |
| ชนะแล้วทักแชทโอน | ชนะ → ออเดอร์/invoice → ส่งของ |

Aplus1 เก็บ **ความรู้สึกแข่งราคา** ของเฟสบุ๊ค แต่ backend เป็น **timed auction จริง** แล้วไหลเข้า order pipeline ของ Shop

### 4.3 กลไกมาตรฐานที่ควรรู้ (ตอนลงลึก)

- English timed auction + bid increment  
- Soft close / popcorn (ยืดเวลาเมื่อมีบิดช่วงท้าย)  
- Proxy / max bid (ฝากเพดาน) — เฟสถัดไป  
- Reserve (ราคาขั้นต่ำ) — เฟสถัดไป  
- Buy Now คู่ประมูล — optional  
- Bids binding + outbid notify  
- KYC / registration ก่อนบิด  

### 4.4 Auction build phases (เมื่อถึงเวลา)

| | ทำอะไร |
|--|--------|
| A1 MVP | Timed ต่อชิ้น, increment, soft close, starting price, KYC ก่อนบิด, ชนะ→ออเดอร์ Shop |
| A2 | Proxy max-bid, cascade หลายล็อต, push outbid |
| A3 | Reserve, Buy Now คู่ประมูล, live room |
| เลื่อน | คลังกลาง, escrow หนัก, โหมดบ้านประมูลใหญ่ |

### 4.5 ความเสี่ยงเฉพาะ

Bid-then-ghost, shill bidding, sniping (แก้ด้วย soft close), realtime แหล่งความจริงเดียวของราคาปัจจุบัน

---

## 5. Live — ไลฟ์กลุ่มทำงานศิลปะ

### 5.1 Intent (ตามที่ตกลง)

ไม่ใช่ไลฟ์ขายของทั่วไปเป็นหลัก  
เจาะ **กลุ่มทำงานศิลปะ** — ไลฟ์/ห้องที่ช่วย **หาเพื่อนทำงานด้วยกัน**, collab, แชร์กระบวนการทำงาน

### 5.2 วางตำแหน่ง

- หลัง Shop (และน่าจะหลัง/คู่กับ Auction แบบช้า)  
- เชื่อมโปรไฟล์, พอร์ต, แชท, โอกาส collab  
- อย่าให้กลายเป็นคลิปไวรัลเปล่าๆ ที่ไม่เกี่ยวกับงาน

### 5.3 เมื่อถึงเวลาออกแบบลึก

ควรตอบ: โฮสต์คือใคร, กติกาห้อง, การจับคู่/ค้นหา, safety/report, บันทึก/ไม่บันทึก, เชื่อมไป hire/collab ยังไง

*(รายละเอียด UX/สคีมา — ยังไม่ล็อกในเอกสารนี้)*

---

## 6. Courses — คอร์สออกแบบและศิลปะ

### 6.1 สถานะ

ไอเดียอนาคตไกล — **ยังไม่สเปก**

### 6.2 ทิศทางคร่าวๆ (ไม่ผูกมัด)

- คอร์สจากครีเอเตอร์ที่มีพอร์ตจริงบน Aplus1  
- อาจผูก proof / KYC คล้าย Shop  
- อย่าสร้าง LMS ใหญ่ก่อนมี demand ชัด

กลับมาเปิดหัวข้อนี้เมื่อ P1–P4 มีฐานผู้ใช้และ ops ไหว

---

## 7. Ops — แอดมินน้อยคน + AI ผู้ช่วย

เป้าหมาย: **แอดมิน 1–2 คน** ดูแลคุณภาพได้ เพราะระบบกรองงานให้เหลือเคสที่ต้องตัดสินใจ

### 7.1 หลักการ

- AI = triage / สรุป / anomaly — **ไม่ใช่** แบนถาวรหรืออนุมัติเงินคนเดียวโดยไม่มี audit  
- รวมคิวเป็น **Shop Ops** (และขยายเป็น Commerce Ops เมื่อมีประมูล) แทนการกระจาย 10 เมนู  
- Auto-rules ก่อนถึงคน; มนุษย์กด approve / reject / pause / request changes

### 7.2 คิวเช้าแนะนำ (เมื่อมี Shop)

| คิว | ใคร |
|-----|-----|
| KYC pending | มนุษย์ (reuse Admin KYC) |
| Listing review (AI กลาง–ต่ำ / ชิ้นแรก) | มนุษย์ + คำแนะนำ AI |
| Report ไม่ใช่งานอาร์ต / สแปม | มนุษย์ |
| Copyright | มนุษย์ |
| Disputes | มนุษย์ |
| Risk digest ประจำวัน | มนุษย์ดู severity สูง |

เป้า: คิวรวมเคลียร์ได้ใน ~15–30 นาที/เช้า เมื่อ volume ยังไม่ใหญ่

### 7.3 AI jobs ที่คุ้ม

- Art vs service-intent classifier  
- Listing quality checklist  
- Duplicate/spam  
- Report triage สรุปภาษาไทย  
- Dispute brief (privacy-aware)  
- Daily risk digest  
- Seller coach หลังถูก reject (ชี้นำไป Package ถ้าเป็นงานจ้าง)

### 7.4 สุขภาพระบบ

- Auto-publish สูง + dispute ต่ำ + override rate ของแอดมินต่อ AI อยู่ในเกณฑ์ที่อธิบายได้

Reuse ทิศทาง: `/admin/*` ที่มีอยู่, moderation_actions, AdminAiMonitor, community safety skill

---

## 8. ขอบเขตโดเมน (อย่าปน)

```
Hire / Opportunity chat  → คุยจากผลงาน / จ้างโปรเจกต์
Package (creator_services) → บริการแพ็กเกจ
Jobs board               → ประกาศเปิดรับหลายคน
Art Shop                 → สินค้าอาร์ต (ready | preorder)
Art Auction              → ประมูลชิ้นงาน → ออเดอร์แบบ Shop
Live                     → ห้อง/ไลฟ์ collab ทำงานศิลปะ
Courses                  → เรียน (อนาคต)
```

Discovery หลักของผลิตภัณฑ์ **ไม่** กลายเป็น shop-first หรือ price-first  
Shop/Auction อยู่ใต้โปรไฟล์/พอร์ตเป็นหลักในเฟสแรก

---

## 9. Decision log

บันทึกจากเจ้าของผลิตภัณฑ์ (2026-07-31):

1. จะมีระบบ **สินค้าอาร์ต** — ไม่ขายทุกอย่าง; มีการตรวจสอบ art-only  
2. ต้องมี **ผลงานเผยแพร่ก่อน** ถึงขายได้ (ecosystem proof) — แนวเดียวกับแพ็กเกจที่ต้องมีอ้างอิง  
3. เพิ่ม: ต้อง **KYC ผ่าน** ด้วย ถึงลงสินค้าได้ (มาตรฐาน L0 = ผลงาน + KYC)  
4. สินค้าตั้งได้ **พร้อมขาย | พรีออเดอร์** — เป็นสินค้า ไม่ใช่งานจ้างวาด; **แยก Package ชัด**  
5. ขาย: ลงขาย → แชทลูกค้า → สั่ง/สรุปออเดอร์ → ส่งเอง → อัป tracking; ระบบออเดอร์ครบในระยะยาว  
6. แอดมิน 1–2 คนไหวด้วย **ออกแบบคิว + AI ผู้ช่วยแพลตฟอร์ม**  
7. **ประมูล** มีในอนาคต แต่ **ตามหลัง Shop**; รายละเอียดลึกค่อยทำตอนนั้น (แรงบันดาลใจเฟสบุ๊ค + กติกาแพลตฟอร์มจริง)  
8. หลังนั้นมี **ไลฟ์** เจาะกลุ่มทำงานศิลปะ / หาเพื่อนทำงาน  
9. **คอร์ส** ออกแบบ–ศิลปะ = ไกล ค่อยว่ากัน  
10. **ก่อนมีระบบสินค้า:** เปิดใช้ **บอร์ดประกาศงาน** ที่มีอยู่แล้ว หลังเปิดเว็บได้สักระยะ แล้วค่อยลงลึก  
11. เปิดตัว Shop โดยประมาณ **หลังแอปเสร็จ** (ปีหน้า / สิ้นปีนี้ถ้าทัน)

---

## 10. Code pointers

ของที่มีอยู่แล้วที่เกี่ยวข้อง (ไม่ใช่ implementation ของ Shop):

| พื้นที่ | ตัวชี้ |
|--------|--------|
| ประกาศงาน | `src/pages/JobsPage.tsx`, `src/components/jobs/PostOpportunityForm.tsx`, `/jobs` |
| แพ็กเกจบริการ | `src/hooks/useCreatorServices.ts`, `ServiceEditorDialog`, legal `/legal/packages` |
| KYC | `src/hooks/useKyc.ts`, `src/lib/kycIdentity.ts`, Admin KYC |
| Published project gate | `src/hooks/useHasPublishedProject.ts` |
| Hire seller readiness (เข้มกว่า L0 Shop) | `src/hooks/useHireSellerReadiness.ts` |
| Creator eligibility (PX ฯลฯ) | `src/hooks/useCreatorEligibility.ts` |
| Moderation / reports | AdminReports, AdminModeration, community safety skill |
| AI admin | `AdminAiMonitorPage` |

เมื่อเริ่ม implement Shop: สร้างโมดูล/`art_*` ใหม่ + readiness แยกจาก package publish validation

---

## 11. สิ่งที่เอกสารนี้จงใจยังไม่ล็อก

- Schema SQL ละเอียดของ Shop/Auction  
- ค่า fee / commission  
- UI pixel-perfect  
- Live room protocol  
- Course LMS structure  

เปิดหัวข้อย่อยหรือไฟล์ `aplus1-art-shop-spec.md` เมื่อเข้า P2 จริง

---

## 12. Cursor handoff (เมื่อเริ่มงาน)

ก่อนลงมือ:

1. อ่านหัวข้อที่เกี่ยวข้องในไฟล์นี้ + PRD ปัจจุบัน  
2. ยืนยันว่า phase ตรงลำดับในหัวข้อ 1  
3. ไม่ทำให้ discovery เป็น shop/price-first  
4. Gate และโดเมนแยกตามหัวข้อ 3 และ 8  
5. Ops คิดแบบคิวสั้น + AI assist ตามหัวข้อ 7  

ตัวอย่าง prompt:

> Implement Art Shop P0 per `docs/product/aplus1-future-commerce-roadmap.md` section 3. Do not build auction/live/courses. Reuse KYC + published project gates. Keep packages as services only.
