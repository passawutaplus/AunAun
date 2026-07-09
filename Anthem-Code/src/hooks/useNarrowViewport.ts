import { useEffect, useState } from "react";
import { BOTTOM_NAV_MAX_WIDTH } from "@/lib/mobileLayout";

const QUERY = `(max-width: ${BOTTOM_NAV_MAX_WIDTH}px)`;

export function useNarrowViewport() {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(QUERY).matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = () => setNarrow(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return narrow;
}
