# Gemini Models Changelog

บันทึกการอัปเดต model อัตโนมัติ — แอดมินดูที่ **Admin → AI Monitor** หรือไฟล์นี้

การอัปเดตรันผ่าน `npm run gemini:sync` (local) หรือ GitHub Actions รายสัปดาห์

## 2026-06-18

- **Vision (PDF / image / WHT 50ทวิ)**: `gemini-1.5-flash` → `gemini-2.5-flash` (manual pin — WHT scan ใช้ vision model ร่วมกับ default)

_อัปเดตครั้งแรกเมื่อย้ายมาใช้ config กลาง `config/gemini-models.json`_

## 2026-06-18

- **Fast (chat / lightweight)**: `gemini-2.5-flash-lite` → `gemini-3.1-flash-lite`
- **Default (general)**: `gemini-2.5-flash` → `gemini-3.5-flash`
- **Vision (PDF / image / WHT 50ทวิ)**: `gemini-2.5-flash` → `gemini-3.5-flash`

_อัปเดตอัตโนมัติโดย `npm run gemini:sync`_
