# CSP Rollout

## Current state

`src/start.ts` ส่ง CSP **enforce** header สำหรับ allowlist: self + Google Fonts + Google Analytics + Supabase + Lovable hosts

## Report-Only listener

`src/lib/cspReporter.ts` ติดตั้ง listener สำหรับ `securitypolicyviolation` event — log violation ลง `console.warn("[CSP] ...")`

ใช้ DevTools Console filter `[CSP]` เพื่อเก็บ violation:

```
[CSP] blockedURI=https://example.com/foo.js
     violatedDirective=script-src
     sourceFile=https://solofreelancer.com/dashboard
     lineNumber=42
```

## Rollout plan

| Phase | Action | Duration |
|---|---|---|
| 1 | Enforce current policy + listener active | ongoing |
| 2 | เก็บ violation จาก console — ดู pattern | ≥ 2 สัปดาห์ |
| 3 | ปรับ policy ให้ tighter ลบ allowlist ที่ไม่ใช้จริง | 1 สัปดาห์ |
| 4 | Re-enforce + monitor | ต่อเนื่อง |

## เก็บ log จาก users

ใน DevTools Console:

1. Filter: `[CSP]`
2. Right-click → Save as → `csp-violations.log`
3. ส่ง file มาให้ agent

## หรือ — ตั้ง endpoint จริง (อนาคต)

```ts
// future: src/routes/api/public/csp-report.ts
POST → ingest violation report → store in beta_feedback table
```

ตอนนี้ console-only ก่อนเพื่อ keep cost = 0

## Tightening targets (after data collection)

- ลบ `'unsafe-eval'` ถ้า TanStack hydration ไม่ใช้แล้ว
- เปลี่ยน `'unsafe-inline'` → nonce-based สำหรับ scripts
- Restrict `connect-src` เฉพาะ host ที่ใช้จริง
- เพิ่ม `require-trusted-types-for 'script'` ถ้า DOMPurify deployed
