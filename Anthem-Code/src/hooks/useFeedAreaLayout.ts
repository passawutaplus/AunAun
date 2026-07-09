import { useCallback, useEffect, useState } from "react";
import { useNarrowViewport } from "@/hooks/useNarrowViewport";
import {
  FEED_AREA_LAYOUT_EVENT,
  getFeedAreaContainerClass,
  getFeedAreaGapClass,
  getFeedAreaItemClass,
  readFeedAreaLayout,
  writeFeedAreaLayout,
  type FeedAreaLayout,
} from "@/lib/feedAreaDensity";
import {
  FEED_AREA_MOBILE_EVENT,
  getFeedAreaContainerClassMobile,
  getFeedAreaGapClassMobile,
  getFeedAreaItemClassMobile,
  readFeedAreaMobileColumns,
  writeFeedAreaMobileColumns,
  type FeedMobileColumns,
} from "@/lib/feedMobileColumns";

export function useFeedAreaLayout() {
  const narrow = useNarrowViewport();
  const [layout, setLayoutState] = useState<FeedAreaLayout>(readFeedAreaLayout);
  const [mobileColumns, setMobileColumnsState] = useState<FeedMobileColumns>(readFeedAreaMobileColumns);

  useEffect(() => {
    const syncDesktop = () => setLayoutState(readFeedAreaLayout());
    const syncMobile = () => setMobileColumnsState(readFeedAreaMobileColumns());
    window.addEventListener(FEED_AREA_LAYOUT_EVENT, syncDesktop);
    window.addEventListener(FEED_AREA_MOBILE_EVENT, syncMobile);
    return () => {
      window.removeEventListener(FEED_AREA_LAYOUT_EVENT, syncDesktop);
      window.removeEventListener(FEED_AREA_MOBILE_EVENT, syncMobile);
    };
  }, []);

  const setLayout = useCallback((next: FeedAreaLayout) => {
    if (next === readFeedAreaLayout()) return;
    writeFeedAreaLayout(next);
    setLayoutState(next);
  }, []);

  const setMobileColumns = useCallback((next: FeedMobileColumns) => {
    if (next === readFeedAreaMobileColumns()) return;
    writeFeedAreaMobileColumns(next);
    setMobileColumnsState(next);
  }, []);

  const containerClass = narrow
    ? getFeedAreaContainerClassMobile(mobileColumns)
    : getFeedAreaContainerClass(layout);
  const itemClass = narrow ? getFeedAreaItemClassMobile(mobileColumns) : getFeedAreaItemClass(layout);
  const gapClass = narrow ? getFeedAreaGapClassMobile(mobileColumns) : getFeedAreaGapClass(layout);

  return {
    narrow,
    layout,
    mobileColumns,
    setLayout,
    setMobileColumns,
    containerClass,
    itemClass,
    gapClass,
  };
}
