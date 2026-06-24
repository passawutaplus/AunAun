# Architecture

## High-level diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     Browser (React 19 + TanStack Start SSR)   │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────────────┐ │
│  │ Components │→ │ Feature    │→ │ React Query / Zustand   │ │
│  │ (UI only)  │  │ Hooks      │  │ (cache + client state)  │ │
│  └────────────┘  └────────────┘  └────────────┬────────────┘ │
│                                                │              │
│                          ┌─────────────────────┴───────────┐  │
│                          │ Supabase JS Client (PostgREST   │  │
│                          │ + Realtime + Auth + Storage)    │  │
│                          └─────────────────┬───────────────┘  │
└────────────────────────────────────────────┼──────────────────┘
                                             │ HTTPS / WSS
┌────────────────────────────────────────────┼──────────────────┐
│            TanStack Start Server (Cloudflare Worker)          │
│  ┌─────────────────────┐  ┌────────────────────────────────┐ │
│  │ Server Functions    │  │ Server Routes (/api/public/*)  │ │
│  │ createServerFn(...) │  │ webhooks / cron / public APIs  │ │
│  └──────────┬──────────┘  └──────────────┬─────────────────┘ │
│             │ requireSupabaseAuth        │ signature verify  │
└─────────────┼─────────────────────────────┼───────────────────┘
              ▼                             ▼
        ┌────────────────────────────────────────────┐
        │           Supabase (rvnzjiskqliexysicfmh)          │
        │  Postgres + RLS + Auth + Storage + Edge Functions  │
        └────────────────────────────────────────────┘
```

## Data flow rules

1. **Components are dumb.** No direct Supabase calls. Only render + emit events.
2. **Feature hooks own the read/write.** A hook returns `{ data, mutate, isLoading, error }` shaped by React Query.
3. **Server functions own privileged work.** Anything that needs service-role, third-party API keys, or trusted aggregation runs in `createServerFn`.
4. **Server routes own HTTP boundaries.** Webhooks, cron pull endpoints, public APIs.

## Read path

```
Component → useFeatureXyz() (React Query)
          → supabase.from('xyz').select(...)   ← RLS enforced as the user
          → returns typed data
```

## Write path (user-scoped)

```
Component event → useMutationXyz()
                → supabase.from('xyz').insert(...)   ← RLS enforced
                → onSuccess: queryClient.invalidateQueries
                → toast.success / error
```

## Write path (privileged / cross-user / external API)

```
Component event → useServerFn(serverFnXyz)
                → serverFnXyz.handler({ context: { supabase, userId } })
                → supabaseAdmin OR external API call
                → returns minimal response
```

## Auth boundaries

| Surface | Client | RLS |
|---|---|---|
| Browser code | `@/integrations/supabase/client` (publishable key + user session) | ✅ as the user |
| Authenticated server fn | `requireSupabaseAuth` middleware → `context.supabase` | ✅ as the user |
| Admin/webhook server | `@/integrations/supabase/client.server` (`supabaseAdmin`) | ❌ BYPASSED |

**Rule:** Default to `requireSupabaseAuth`. Use `supabaseAdmin` only when you genuinely need to bypass RLS (admin tools, webhooks after signature verification, cross-user aggregations).

## State boundaries

- **Server state** → React Query (`useQuery`, `useMutation`). Cache key namespacing: `[feature, scope, ...args]`.
- **Client state** → Zustand for cross-component widgets, `useState` for local-only.
- **Form state** → react-hook-form + Zod resolver.
- **Persistence** → Supabase (no localStorage for source-of-truth data).

## Realtime

Channels use UUID-suffixed topics: `track-<uuid>`, `job-<uuid>`, `planner-<uuid>`, `planner-approvals-<uuid>`. RLS policies parse with `substring(topic FROM N)` because UUIDs contain hyphens (NOT `split_part`).

## Edge functions

Supabase Edge Functions ใน `supabase/functions/` (19 ตัว) — ใช้สำหรับ:

- **AI/Gemini** — streaming workloads
- **Ecosystem notify** — `notify-anthem*` → email + LINE (ดู [ecosystem-notifications.md](../../docs/ecosystem-notifications.md))
- **LINE** — `line-connect`, `line-webhook`, `line-queue-process`

**New privileged So1o work** ยังไปที่ `createServerFn` เป็นหลัก — ดู [`adding-a-feature.md`](./adding-a-feature.md).

## Email / notifications

- So1o transactional: `/lovable/email/*` server routes + PGMQ
- Anthem events: client → edge `notify-anthem*` → email queue + LINE queue
- ดู [ecosystem-notifications.md](../../docs/ecosystem-notifications.md) · [stripe.md](./stripe.md)
