# Meeting Capture MVP — แผนงานฉบับสมบูรณ์

> เอกสารสรุปจากการวางแผน So1o Freelancer (My Desk)  
> อัปเดต: มิถุนายน 2026  
> หมวด: **Client Work → Smart Brief**  
> สถานะ: **Launched** (มิ.ย. 2026 — migration applied, QA automated passed)

---

## สารบัญ

1. [ภาพรวม & Positioning](#1-ภาพรวม--positioning)
2. [ทำไมทำเอง ไม่ embed Otter/Fireflies](#2-ทำไมทำเอง-ไม่-embed-otterfireflies)
3. [User Journey & UI](#3-user-journey--ui)
4. [สถาปัตยกรรมเทคนิค](#4-สถาปัตยกรรมเทคนิค)
5. [Database & Storage](#5-database--storage)
6. [Server Functions & Pipeline AI](#6-server-functions--pipeline-ai)
7. [ระบบเครดิต AI](#7-ระบบเครดิต-ai)
8. [AI Quality Contract (Medium/Heavy)](#8-ai-quality-contract-mediumheavy)
9. [PDPA & ความปลอดภัย](#9-pdpa--ความปลอดภัย)
10. [ข้อจำกัด Browser/Device](#10-ข้อจำกัด-browserdevice)
11. [MVP Scope vs Post-MVP](#11-mvp-scope-vs-post-mvp)
12. [ลำดับ Implement](#12-ลำดับ-implement)
13. [ไฟล์ที่ต้องสร้าง/แก้](#13-ไฟล์ที่ต้องสร้างแก้)
14. [Copy ภาษาไทย (UI)](#14-copy-ภาษาไทย-ui)
15. [เกณฑ์ทดสอบก่อน Launch](#15-เกณฑ์ทดสอบก่อน-launch)
16. [อ้างอิงโค้ดที่มีอยู่](#16-อ้างอิงโค้ดที่มีอยู่)

---

## 1. ภาพรวม & Positioning

### ปัญหาที่แก้

ฟรีแลนซ์ประชุมลูกค้า (หน้างาน / ออนไลน์) แล้วต้องจดบันทึก → สรุปบรีฟ → ทำใบเสนอราคา ใช้เวลามาก

### คุณค่าที่ขาย (ไม่ใช่แค่ถอดเสียง)

```
ประชุมจบ → ได้บรีฟ structured → สร้างใบเสนอราคาได้เลย
```

### จุดวางในแอป

```
Client Work (sidebar)
├── Pipeline
├── Smart Brief          ← เพิ่ม entry "Meeting Capture" ตรงนี้
├── Quotation
└── Job Tracker
```

**ไม่สร้างเมนูใหม่** — ต่อจาก Smart Brief / Quick Capture ที่มีอยู่

### ชื่อในแอป (แนะนำ)

- **EN:** Meeting Capture
- **TH:** จดประชุม AI
- **Subtitle:** อัดหรืออัปโหลด → ได้บรีฟพร้อมใบเสนอราคา

### กลยุทธ์ Build vs Buy

| ทางเลือก | คำตอบ |
|----------|--------|
| Embed Otter / Fireflies / Notta | ❌ ไม่ทำเป็นหลัก — API แพง, data นอกระบบ, ภาษาไทยไม่ใช่จุดแข็ง |
| Pipeline เอง 80% | ✅ Gemini audio + prompt `aiBriefExtract` ที่มี |
| รับ output จากภายนอก 20% | ✅ paste/upload transcript จาก Otter (Phase 2) |
| Zoom bot real-time | ❌ อย่าทำใน MVP |

---

## 2. ทำไมทำเอง ไม่ embed Otter/Fireflies

| เครื่องมือ | เหมาะ user ใช้เอง | เหมาะ embed ใน So1o |
|-----------|-------------------|---------------------|
| Otter / Fireflies | Zoom/Teams บ่อย | API enterprise, แพง, ไทยอ่อน |
| Notta / Transkriptor | อัปโหลดไฟล์ | user จ่ายแยก, map Brief ยาก |
| NotebookLM | อ่านเอกสาร | ไม่มี API embed |

**So1o มีครึ่งทางแล้ว:** `aiBriefExtract` แปลงข้อความ/รูป → JSON บรีฟ 10 หมวด  
**สิ่งที่ขาด:** ชั้น audio/video input

---

## 3. User Journey & UI

### Flow หลัก

```
Smart Brief landing
  → การ์ด "Meeting Capture"
  → เลือกโหมด
      ├── ประชุมหน้างาน (มือถือ/แท็บเล็ต)
      └── ประชุมออนไลน์ (PC)
  → Capture (อัด / อัปโหลด)
  → [ฟรี] Preflight ตรวจไฟล์
  → [Phase 1] ถอดเสียง → แสดง Transcript (แก้ได้)
  → user กด "สรุปเป็นบรีฟ"
  → AI Extract → Review Structured Brief
  → บันทึก Smart Brief / สร้างใบเสนอราคา
```

### ขั้น 0 — BriefsTab landing

เพิ่มการ์ดที่ 3 ข้าง Quick Capture:

```
┌─────────────────────┬─────────────────────┬─────────────────────┐
│ AI Quick Capture    │ Meeting Capture  🎙️ │ บรีฟเปล่า           │
│ แคปแชท/รูปอ้างอิง   │ อัด/อัปโหลดประชุม   │ กรอกเอง             │
└─────────────────────┴─────────────────────┴─────────────────────┘
```

### ขั้น 1 — เลือกสถานการณ์

```
┌──────────────────────────────────────────────┐
│  Meeting Capture / จดประชุม AI               │
├──────────────────────────────────────────────┤
│  📍 ประชุมหน้างาน                             │
│  อัปโหลดไฟล์เสียง หรืออัดเสียงในแอป            │
│  เหมาะ: คุยลูกค้าที่ร้าน / café / onsite      │
├──────────────────────────────────────────────┤
│  💻 ประชุมออนไลน์                             │
│  อัดหน้าจอ+เสียง หรืออัปโหลดวิดีโอ            │
│  เหมาะ: Zoom / Meet / Teams บน PC             │
└──────────────────────────────────────────────┘
```

### ขั้น 2a — หน้างาน (mobile-first)

```
┌──────────────────────────────────────────────┐
│  [← กลับ]  ประชุมหน้างาน                       │
├──────────────────────────────────────────────┤
│  ⚠️ ได้รับอนุญาตบันทึกการสนทนาจากลูกค้าแล้ว     │
│  [checkbox] ยืนยันก่อนอัด/อัปโหลด              │
├──────────────────────────────────────────────┤
│  ┌────────────────────────────────────────┐  │
│  │  🎤  กดเพื่อเริ่มอัดเสียง               │  │
│  │      00:00:00  (max 60 นาที)           │  │
│  └────────────────────────────────────────┘  │
│  — หรือ —                                    │
│  [  📁 อัปโหลดไฟล์เสียง ]                     │
│  .m4a .mp3 .wav .webm  สูงสุด 60 นาที        │
├──────────────────────────────────────────────┤
│  ชื่องาน (optional): [________________]        │
│  ลูกค้า (optional):  [เลือกจาก CRM ▼]         │
└──────────────────────────────────────────────┘
```

### ขั้น 2b — ออนไลน์ (PC-first)

```
┌──────────────────────────────────────────────┐
│  [← กลับ]  ประชุมออนไลน์                      │
├──────────────────────────────────────────────┤
│  💡 เลือกแท็บ Meet/Zoom แล้วติ๊ก "แชร์เสียงแท็บ" │
├──────────────────────────────────────────────┤
│  ┌────────────────────────────────────────┐  │
│  │  🖥️  เริ่มอัดหน้าจอ + เสียง              │  │
│  │      ⏺ REC  00:00:00                   │  │
│  └────────────────────────────────────────┘  │
│  — หรือ —                                    │
│  [  📁 อัปโหลดวิดีโอ ]  .mp4 .webm            │
│  สูงสุด 500MB / 90 นาที                      │
├──────────────────────────────────────────────┤
│  [checkbox] ได้รับอนุญาตบันทึกแล้ว             │
└──────────────────────────────────────────────┘
```

**ถ้า `getAudioTracks().length === 0` หลังเลือกหน้าจอ:**  
toast: *"ไม่พบเสียงแท็บ — เลือกแท็บประชุมและติ๊ก Share tab audio"*

### ขั้น 3 — Processing

```
┌──────────────────────────────────────────────┐
│  กำลังถอดเสียง…                               │
│  ████████░░░░  65%                           │
│  ✓ อัปโหลดเสร็จ                               │
│  ◌ ถอดเสียงเป็นข้อความ                          │
│  ประมาณ 2–5 นาที · ปิดหน้านี้ได้              │
└──────────────────────────────────────────────┘
```

### ขั้น 4 — Transcript Review (สำคัญ — ก่อนหักเครดิตเต็ม)

```
┌──────────────────────────────────────────────┐
│  📝 ถอดเสียงแล้ว — ตรวจและแก้ชื่อ/ตัวเลขก่อนสรุป │
│  [Textarea แก้ transcript ได้]                │
│  ใช้ ~3 เครดิต (ถอดเสียง) · เหลือ ~15 สำหรับบรีฟ │
│  [ สรุปเป็นบรีฟ → ]                           │
└──────────────────────────────────────────────┘
```

### ขั้น 5 — Brief Review (reuse Quick Capture)

- Structured Brief 10 หมวด (แก้ได้)
- Confidence badge ต่อฟิลด์ (✓ / ⚠ / ?)
- Red Flags + คำถามต้องเคลียร์
- ปุ่ม: `บันทึกเป็นบรีฟ` | `สร้างใบเสนอราคา`

---

## 4. สถาปัตยกรรมเทคนิค

### Sequence

```
UI (MeetingCapturePanel)
  → uploadMeetingMedia.ts → Supabase Storage (meeting-captures)
  → insert meeting_captures (status=processing)
  → aiMeetingTranscribe.functions.ts
      → Gemini audio input → transcript
  → user แก้ transcript
  → aiMeetingBriefExtract.functions.ts
      → reuse buildBriefExtractPrompt() + transcript
      → AiBriefExtractResult JSON
  → qualityGate() → อาจ auto-retry 1 ครั้ง
  → debit_ai_credits (ตาม duration + phase)
  → UI review → save brief / quotation
```

### Reuse จากโค้ดเดิม

| ส่วน | ไฟล์เดิม |
|------|----------|
| Brief JSON schema + prompt | `src/lib/aiBriefExtract.functions.ts` |
| Save brief logic | `QuickCapturePanel.saveAsBrief()` → แยกเป็น `briefFromExtractResult()` |
| Gemini multimodal | `src/lib/geminiServer.ts` (`geminiChatWithParts`) |
| AI credits | `src/lib/aiCreditsServer.ts` |
| Upload pattern | `src/components/dashboard/briefs/uploadReference.ts` |
| Red flags pattern | `src/components/dashboard/briefs/AiAnalysisSheet.tsx` |

### โมเดล AI

| ขั้น | โมเดล | หมายเหตุ |
|------|-------|----------|
| Transcribe | `gemini-2.5-flash` (audio) | มี `GEMINI_API_KEY` แล้ว |
| Brief extract | `gemini-2.5-flash` + JSON mode | prompt เดิม `aiBriefExtract` |
| Fallback ไทยไม่พอ | OpenAI Whisper API | Phase 2 — เฉพาะ transcribe |

**วิดีโอ MVP:** ดึง audio track ก่อนส่ง Gemini (ถูกกว่าส่งวิดีโอเต็ม)  
**Server-side extract audio:** Phase 2 (ffmpeg) — MVP ให้ browser บันทึก audio+video แต่ upload audio เป็นหลัก

### ไฟล์ใหม่

| ไฟล์ | หน้าที่ |
|------|--------|
| `src/components/dashboard/briefs/MeetingCapturePanel.tsx` | UI หลัก |
| `src/components/dashboard/briefs/useMediaRecorder.ts` | hook อัดเสียง/หน้าจอ |
| `src/lib/uploadMeetingMedia.ts` | อัปโหลด storage |
| `src/lib/meetingCaptureSchema.ts` | types, limits, enums |
| `src/lib/briefExtractPrompt.ts` | แยก SYSTEM_PROMPT จาก aiBriefExtract |
| `src/lib/briefFromExtractResult.ts` | แยก save logic จาก QuickCapturePanel |
| `src/lib/aiMeetingTranscribe.functions.ts` | transcribe only |
| `src/lib/aiMeetingBriefExtract.functions.ts` | extract จาก transcript |
| `src/lib/meetingQualityGate.ts` | quality check + retry logic |
| `supabase/migrations/YYYYMMDD_meeting_captures.sql` | table + bucket |

---

## 5. Database & Storage

### Table: `meeting_captures`

```sql
CREATE TABLE public.meeting_captures (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id       uuid REFERENCES saved_clients(id) ON DELETE SET NULL,
  title           text,
  source_type     text NOT NULL CHECK (source_type IN (
    'audio_upload', 'audio_record', 'video_upload', 'video_record'
  )),
  media_path      text,
  media_mime      text,
  duration_sec    integer,
  file_size_bytes bigint,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'uploading', 'transcribing', 'transcribed',
    'extracting', 'ready', 'failed'
  )),
  transcript      text,
  summary_bullets text[],
  extract_result  jsonb,          -- AiBriefExtractResult
  quality_score   numeric(3,2),    -- 0.00–1.00
  brief_id        uuid REFERENCES design_briefs(id) ON DELETE SET NULL,
  error_message   text,
  credits_transcribe integer DEFAULT 0,
  credits_extract    integer DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- RLS: auth.uid() = user_id
-- GRANT authenticated + service_role ตาม playbook
```

### Storage bucket: `meeting-captures`

- Path: `{userId}/{captureId}/media.{ext}`
- Max size MVP: 100MB audio / 500MB video
- **Retention:** ลบ media 7 วันหลัง `status=ready` (เก็บ transcript + extract_result)
- Cron หรือ edge function สำหรับ cleanup

### AI feature keys (เพิ่มใน `ai_feature_costs`)

```
ai_meeting_transcribe     -- phase 1
ai_meeting_brief_extract  -- phase 2
-- หรือรวมเป็น ai_meeting_capture + คำนวณ dynamic ตาม duration
```

---

## 6. Server Functions & Pipeline AI

### Phase A — Transcribe (`aiMeetingTranscribe`)

**Input:**
```typescript
{
  captureId: string;
  mediaUrl: string;
  sourceType: 'audio_upload' | 'audio_record' | 'video_upload' | 'video_record';
  durationSec?: number;
}
```

**Logic:**
1. `assertAiCreditsAvailable` — transcribe cost
2. `debitAiCredits` — idempotency key `meeting-tx:{captureId}`
3. ส่ง audio เป็น inline part → Gemini
4. System prompt: ถอดเสียงภาษาไทยเป็นข้อความ ไม่สรุป ไม่ตีความ
5. บันทึก `transcript`, `status=transcribed`
6. Error → `refundAiCredits`

**กัน transcript สั้นเกินไป (< 200 คำ):**
- ไม่ไปขั้น extract
- แจ้ง user: *"เสียงสั้นหรือไม่ชัด — ลองอัดใหม่หรือเพิ่มบริบท"*
- refund transcribe credits

### Phase B — Brief Extract (`aiMeetingBriefExtract`)

**Input:**
```typescript
{
  captureId: string;
  transcript: string;  // จาก user-approved transcript
}
```

**Logic:**
1. Reuse `buildBriefExtractPrompt()` จาก `aiBriefExtract`
2. User content: `ข้อความจากการประชุม:\n"""${transcript}"""`
3. `debitAiCredits` — extract cost (ตาม duration tier)
4. `qualityGate(result, transcript)` → ถ้า fail: auto-retry 1 ครั้ง (ไม่หักเพิ่ม)
5. บันทึก `extract_result`, `status=ready`

### Quality Gate (`meetingQualityGate.ts`)

```typescript
// คืน { score, issues, shouldRetry }
// ตรวจ:
// - deliverables ว่างทั้งหมด → shouldRetry=true
// - proposition + goal ว่าง → score < 0.3
// - budget มีค่าแต่ไม่ปรากฏใน transcript → flag "อาจเดา"
// - client.name ไม่ match substring ใน transcript → confidence ต่ำ
```

### Confidence ต่อฟิลด์ (client-side)

```typescript
// ง่าย: substring / fuzzy match กับ transcript
// ✓ พบใน transcript
// ⚠ AI ประมาณจากบริบท
// ? ไม่พบ — กรอกเอง
```

---

## 7. ระบบเครดิต AI

### มูลค์เครดิต (อ้างอิง `plans.ts` + `aiCreditWeights.ts`)

| แผน | เครดิต | บาท/เครดิต (โดยประมาณ) |
|-----|--------|------------------------|
| Free starter | 25 (ครั้งเดียว) | — |
| Pro | 800/รอบบิล | ~0.31฿ |
| Pro+ | 1,400 | ~0.29฿ |
| In-House | 2,000 | ~0.30฿ |
| Top-up 100 | 100 @ 99฿ | 0.99฿ |
| Top-up 500 | 500 @ 399฿ | 0.80฿ |
| Top-up 2000 | 2000 @ 1290฿ | 0.65฿ |

### ฟีเจอร์ AI ปัจจุบัน (tier)

| Tier | เครดิต | ฟีเจอร์ |
|------|--------|---------|
| Light | 1–2 | Mentor, Copy, Legal(2), Planner, Color, Price |
| Medium | 5–8 | Business(5), สัญญา(8), Brief รูป(8) |
| Heavy | 10 | Quick Capture, Anthem brief จากแชท |
| **Heavy+** | **12–30** | **Meeting Capture (ใหม่)** |

### ต้นทุน API Meeting (Gemini 2.5 Flash, ~36฿/USD)

| ความยาว | Audio tokens (~32/s) | ต้นทุน API รวม |
|---------|---------------------|----------------|
| 15 นาที | ~28,800 | ~1.2฿ |
| 30 นาที | ~57,600 | ~2.4฿ |
| 45 นาที | ~86,400 | ~3.5฿ |
| 60 นาที | ~115,200 | ~4.6฿ |

### ราคาเครดิตที่แนะนำ — 2-Phase Billing

#### Phase 1: Transcribe

| ความยาว | เครดิต |
|---------|--------|
| ≤ 15 นาที | **3** |
| 16–30 นาที | **4** |
| 31–45 นาที | **5** |
| 46–60 นาที | **6** |

#### Phase 2: Brief Extract (หลัง user approve transcript)

| ความยาว | เครดิต |
|---------|--------|
| ≤ 15 นาที | **9** |
| 16–30 นาที | **14** |
| 31–45 นาที | **19** |
| 46–60 นาที | **24** |

#### รวมทั้ง flow

| ความยาว | Transcribe | Extract | **รวม** |
|---------|-----------|---------|---------|
| ≤ 15 นาที | 3 | 9 | **12** |
| 16–30 นาที | 4 | 14 | **18** |
| 31–45 นาที | 5 | 19 | **24** |
| 46–60 นาที | 6 | 24 | **30** |

**สูตรย่อ (ถ้ารวม charge ครั้งเดียว):**
```
total = 12 + ceil(duration_min / 15) * 6
cap ที่ 30 credits (60 นาที)
```

### First-time / Free policy

| กลุ่ม | นโยบาย |
|------|--------|
| Free (25 credits) | Meeting ได้ **1 ครั้ง** ≤15 นาที หรือ **ไม่ให้** ใน MVP |
| ครั้งแรกทุกแอคเคาต์ | Transcribe ครั้งแรก **ลด 50%** หรือ extract ครั้งแรก **6 credits** แทน 9 |
| Pro 800 credits | Meeting 30min ได้ ~44 ครั้ง (ถ้าใช้แค่ meeting) |

### Refund policy

| เงื่อนไข | การทำ |
|---------|--------|
| API error / JSON พัง | คืนเต็ม (`refundAiCredits` — มีแล้ว) |
| Transcript ว่าง / < 50 คำ | คืน transcribe เต็ม |
| Extract ว่าง (no deliverables) | คืน extract + auto-retry ฟรี 1 ครั้ง |
| Quality score < 0.3 | แสดงปุ่ม retry ฟรี (ไม่หักเพิ่ม) |
| User กด "ผลใช้ได้" แล้ว | ไม่คืน |
| ไม่พอใจทั่วไป | **1 ครั้ง/เดือน/ฟีเจอร์** retry ฟรี (optional Phase 2) |

### เพิ่มใน `aiCreditWeights.ts`

```typescript
ai_meeting_transcribe: 4,      // base — คำนวณจริงตาม duration ใน server
ai_meeting_brief_extract: 14,  // base
// หรือ
ai_meeting_capture: 18,         // ถ้า charge รวมครั้งเดียว
```

**sync กับ:** `public.ai_feature_costs` migration

---

## 8. AI Quality Contract (Medium/Heavy)

> **Medium/Heavy คือ moment of truth** — พลาดครั้งเดียว user เลิกใช้ทั้งแอป

### สิ่งที่มีแล้ว (รักษาไว้)

- ✅ Prompt `ห้ามมั่ว ห้ามเดา`
- ✅ `refundAiCredits` เมื่อ technical fail
- ✅ แก้ Structured Brief ก่อน save
- ✅ AiAnalysisSheet: Red Flags + คำถามต้องเคลียร์

### สิ่งที่ต้องเพิ่ม (บังคับสำหรับ Meeting + แนะนำ Heavy อื่น)

#### 1. 2-Phase ไม่หักเต็มก่อนเห็นผล

```
อัปโหลด → preflight ฟรี → transcribe (ถูก) → แก้ transcript → extract (ที่เหลือ)
```

#### 2. Expectation copy (ไม่ oversell)

❌ *"AI สรุปบรีฟอัตโนมัติ"*  
✅ *"AI ร่างบรีฟให้ — คุณตรวจและแก้ก่อนส่งลูกค้า"*

#### 3. Confidence badge ต่อฟิลด์

```
ชื่อลูกค้า: ร้าน Bloom     ✓ พบใน transcript
งบประมาณ: 15,000 บาท      ⚠ ประมาณจากบริบท
Deadline: (ว่าง)           ? ไม่พบ — กรอกเอง
```

#### 4. Quality gate + auto-retry 1 ครั้ง

- deliverables ว่าง → retry ฟรี
- ไม่หักเครดิตซ้ำถ้า retry จาก quality fail

#### 5. Red Flags หลัง extract ทุกครั้ง

reuse pattern จาก `AiAnalysisSheet`:
- Action items
- Red flags (scope creep)
- คำถามต้องเคลียร์กับลูกค้า

#### 6. อย่าใส่ Meeting ใน onboarding

ให้ใช้หลังสร้าง quotation / brief แรกสำเร็จ

#### 7. Medium tier เพิ่มเติม

| ฟีเจอร์ | แนวทาง |
|---------|--------|
| Business (5) | แสดง snapshot ที่ AI อ่านให้ user เห็น |
| สัญญา (8) | checklist ก่อน export + disclaimer |
| Brief รูป (8) | thumbnail + ช่องบริบทก่อน analyze |

### AI Contract สรุป

```
เราสัญญา:
✓ ไม่หักเครดิตถ้า technical fail
✓ แก้ทุกฟิลด์ก่อนบันทึก
✓ บอกช่องที่ AI ไม่แน่ใจ
✓ แยก transcript กับ brief (Meeting)
✓ retry ฟรีเมื่อผลว่าง/คุณภาพต่ำ

เราไม่สัญญา:
✗ บรีฟพร้อมส่งลูกค้า 100% โดยไม่ตรวจ
✗ ถอดเสียงไทย perfect ทุกคำ
✗ สัญญาถูกกฎหมายครบ
```

---

## 9. PDPA & ความปลอดภัย

1. **Consent checkbox** ก่อนอัด/อัปโหลด — บังคับ
2. Copy: *"การบันทึกจะถูกประมวลผลด้วย AI บนเซิร์ฟเวอร์ที่เข้ารหัส"*
3. เก็บ media ชั่วคราว — ลบ 7 วันหลัง process
4. Transcript + extract อยู่ใน RLS `user_id` เหมือนข้อมูลอื่น
5. ไม่ส่ง audio ไป third-party โดยไม่แจ้ง (ถ้าใช้ Whisper ต้องอัปเดต privacy policy)
6. ห้ามใช้ recording ฝึกโมเดล (Gemini paid tier: Used to improve products = No)

---

## 10. ข้อจำกัด Browser/Device

| สถานการณ์ | MVP |
|-----------|-----|
| อัดเสียงในแอป (มือถือ PWA) | ✅ |
| อัปโหลดเสียงจาก Voice Memos | ✅ แนะนำ onsite |
| อัดหน้าจอ+เสียง Chrome/Edge PC | ✅ |
| อัดหน้าจอ Safari Mac | ⚠️ เสียงระบบจำกัด |
| อัดหน้าจอมือถือ | ❌ ใช้อัปโหลดเสียงแทน |
| วิดีโอ > 60 นาที | ❌ ปฏิเสธหรือแบ่ง chunk (v2) |
| Real-time transcript | ❌ Post-MVP |
| Zoom/Meet bot | ❌ Q1 2027+ |

### `useMediaRecorder` แนวคิด

```typescript
// Audio (หน้างาน)
getUserMedia({ audio: true }) → MediaRecorder

// Screen (ออนไลน์)
getDisplayMedia({ video: true, audio: true })
+ getUserMedia({ audio: true })  // mic สำรอง
→ รวม tracks → MediaRecorder
→ max 90 นาที auto-stop
```

---

## 11. MVP Scope vs Post-MVP

### ✅ MVP (สัปดาห์ 1–2)

- [ ] การ์ด Meeting Capture ใน `BriefsTab`
- [ ] อัปโหลดไฟล์เสียง (มือถือ + PC)
- [ ] อัดเสียงใน browser
- [ ] อัดหน้าจอ+เสียง (Chrome/Edge PC)
- [ ] อัปโหลดวิดีโอ (PC) — หรือ audio-only จาก recording
- [ ] 2-phase: transcribe → แก้ → extract brief
- [ ] Gemini transcribe + brief extract
- [ ] Review UI reuse Quick Capture + confidence badges
- [ ] บันทึก Smart Brief
- [ ] PDPA consent
- [ ] AI credits ตาม duration + refund on fail
- [ ] Quality gate + 1 free retry

### ❌ Post-MVP

- [ ] Paste/upload transcript จาก Otter/Fireflies
- [ ] ปุ่มสร้างใบเสนอราคา pre-fill เต็มรูปแบบ
- [ ] รายการประวัติ meeting captures แยก
- [ ] Whisper fallback
- [ ] Server-side ffmpeg extract audio จากวิดีโอ
- [ ] Real-time transcript
- [ ] Zoom/Meet bot integration
- [ ] Speaker diarization

---

## 12. ลำดับ Implement

```
สัปดาห์ 1 — Core path (มือถือ + upload)
────────────────────────────────────────
1.  Migration: meeting_captures + storage bucket + RLS
2.  ai_feature_costs: ai_meeting_transcribe, ai_meeting_brief_extract
3.  aiCreditWeights.ts sync
4.  meetingCaptureSchema.ts + uploadMeetingMedia.ts
5.  briefExtractPrompt.ts (แยกจาก aiBriefExtract)
6.  aiMeetingTranscribe.functions.ts
7.  MeetingCapturePanel — โหมดหน้างาน + upload only
8.  Transcript review UI
9.  aiMeetingBriefExtract.functions.ts
10. briefFromExtractResult.ts (แยกจาก QuickCapturePanel)
11. BriefsTab — การ์ด entry + state meetingCapture
12. ทดสอบ: ไฟล์เสียงไทย 5 นาที → brief

สัปดาห์ 2 — PC + quality + polish
────────────────────────────────────────
13. useMediaRecorder.ts — อัดเสียง + อัดหน้าจอ
14. meetingQualityGate.ts + confidence badges
15. Red flags หลัง extract
16. Refund paths ครบ
17. First-time discount logic
18. ทดสอบ: screen record Meet 10 นาที → brief
19. ปุ่ม "สร้างใบเสนอราคา" (basic pre-fill scope_items)
20. Log duration_sec ใน ledger สำหรับปรับราคาทีหลัง
```

---

## 13. ไฟล์ที่ต้องสร้าง/แก้

### สร้างใหม่

```
supabase/migrations/YYYYMMDD_meeting_captures.sql
src/lib/meetingCaptureSchema.ts
src/lib/uploadMeetingMedia.ts
src/lib/briefExtractPrompt.ts
src/lib/briefFromExtractResult.ts
src/lib/meetingQualityGate.ts
src/lib/aiMeetingTranscribe.functions.ts
src/lib/aiMeetingBriefExtract.functions.ts
src/components/dashboard/briefs/MeetingCapturePanel.tsx
src/components/dashboard/briefs/useMediaRecorder.ts
src/components/dashboard/briefs/TranscriptReviewPanel.tsx
src/components/dashboard/briefs/FieldConfidenceBadge.tsx
```

### แก้ไข

```
src/lib/aiCreditWeights.ts
src/lib/aiBriefExtract.functions.ts      — import shared prompt
src/components/dashboard/briefs/BriefsTab.tsx
src/components/dashboard/briefs/QuickCapturePanel.tsx  — ใช้ briefFromExtractResult
src/components/dashboard/layout/DashboardSidebar.tsx   — (optional) ไม่ต้องเพิ่มเมนู
src/components/dashboard/DashboardCommandMenu.tsx    — keyword "meeting"
```

---

## 14. Copy ภาษาไทย (UI)

### การ์ด entry

```
หัวข้อ: จดประชุม AI
คำอธิบาย: อัดหรืออัปโหลดการประชุม → AI ถอดเสียงและร่างบรีฟให้ตรวจแก้ก่อนใช้งาน
```

### Consent

```
ข้อความ: การบันทึกเสียง/วิดีโอจะถูกอัปโหลดและประมวลผลด้วย AI เพื่อถอดเสียงและร่างบรีฟงาน
ฉันได้รับความยินยอมจากลูกค้า/ผู้เข้าร่วมประชุมแล้ว
```

### ก่อนวิเคราะห์

```
AI จะร่างบรีฟจากเนื้อหาที่พบ — ไม่ใช่เอกสารสำเร็จรูป
ชื่อแบรนด์และตัวเลขอาจถอดผิด โปรดตรวจ transcript ก่อนสรุป
ใช้ประมาณ {N} เครดิต
```

### Transcript step

```
ถอดเสียงแล้ว — ตรวจและแก้ชื่อร้าน/ตัวเลขก่อนกดสรุปบรีฟ
```

### Confidence

```
✓ พบในการถอดเสียง
⚠ AI ประมาณจากบริบท — โปรดตรวจสอบ
? ไม่พบข้อมูล — กรอกเอง
```

### Quality fail

```
ผลลัพธ์ไม่ชัดเจนพอ — ลองสรุปใหม่ฟรี (ไม่เสียเครดิตเพิ่ม)
หรือเพิ่มบริบท/อัดเสียงใหม่ที่ชัดกว่า
```

### Empty / สั้นเกินไป

```
เสียงสั้นหรือไม่ชัดเพียงพอ — ไม่สามารถสรุปบรีฟได้
เครดิตถอดเสียงถูกคืนแล้ว
```

---

## 15. เกณฑ์ทดสอบก่อน Launch

### Automated (มิ.ย. 2026)

- [x] Migration `meeting_captures` + storage bucket + AI costs บน Supabase remote
- [x] Cron `/api/public/cron/meeting-capture-cleanup` ปฏิเสธ request ไม่มี auth (401)
- [x] Unit tests: `meetingCredits`, `meetingQualityGate`

### Functional

- [ ] อัปโหลด .m4a ไทย 10 นาที → transcript อ่านได้
- [ ] แก้ transcript → extract → ได้ deliverables ≥ 1
- [ ] อัดเสียงใน Chrome mobile → ได้ผลเหมือน upload
- [ ] อัดหน้าจอ Meet + share tab audio → ได้ transcript
- [ ] ไม่มี tab audio → แจ้งเตือนชัด
- [ ] ไฟล์ > 60 นาที → reject ก่อน upload
- [ ] API fail → refund credits
- [ ] transcript < 50 คำ → refund + ไม่ extract
- [ ] Free user → จำกัดตาม policy
- [ ] บันทึก brief → เปิดใน editor ได้
- [ ] RLS: user A อ่าน capture ของ user B ไม่ได้

### Quality (manual)

- [ ] ชื่อร้านไทยใน transcript ถูก ≥ 70% (ไม่บังคับ auto)
- [ ] งบประมาณไม่มั่วถ้าไม่ได้พูดถึง (ห้ามมั่ว prompt)
- [ ] deliverables ตรงกับที่คุยจริงใน sample 5 ไฟล์

### Performance

- [ ] 15 นาที audio → transcribe < 90 วินาที
- [ ] 30 นาที → transcribe < 3 นาที

---

## 16. อ้างอิงโค้ดที่มีอยู่

| หัวข้อ | Path |
|--------|------|
| Quick Capture UI | `src/components/dashboard/briefs/QuickCapturePanel.tsx` |
| Brief extract API | `src/lib/aiBriefExtract.functions.ts` |
| Brief schema | `src/lib/briefSchema.ts` |
| AI credits | `src/lib/aiCreditWeights.ts`, `src/lib/aiCredits.ts` |
| Credit debit/refund | `src/lib/aiCreditsServer.ts` |
| Gemini server | `src/lib/geminiServer.ts` |
| Upload pattern | `src/components/dashboard/briefs/uploadReference.ts` |
| Briefs tab | `src/components/dashboard/briefs/BriefsTab.tsx` |
| AI analysis / red flags | `src/components/dashboard/briefs/AiAnalysisSheet.tsx` |
| Sidebar Client Work | `src/components/dashboard/layout/DashboardSidebar.tsx` |
| Plans / quotas | `src/data/plans.ts` |
| Feature playbook | `docs/adding-a-feature.md` |
| Gemini env | `docs/ai-gemini.md` |

---

## Quick Reference — ตัวเลขสำคัญ

```
Meeting credits (รวม 2-phase):
  ≤15min: 12  |  ≤30min: 18  |  ≤45min: 24  |  ≤60min: 30

API cost 30min: ~2.4฿  |  Margin Pro @ 18cr: ~55%

Quick Capture: 10 credits (เทียบ)
Free starter: 25 credits (ครั้งเดียว)
Pro: 800 credits/รอบบิล @ 249฿

Stack: Gemini 2.5 Flash (audio + JSON) — ไม่เพิ่ม vendor ใน MVP
```

---

*จบเอกสาร — พร้อม handoff ไป @AunAun implement*
