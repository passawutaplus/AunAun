# Vercel Projects — So1o Ecosystem

แผนที่ project บน Vercel (team `passawutaplus-9338s-projects`)

| Vercel project | บทบาท | URL | Git repo | Deploy |
|----------------|--------|-----|----------|--------|
| **solo-demo** | So1o production | https://solofreelancer.com | `passawutaplus/Solo-Code` | `./scripts/deploy-vercel.sh production solo` |
| **solo-demo-liart** | So1o demo | https://solo-demo-liart.vercel.app | `passawutaplus/Solo-Code` | `./scripts/deploy-vercel.sh demo solo` |
| **aplus1-prod** | Aplus1 production | https://aplus1.app (+ vanity `forum.aplus1.app` → `/forum`) | `passawutaplus/Anthem-Code` | `./scripts/deploy-vercel.sh production 1px` |
| **aplus1-demo** | Aplus1 demo | https://aplus1-demo.vercel.app | `passawutaplus/Anthem-Code` | `./scripts/deploy-vercel.sh demo 1px` |
| **so1o-ops-hub** | Ops Hub (admin) | https://so1o-ops-hub.vercel.app | `passawutaplus/AunAun` · root **`Ops-Hub`** | `cd Ops-Hub && npm run deploy:demo` |

## ลบได้ (ถ้ายังมี)

- `solo-code` — ซ้ำ Solo-Code
- repo เก่า `so1o-freelancer-managment`, `anthem-freelancehub` — ลบแล้ว

## Ops Hub + monorepo

`Ops-Hub/` อยู่ใน **`passawutaplus/AunAun`** — Root Directory = `Ops-Hub`

## ตรวจสอบ

```bash
node scripts/setup-vercel-ecosystem.mjs
npx vercel project ls
```

ดูเพิ่ม: [ecosystem-hosting.md](./ecosystem-hosting.md) · [deploy-workflow](../.cursor/rules/deploy-workflow.mdc)
