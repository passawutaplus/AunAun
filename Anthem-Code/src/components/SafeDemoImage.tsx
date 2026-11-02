import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { demoImageUrl, demoImageUrlNatural } from "@/lib/demoImages";
import { imageRevealTransition } from "@/lib/motion";

type SafeDemoImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  index?: number;
  /** Smooth fade-in when image loads (default on). */
  reveal?: boolean;
  /** Use uncropped Unsplash fallback (feed project covers). */
  naturalFallback?: boolean;
};

/** Shown when an image fails: a creator's work must never be swapped for someone else's art. */
const FAILED_IMAGE_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'%3E%3Crect width='4' height='3' fill='%23e5e4e2'/%3E%3C/svg%3E";

const SafeDemoImage = ({
  src,
  index = 0,
  alt = "",
  reveal = true,
  naturalFallback = false,
  className,
  ...props
}: SafeDemoImageProps) => {
  const reduced = useReducedMotion();
  const fallback = naturalFallback ? demoImageUrlNatural(index) : demoImageUrl(index);
  const [current, setCurrent] = useState(src || fallback);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setCurrent(src || fallback);
    // A cached image can finish before React attaches onLoad → it would stay invisible.
    setLoaded(!!imgRef.current?.complete && (imgRef.current?.naturalWidth ?? 0) > 0);
  }, [src, fallback]);

  const showReveal = reveal && !reduced;

  return (
    <motion.img
      ref={(el: HTMLImageElement | null) => {
        imgRef.current = el;
      }}
      decoding="async"
      loading="lazy"
      {...props}
      src={current}
      alt={alt}
      className={className}
      initial={false}
      animate={
        showReveal
          ? { opacity: loaded ? 1 : 0, scale: loaded ? 1 : 1.02 }
          : { opacity: 1, scale: 1 }
      }
      transition={imageRevealTransition}
      onLoad={() => setLoaded(true)}
      onError={() => {
        if (current !== FAILED_IMAGE_PLACEHOLDER) {
          setLoaded(false);
          setCurrent(FAILED_IMAGE_PLACEHOLDER);
        }
      }}
    />
  );
};

export default SafeDemoImage;
