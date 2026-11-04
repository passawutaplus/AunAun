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

const OPEN_MS = 440;
const CLOSE_MS = 320;
/** easeOutQuint for the zoom out of the card; a softer ease-in-out for the way back. */
const EASE_OPEN = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_CLOSE = "cubic-bezier(0.4, 0, 0.2, 1)";
/** Longest wait for the work to render before zooming anyway. */
const READY_TIMEOUT_MS = 700;
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
  const wrapRef = useRef<HTMLDivElement>(null);
  // Hint the compositor only while moving; a permanent will-change would blur text and cost memory.
  const [animating, setAnimating] = useState(true);
  // The backdrop fades in right away, even while the work is still loading, so the tap feels answered.
  const [dimmed, setDimmed] = useState(false);

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
    setAnimating(true);
    setPhase("leave");
    window.setTimeout(leave, CLOSE_MS);
  }, [leave]);

  // Lock the page underneath; pad for the vanished scrollbar so the feed does not jump sideways.
  useEffect(() => {
    const body = document.body;
    const prev = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
    const gutter = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (gutter > 0) body.style.paddingRight = `${gutter}px`;
    const raf = requestAnimationFrame(() => setDimmed(true));
    return () => {
      cancelAnimationFrame(raf);
      body.style.overflow = prev.overflow;
      body.style.paddingRight = prev.paddingRight;
    };
  }, []);

  // Start the zoom once the work itself has rendered (not the loader), so nothing swaps mid-flight.
  useEffect(() => {
    const wrap = wrapRef.current;
    let raf1 = 0;
    let raf2 = 0;
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      observer.disconnect();
      window.clearTimeout(timer);
      // Two frames: the first paints the start state, the second runs the transition.
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setPhase("open"));
      });
    };
    const isReady = () => !!wrap?.querySelector(".work-paper");
    const observer = new MutationObserver(() => {
      if (isReady()) start();
    });
    const timer = window.setTimeout(start, READY_TIMEOUT_MS);
    if (wrap) observer.observe(wrap, { childList: true, subtree: true });
    if (isReady()) start();
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);

  useEffect(() => {
    if (phase !== "open") return;
    const t = window.setTimeout(() => setAnimating(false), OPEN_MS + 50);
    return () => window.clearTimeout(t);
  }, [phase]);

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
    ? // Content becomes visible early in the zoom, so the card seems to grow into the work.
      { transition: `transform ${OPEN_MS}ms ${EASE_OPEN}, opacity 180ms linear` }
    : {
        transform: origin ? originTransform(origin) : "scale(0.96)",
        opacity: 0,
        transition:
          phase === "leave"
            ? `transform ${CLOSE_MS}ms ${EASE_CLOSE}, opacity 200ms linear ${CLOSE_MS - 200}ms`
            : "none",
      };
  if (animating) zoom.willChange = "transform, opacity";

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="ผลงาน">
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 bg-black/90 backdrop-blur-md transition-opacity duration-300 ease-out motion-reduce:transition-none",
          dimmed && phase !== "leave" ? "opacity-100" : "opacity-0",
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
