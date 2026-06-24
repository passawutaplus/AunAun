# So1o Design System

Visual / UX rules for **So1o Freelancer** — use with [`conventions.md`](./conventions.md).

## Core rules

1. **No emoji in UI** — use [Lucide React](https://lucide-react.dev) flat stroke SVG icons only.
2. **Semantic tokens** — `bg-primary`, `text-muted-foreground`, `border-border`; avoid hardcoded hex in new code.
3. **Mobile-first** — default mobile, scale with `sm:` / `md:` / `lg:`.

## Color tokens

| Token | Use |
|-------|-----|
| `primary` / `primary-soft` | CTA, icon badges, links |
| `muted` | Secondary surfaces, descriptions |
| `success` / `warning` / `destructive` | Status, drill difficulty |
| `gradient-primary` | Hero icons, primary buttons |

## Icons

- Library: `lucide-react`, `strokeWidth={2}` default
- Trend categories: `@/lib/trendIcons` → `TrendIcon`, `resolveTrendIconKey(category)`
- Drill difficulty: `SignalLow` / `SignalMedium` / `SignalHigh` via `DrillDifficultyIcon`

## Home (Daily Briefing)

```
Hero + insight
So1o Daily (featured + compact grid)
[ Blog | Inspire today ]
Design Drill
Inspire catalog
```

Deep links: `#news` `#insights` `#drill` `#inspire`

## Components

- Cards: `rounded-2xl border border-border bg-card shadow-soft`
- Icon badge: `h-9 w-9 rounded-xl bg-primary/10 text-primary border border-primary/15`
- Chips: `rounded-full px-3 py-1.5 text-xs font-semibold`

## Checklist before UI merge

- [ ] No emoji in user-visible JSX
- [ ] Semantic colors only
- [ ] One `h1` per page
- [ ] Touch targets ≥ 44px on mobile
