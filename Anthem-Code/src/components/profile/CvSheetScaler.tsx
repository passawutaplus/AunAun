import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/** The CV sheet is laid out at A4 96dpi; this scales it to whatever frame it sits in. */
export const CV_SHEET_PX_W = 794;
export const CV_SHEET_PX_H = 1123;

/** Fill a positioned `.about-cv-a4-frame` with the sheet, scaled to the frame's width. */
export default function CvSheetScaler({ children }: { children: ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / CV_SHEET_PX_W);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={hostRef} className="absolute inset-0 overflow-hidden">
      <div
        className="origin-top-left"
        style={{ width: CV_SHEET_PX_W, height: CV_SHEET_PX_H, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
