import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { lightboxBackdropVariants, lightboxImageVariants, lightboxTransition } from "@/lib/motion";

interface Props {
  src: string;
  alt: string;
  open: boolean;
  onClose: () => void;
}

const ImageLightbox = ({ src, alt, open, onClose }: Props) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          onClick={onClose}
          variants={lightboxBackdropVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={lightboxTransition}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md [-webkit-backdrop-filter:blur(12px)] cursor-zoom-out"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="ปิด"
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/15 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <motion.img
            key={src}
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            variants={lightboxImageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={lightboxTransition}
            className="max-w-[95vw] max-h-[92vh] object-contain rounded-lg shadow-2xl cursor-default"
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default ImageLightbox;
