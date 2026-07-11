import { useState, useEffect } from "react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import ImageActionBar from "@/components/project/ImageActionBar";

interface Props {
  images: string[];
  alt: string;
  projectId?: string;
  projectTitle?: string;
  imageIndexOffset?: number;
}

const ProjectGallery = ({
  images,
  alt,
  projectId,
  projectTitle,
  imageIndexOffset = 0,
}: Props) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  if (!images?.length) return null;

  const showActions = !!projectId && !!projectTitle;

  return (
    <div className="space-y-3">
      <Carousel setApi={setApi} className="relative group overflow-hidden rounded-none bg-transparent">
        <CarouselContent>
          {images.map((src, i) => (
            <CarouselItem key={i}>
              <img
                src={src}
                alt={`${alt} ${i + 1}`}
                className="max-h-[min(80vh,720px)] w-full object-contain"
                loading="lazy"
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-3 border-0 bg-background/20 text-foreground/55 shadow-none backdrop-blur-[2px] hover:bg-background/40 hover:text-foreground/80 disabled:opacity-20" />
        <CarouselNext className="right-3 border-0 bg-background/20 text-foreground/55 shadow-none backdrop-blur-[2px] hover:bg-background/40 hover:text-foreground/80 disabled:opacity-20" />
        {showActions && images[current] ? (
          <ImageActionBar
            projectId={projectId}
            projectTitle={projectTitle}
            imageUrl={images[current]}
            imageIndex={imageIndexOffset + current}
          />
        ) : null}
      </Carousel>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {images.map((src, i) => (
          <button
            key={i}
            onClick={() => api?.scrollTo(i)}
            className={`h-14 w-20 shrink-0 overflow-hidden rounded-none border-2 bg-transparent transition-all ${
              current === i ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
            }`}
          >
            <img src={src} alt="" className="h-full w-full object-contain" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProjectGallery;
