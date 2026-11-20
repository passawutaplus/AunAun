# 06 · Feed Design & Visual System

Direction: **creative editorial magazine × digital gallery**. The work is the hero; branding is quiet.

## Brand tokens (Brand Book v1.0, not the spec's draft colours)

| Token | Value | Use |
|---|---|---|
| Samecor Red | `#EE3D29` | Accent, ≈10%. Large text only on red (ink 3.7:1, white ≈3.6:1). Never a status colour |
| Ink | `#282929` | Text, dark backgrounds |
| Gallery Grey | `#F2F2F0` | Main background, ≈40% |
| White | `#FFFFFF` | Cards, ≈35%. White text on grey fails contrast |
| Type EN | Elms Sans (Light / Regular / Bold Italic) | Display mixes Light + Bold Italic |
| Type TH | IBM Plex Sans Thai (Light / Regular / Bold) | Body, captions |

No gradients, glow, 3D effects or bouncy motion. `toneStyle()` in `src/components/admin/growth/GrowthBits.tsx` maps these tokens for previews (the hatch pattern only marks "image placeholder" in mock mode).

## Rendering rule

AI makes the underlying visual (photo, texture, illustration). **All text, logos, QR codes and UI are rendered deterministically** (HTML/CSS/SVG → PNG) so Thai is exact. The Phase 1 `FrameCard` is the first version of that renderer.

## Recipes (`ge_brand_templates`)

| Recipe | Structure | Watch out |
|---|---|---|
| R01 Gallery | Full-bleed work + small credit | Never crop a creator's work without permission |
| R02 Editorial Cover | 80% art / 20% headline | One message per cover |
| R03 Explainer | Visual + 2–3 short points | No icon overload |
| R04 Minimal Type | Large short type + whitespace | Not back-to-back |
| R05 Product Story | Real UI capture | UI and numbers must be real |
| R06 Opportunity Card | Real event visual + title + date | Check dates and image rights |

## Canvas presets (starting points; the publisher re-checks each platform's live spec)

IG feed/carousel 1080×1350 (4:5) · FB 4:5 or square · Stories/Reels cover 1080×1920 (9:16) · Pinterest 1000×1500 (2:3) · Blog hero/OG 1200×630.

Adaptation order: reuse if ratio + safe zone fit → smart crop if the focal point, heading and credit survive → outpaint if the missing background is safe to synthesise → otherwise compose natively. Never stretch, never cut faces/hands/work, never alter logos, never edit a creator's work with generative AI without consent.

## 3×3 feed QC (`feedQc` in `engine.ts`)

Preview shows the grid in real publish order (tile 1 = newest) including the new cover.

| Check | Level |
|---|---|
| Text-heavy covers ≤ 3 of 9 | warn |
| No 3 tiles in a row with the same tone (covers full rows too) | warn |
| No 3 posts in a row with the same recipe | warn |

These are soft checks: they warn and the owner decides. A `FEED` comment such as "อย่าให้โพสต์พื้นดำ 3 ชิ้นติดกัน" makes the revision agent reorder tiles (the campaign's own tile stays in place) and returns a new version for approval. Planned (Phase 2): ≥2 of 9 real/licensed creative works, cover legible at thumbnail size within 2 s, cover word limits.

## Art QC (Phase 2, per asset)

Meaningful image (not decoration) · no AI-drawn Thai · no fake "real event" photos · product UI real or labelled concept · alt text and credits · legible at thumbnail · every channel previewed · marketing rights + consent stored.
