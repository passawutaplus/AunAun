import { useCallback } from "react";
import { useLocation, useNavigate, type Location } from "react-router-dom";

/** Router state that makes /showcase/:id open as an overlay on top of `backgroundLocation`. */
export type ProjectOverlayState = { backgroundLocation: Location };

export function getBackgroundLocation(state: unknown): Location | undefined {
  const bg = (state as Partial<ProjectOverlayState> | null)?.backgroundLocation;
  return bg && typeof bg.pathname === "string" ? bg : undefined;
}

/**
 * State for a <Link to="/showcase/:id">: keeps the page underneath (or the one already under an
 * open overlay) so the work opens on top of it. Direct visits and refreshes still get the full page.
 */
export function useProjectOverlayState(): ProjectOverlayState {
  const location = useLocation();
  return {
    backgroundLocation: getBackgroundLocation(location.state) ?? location,
  };
}

/** navigate() to a work as an overlay over the current page. */
export function useOpenProject() {
  const navigate = useNavigate();
  const state = useProjectOverlayState();
  return useCallback(
    (projectId: string, search = "") =>
      navigate(`/showcase/${projectId}${search}`, { state }),
    [navigate, state],
  );
}

/**
 * Where the last tap landed: the card (nearest ancestor holding an image) the user pressed, so the
 * work overlay can zoom out of it and back into it. Recorded on pointerdown, read once on open.
 */
type Origin = { rect: DOMRect; at: number };
let lastOrigin: Origin | null = null;

function cardFor(target: EventTarget | null): Element | null {
  let el = target instanceof Element ? target : null;
  for (let i = 0; el && i < 8; i++, el = el.parentElement) {
    const r = el.getBoundingClientRect();
    if (r.width >= 60 && r.height >= 60 && el.querySelector("img")) return el;
  }
  return null;
}

if (typeof document !== "undefined") {
  document.addEventListener(
    "pointerdown",
    (e) => {
      const card = cardFor(e.target);
      lastOrigin = card ? { rect: card.getBoundingClientRect(), at: Date.now() } : null;
      // Warm the work page chunk while the finger is still down, so the zoom does not wait on it.
      if (card) {
        void import("@/components/project/ProjectOverlay");
        void import("@/pages/ProjectDetailPage");
      }
    },
    { capture: true, passive: true },
  );
}

/** The card rect from a tap in the last second (consumed), or null. */
export function takeOverlayOrigin(): DOMRect | null {
  const o = lastOrigin;
  lastOrigin = null;
  return o && Date.now() - o.at < 1500 ? o.rect : null;
}
