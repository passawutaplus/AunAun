# Meeting Capture (Smart Brief)

Updated: 2026-07-03 · **Status: Launched** (มิ.ย. 2026)

ฟีเจอร์ **จดประชุม AI** ใน So1o — อัดหรืออัปโหลดเสียง → transcript → บรีฟ structured → สร้างใบเสนอราคา

## ที่อยู่ในแอป

```
Client Work → Smart Brief → Meeting Capture (จดประชุม AI)
```

## Flow สั้น ๆ

```
อัด/อัปโหลด → Gemini transcribe → aiBriefExtract → Brief JSON → Quotation draft
```

## โค้ดหลัก

| ส่วน | ไฟล์ |
|------|------|
| UI | `Solo-Code/src/features/` (Smart Brief / meeting capture routes) |
| Transcribe | `src/lib/aiMeetingTranscribe.functions.ts` |
| Upload | `src/lib/uploadMeetingMedia.ts` — bucket `meeting-captures` |
| Brief extract | `aiBriefExtract` (มีอยู่แล้วใน pipeline) |
| Cleanup cron | `src/routes/api/public/cron/meeting-capture-cleanup.ts` |

## AI credits

หักเครดิต AI ตาม tier — ใช้ shared `ecosystem-ai-usage` เหมือน feature AI อื่น

## PDPA

- ไม่เก็บไฟล์เสียงถาวรเกินจำเป็น — cron cleanup
- User ต้องยินยอมก่อนอัด
- Transcript/report HTML-escaped

## แผนเต็ม (archive)

Spec ฉบับ implement 818 บรรทัด: [docs/archive/meeting-capture-mvp-plan.md](../../docs/archive/meeting-capture-mvp-plan.md)
