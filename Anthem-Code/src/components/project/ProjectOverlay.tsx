import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useState,
  type MouseEvent,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getBackgroundLocation } from "@/lib/projectOverlay";
import { cn } from "@/lib/utils";

const ProjectDetailPage = lazy(() => import("@/pages/ProjectDetailPage"));

/** /showcase/:id on top of the page it was opened from: dark backdrop, fade in; click outside the work, Esc or Back to close. */
export default function ProjectOverlay() {
  const navigate = useNavigate();
  const location = useLocation();
  const [shown, setShown] = useState(false);

  const close = useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else {
      const bg = getBackgroundLocation(location.state);
      navigate(bg ? `${bg.pathname}${bg.search}${bg.hash}` : "/", {
        replace: true,
      });
    }
  }, [navigate, location.state]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Let open dialogs / popovers handle Esc first.
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (
        document.querySelector(
          "[role=dialog][data-state=open], [data-radix-popper-content-wrapper]",
        )
      )
        return;
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
    if ((e.target as HTMLElement).hasAttribute("data-overlay-backdrop"))
      close();
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-black/80 transition-opacity duration-300 ease-out motion-reduce:transition-none",
        shown ? "opacity-100" : "opacity-0",
      )}
      role="dialog"
      aria-modal="true"
      aria-label="ผลงาน"
    >
      <div
        id="project-overlay-scroll"
        className="h-full overflow-y-auto overscroll-contain"
        data-overlay-backdrop
        onClick={onBackdrop}
      >
        <Suspense fallback={null}>
          <ProjectDetailPage overlay />
        </Suspense>
      </div>
    </div>
  );
}
