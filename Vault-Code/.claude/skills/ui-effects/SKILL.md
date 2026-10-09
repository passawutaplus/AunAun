---
name: ui-effects
description: Add or tweak animations, hover effects, transitions, micro-interactions, and visual polish in A+ Vault. Use for "ลูกเล่น", effects, motion, polish, hover, transitions.
---
# UI effects (A+ Vault)
- CSS first. Animate only `transform` and `opacity`. 150-250ms hover/tap, 350-600ms entrances, one shared easing (e.g. cubic-bezier(.2,.8,.2,1)).
- Add new CSS as a NEW block at the end of `outputs/a-plus-vault/styles.css` with header `/* A+ Vault <feature> */`. Never rewrite existing minified lines.
- Reuse tokens: `--coral`, `--coral-dark`, `--ink`, `--line`, `--panel`, `--shadow-soft`; radius 8px. Light theme.
- Wrap motion in `@media (prefers-reduced-motion: reduce)` fallback.
- Touch: add `:active`/focus-visible states; no hover-only information (mobile <=560px hides `.pin-hover` overlay already).
- Existing hooks: `.pin-card`, `.pin-hover`, `.board-object`, `.drawer`, `.modal`, `.toast`, boot skeleton in index.html; scroll blur lives in `modules/scroll-blur.js`.
- Find the element via class/text in app.js with `grep -n ... | cut -c1-200`. Touch only the target. Then `npm run check`.
