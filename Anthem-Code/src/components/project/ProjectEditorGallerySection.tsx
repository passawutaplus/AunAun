import { Star, Trash2 } from "lucide-react";
import CommunityPostMedia from "@/components/community/CommunityPostMedia";
import { PhotoGridPreview } from "@/components/project/PhotoGridPreview";
import { SortableGalleryGrid } from "@/components/project/SortableGalleryGrid";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { GalleryDisplayMode } from "@/lib/projectContentBlocks";
import { photoGridSlotCount, type PhotoGridLayout } from "@/lib/photoGridLayouts";
import type { PortfolioMediaItem } from "@/lib/portfolioMedia";
import { cn } from "@/lib/utils";

type Props = {
  items: PortfolioMediaItem[];
  displayMode: GalleryDisplayMode;
  gridLayout: PhotoGridLayout;
  title: string;
  coverUrl: string;
  disabled?: boolean;
  uploadingGridSlot?: number | null;
  onReorder: (items: PortfolioMediaItem[]) => void;
  onSetCover: (url: string) => void;
  onRemove: (index: number) => void;
  onGridSlotUpload?: (slotIndex: number, file: File) => void;
  onGridSlotRemove?: (slotIndex: number) => void;
};

function imageItems(items: PortfolioMediaItem[]) {
  return items.filter((m) => m.kind === "image");
}

function videoItems(items: PortfolioMediaItem[]) {
  return items.filter((m) => m.kind === "video");
}

function mergeImageOrder(items: PortfolioMediaItem[], orderedImages: PortfolioMediaItem[]) {
  return [...orderedImages, ...videoItems(items)];
}

function indexInAll(items: PortfolioMediaItem[], itemId: string) {
  return items.findIndex((m) => m.id === itemId);
}

export function ProjectEditorGallerySection({
  items,
  displayMode,
  gridLayout,
  title,
  coverUrl,
  disabled,
  uploadingGridSlot = null,
  onReorder,
  onSetCover,
  onRemove,
  onGridSlotUpload,
  onGridSlotRemove,
}: Props) {
  const images = imageItems(items);
  const videos = videoItems(items);

  const handleReorderImages = (ordered: PortfolioMediaItem[]) => {
    onReorder(mergeImageOrder(items, ordered));
  };

  const handleRemoveImage = (imageIndex: number) => {
    const target = images[imageIndex];
    if (!target) return;
    const fullIndex = indexInAll(items, target.id);
    if (fullIndex >= 0) onRemove(fullIndex);
  };

  const handleReorderVideos = (ordered: PortfolioMediaItem[]) => {
    onReorder([...images, ...ordered]);
  };

  const handleRemoveVideo = (videoIndex: number) => {
    const target = videos[videoIndex];
    if (!target) return;
    const fullIndex = indexInAll(items, target.id);
    if (fullIndex >= 0) onRemove(fullIndex);
  };

  if (displayMode === "gallery") {
    return (
      <div className="space-y-3">
        {images.length > 0 ? (
          <>
            <div className="rounded-2xl border border-border/60 overflow-hidden aspect-[4/3] sm:aspect-video bg-muted/20">
              <CommunityPostMedia
                galleryUrls={images.map((m) => m.url)}
                title={title.trim() || "ตัวอย่างผลงาน"}
                variant="detail"
              />
            </div>
            <div className="space-y-2">
              {images.length > 1 ? (
                <Label className="text-xs text-muted-foreground">ลากเพื่อเรียงลำดับสไลด์</Label>
              ) : null}
              <SortableGalleryGrid
                items={images}
                coverUrl={coverUrl}
                onReorder={handleReorderImages}
                onSetCover={onSetCover}
                onRemove={handleRemoveImage}
                layout="grid"
              />
            </div>
          </>
        ) : null}

        {videos.length > 0 ? (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">วิดีโอในผลงาน</Label>
            <SortableGalleryGrid
              items={videos}
              coverUrl={coverUrl}
              onReorder={handleReorderVideos}
              onSetCover={onSetCover}
              onRemove={handleRemoveVideo}
              layout="list"
            />
          </div>
        ) : null}
      </div>
    );
  }

  if (displayMode === "grid") {
    const slots = photoGridSlotCount(gridLayout);
    const gridImages = images.slice(0, slots);
    const overflowImages = images.slice(slots);

    return (
      <div className="space-y-4">
        <PhotoGridPreview
          images={gridImages.map((m) => ({ url: m.url }))}
          layout={gridLayout}
          title={title.trim() || "ตัวอย่างผลงาน"}
          editor
          disabled={disabled}
          uploadingSlot={uploadingGridSlot}
          onSlotUpload={onGridSlotUpload}
          onSlotRemove={onGridSlotRemove}
          className="border border-border/60 rounded-2xl p-2 bg-card/30"
        />

        {overflowImages.length > 0 ? (
          <p className="text-xs text-amber-600/90 dark:text-amber-400/90">
            รูปแบบนี้แสดงได้ {slots} ภาพในตาราง — ภาพที่ {slots + 1} เป็นต้นไปจะไม่แสดงในตารางหลัก
          </p>
        ) : null}

        {videos.length > 0 ? (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">วิดีโอในผลงาน</Label>
            <SortableGalleryGrid
              items={videos}
              coverUrl={coverUrl}
              onReorder={handleReorderVideos}
              onSetCover={onSetCover}
              onRemove={handleRemoveVideo}
              layout="list"
            />
          </div>
        ) : null}
      </div>
    );
  }

  const hero = images[0];
  const heroIsCover = !!hero && coverUrl === hero.url;

  return (
    <div className="space-y-3">
      {hero ? (
        <div className="relative rounded-2xl overflow-hidden border border-border bg-card group">
          <img
            src={hero.url}
            alt={title.trim() || "ภาพผลงาน"}
            className="w-full max-h-[480px] object-contain bg-muted/20"
          />
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 rounded-full"
              onClick={() => onSetCover(hero.url)}
              title="ตั้งเป็นภาพปก"
            >
              <Star className={cn("w-4 h-4", heroIsCover && "fill-primary text-primary")} />
            </Button>
            <Button
              size="icon"
              variant="destructive"
              className="h-8 w-8 rounded-full"
              onClick={() => handleRemoveImage(0)}
              title="ลบภาพ"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : null}

      {videos.length > 0 ? (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">วิดีโอในผลงาน</Label>
          <SortableGalleryGrid
            items={videos}
            coverUrl={coverUrl}
            onReorder={handleReorderVideos}
            onSetCover={onSetCover}
            onRemove={handleRemoveVideo}
            layout="list"
          />
        </div>
      ) : null}
    </div>
  );
}
