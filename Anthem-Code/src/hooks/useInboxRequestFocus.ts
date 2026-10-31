import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { STUDIO_REQUEST_PARAM, inboxRowDomId } from "@/lib/studioNav";

/**
 * `?request=<id>` deep link: once that row is loaded, `reveal` clears filters so it is listed,
 * then it is expanded and scrolled into view. Call after the section's own "collapse on tab change"
 * effect so the expand wins in the same commit.
 */
export function useInboxRequestFocus(
  rowIds: string[],
  reveal: () => void,
  expand: (id: string) => void,
) {
  const [params, setParams] = useSearchParams();
  const focusId = params.get(STUDIO_REQUEST_PARAM);
  const loaded = !!focusId && rowIds.includes(focusId);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (!focusId || !loaded) return;
    reveal();
    setPending(focusId);
    const next = new URLSearchParams(params);
    next.delete(STUDIO_REQUEST_PARAM);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, loaded]);

  useEffect(() => {
    if (!pending) return;
    expand(pending);
    const id = pending;
    setPending(null);
    requestAnimationFrame(() => {
      document.getElementById(inboxRowDomId(id))?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);
}
