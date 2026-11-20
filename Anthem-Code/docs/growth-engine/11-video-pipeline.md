# 11 · Video Production Pipeline (Phase 4)

Video comes **last**, after the system is built, tested and approved. First episode: *SAMECOR Design Stories EP.01* (Thonet Chair No.14), 9:16, 45–60 s, Thai voiceover recorded by the founder.

## Approach

HyperFrames first (editable HTML/CSS/SVG motion collage with authentic archive images); Remotion or an external editor only if HyperFrames cannot meet quality or export needs (document the exact limitation first).

Pipeline: research facts + visuals → rights ledger → script + timing → **owner storyboard approval** → per-shot asset prep → compose → preview render → credit + safe-zone QC → owner comments → targeted revision (approved shots stay) → final approval → export. A render is never a publishing approval.

## HyperFrames limits (from the connector's tool description, checked 2026-11-20)

| Limit | Impact | Plan |
|---|---|---|
| Every `compose` run auto-renders an MP4 | Each iteration costs a render | Iterate storyboard and HTML locally first; compose only approved shots |
| **Ignores linked audio, uses its own narration** | Conflicts with the founder recording the voiceover | Decide at Phase 4: (a) render silent and mux the founder's audio afterwards (ffmpeg / editor), (b) Remotion for final assembly, or (c) accept connector narration only for drafts. No synthetic voice in the final by default |
| Media must be public https URLs | Archive images must be hosted | Upload licensed images to a public bucket path per episode; never hot-link sources |
| Max length ≈ 90 s | Fine for 45–60 s episodes | Keep episodes ≤ 75 s |

## Rights and credits

- Real historical material first; AI only for masks, clean-up and clearly non-historical supporting graphics. Never fabricate archive evidence.
- Every file: URL, author, licence, credit, access date in the manifest. `RIGHTS_PENDING` blocks the shot. Credits do not replace permission.
- Lower-third source credit per shot, not overlapping captions or faces; full credits file exported.

## Shot data (stored with the campaign later)

`id, duration_seconds, script_th, visual_type, real_assets[], original_vector, claim_sources[], credit_short, credit_full, on_screen_text[], motion, review_status, version`.

## End card (5–6 s)

Closing line → SAMECOR wordmark + samecor.com → one primary CTA at a time (Join / Explore) with **verified** download info only (Google Play link checked live; iOS only once the listing is confirmed) → Follow / Subscribe.

## Go / no-go for the HyperFrames pilot

Returns a playable 9:16 file or a clear failure · authentic, legible imagery with rights · editable per scene · credits without overlap + exportable file · targeted revisions · end card makes no unverified claims · the file stays an unpublished preview until the owner approves.

## Feedback after posting

Per episode: hook, duration, outputs, thumbnail, credits, 3-second retention (where available), completion, saves/shares, profile/site clicks, signups, activation at 24h/72h/7d. Suggestions may change hook, pacing, subtitles, cover, outro timing, never the historical facts.
