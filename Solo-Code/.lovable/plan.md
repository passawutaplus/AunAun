
## เป้าหมาย
ทำให้ AI scan WHT certificate (50 ทวิ) อ่านไฟล์ราชการไทยจริง (เช่น WTI-20260100009.pdf) ได้ครบและถูก โดยอิงข้อสังเกตจาก 2 ไฟล์ที่อัปโหลดมา

## ปัญหาที่พบในไฟล์จริง (กับ prompt ปัจจุบัน)
1. **PDF 4 หน้าซ้ำกัน** (ฉบับ 1–4) — AI ปัจจุบันอ่านทุกหน้าเปลือง token และอาจสับสน
2. **ปี พ.ศ. + เดือนย่อภาษาไทย** (`31 / ม.ค. / 2569`) — prompt ไม่ได้สั่งแปลงเป็น ค.ศ. → ออกมาเป็น `2569-01-31` หรือว่าง
3. **เลขใบ alphanumeric** (`WTI-20260100009`) — รองรับอยู่แล้ว แต่ไม่ระบุชัด
4. **ประเภทเงินได้เป็นตาราง 6 แถวมี checkbox** — แถวที่ "มีตัวเลข" คือประเภทจริง (ในไฟล์นี้คือแถว 2 = ม.40(2) 20,000 บาท หัก 600) — prompt เดิมไม่ได้อธิบายวิธีอ่านตาราง
5. **whtRate ส่วนใหญ่ไม่พิมพ์ในใบ** — ต้องคำนวณ `whtAmount / grossAmount * 100`
6. **ฟิลด์ที่ขาดและมีประโยชน์**: payerTaxId (มีอยู่), payeeName, payeeTaxId, ฟอร์มที่ยื่น (ภ.ง.ด.1ก/2/3/53), เงื่อนไขผู้จ่าย (หัก/ออกให้)

## ขอบเขตการเปลี่ยนแปลง

### 1) `src/lib/whtScan.functions.ts` — ปรับ prompt + tool schema
- เพิ่มคำสั่ง:
  - "PDF อาจมี 4 ฉบับซ้ำกัน — อ่านจากหน้าแรกพอ ถ้าหน้าแรกเบลอค่อยใช้หน้าถัดไป"
  - แปลง พ.ศ. → ค.ศ. (ลบ 543) และเดือนย่อไทย (ม.ค.–ธ.ค.) → 01–12 ก่อนคืน `issueDate` รูปแบบ `YYYY-MM-DD`
  - วิธีอ่านตารางประเภทเงินได้: ดูแถวที่มีจำนวนเงิน > 0 เป็นหลัก map เลขแถว (1–6) → รหัสมาตรา
  - ถ้า whtRate ไม่ปรากฏ ให้คำนวณจาก grossAmount/whtAmount แล้วปัดเศษเป็น 0.5/1/3/5/10/15
- เพิ่ม field ใน tool schema (optional, default ว่าง): `payeeName`, `payeeTaxId`, `formType` (`pnd1a`|`pnd1a_special`|`pnd2`|`pnd3`|`pnd2a`|`pnd3a`|`pnd53`|`""`), `payerCondition` (`withhold`|`pay_always`|`pay_once`|`other`)
- คงรูปแบบ return เดิมไว้ + field ใหม่ (backward compatible)

### 2) `src/components/dashboard/tax/WhtScanVerifyDialog.tsx` — แสดงฟิลด์ใหม่
- เพิ่ม `payeeName`, `payeeTaxId`, `formType` ใน `WhtDraft` (auto-fill จาก scan, แก้ไขได้)
- แสดงในฟอร์มตรวจสอบเป็นกลุ่ม "ผู้ถูกหักภาษี" + Select "ฟอร์มที่ยื่น" (ใช้กรอกตอน export ภายหลัง)
- ถ้า scan มี `payerTaxId` แสดง read-only ใต้ payerName

### 3) `src/components/dashboard/tax/whtUtils.ts` — เพิ่ม helper
- `parseThaiDate(s: string): string` — รองรับ `31 / ม.ค. / 2569` และรูปอื่นๆ (fallback ฝั่ง client เผื่อ AI ไม่แปลง)
- `inferWhtRate(gross, wht): number` — snap เป็น preset

### 4) `src/components/dashboard/tax/WHTCertificates.tsx` — เก็บข้อมูลเพิ่ม
- ส่งต่อ `payeeTaxId`, `formType` ไป `addIncome` ผ่าน `note` (เพื่อไม่ต้อง migrate DB ในรอบนี้)
- หรือถ้าจะเก็บถาวร → migration เพิ่ม column ใน `incomes` (ดู "นอกขอบเขต" ด้านล่าง)

## รายละเอียดเทคนิค
- Tool calling แบบเดิม (Gemini 2.5 Flash) — ยังเหมาะกับ vision PDF
- Token: เพิ่ม instruction ~150 token, ลด output noise ด้วยการบอกให้ตอบเฉพาะหน้าแรก → ลด token รวม
- ไม่แตะ DB schema / RLS / business logic อื่น

## นอกขอบเขต (ขอ user ยืนยันถ้าจะทำ)
- เพิ่มคอลัมน์ `payee_tax_id`, `form_type` ใน table `incomes` (ต้อง migration) — ตอนนี้เก็บใน note ก่อน
- Auto-fill "ผู้ถูกหักภาษี" จาก profile ของ user

## ไฟล์ที่แก้
- `src/lib/whtScan.functions.ts`
- `src/components/dashboard/tax/whtUtils.ts`
- `src/components/dashboard/tax/WhtScanVerifyDialog.tsx`
- `src/components/dashboard/tax/WHTCertificates.tsx`
