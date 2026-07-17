import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Box, Film, Loader2 } from "lucide-react";
import {
  parseFlexGridLayout,
  type FlexGridLayout,
  type FlexGridModule,
} from "@/lib/flexGridLayout";
import { cn } from "@/lib/utils";

const Model3dViewer = lazy(() => import("@/components/project/Model3dViewer"));

type Props = {
  layout: FlexGridLayout | unknown;
  className?: string;
};

export function FlexGridView({ layout: rawLayout, className }: Props) {
  const layout = parseFlexGridLayout(rawLayout);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w <= 0 || layout.canvasWidth <= 0) return;
      setScale(Math.min(1, w / layout.canvasWidth));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [layout.canvasWidth]);

  if (!layout.boards.some((b) => b.modules.length > 0)) {
    return (
      <div
        className={cn(
          "flex aspect-video items-center justify-center rounded-2xl bg-muted text-muted-foreground",
          className,
        )}
      >
        ยังไม่มีเนื้อหา
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("w-full", className)}>
      <div className="mx-auto flex flex-col gap-0" style={{ width: layout.canvasWidth * scale }}>
      {layout.boards.map((board) => (
          <div
            key={board.id}
            className="relative overflow-hidden bg-background"
            style={{
              width: layout.canvasWidth * scale,
              height: board.height * scale,
            }}
          >
            <div
              className="absolute left-0 top-0 origin-top-left"
              style={{
                width: layout.canvasWidth,
                height: board.height,
                transform: `scale(${scale})`,
              }}
            >
              {board.modules.map((mod) => (
                <ModuleView key={mod.id} module={mod} />
              ))}
            </div>
          </div>
      ))}
      </div>
    </div>
  );
}

function ModuleView({ module }: { module: FlexGridModule }) {
  return (
    <div
      className="absolute overflow-hidden"
      style={{
        left: module.x,
        top: module.y,
        width: module.w,
        height: module.h,
        zIndex: module.z,
      }}
    >
      {module.type === "image" ? (
        module.url ? (
          <img src={module.url} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="h-full w-full bg-muted" />
        )
      ) : null}

      {module.type === "gif" ? (
        module.url ? (
          <img src={module.url} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="h-full w-full bg-muted" />
        )
      ) : null}

      {module.type === "video" ? (
        module.url ? (
          <div className="relative h-full w-full bg-black">
            <video
              src={module.url}
              className="h-full w-full object-cover"
              controls
              playsInline
              preload="metadata"
            />
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
            <Film className="h-8 w-8" />
          </div>
        )
      ) : null}

      {module.type === "model3d" ? (
        module.url && module.format ? (
          <Suspense
            fallback={
              <div className="flex h-full w-full items-center justify-center bg-muted/30">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            }
          >
            <Model3dViewer
              url={module.url}
              format={module.format}
              orbit={module.orbit}
              autoRotate={!module.viewLocked}
              viewLocked={!!module.viewLocked}
            />
          </Suspense>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
            <Box className="h-8 w-8" />
          </div>
        )
      ) : null}

      {module.type === "text" ? (
        <div
          className="h-full w-full overflow-auto bg-transparent p-1 text-sm leading-relaxed text-foreground [&_b]:font-bold [&_strong]:font-bold"
          dangerouslySetInnerHTML={{ __html: module.text || "" }}
        />
      ) : null}
    </div>
  );
}
