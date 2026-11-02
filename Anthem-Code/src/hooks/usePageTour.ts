import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { pullCloudPrefs } from "@/lib/settingsCloudPrefs";
import {
  TOUR_QUERY_PARAM,
  noteShownThisVisit,
  shouldAutoStartTour,
  type GuideTourId,
} from "@/lib/guideTours";

/**
 * Offers the page tour by itself once per visit until it is finished or switched off (`intro`),
 * or opens it right away when the URL has `?tour=<id>` (Settings → replay).
 * `ready` = the page's targets are on screen (data loaded, not a loading skeleton).
 */
export function usePageTour(id: GuideTourId, ready: boolean, delayMs = 900) {
  const { user, loading } = useAuth();
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [intro, setIntro] = useState(false);
  const checked = useRef(false);
  const timer = useRef<number>();
  // The auto-open timer survives re-renders (URL changes); it is only dropped when the page unmounts.
  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    if (!ready || loading) return;
    if (params.get(TOUR_QUERY_PARAM) === id) {
      // Open now (removing the param re-runs this effect).
      checked.current = true;
      noteShownThisVisit(id);
      setIntro(false);
      setOpen(true);
      const next = new URLSearchParams(params);
      next.delete(TOUR_QUERY_PARAM);
      setParams(next, { replace: true });
      return;
    }
    if (checked.current) return;
    checked.current = true;
    const userId = user?.id;
    // Signed in: read the account copy first so a tour finished on another device stays finished here.
    const synced = userId ? pullCloudPrefs(userId) : Promise.resolve(null);
    void synced.then(() => {
      if (!shouldAutoStartTour(userId, id)) return;
      noteShownThisVisit(id);
      timer.current = window.setTimeout(() => {
        setIntro(true);
        setOpen(true);
      }, delayMs);
    });
  }, [ready, loading, user?.id, id, params, setParams, delayMs]);

  const start = useCallback(() => {
    setIntro(false);
    setOpen(true);
  }, []);
  const close = useCallback(() => setOpen(false), []);
  return { open, intro, start, close };
}
