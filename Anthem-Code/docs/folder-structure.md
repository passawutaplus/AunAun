# Folder Structure

```text
src/
├── core/           ← shared with So1o (Phase 4) — KEEP PORTABLE
│   ├── auth/
│   ├── profiles/
│   ├── wallet/
│   ├── notifications/
│   └── types/
│
├── features/       ← Anthem business domains (barrel re-exports)
│   ├── projects/   collections/  social/   studios/
│   ├── jobs/       hiring/       chat/     gifting/
│   ├── ads/        feed/         admin/
│
├── server/         ← pure supabase calls (no React)
│   ├── queries/
│   └── mutations/
│
├── hooks/          ← generic UI hooks only (use-mobile, use-toast, useIsAdmin)
├── lib/            ← pure utils + email-templates/, notifyAnthem.ts
├── stores/         ← Zustand
├── components/     ← presentational (ui/ = shadcn primitives)
├── pages/          ← route entry points
└── integrations/   ← auto-generated supabase client/types (DO NOT EDIT)
```

## Naming

- Files: **kebab-case** (`use-projects.ts`, `project-card.tsx`)
  - Exception: existing PascalCase/camelCase hooks ที่ยังไม่ย้าย
- Components: **PascalCase** export
- Hooks: `useXxx`
- Server fns: `getXxx` / `listXxx` / `createXxx` / `updateXxx` / `deleteXxx`

## Migration plan (in-progress)

`src/features/*/index.ts` ตอนนี้เป็น **barrel re-export** จาก `src/hooks/*` ที่มีอยู่
รอบหน้าจะย้ายไฟล์ physically — import path เป็น `@/features/<domain>` แล้วจะ migrate ได้โดยไม่กระทบ
