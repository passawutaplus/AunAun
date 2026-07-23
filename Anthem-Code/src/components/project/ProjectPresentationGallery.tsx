import { useState } from "react";
import { motion } from "framer-motion";
import CommunityPostMedia from "@/components/community/CommunityPostMedia";
import ImageActionBar from "@/components/project/ImageActionBar";
import ImageLightbox from "@/components/project/ImageLightbox";
import SafeDemoImage from "@/components/SafeDemoImage";
import { PhotoGridPreview } from "@/components/project/PhotoGridPreview";
import { staggerReveal, viewportOnce } from "@/lib/motion";
import type { GalleryDisplayMode } from "@/lib/projectContentBlocks";
import type { PhotoGridLayout } from "@/lib/photoGridLayouts";
import { photoGridSlotCount } from "@/lib/photoGridLayouts";
import type { PortfolioMediaItem } from "@/lib/portfolioMedia";

type Props = {
  items: PortfolioMediaItem[];
  title: string;
  projectId: string;
  displayMode: GalleryDisplayMode;
  gridLayout?: PhotoGridLayout;
};

export function ProjectPresentationGallery({
  items,
  title,
  projectId,
  displayMode,
  gridLayout = "four_quad",
}: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!items.length) return null;

  const imageItems = items.filter((m) => m.kind === "image");
  const videoItems = items.filter((m) => m.kind === "video");
  const heroImages = displayMode === "single" ? imageItems.slice(0, 1) : imageItems;
  const lightboxImages = heroImages.map((m) => m.url);

  const openAt = (i: number) => {
    if (i >= 0 && i < lightboxImages.length) setLightboxIndex(i);
  };

  const imgIndex = (i: number) =>
    projectId.split("").reduce((a, c) => a + c.charCodeAt(0), 0) + i;

  return (
    <div className="space-y-4">
      {displayMode === "grid" && heroImages.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={staggerReveal(0)}
        >
          <PhotoGridPreview
            images={heroImages.slice(0, photoGridSlotCount(gridLayout)).map((m) => ({ url: m.url }))}
            layout={gridLayout}
            title={title}
            onImageClick={openAt}
          />
        </motion.div>
      ) : displayMode === "gallery" && heroImages.length > 1 ? (
        <div className="rounded-2xl border border-border/60 overflow-hidden aspect-[4/3] sm:aspect-video">
          <CommunityPostMedia
            galleryUrls={heroImages.map((m) => m.url)}
            title={title}
            variant="detail"
          />
        </div>
      ) : (
        heroImages.map((item, i) => (
          <motion.div
            key={item.id}
            className="relative group"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            transition={staggerReveal(i)}
          >
            <SafeDemoImage
              src={item.url}
              index={imgIndex(i)}
              alt={`${title} ${i + 1}`}
              onClick={() => openAt(i)}
              className="w-full rounded-2xl border border-border/60 bg-card object-contain cursor-zoom-in"
              loading="lazy"
            />
            <ImageActionBar
              projectId={projectId}
              projectTitle={title}
              imageUrl={item.url}
              imageIndex={i}
            />
          </motion.div>
        ))
      )}

      {videoItems.map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={staggerReveal(heroImages.length + i)}
        >
          <video
            src={item.url}
            poster={item.posterUrl || undefined}
            controls
            playsInline
            className="w-full rounded-2xl border border-border/60 bg-black max-h-[480px]"
            preload="metadata"
          />
        </motion.div>
      ))}

      <ImageLightbox
        images={lightboxImages}
        index={lightboxIndex ?? 0}
        open={lightboxIndex != null}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
        alt={title}
        projectId={projectId}
        projectTitle={title}
      />
    </div>
  );
}
