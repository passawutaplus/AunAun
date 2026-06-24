# Puppeteer E2E (ทางเลือกแทน Playwright)

ใช้เมื่อ **Playwright ติดตั้ง browser ไม่ได้** (เช่น WSL บางเวอร์ชัน, Ubuntu ใหม่) หรืออยากใช้ Chrome ที่มีในเครื่องแล้ว

ครอบคลุมเทสเดียวกับ Playwright specs ใน `e2e/`:

| Playwright | Puppeteer |
|------------|-----------|
| `e2e/smoke/public.smoke.spec.ts` | `npm run e2e:puppeteer:smoke` |
| `e2e/auth.e2e.spec.ts` + `flows/admin.e2e.spec.ts` | `npm run e2e:puppeteer` (suite `auth`) |

## ทำไมมีสองตัว?

- **Playwright** — config มาตรฐาน, projects (smoke/chromium/mobile), trace/video — เหมาะ CI บน macOS/Linux ที่รองรับ
- **Puppeteer** (`puppeteer-core`) — ไม่บังคับ download browser ตอน `npm install`; ชี้ไป Chrome/Chromium ในเครื่อง — เหมาะ WSL ที่ Playwright ยังไม่รองรับ OS

## ติดตั้งครั้งแรก (Linux / WSL)

```bash
# ติดตั้ง lib ของ Chrome + unzip + ดาวน์โหลด Chrome (ต้อง sudo)
bash scripts/e2e-puppeteer/install-chrome-deps.sh
```

ถ้าไม่มี sudo: รัน `npm run smoke:public` (curl) สำหรับ public routes แทน

หรือชี้ Chrome เอง:

```bash
export PUPPETEER_EXECUTABLE_PATH=/path/to/chrome
```

บน WSL บางเครื่องใช้ Chrome Linux ใน `~/.cache/puppeteer/` หลัง install script

## รัน

```bash
# Smoke — ไม่ต้อง login
npm run e2e:puppeteer:smoke

# กับ production / preview
E2E_BASE_URL=https://solofreelancer.com npm run e2e:puppeteer:smoke

# Local (ต้อง npm run dev หรือให้ script รอ server)
npm run dev
npm run e2e:puppeteer:smoke

# Auth + admin guard — ต้องมี .env.local
cp .env.example .env.local   # เติม E2E_USER_* E2E_ADMIN_*
npm run e2e:puppeteer

# เฉพาะ auth suite
E2E_SUITE=auth npm run e2e:puppeteer

# ดู browser (ไม่ headless)
E2E_HEADED=1 npm run e2e:puppeteer:smoke
```

## Env vars

อ่านจาก `.env.local` อัตโนมัติ (ดู `.env.example`):

- `E2E_BASE_URL` — default `http://localhost:5173`
- `E2E_USER_EMAIL` / `E2E_USER_PASSWORD`
- `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`
- `PUPPETEER_EXECUTABLE_PATH` — path Chrome/Chromium
- `E2E_SUITE` — `smoke` | `auth` | `all`
- `E2E_HEADED=1` — แสดง browser

## เทียบกับ `smoke:public` (curl)

| | curl `smoke:public` | Puppeteer smoke |
|--|---------------------|-----------------|
| ต้อง browser | ไม่ | ใช่ |
| ตรวจ redirect SPA | แค่ WARN | ตรวจ URL จริง |
| ตรวจ security headers | ไม่ | ตรวจ `X-Content-Type-Options` |
| รันบน WSL ไม่มี Chrome | ✅ | ต้องติดตั้ง Chrome + libs |

แนะนำรันทั้งสองใน Phase 1 automated gate
