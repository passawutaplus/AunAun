import { useCallback, useEffect, useState } from "react";
import { useNarrowViewport } from "@/hooks/useNarrowViewport";
import {
  FEED_GRID_DENSITY_EVENT,
  getFeedProjectGridClass,
  readFeedGridDensity,
  writeFeedGridDensity,
  type FeedGridDensity,
} from "@/lib/feedGridDensity";
import {
  FEED_GRID_MOBILE_EVENT,
  getFeedProjectGridClassMobile,
  readFeedGridMobileColumns,
  writeFeedGridMobileColumns,
  type FeedMobileColumns,
} from "@/lib/feedMobileColumns";

export function useFeedGridDensity() {
  const narrow = useNarrowViewport();
  const [density, setDensityState] = useState<FeedGridDensity>(readFeedGridDensity);
  const [mobileColumns, setMobileColumnsState] = useState<FeedMobileColumns>(readFeedGridMobileColumns);

  useEffect(() => {
    const syncDesktop = () => setDensityState(readFeedGridDensity());
    const syncMobile = () => setMobileColumnsState(readFeedGridMobileColumns());
    window.addEventListener(FEED_GRID_DENSITY_EVENT, syncDesktop);
    window.addEventListener(FEED_GRID_MOBILE_EVENT, syncMobile);
    return () => {
      window.removeEventListener(FEED_GRID_DENSITY_EVENT, syncDesktop);
      window.removeEventListener(FEED_GRID_MOBILE_EVENT, syncMobile);
    };
  }, []);

  const setDensity = useCallback((next: FeedGridDensity) => {
    if (next === readFeedGridDensity()) return;
    writeFeedGridDensity(next);
    setDensityState(next);
  }, []);

  const setMobileColumns = useCallback((next: FeedMobileColumns) => {
    if (next === readFeedGridMobileColumns()) return;
    writeFeedGridMobileColumns(next);
    setMobileColumnsState(next);
  }, []);

  const gridClass = narrow
    ? getFeedProjectGridClassMobile(mobileColumns)
    : getFeedProjectGridClass(density);

  return {
    narrow,
    density,
    mobileColumns,
    setDensity,
    setMobileColumns,
    gridClass,
  };
}
