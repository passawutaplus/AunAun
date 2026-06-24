import { useState } from "react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { useEffect } from "react";

interface Props {
  images: string[];
  alt: string;
}

const ProjectGallery = ({ images, alt }: Props) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  if (!images?.length) return null;

  return (
    <div className="space-y-3">
      <Carousel setApi={setApi} className="rounded-2xl overflow-hidden border border-border bg-card">
        <CarouselContent>
          {images.map((src, i) => (
            <CarouselItem key={i}>
              <img src={src} alt={`${alt} ${i + 1}`} className="w-full aspect-[16/10] object-cover" loading="lazy" />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-3" />
        <CarouselNext className="right-3" />
      </Carousel>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {images.map((src, i) => (
          <button
            key={i}
            onClick={() => api?.scrollTo(i)}
            className={`shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
              current === i ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
            }`}
          >
            <img src={src} alt="" className="w-20 h-14 object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProjectGallery;
