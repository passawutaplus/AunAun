---
name: responsive-thai
description: Check or fix responsive layout, mobile behavior, and Thai/English text rendering. Use for mobile, responsive, tablet, text wrapping, Thai font, or visible copy changes.
---
# Responsive + Thai
- Existing breakpoints in styles.css: 1400, 1280, 1180, 920, 860, 560. Reuse them; don't add new ones lightly.
- Layout: `.workspace` (rail | main | drawer) and `.board-workspace` (project rail | library | canvas | inspector). Drawer becomes full-width sheet <=860px; canvas scrolls horizontally on mobile.
- Test widths 360 / 390 / 430 / 768. No page-level horizontal scroll. Touch targets >=44px. Inputs font-size >=16px. Use `100dvh` where full height is needed.
- Thai: line-height ~1.5-1.7; use `overflow-wrap:anywhere` in narrow cards; font IBM Plex Sans Thai (keep fallback).
- Copy tone: follow existing labels; Thai/English mixing should match nearby UI. Don't change wording outside the marked area.
- Report issues briefly; fix only what was asked.
