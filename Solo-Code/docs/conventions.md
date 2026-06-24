# Conventions

## Language

- **TypeScript strict mode**, no `any`. Use `unknown` + narrow.
- **Files:** `kebab-case.ts` / `kebab-case.tsx` (except shadcn components which are PascalCase, and pre-existing files we don't rename to avoid churn).
- **Components:** `PascalCase` (function + filename).
- **Hooks:** `useCamelCase`.
- **Types:** `PascalCase`. Prefer `type` for unions/aliases, `interface` for object shapes that may be extended.
- **Constants:** `SCREAMING_SNAKE_CASE` only for true module-level constants; otherwise `camelCase`.

## Imports

- Absolute imports via `@/...` alias.
- Order: builtin → external → `@/...` → relative. (Prettier/eslint will sort.)
- No `console.log` in production paths. Use `import.meta.env.DEV` guard if needed.
- No unused imports (eslint warn → fix on commit).

## React

- Functional components only. No class components.
- Effects: keep dependency arrays exhaustive. Use `useCallback`/`useMemo` only when profiler proves it.
- Side effects in event handlers, NOT `useEffect`, whenever possible.

## Data

- **Server state:** React Query (`useQuery`, `useMutation`). Stale time defaults set in `src/router.tsx`.
- **Client state:** Zustand for cross-component, `useState` for local.
- **Persistence:** Supabase (Real-time `public` schema). Never `DROP` / `TRUNCATE` existing tables.

## Forms

- `react-hook-form` + `zodResolver`.
- Validate every input length, format, and bounds. See [`security.md`](./security.md).

## Tailwind

- Tailwind v4 — config lives in `src/styles.css` via `@theme` directive.
- Use semantic tokens (`bg-background`, `text-foreground`, `border-border`). Never hardcoded colors (`bg-white`, `text-black`).
- Mobile-first: default styles target mobile, scale up with `md:` / `lg:`.

## Cross-platform (Universal PWA)

So1o targets Win / macOS / iOS / Android. Every interactive element must:

- Not rely on hover-only (`group-hover:`) for important actions on touch devices — pair with tap-visible fallback.
- Keyboard shortcuts: check both `metaKey` (mac) AND `ctrlKey` (win).
- Fixed UI uses `env(safe-area-inset-*)` padding.
- `backdrop-filter` always paired with `-webkit-backdrop-filter`.
- Icons: prefer SVG (Lucide).

## Commit messages

Conventional commits:

- `feat:` new feature
- `fix:` bug fix
- `refactor:` no behavior change
- `perf:` performance
- `security:` security hardening
- `docs:` docs only
- `test:` tests only
- `chore:` tooling / deps

## Code review checklist

- [ ] No `any`, no `console.log`
- [ ] Touched a form? Has Zod validation?
- [ ] Touched RLS-relevant data? Verified policy still scopes correctly
- [ ] Touched a server fn? Has `requireSupabaseAuth` unless intentionally public
- [ ] Touched UI? Tested at 375px (mobile), 768px (tablet), 1280px (desktop)
- [ ] Touched DB? Migration file under `supabase/migrations/`

## Before adding code

Before creating a new file, abstraction, or dependency:

1. **Must this exist?** Speculative "for later" → skip unless requested.
2. **Already in the stack?** React Query, Zod, shadcn, existing hooks/utils in `src/lib/` or `src/server/`.
3. **Can an existing file absorb it?** Prefer extending over a new module with one caller.
4. **Minimum that works** — then stop.

Stack patterns in this doc (React Query, Zod, server queries/mutations, RLS) are **not** over-engineering.

Intentional shortcuts: `// ponytail: <ceiling> — upgrade when <condition>`

After a large change, ask the agent to run the **review-bloat** skill (`.cursor/skills/review-bloat/`) on the diff.
