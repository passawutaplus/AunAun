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
