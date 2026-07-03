# Google Sign-In (unified project)

โปรเจกต์เดียว `zkflkpbmbozrchqncpzi` — เปิด Google provider ครั้งเดียว ใช้ได้ทั้ง So1o และ Aplus1

> Apple Sign-In ยังไม่เปิดใช้งาน (ปิดไว้ชั่วคราว)

## 1. Supabase Dashboard → Authentication → Providers → Google

1. สร้าง OAuth Client ใน [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. **Authorized redirect URI** (สำคัญ — ใส่ครั้งเดียว ใช้ร่วม Solo + Anthem):
   ```
   https://zkflkpbmbozrchqncpzi.supabase.co/auth/v1/callback
   ```
3. **Authorized JavaScript origins** — ต้องมีทุกโดเมนที่ผู้ใช้กดปุ่ม Google:
   - `https://www.solofreelancer.com`
   - `https://solofreelancer.com`
   - `https://aplus1.app`
   - `https://www.aplus1.app`
   - `https://an1hem.app` (legacy redirect — เก็บชั่วคราว)
   - `https://www.an1hem.app`
   - `https://aplus1-demo.vercel.app` (Anthem demo/preview)
   - `http://localhost:5173` (So1o dev)
   - `http://localhost:8080` (Anthem dev)
4. ใส่ **Client ID** + **Client Secret** ใน Supabase → Save

> **หลังย้าย Supabase project (US → SG):** ต้องใส่ Client Secret ใหม่ใน Dashboard SG ด้วยมือ — copy ผ่าน API ไม่ได้ (ค่าที่ API คืนมาเป็น encrypted)
>
> ```bash
> # Solo-Code/.env — อย่า commit
> GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-...
> node scripts/set-google-oauth-secret.mjs
> ```

### Troubleshooting: `Unable to exchange external code`

Auth log จะเป็น `invalid_client — The provided client secret is invalid`

1. [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials) → OAuth client
2. คัดลอก **Client secret** ปัจจุบัน (หรือ Reset แล้ว copy ใหม่)
3. [Supabase SG → Auth → Providers → Google](https://supabase.com/dashboard/project/zkflkpbmbozrchqncpzi/auth/providers) → วาง Secret → Save
4. ตรวจ **Authorized redirect URI** ใน Google Console:
   ```
   https://zkflkpbmbozrchqncpzi.supabase.co/auth/v1/callback
   ```
   (ต้องมีคู่กับ URI เก่า `https://rvnzjiskqliexysicfmh.supabase.co/auth/v1/callback` — **เพิ่ม SG ไม่ใช่แทนที่** ถ้ายังใช้ US อยู่)

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
- `https://aplus1.app/**`
- `https://www.aplus1.app/**`
- `https://an1hem.app/**` (legacy)
- `https://www.an1hem.app/**`
- `https://hq.solofreelancer.com/**`

**Demo (Vercel):**
- `https://aplus1-demo.vercel.app/**`
- `https://solo-demo-liart.vercel.app/**`

**Local dev:**
- `http://localhost:5173/**` (So1o `npm run dev`)
- `http://localhost:8080/**` (Aplus1 `npm run dev`)
- `http://localhost:3000/**` (So1o Docker SSR)
- `http://localhost:3090/**` (Ops Hub)

Legacy callback paths (`/auth/callback`) ยังรองรับผ่าน wildcard `/**`

## 3. App flow

1. กด "เข้าสู่ระบบด้วย Google" → redirect ไป Google
2. Supabase callback → `/auth/callback` ของแต่ละแอป
3. PKCE + `detectSessionInUrl` สร้าง session
4. กลับหน้าเดิมที่เก็บใน `sessionStorage`

### Troubleshooting: ครั้งแรกเข้าได้ แต่กดย้อนกลับแล้วไป Solo

URL บน Google อาจยังมี `redirect_to=https://aplus1.app/auth/callback` ถูกต้อง — แต่ถ้า **กดย้อนกลับ** ไปหน้า Google แล้วเลือกบัญชีซ้ำ Supabase จะเห็น **OAuth state/PKCE เก่าหมดอายุ** แล้ว fallback ไป **Site URL** (`solofreelancer.com`)

**วิธีใช้ที่ถูก:** อย่ากดย้อนกลับจาก Google — กลับไป `/auth` แล้วกดปุ่ม Google ใหม่

**ในโค้ด (Anthem + Solo):** ก่อนเริ่ม OAuth จะล้าง PKCE verifier เก่า และใช้ `location.replace()` แทน `assign()` เพื่อไม่ให้ Google ค้างใน history

## 4. Production env

```bash
# Solo-Code .env
VITE_SITE_URL=https://solofreelancer.com

# Anthem-Code .env
VITE_SITE_URL=https://aplus1.app
```

## 5. LINE OAuth (แยกจาก Google)

LINE Login ใช้ช่องแยก + callback ที่ `/line-link` — ดู [setup-line.md](../../docs/setup-line.md)

## 6. Google consent screen — ชื่อแอป / “ไปยัง …supabase.co”

หน้า Google แสดง **“ไปยัง zkflkpbmbozrchqncpzi.supabase.co”** เพราะ OAuth callback อยู่ที่ Supabase — **ไม่ใช่ bug**

### ทำได้ทันที (ฟรี): ชื่อ + โลโก้

```bash
cd Solo-Code
node scripts/setup-google-oauth-branding.mjs --open
```

ค่าที่ตั้งใน [Google Cloud → Branding](https://console.cloud.google.com/auth/branding?project=727912671200):

| ช่อง | ค่า |
|------|-----|
| App name | **So1o & Aplus1** |
| Home page | https://aplus1.app |
| Privacy | https://aplus1.app/legal/privacy |
| Terms | https://aplus1.app/legal/terms |
| Logo | https://aplus1.app/icons/icon-512.png |
| Authorized domains | `aplus1.app`, `solofreelancer.com` |

Submit for verification แล้ว Google จะแสดงชื่อ/โลโก้ — แต่โดเมน “ไปยัง …” ยังเป็น supabase.co จนกว่าจะมี custom domain

Config กลาง: `Solo-Code/scripts/ecosystem-oauth-brand.mjs`

### เปลี่ยน “ไปยัง …” เป็น aplus1 (ต้อง Supabase Pro)

Org ปัจจุบัน: **Free** → ต้องอัปเกรด [Pro](https://supabase.com/dashboard/org/_/billing) + [Custom Domain add-on](https://supabase.com/docs/guides/platform/custom-domains)

1. ตั้ง `auth.aplus1.app` → CNAME → `zkflkpbmbozrchqncpzi.supabase.co`
2. `supabase domains create --project-ref zkflkpbmbozrchqncpzi --custom-hostname auth.aplus1.app`
3. Google Console เพิ่ม redirect URI: `https://auth.aplus1.app/auth/v1/callback`
4. Activate domain แล้ว OAuth จะโฆษณา `auth.aplus1.app` แทน supabase.co
