import { useLayoutEffect, useRef, useState, type ComponentProps } from "react";
import { AboutDocumentSheet } from "@/components/profile/AboutDocumentPreview";

/** A4 at 96dpi; the sheet is laid out at full size and scaled down so the preview is exact. */
const A4_PX_W = 794;
const A4_PX_H = 1123;

type Props = ComponentProps<typeof AboutDocumentSheet>;

export default function CvLivePreview(props: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / A4_PX_W));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={hostRef} className="w-full" style={{ height: A4_PX_H * scale }}>
      <div
        className="origin-top-left overflow-hidden rounded-md shadow-lg ring-1 ring-black/10"
        style={{ width: A4_PX_W, height: A4_PX_H, transform: `scale(${scale})` }}
      >
        <AboutDocumentSheet {...props} />
      </div>
    </div>
  );
}
