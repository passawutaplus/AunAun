import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import { uploadProjectImage } from "@/lib/uploadImage";
import { prefetchAnthemStorageUsage } from "@/lib/anthemStorageUsage";
import {
  canAddCommunityImage,
  communityMediaLimitMessage,
} from "@/lib/communityLimits";
import type { CommunityMediaAspect } from "@/lib/communityMediaAspect";
import {
  countMediaByKind,
  mediaItemFromUrl,
  type PortfolioMediaItem,
} from "@/lib/portfolioMedia";
import type { Tier } from "@/core/subscription/useSubscription";

type QueueItem = {
  file?: File;
  sourceUrl?: string;
  replaceUrl?: string;
};

type Options = {
  userId: string | undefined;
  folder: string;
  tier: Tier;
  maxImages: number;
  maxTotal: number;
  aspect: CommunityMediaAspect;
  setMediaItems: Dispatch<SetStateAction<PortfolioMediaItem[]>>;
  mediaItems: PortfolioMediaItem[];
  setUploadingGallery: (v: boolean) => void;
};

async function urlToImageFile(url: string): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("โหลดรูปเดิมไม่สำเร็จ");
  const blob = await res.blob();
  const ext = blob.type === "image/png" ? "png" : "jpg";
  const name = url.split("/").pop()?.split("?")[0]?.replace(/\.\w+$/, "") || "recrop";
  return new File([blob], `${name}.${ext}`, { type: blob.type || "image/jpeg" });
}

export function useCommunityImageUpload({
  userId,
  folder,
  tier,
  maxImages,
  maxTotal,
  aspect,
  setMediaItems,
  mediaItems,
  setUploadingGallery,
}: Options) {
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [recropping, setRecropping] = useState(false);
  const queueRef = useRef<QueueItem[]>([]);
  const cropOpenRef = useRef(false);
  const replaceUrlRef = useRef<string | null>(null);
  const recroppingRef = useRef(false);

  const imageCount = countMediaByKind(mediaItems, "image");
  const videoCount = countMediaByKind(mediaItems, "video");

  const uploadOne = useCallback(
    async (file: File, replaceUrl: string | null) => {
      if (!userId) return;
      const url = await uploadProjectImage(file, userId, folder, tier, {
        skipCompression: true,
        fastQuotaCheck: true,
      });
      if (replaceUrl) {
        setMediaItems((items) =>
          items.map((m) => (m.url === replaceUrl ? mediaItemFromUrl(url) : m)),
        );
      } else {
        setMediaItems((items) => [...items, mediaItemFromUrl(url)]);
      }
    },
    [userId, folder, tier, setMediaItems],
  );

  const processQueue = useCallback(async () => {
    if (!userId || cropOpenRef.current) return;
    const next = queueRef.current.shift();
    if (!next) {
      if (recroppingRef.current) {
        recroppingRef.current = false;
        setRecropping(false);
        setUploadingGallery(false);
        toast.success("ครอปรูปใหม่ตามสัดส่วนแล้ว");
      }
      return;
    }

    try {
      cropOpenRef.current = true;
      replaceUrlRef.current = next.replaceUrl ?? null;
      if (next.file) {
        prefetchAnthemStorageUsage(userId);
        setCropFile(next.file);
        setUploadingGallery(false);
        return;
      }
      if (next.sourceUrl) {
        prefetchAnthemStorageUsage(userId);
        const file = await urlToImageFile(next.sourceUrl);
        setCropFile(file);
        setUploadingGallery(false);
        return;
      }
      cropOpenRef.current = false;
      void processQueue();
    } catch (err) {
      cropOpenRef.current = false;
      replaceUrlRef.current = null;
      toast.error(err instanceof Error ? err.message : "เตรียมครอปรูปไม่สำเร็จ");
      void processQueue();
    }
  }, [userId, setUploadingGallery]);

  const enqueueImages = useCallback(
    (files: FileList) => {
      if (!userId) return;
      if (!canAddCommunityImage(imageCount, videoCount)) {
        toast.error(communityMediaLimitMessage("image", imageCount, videoCount));
        return;
      }
      const roomByImages = maxImages - imageCount;
      const roomByTotal = maxTotal - mediaItems.length;
      const room = Math.min(roomByImages, roomByTotal);
      const incoming = Array.from(files).slice(0, room);
      if (incoming.length < files.length) {
        toast.message(`เพิ่มได้อีก ${room} ไฟล์ในโพสต์นี้`);
      }
      queueRef.current.push(...incoming.map((file) => ({ file })));
      void processQueue();
    },
    [userId, imageCount, videoCount, maxImages, maxTotal, mediaItems.length, processQueue],
  );

  const recropImages = useCallback(
    (urls: string[]) => {
      if (!userId || !urls.length) return;
      if (cropOpenRef.current || queueRef.current.length) {
        toast.message("รอครอปรูปปัจจุบันให้เสร็จก่อน");
        return;
      }
      recroppingRef.current = true;
      setRecropping(true);
      setUploadingGallery(true);
      queueRef.current = urls.map((sourceUrl) => ({ sourceUrl, replaceUrl: sourceUrl }));
      void processQueue();
    },
    [userId, processQueue, setUploadingGallery],
  );

  const finishCrop = useCallback(() => {
    cropOpenRef.current = false;
    setCropFile(null);
    replaceUrlRef.current = null;
    void processQueue();
  }, [processQueue]);

  const confirmCrop = useCallback(
    async (file: File) => {
      const replaceUrl = replaceUrlRef.current;
      try {
        setUploadingGallery(true);
        await uploadOne(file, replaceUrl);
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
    aspect,
    enqueueImages,
    recropImages,
    finishCrop,
    confirmCrop,
    recropping,
  };
}
