import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Film,
  Image,
  Layers,
  LayoutGrid,
  Loader2,
  Type,
} from "lucide-react";
import { PhotoGridLayoutWireframe } from "@/components/project/PhotoGridLayoutPicker";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CONTENT_BLOCK_META,
  PROJECT_CONTENT_BLOCKS_MAX,
  type GalleryDisplayMode,
  type ProjectContentBlock,
  type ProjectContentBlockType,
} from "@/lib/projectContentBlocks";
import { PHOTO_GRID_LAYOUTS, type PhotoGridLayout } from "@/lib/photoGridLayouts";
import { cn } from "@/lib/utils";

type Props = {
  galleryDisplayMode: GalleryDisplayMode;
  gridLayout: PhotoGridLayout;
  onDisplayModeChange: (mode: GalleryDisplayMode) => void;
  onGridLayoutSelect: (layout: PhotoGridLayout) => void;
  imageCount: number;
  maxImages: number;
  videoCount: number;
  maxVideos: number;
  contentBlocks: ProjectContentBlock[];
  imageDisabled?: boolean;
  videoDisabled?: boolean;
  textDisabled?: boolean;
  uploadingImage?: boolean;
  uploadingVideo?: boolean;
  onPickImages: (files: FileList) => void;
  onPickVideo: (file: File) => void;
  onAddTextBlock: (type: ProjectContentBlockType) => void;
  className?: string;
};

type PreviewKind = GalleryDisplayMode | "video" | ProjectContentBlockType;

function SectionDivider() {
  return <div className="border-t border-border/60" role="separator" />;
}

function ToolPreview({ kind, compact }: { kind: PreviewKind; compact?: boolean }) {
  const box = "rounded-[2px] bg-muted-foreground/25";
  const frame = cn(
    "flex items-center justify-center rounded-md border border-border/70 bg-muted/40",
    compact ? "h-10 w-full p-1" : "h-14 w-full rounded-lg p-2",
  );

  if (kind === "single") {
    return (
      <div className={frame}>
        <div className={cn(box, "flex h-full w-full items-center justify-center")}>
          <Image className="h-3.5 w-3.5 text-muted-foreground/70" strokeWidth={1.5} />
        </div>
      </div>
    );
  }
  if (kind === "gallery") {
    return (
      <div className={frame}>
        <div className="flex h-full w-full gap-0.5">
          <div className={cn(box, "h-full flex-1")} />
          <div className={cn(box, "h-full w-3")} />
          <div className={cn(box, "h-full w-3 opacity-60")} />
        </div>
      </div>
    );
  }
  if (kind === "video") {
    return (
      <div className={frame}>
        <div className={cn(box, "flex h-full w-full items-center justify-center")}>
          <Film className="h-3.5 w-3.5 text-muted-foreground/70" strokeWidth={1.5} />
        </div>
      </div>
    );
  }
  if (kind === "heading") {
    return (
      <div className={frame}>
        <div className={cn(box, "h-1.5 w-3/4")} />
      </div>
    );
  }
  if (kind === "heading_body") {
    return (
      <div className={frame}>
        <div className="flex w-full flex-col gap-0.5 px-0.5">
          <div className={cn(box, "h-1 w-2/3")} />
          <div className={cn(box, "h-0.5 w-full")} />
        </div>
      </div>
    );
  }
  if (kind === "body") {
    return (
      <div className={frame}>
        <div className="flex w-full flex-col gap-0.5 px-0.5">
          <div className={cn(box, "h-0.5 w-full")} />
          <div className={cn(box, "h-0.5 w-4/5")} />
        </div>
      </div>
    );
  }
  return null;
}

function ToolRowButton({
  label,
  hint,
  preview,
  active,
  disabled,
  loading,
  count,
  max,
  onClick,
}: {
  label: string;
  hint: string;
  preview: PreviewKind;
  active?: boolean;
  disabled?: boolean;
  loading?: boolean;
  count: number;
  max: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg border p-2 text-left transition-colors",
        active
          ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
          : "border-border/60 bg-card/50 hover:border-primary/30 hover:bg-muted/30",
        disabled && "pointer-events-none opacity-45",
      )}
    >
      <div className="w-14 shrink-0">
        {loading ? (
          <div className="flex h-10 items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ToolPreview kind={preview} compact />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs font-medium text-foreground">{label}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="shrink-0 text-muted-foreground/60"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                role="presentation"
              >
                <CircleHelp className="h-3 w-3" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[200px] text-xs">
              {hint}
            </TooltipContent>
          </Tooltip>
        </div>
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {count}/{max}
        </span>
      </div>
    </button>
  );
}

function TextToolButton({
  label,
  preview,
  disabled,
  count,
  max,
  onClick,
}: {
  label: string;
  preview: ProjectContentBlockType;
  disabled?: boolean;
  count: number;
  max: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex flex-col gap-1 rounded-lg border border-border/60 bg-card/50 p-1.5 text-left transition-colors hover:border-primary/30 hover:bg-muted/30",
        disabled && "pointer-events-none opacity-45",
      )}
    >
      <ToolPreview kind={preview} compact />
      <span className="text-[10px] font-medium leading-tight text-foreground line-clamp-2">{label}</span>
      <span className="text-[9px] tabular-nums text-muted-foreground">{count}/{max}</span>
    </button>
  );
}

function CollapsedRailButton({
  label,
  active,
  disabled,
  loading,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-pressed={active}
          disabled={disabled || loading}
          onClick={onClick}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
            active
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
            (disabled || loading) && "pointer-events-none opacity-50",
          )}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function ProjectEditorToolsSidebar({
  galleryDisplayMode,
  gridLayout,
  onDisplayModeChange,
  onGridLayoutSelect,
  imageCount,
  maxImages,
  videoCount,
  maxVideos,
  contentBlocks,
  imageDisabled,
  videoDisabled,
  textDisabled,
  uploadingImage,
  uploadingVideo,
  onPickImages,
  onPickVideo,
  onAddTextBlock,
  className,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setExpanded(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const singleImageRef = useRef<HTMLInputElement>(null);
  const galleryImageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const singleMax = 1;
  const blockCount = (type: ProjectContentBlockType) =>
    contentBlocks.filter((b) => b.type === type).length;

  const pickSingle = () => {
    if (imageDisabled || uploadingImage) return;
    onDisplayModeChange("single");
    requestAnimationFrame(() => singleImageRef.current?.click());
  };

  const pickGallery = () => {
    if (imageDisabled || uploadingImage) return;
    onDisplayModeChange("gallery");
    requestAnimationFrame(() => galleryImageRef.current?.click());
  };

  const selectGridLayout = (layout: PhotoGridLayout) => {
    if (imageDisabled || uploadingImage) return;
    onGridLayoutSelect(layout);
  };

  const singleMode = galleryDisplayMode === "single";
  const galleryMode = galleryDisplayMode === "gallery";
  const gridMode = galleryDisplayMode === "grid";

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        className={cn(
          "shrink-0 border-r border-border/80 bg-card/95 backdrop-blur-md transition-[width] duration-200 ease-out",
          expanded ? "w-[248px]" : "w-12",
          className,
        )}
        aria-label="เครื่องมือเพิ่มเนื้อหา"
      >
        <div className="sticky top-16 flex h-[calc(100dvh-4rem)] flex-col">
          <div
            className={cn(
              "flex items-center border-b border-border/60 p-2",
              expanded ? "justify-between" : "justify-center",
            )}
          >
            {expanded ? (
              <span className="px-1 text-xs font-semibold text-muted-foreground">เครื่องมือ</span>
            ) : null}
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={expanded ? "ย่อแถบเครื่องมือ" : "ขยายแถบเครื่องมือ"}
            >
              {expanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>

          {expanded ? (
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
              {/* ข้อความ */}
              <div className="space-y-2">
                <p className="px-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  ข้อความ
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["heading", "heading_body", "body"] as const).map((type) => (
                    <TextToolButton
                      key={type}
                      label={CONTENT_BLOCK_META[type].label}
                      preview={type}
                      disabled={textDisabled}
                      count={blockCount(type)}
                      max={PROJECT_CONTENT_BLOCKS_MAX}
                      onClick={() => onAddTextBlock(type)}
                    />
                  ))}
                </div>
              </div>

              <SectionDivider />

              {/* ภาพเดี่ยว */}
              <ToolRowButton
                label="ภาพเดี่ยว"
                hint="โชว์ภาพหลักเต็มจอ"
                preview="single"
                active={singleMode}
                disabled={imageDisabled}
                loading={uploadingImage && singleMode}
                count={singleMode ? imageCount : 0}
                max={singleMax}
                onClick={pickSingle}
              />

              <SectionDivider />

              {/* สไลด์ */}
              <ToolRowButton
                label="แกลเลอรีสไลด์"
                hint="หลายภาพเลื่อนดูได้"
                preview="gallery"
                active={galleryMode}
                disabled={imageDisabled}
                loading={uploadingImage && galleryMode}
                count={galleryMode ? imageCount : 0}
                max={maxImages}
                onClick={pickGallery}
              />

              <SectionDivider />

              {/* Photo grid 4 แบบ */}
              <div className="space-y-2">
                <p className="px-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Photo grid
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {PHOTO_GRID_LAYOUTS.map((layout) => {
                    const active = gridMode && gridLayout === layout.id;
                    return (
                      <button
                        key={layout.id}
                        type="button"
                        disabled={imageDisabled || uploadingImage}
                        aria-pressed={active}
                        onClick={() => selectGridLayout(layout.id)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-lg border p-2 transition-colors",
                          active
                            ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                            : "border-border/60 bg-card/50 hover:border-primary/30 hover:bg-muted/30",
                          (imageDisabled || uploadingImage) && "pointer-events-none opacity-45",
                        )}
                      >
                        <PhotoGridLayoutWireframe layout={layout.id} active={active} />
                        <span className="text-[10px] font-medium leading-tight text-center text-foreground">
                          {layout.label}
                        </span>
                        {active ? (
                          <span className="text-[9px] tabular-nums text-muted-foreground">
                            {imageCount}/{maxImages}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              <SectionDivider />

              {/* วิดีโอ */}
              <ToolRowButton
                label="วิดีโอ"
                hint="เพิ่มคลิปวิดีโอในผลงาน"
                preview="video"
                disabled={videoDisabled}
                loading={uploadingVideo}
                count={videoCount}
                max={maxVideos}
                onClick={() => videoRef.current?.click()}
              />
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center gap-1 overflow-y-auto p-1.5">
              <CollapsedRailButton
                label="ภาพเดี่ยว"
                active={singleMode}
                disabled={imageDisabled}
                loading={uploadingImage && singleMode}
                onClick={pickSingle}
              >
                <Image className="h-4 w-4" />
              </CollapsedRailButton>
              <CollapsedRailButton
                label="แกลเลอรีสไลด์"
                active={galleryMode}
                disabled={imageDisabled}
                loading={uploadingImage && galleryMode}
                onClick={pickGallery}
              >
                <Layers className="h-4 w-4" />
              </CollapsedRailButton>
              <CollapsedRailButton
                label="Photo grid"
                active={gridMode}
                disabled={imageDisabled}
                onClick={() => selectGridLayout(gridLayout)}
              >
                <LayoutGrid className="h-4 w-4" />
              </CollapsedRailButton>
              <CollapsedRailButton
                label="วิดีโอ"
                disabled={videoDisabled}
                loading={uploadingVideo}
                onClick={() => videoRef.current?.click()}
              >
                <Film className="h-4 w-4" />
              </CollapsedRailButton>
              <CollapsedRailButton
                label="ข้อความ"
                disabled={textDisabled}
                onClick={() => onAddTextBlock("body")}
              >
                <Type className="h-4 w-4" />
              </CollapsedRailButton>
            </div>
          )}
        </div>

        <input
          ref={singleImageRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(e) => {
            if (e.target.files?.length) onPickImages(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={galleryImageRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files?.length) onPickImages(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={videoRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPickVideo(f);
            e.target.value = "";
          }}
        />
      </aside>
    </TooltipProvider>
  );
}
