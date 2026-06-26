import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import { uploadProjectImage } from "@/lib/uploadImage";
import { isSquareImageFile } from "@/lib/cropImage";
import {
  countMediaByKind,
  mediaItemFromUrl,
  type PortfolioMediaItem,
} from "@/lib/portfolioMedia";
import type { Tier } from "@/core/subscription/useSubscription";

type Options = {
  userId: string | undefined;
  folder: string;
  tier: Tier;
  maxImages: number;
  setMediaItems: Dispatch<SetStateAction<PortfolioMediaItem[]>>;
  mediaItems: PortfolioMediaItem[];
  setUploadingGallery: (v: boolean) => void;
};

export function useCommunityImageUpload({
  userId,
  folder,
  tier,
  maxImages,
  setMediaItems,
  mediaItems,
  setUploadingGallery,
}: Options) {
  const [cropFile, setCropFile] = useState<File | null>(null);
  const queueRef = useRef<File[]>([]);
  const cropOpenRef = useRef(false);

  const imageCount = countMediaByKind(mediaItems, "image");

  const uploadOne = useCallback(
    async (file: File) => {
      if (!userId) return;
      const url = await uploadProjectImage(file, userId, folder, tier);
      setMediaItems((items) => [...items, mediaItemFromUrl(url)]);
    },
    [userId, folder, tier, setMediaItems],
  );

  const processQueue = useCallback(async () => {
    if (!userId || cropOpenRef.current) return;
    const next = queueRef.current.shift();
    if (!next) return;

    setUploadingGallery(true);
    try {
      if (await isSquareImageFile(next)) {
        await uploadOne(next);
        setUploadingGallery(false);
        void processQueue();
      } else {
        cropOpenRef.current = true;
        setCropFile(next);
        setUploadingGallery(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "อัปโหลดรูปไม่สำเร็จ");
      setUploadingGallery(false);
      void processQueue();
    }
  }, [userId, uploadOne, setUploadingGallery]);

  const enqueueImages = useCallback(
    (files: FileList) => {
      if (!userId) return;
      if (imageCount >= maxImages) {
        toast.error(`อัปโหลดรูปได้สูงสุด ${maxImages} รูป/โพสต์`);
        return;
      }
      const room = maxImages - imageCount;
      const incoming = Array.from(files).slice(0, room);
      if (incoming.length < files.length) {
        toast.message(`เพิ่มได้อีก ${room} รูปในโพสต์นี้`);
      }
      queueRef.current.push(...incoming);
      void processQueue();
    },
    [userId, imageCount, maxImages, processQueue],
  );

  const finishCrop = useCallback(() => {
    cropOpenRef.current = false;
    setCropFile(null);
    void processQueue();
  }, [processQueue]);

  const confirmCrop = useCallback(
    async (file: File) => {
      try {
        setUploadingGallery(true);
        await uploadOne(file);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "อัปโหลดรูปไม่สำเร็จ");
      } finally {
        setUploadingGallery(false);
        finishCrop();
      }
    },
    [uploadOne, setUploadingGallery, finishCrop],
  );

  return {
    cropFile,
    enqueueImages,
    finishCrop,
    confirmCrop,
  };
}
