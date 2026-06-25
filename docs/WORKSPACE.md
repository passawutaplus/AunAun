# Workspace layout (มิ.ย. 2026)

โครงสร้าง submodule เลิกใช้แล้ว — AunAun เป็น **inline monorepo**

| งาน | โฟลเดอร์หลัก |
|-----|-------------|
| Ecosystem, deploy scripts, docs รวม | `F:\So1o\AunAun-fresh` ← **workspace หลัก** |
| UX/UI Anthem (Pixel100) | `F:\So1o\AnthemCode` |
| Solo backend / migrations | `F:\So1o\Solo Code` |
| เก่า (archive ~1 สัปดาห์) | `F:\So1o\AunAun` → rename เป็น `AunAun-archive` หลังปิด Cursor workspace เก่า |

**กฎ:** อย่าใช้ `Anthem-Code/.git` หรือ `Solo-Code/.git` ในโฟลเดอร์เก่า — clone แยกหรือใช้ monorepo fresh

## Archive โฟลเดอร์เก่า

1. ปิด Cursor workspace ที่ `F:\So1o\AunAun`
2. รัน `F:\So1o\rename-aunaun-archive.ps1` (หรือ `Rename-Item` เอง)
3. เปิด workspace ใหม่ที่ `F:\So1o\AunAun-fresh`
4. เก็บ archive 1 สัปดาห์ — สัปดาห์หน้าตรวจ stash/env/local files ก่อนลบ

## Migrations (Referral E2E)

```powershell
$env:SUPABASE_ACCESS_TOKEN = "sbp_..."
F:\So1o\AunAun-fresh\scripts\push-migrations.ps1
```
