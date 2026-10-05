# Phase 07 — Image viewer (PC + mobile) + view filters

Applies to feed images AND My Vault (incl. own uploads). Use the existing viewer/detail route if one exists. **No download control** (except owner's own uploads).
Principle: progressive disclosure in 3 layers; do not clutter.
- Layer 1 (always): large image, 5-swatch palette strip, 3 key tags, Keep.
- Layer 2 (hover/tap): why it matched (matched tags + missing tags as tappable chips), credit/source, "Open original".
- Layer 3 (toggle): all tags, discipline, era, size, source.

## Features (build in this order)
1. **Palette strip**: swatch widths ∝ share; tap = copy hex (try/catch clipboard); shows name+hex+"copied"; action "find images with this color" (uses palette search). Use stored palette; do NOT read pixels from cross-origin images (canvas is blocked).
2. **Tags as chips**: tap = pin (aria-pressed); when ≥1 pinned show "search with selected tags (n)". Long-press = exclude.
3. **Ambient background**: page background tints to a dark variant of the dominant (or tapped) swatch, 0.6 s transition; ensure text contrast ≥ 4.5:1.
4. **B&W filter** (display-only): CSS `grayscale(1) contrast(1.1)` on the image (and on strip thumbnails); toggle button with aria-pressed; hold-to-peek original color on the image; shortcut `B` (PC); remember in localStorage; 300 ms transition; no server, no AI, never alters/saves the stored image; no "save filtered copy" for feed images. Not applied to search ranking. Test scroll performance on a mid-range phone (prefer one class on the container).
5. **Composition overlay**: toggle rule-of-thirds lines over the image (CSS only, off by default).
6. **"Continue from this image" strip**: tabs similar / opposite (phase 06 endpoints), horizontally scrollable, infinite.
7. **Navigation**: prev/next buttons + arrow keys (PC), swipe (mobile); breadcrumb trail of the exploration path (search › similar #3 › this image), tappable to go back.

## PC layout (≥ 1024 px)
Top bar: back + breadcrumb trail (left), prev/next (right). Two columns: image stage (left, max ~520 px wide, 4:5 frame, under it the B&W and composition toggles + "hold to see color" hint) and info panel (right, ~420 px): title, creator, credit line + license badge, palette, tags, match box, Keep + Open original, "all details" toggle (layer 3). Below: "Continue from this image" tabs + strip. Wraps to a single column on narrow widths.

## Mobile layout (390 px, touch targets ≥ 44 px)
Image on top (4:5, side margin 16); top bar: back + B&W pill. **Bottom sheet**: collapsed (~316 px) shows handle, title, palette strip, tag chips (horizontal scroll), sticky action bar (Keep + open original). Tap handle (aria-expanded) expands (~760 px) to layer 2/3 content + continue strip. Swipe image left/right = next/prev. Hold image to peek color.

## My Vault additions (from mymind study; keep the existing look)
- Source line always visible: "from {domain}" + **Open original** + saved date; credit text if saved (phase 11.C); never a license claim.
- Palette strip on every image card detail: tap = copy hex; palette search entry; typed hex colors in a note show as color chips.
- Card layouts by `itemType` (image, webpage, highlight/quote, video, note) so links no longer look like images.
- **Top of Mind**: pin up to 5 items to a row at the top of My Vault (`pinned` flag).
- Replace image (thumbnail) for items saved as link-only; user's file stays private.
- Multi-select (Shift+click / long-press) with bulk tag, move, delete; "Save this search as a collection" (phase 06).

## States/a11y
Loading skeleton (blurhash), broken-image placeholder, missing palette/tags (hide section, don't show empty). Buttons are real `<button>`; chips/swatches have aria-labels; `prefers-reduced-motion` disables transitions.

Done when: PC and mobile layouts work; swatch copy, tag pin, B&W (with peek), overlay, tabs and navigation work; sheet expands/collapses; no new library added unless asked.
