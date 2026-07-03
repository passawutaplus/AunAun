import { useEffect, useState } from "react";
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

  useEffect(() => {
    setCurrent(src || fallback);
    setLoaded(false);
  }, [src, fallback]);

  const showReveal = reveal && !reduced;

  return (
    <motion.img
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
        if (current !== fallback) {
          setLoaded(false);
          setCurrent(fallback);
        }
      }}
    />
  );
};

export default SafeDemoImage;
