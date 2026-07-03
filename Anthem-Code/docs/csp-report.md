# Content Security Policy

## Production (Vercel / nginx)

**Enforced** via HTTP headers in `vercel.json` and `nginx.conf` — includes Stripe + So1o billing in `connect-src`.

## Local dev

**Report-Only** meta in `index.html` + `installCspReporter()` in `main.tsx`.

## วิธีทำงาน

1. `index.html` ฝัง `<meta http-equiv="Content-Security-Policy-Report-Only" ...>` ที่ระบุ policy เริ่มต้น
2. `src/lib/cspReporter.ts` ติด `SecurityPolicyViolationEvent` listener ส่ง violation ไปที่ `console.warn` (และ optionally POST ไป edge function ในอนาคต)
3. นัก QA / dev ใช้เว็บปกติ — ทุกครั้งที่มี resource ที่ policy ไม่อนุญาต จะเห็นใน DevTools Console

> หมายเหตุ: meta-tag CSP **ไม่รองรับ** `report-uri` / `report-to` ทั้งสองอันต้องการ HTTP header
> เราจึงใช้ JS listener แทน ซึ่งครอบคลุม violation ทุกประเภทใน browser สมัยใหม่

## Starter policy (อยู่ใน `index.html`)

```text
default-src 'self';
script-src   'self' 'unsafe-inline' 'unsafe-eval' https://cdn.gpteng.co https://*.lovable.app https://*.lovable.dev;
style-src    'self' 'unsafe-inline' https://fonts.googleapis.com;
img-src      'self' data: blob: https:;
font-src     'self' data: https://fonts.gstatic.com;
connect-src  'self' https://*.supabase.co wss://*.supabase.co https://*.lovable.app https://*.lovable.dev https://api.lovable.dev;
frame-src    'self' https://*.lovable.app https://*.lovable.dev;
media-src    'self' data: blob: https:;
object-src   'none';
base-uri     'self';
form-action  'self';
```

`'unsafe-inline'` + `'unsafe-eval'` ยังจำเป็นช่วง report-only เพราะ Vite/React dev tool inject runtime — เป้าหมาย Phase 2 คือถอดออกหลัง enforce

> Policy ด้านบนเป็น report-only ใน `index.html` — production บน `aplus1.app` ใช้ CSP จาก `vercel.json` / nginx (ไม่มี `*.lovable.app`)

## วิธีเก็บ report

### ระหว่าง dev / QA local

1. เปิด DevTools → Console
2. Filter: `[CSP]`
3. ทุก violation จะ log เป็น object พร้อม:
   - `violatedDirective` — directive ไหนพัง
   - `blockedURI` — URL ของ resource
   - `sourceFile` + `lineNumber`
   - `effectiveDirective`

### ระหว่าง production / external test

แนะนำให้รวบรวมจริงด้วย edge function:

```ts
// supabase/functions/csp-report/index.ts  (ทำต่อเมื่อพร้อม enforce)
serve(async (req) => {
  const body = await req.json();
  console.log("CSP_REPORT", JSON.stringify(body));
  return new Response(null, { status: 204 });
});
```

แล้วแก้ `cspReporter.ts` ให้ POST violation ไปที่ `/functions/v1/csp-report` (sample rate 10% เพื่อไม่ตันโควต้า)

## ขั้นไปต่อ Enforce

1. รัน Report-Only อย่างน้อย 2 สัปดาห์ ในการใช้งานจริง
2. รวบรวม `blockedURI` ทั้งหมด → จัด domain เข้า allowlist เพิ่ม
3. พยายามตัด `'unsafe-eval'` ออกก่อน (build production ไม่ใช้)
4. พยายามตัด `'unsafe-inline'` ออกใน script (ใช้ nonce/hash)
5. เปลี่ยน `Content-Security-Policy-Report-Only` → `Content-Security-Policy`

## ตรวจสอบ policy ก่อน deploy

```bash
# Validate syntax ด้วย Mozilla Observatory หรือ
curl -sI https://aplus1.app | grep -i content-security
```
