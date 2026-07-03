import { useEffect, useRef, useState } from "react";

function measureFeedToolbarHeight(): number {
  const toolbar = document.querySelector<HTMLElement>("[data-feed-toolbar]");
  if (toolbar) return toolbar.getBoundingClientRect().height;
  return 112;
}

/** Sticky `top` (px) that centers the element below the feed toolbar when stuck. */
export function useStickyViewportCenter() {
  const ref = useRef<HTMLDivElement>(null);
  const [topPx, setTopPx] = useState(112);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const headerBottom = measureFeedToolbarHeight();
      const height = el.getBoundingClientRect().height;
      const space = window.innerHeight - headerBottom;
      const nextTop = headerBottom + Math.max(0, (space - height) / 2);
      setTopPx(Math.round(nextTop));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    const toolbar = document.querySelector("[data-feed-toolbar]");
    if (toolbar) ro.observe(toolbar);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return { ref, topPx };
}
