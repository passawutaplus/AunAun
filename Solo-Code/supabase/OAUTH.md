# Google Sign-In (unified project)

โปรเจกต์เดียว `zkflkpbmbozrchqncpzi` — เปิด Google provider ครั้งเดียว ใช้ได้ทั้ง So1o และ an1hem

> Apple Sign-In ยังไม่เปิดใช้งาน (ปิดไว้ชั่วคราว)

## 1. Supabase Dashboard → Authentication → Providers → Google

1. สร้าง OAuth Client ใน [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. **Authorized redirect URI** (สำคัญ):
   ```
   https://zkflkpbmbozrchqncpzi.supabase.co/auth/v1/callback
   ```
3. ใส่ **Client ID** + **Client Secret** ใน Supabase → Save

## 2. Redirect URLs (Auth → URL Configuration)

รัน:

```bash
export SUPABASE_ACCESS_TOKEN=sbp_...
./scripts/supabase-setup-project.sh
```

หรือเพิ่มเอง:

**Production:**
- `https://solofreelancer.com/**`
- `https://www.solofreelancer.com/**`
- `https://an1hem.app/**`
- `https://www.an1hem.app/**`
- `https://hq.solofreelancer.com/**`

**Demo (Vercel):**
- `https://1px-demo.vercel.app/**`
- `https://solo-demo-liart.vercel.app/**`

**Local dev:**
- `http://localhost:5173/**` (So1o `npm run dev`)
- `http://localhost:8080/**` (an1hem `npm run dev`)
- `http://localhost:3000/**` (So1o Docker SSR)
- `http://localhost:3090/**` (Ops Hub)

Legacy callback paths (`/auth/callback`) ยังรองรับผ่าน wildcard `/**`

## 3. App flow

1. กด "เข้าสู่ระบบด้วย Google" → redirect ไป Google
2. Supabase callback → `/auth/callback` ของแต่ละแอป
3. PKCE + `detectSessionInUrl` สร้าง session
4. กลับหน้าเดิมที่เก็บใน `sessionStorage`

## 4. Production env

```bash
# Solo-Code .env
VITE_SITE_URL=https://solofreelancer.com

# Anthem-Code .env
VITE_SITE_URL=https://an1hem.app
```

## 5. LINE OAuth (แยกจาก Google)

LINE Login ใช้ช่องแยก + callback ที่ `/line-link` — ดู [setup-line.md](../../docs/setup-line.md)
