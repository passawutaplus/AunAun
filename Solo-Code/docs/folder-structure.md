# Folder Structure

```
src/
├── auth/               # AuthProvider, RequireAuth, role guards
├── components/         # UI — organized by domain
│   ├── ui/             # shadcn primitives (button, dialog, ...)
│   ├── dashboard/      # dashboard tabs + widgets
│   ├── admin/          # admin sections
│   ├── landing/        # marketing landing components
│   └── shared/         # cross-domain UI
├── core/               # shared utilities used by ≥2 features
│   └── profiles/       # batch profile fetch hooks
├── features/           # domain barrels (re-export hooks/stores per feature)
│   ├── projects/
│   ├── jobs/
│   ├── chat/
│   ├── feed/
│   └── ...
├── server/             # server-side code
│   ├── queries/        # pure async Supabase queries (no React)
│   └── *.functions.ts  # createServerFn handlers
├── hooks/              # cross-feature React hooks
├── store/              # Zustand stores
├── lib/                # framework-agnostic utilities (security, format, ...)
├── integrations/
│   └── supabase/       # auto-generated — DO NOT EDIT
├── routes/             # file-based routes (TanStack Router)
│   └── api/public/     # public HTTP endpoints (webhooks, cron)
└── styles.css          # Tailwind v4 + design tokens
```

## Three-layer model

### 1. `src/core/` — Cross-feature primitives

Anything used by ≥2 features lives here. Examples:
- `core/profiles/useProfilesByIds.ts` — batch profile fetch with built-in dedupe

### 2. `src/features/<domain>/` — Domain hooks (barrels)

Each feature exports a barrel that re-exports its public surface:

```ts
// src/features/projects/index.ts
export { useProjects } from "@/hooks/useProjects";
export { useProjectMutations } from "@/hooks/useProjectMutations";
```

Consumers import from the barrel:

```ts
// ✅ good
import { useProjects } from "@/features/projects";

// ❌ avoid going around the barrel
import { useProjects } from "@/hooks/useProjects";
```

### 3. `src/server/queries/` — Pure async DB calls

No React, no hooks. Just `(args, supabaseClient) => Promise<T>`. Reusable from both server functions and client React Query.

```ts
// src/server/queries/profiles.ts
export async function getProfilesByIds(ids: string[], db = supabase) {
  const { data, error } = await db.from("profiles").select("*").in("id", ids);
  if (error) throw error;
  return data;
}
```

## What goes where

| You want to… | Put it in |
|---|---|
| Add a button or layout tweak | `src/components/<domain>/` |
| Fetch / mutate data from React | `src/hooks/<feature>.tsx` then re-export from `src/features/<feature>/index.ts` |
| Call third-party API or service-role write | `src/server/<feature>.functions.ts` |
| Webhook callback from external service | `src/routes/api/public/<service>/<event>.ts` |
| Sharable helper (validators, formatters) | `src/lib/<topic>.ts` |
| Cross-feature React hook | `src/core/<topic>/` |

## Forbidden patterns

- ❌ Components importing `@/integrations/supabase/client` directly — go through a feature hook (enforced by ESLint `no-restricted-imports`)
- ❌ `src/pages/` directory — TanStack Start uses `src/routes/`
- ❌ Mutating server state in `useEffect` — use `useMutation`
- ❌ Storing source-of-truth data in `localStorage` — use Supabase
