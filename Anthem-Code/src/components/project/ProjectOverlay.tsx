import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getBackgroundLocation, takeOverlayOrigin } from "@/lib/projectOverlay";
import { cn } from "@/lib/utils";

const ProjectDetailPage = lazy(() => import("@/pages/ProjectDetailPage"));

const ZOOM_MS = 380;
const EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";
/** Width the sheet zooms to (overlay sheet max, 72rem). */
const SHEET_W = 1152;

/** Transform that puts the full-screen sheet over the card it was opened from. */
function originTransform(rect: DOMRect): string {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scale = Math.max(0.08, rect.width / Math.min(vw, SHEET_W));
  const dx = rect.left + rect.width / 2 - vw / 2;
  const dy = rect.top + rect.height / 2 - vh / 2;
  return `translate(${dx}px, ${dy}px) scale(${scale})`;
}

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * /showcase/:id on top of the page it was opened from. The work zooms out of the tapped card and
 * back into it on close; click outside the work, Esc or Back closes it.
 */
export default function ProjectOverlay() {
  const navigate = useNavigate();
  const location = useLocation();
  const [origin] = useState(() => (reducedMotion() ? null : takeOverlayOrigin()));
  const [phase, setPhase] = useState<"enter" | "open" | "leave">("enter");
  const closing = useRef(false);
  // Zoom pivot = middle of what is on screen (the overlay may have been scrolled before closing).
  const [pivotY, setPivotY] = useState("50vh");

  const leave = useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else {
      const bg = getBackgroundLocation(location.state);
      navigate(bg ? `${bg.pathname}${bg.search}${bg.hash}` : "/", { replace: true });
    }
  }, [navigate, location.state]);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    if (reducedMotion()) {
      leave();
      return;
    }
    const top = document.getElementById("project-overlay-scroll")?.scrollTop ?? 0;
    setPivotY(`${top + window.innerHeight / 2}px`);
    setPhase("leave");
    window.setTimeout(leave, ZOOM_MS);
  }, [leave]);

  useEffect(() => {
    // Two frames: the first paints the start state, the second starts the transition.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setPhase("open"));
    });
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Let open dialogs / popovers handle Esc first.
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (document.querySelector("[role=dialog][data-state=open], [data-radix-popper-content-wrapper]")) return;
      close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  // Scroll the overlay (not the page underneath) back to the top when moving between works.
  useEffect(() => {
    document.getElementById("project-overlay-scroll")?.scrollTo({ top: 0 });
  }, [location.pathname]);

  const onBackdrop = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).hasAttribute("data-overlay-backdrop")) close();
  };

  const open = phase === "open";
  // While open, no transform at all: a transformed ancestor would break the sticky rail.
  const zoom: CSSProperties = open
    ? { transition: `transform ${ZOOM_MS}ms ${EASE}, opacity ${ZOOM_MS}ms ${EASE}` }
    : {
        transform: origin ? originTransform(origin) : "scale(0.96)",
        opacity: 0,
        transition: phase === "leave" ? `transform ${ZOOM_MS}ms ${EASE}, opacity ${ZOOM_MS}ms ${EASE}` : "none",
      };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="ผลงาน">
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 bg-black/80 transition-opacity duration-300 ease-out motion-reduce:transition-none",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        id="project-overlay-scroll"
        className="relative h-full overflow-y-auto overscroll-contain"
        data-overlay-backdrop
        onClick={onBackdrop}
      >
        <div data-overlay-backdrop style={{ ...zoom, transformOrigin: `50% ${pivotY}` }}>
          <Suspense fallback={null}>
            <ProjectDetailPage overlay />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
