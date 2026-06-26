# So1o Freelancer — Roadmap & Competitive Landscape

อัปเดต: มิถุนายน 2569 (Q2 2026)

## Product split (ecosystem)

| Product | URL | บทบาท |
|---------|-----|--------|
| **So1o Freelancer (My Desk)** | solofreelancer.com | หลังบ้าน: ลูกค้า, ใบเสนอราคา, งาน, การเงิน, ภาษี, Brief, Labs |
| **an1hem Showcase** | [an1hem.app](https://an1hem.app) (demo: [aplus1-demo.vercel.app](https://aplus1-demo.vercel.app)) | หน้าร้าน: ฟีดผลงานชุมชนสไตล์ Pinterest |
| **Free Quotation (legacy)** | freelance-invoice-taupe.vercel.app | เครื่องมือใบเสนอราคาออนไลน์แยก (จะรวมเข้า My Desk ในอนาคต) |

---

## คู่แข่งหลัก (สรุป)

### ระดับโลก — Client workflow & payments

| | [HoneyBook](https://www.honeybook.com/) | [Bonsai](https://www.hellobonsai.com/) | **So1o** |
|---|--------|---------|----------|
| กลุ่มเป้า | Creative freelancers (US/EU) | Freelancers + agencies | ฟรีแลนซ์ไทย สายดีไซน์/กราฟิก |
| ใบเสนอราคา / สัญญา | แข็งมาก | แข็งมาก | มี Quotation + Brief PDF |
| รับชำระออนไลน์ | Stripe, schedules | ใช่ | Stripe สำหรับ **subscription** ยังไม่ครบ **client payment** |
| CRM / Pipeline | ใช่ | ใช่ | CRM + Job tracker |
| ภาษีไทย / 50 ทวิ | ไม่ | ไม่ | **จุดแข็งหลัก** |
| Creative tools | จำกัด | จำกัด | **Labs, Color, Vision, AI Mentor** |
| ราคา | ~$19–79/mo USD | ~$21–79/mo USD | Free + Pro ~249฿ (beta) |

### ระดับไทย — บัญชี & ใบกำกับ

| | [FlowAccount](https://flowaccount.com/) | [Peak](https://peakaccount.com/) | **So1o** |
|---|----------|------|----------|
| โฟกัส | บัญชี SME, ใบกำกับ, ภาษี | บัญชี + payroll | ฟรีแลนซ์คนเดียว |
| ใบเสนอราคา | ใช่ (ธุรกิจ) | ใช่ | ใช่ (งานครีเอทีฟ) |
| Brief / revision | ไม่ | ไม่ | **Feedback + Brief** |
| ภาษีบุคคลธรรมดา freelancer | บางส่วน | บางส่วน | **ประมาณการ + WHT** |
| ราคา | หลักร้อย–พันบาท/เดือน | คล้ายกัน | เริ่มฟรี |

**Positioning ที่ชัด:** So1o = *Freelance OS ไทย* ไม่แข่ง FlowAccount ตรงๆ แต่แข่ง “Excel + Line + นักบัญชี” ของฟรีแลนซ์

---

## สิ่งที่มีแล้ว (baseline)

- Auth (email, Google, Apple), onboarding survey, PDPA export/delete
- Dashboard: Job tracker, Quotation/Invoice/Receipt, รายได้/ภาษีแยกหน้า, Subs tracker
- CRM clients, Suppliers, Assets (brand kit)
- Smart Brief + public links (brief, track, planner, vision)
- Content planner, Feedback rounds
- Creative Labs, Inspire (curated links)
- AI: price calculator, mentor, brief assist, WHT scan, tax simulator
- Stripe subscription + credits, admin mission control
- PWA, blog, legal pages

---

## Roadmap รายไตรมาส

### Q3 2026 — ความชัด + ลูปเก็บเงิน

**เป้า:** ลด confusion หลังสมัคร, เพิ่ม conversion จากใบเสนอราคา → เงินเข้า

| รายการ | ประเภท |
|--------|--------|
| Onboarding 3 ขั้น (แบรนด์ → ลูกค้าแรก → ใบเสนอราคาแรก) | Product |
| Help Center / คู่มือภาษีไทย + วิธีใช้ Brief | Content |
| ลิงก์ an1hem ชัดจาก Landing/Footer (ทำแล้ว) | Marketing |
| ปุ่มติดตามหนี้ → Quotation; แยกรายได้/ภาษี (ทำแล้ว) | UX |
| อีเมลแจ้งลูกค้าเมื่อส่งใบเสนอราคา / ใกล้ครบกำหนดชำระ | Product |
| E2E ทดสอบ flow: quotation → income → tax | Engineering |
| Sentry / error monitoring | Engineering |
| เปิด Stripe Pro checkout (sandbox live — ดู `docs/stripe.md`) | Monetization |

### Q4 2026 — Client experience

**เป้า:** ลูกค้างานจ่ายและ approve ได้ง่ายขึ้น

| รายการ | ประเภท |
|--------|--------|
| Client portal เดียว (งาน + ใบเสนอราคา + สถานะชำระ) | Product |
| Approve quotation ออนไลน์ (ลายเซ็น/คลิกยอมรับ) | Product |
| Payment link / QR สำหรับมัดจำ (PromptPay หรือ Stripe) | Product |
| รวมเครื่องมือ quotation ภายนอกเข้า My Desk | Product |
| Export ชุดภาษีส่งนักบัญชี (PDF/Excel มาตรฐาน) | Product |
| Public changelog | Growth |

### Q1 2027 — ทีม & ecosystem

**เป้า:** In-House ที่ขายได้จริง + เชื่อม an1hem

| รายการ | ประเภท |
|--------|--------|
| Workspace: เชิญสมาชิก, role viewer/editor/admin | Product |
| Shared asset library ข้าม user | Product |
| SSO ลิงก์โปรไฟล์ My Desk ↔ an1hem | Ecosystem |
| Figma plugin หรือ import palette → Assets | Creative |
| Webhook / Zapier (งานใหม่ → Line) | Platform |

### Q2 2027 — Scale & trust

| รายการ | ประเภท |
|--------|--------|
| 2FA, session management | Security |
| Status page | Ops |
| FlowAccount/Peak export (หรือ API พันธมิตร) | Integrations |
| Time tracking → คำนวณราคา | Product |
| EN marketing (optional) | Growth |

---

## ลำดับความสำคัญ (ถ้าทีมเล็ก)

1. Onboarding + Help  
2. Client payment & reminders  
3. Quality (E2E, monitoring)  
4. เปิด Pro billing  
5. In-House workspace  
6. an1hem deep link (โปรไฟล์เดียว)

---

## ไฟล์ที่เกี่ยวข้อง

- ลิงก์ภายนอก: [`src/lib/productLinks.ts`](../src/lib/productLinks.ts)
- จำกัดแผน Free: [`src/lib/planLimits.ts`](../src/lib/planLimits.ts)
- ราคา: [`src/routes/pricing.tsx`](../src/routes/pricing.tsx)
