import { useCallback, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { toast } from "sonner";
import { uploadProjectImage } from "@/lib/uploadImage";
import { sizeModuleToAspect } from "@/lib/flexGridCropAspect";
import type { FlexGridInlineCropResult } from "@/components/project/FlexGridInlineCrop";
import { urlToImageFile, type ModuleImageCropConfirmResult } from "@/components/project/ModuleImageCropDialog";
import { cropImageUrlToAspectFile } from "@/lib/cropImage";
import { communityMediaAspectMeta, normalizeCommunityMediaAspect } from "@/lib/communityMediaAspect";
import { blockImageUrls, type ProjectContentBlock } from "@/lib/projectContentBlocks";
import { isThreeSplitGridLayout, threeSplitSlotCropSpec } from "@/lib/photoGridLayouts";
import type { FlexGridLayout } from "@/lib/flexGridLayout";
import type { useUploadStageReporter } from "@/hooks/useUploadStageReporter";
import type { useSubscription } from "@/core/subscription";

type UploadReporter = ReturnType<typeof useUploadStageReporter>["reporter"];
type Tier = ReturnType<typeof useSubscription>["tier"];

export type ModuleCropTarget = {
  editor: "casual";
  blockId: string;
  slotIndex?: number;
  sourceUrl: string;
  gallerySlide?: boolean;
  lockedCrop?: { ratio: number; exportW: number; exportH: number; label: string };
};

export type FlexInlineCropSession = {
  boardId: string;
  moduleId: string;
  sourceUrl: string;
  prevW: number;
  prevH: number;
};

/**
 * Image-crop state and handlers for the project editor: the casual-editor
 * module crop popup and the Full Grid inline crop session.
 */
export function useProjectEditorCrops({
  user,
  tier,
  cover,
  setCover,
  contentBlocks,
  setContentBlocks,
  flexGridLayout,
  setFlexGridLayout,
  flexGridLayoutRef,
  folderRef,
  uploadReporter,
  resetUploadStage,
  clearPublishFieldError,
  setUploadingBlockId,
  setUploadingGallery,
  setUploadingFlexModuleId,
}: {
  user: { id: string } | null | undefined;
  tier: Tier;
  cover: string;
  setCover: (url: string) => void;
  contentBlocks: ProjectContentBlock[];
  setContentBlocks: Dispatch<SetStateAction<ProjectContentBlock[]>>;
  flexGridLayout: FlexGridLayout;
  setFlexGridLayout: Dispatch<SetStateAction<FlexGridLayout>>;
  flexGridLayoutRef: MutableRefObject<FlexGridLayout>;
  folderRef: MutableRefObject<string>;
  uploadReporter: UploadReporter;
  resetUploadStage: () => void;
  clearPublishFieldError: (key: "canvasImage") => void;
  setUploadingBlockId: (id: string | null) => void;
  setUploadingGallery: (busy: boolean) => void;
  setUploadingFlexModuleId: (id: string | null) => void;
}) {
  const [moduleCropFile, setModuleCropFile] = useState<File | null>(null);
  const [moduleCropOpen, setModuleCropOpen] = useState(false);
  const [moduleCropTarget, setModuleCropTarget] = useState<ModuleCropTarget | null>(null);
  /** Full Grid inline crop session (no popup). */
  const [flexInlineCrop, setFlexInlineCrop] = useState<FlexInlineCropSession | null>(null);
  const [inlineCropSaving, setInlineCropSaving] = useState(false);

  const handleCropImage = useCallback(async (blockId: string, imageUrl: string, slotIndex?: number) => {
    try {
      const block = contentBlocks.find((b) => b.id === blockId);
      const gallerySlide =
        block?.type === "image" &&
        block.mediaLayout === "gallery" &&
        blockImageUrls(block).map((u) => u.trim()).filter(Boolean).length >= 2;
      const lockedCrop =
        block?.type === "image" &&
        block.mediaLayout === "grid" &&
        isThreeSplitGridLayout(block.gridLayout)
          ? (() => {
              const slot = typeof slotIndex === "number" && slotIndex >= 0 ? slotIndex : 0;
              const spec = threeSplitSlotCropSpec(slot);
              return {
                ratio: spec.ratio,
                exportW: spec.exportW,
                exportH: spec.exportH,
                label: slot === 0 ? "1:2" : "1:1",
              };
            })()
          : undefined;
      const file = await urlToImageFile(imageUrl);
      setModuleCropTarget({
        editor: "casual",
        blockId,
        slotIndex,
        sourceUrl: imageUrl,
        gallerySlide,
        lockedCrop,
      });
      setModuleCropFile(file);
      setModuleCropOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "โหลดรูปเพื่อครอบไม่สำเร็จ");
    }
  }, [contentBlocks]);

  const handleBeginFlexCrop = useCallback(
    (boardId: string, moduleId: string, imageUrl: string) => {
      const board = flexGridLayout.boards.find((b) => b.id === boardId);
      const mod = board?.modules.find((m) => m.id === moduleId);
      if (!mod || mod.type !== "image" || !mod.url) {
        toast.error("ไม่พบโมดูลภาพ");
        return;
      }
      setFlexInlineCrop({
        boardId,
        moduleId,
        sourceUrl: imageUrl,
        prevW: mod.w,
        prevH: mod.h,
      });
    },
    [flexGridLayout],
  );

  const handleCancelFlexCrop = useCallback(() => {
    setFlexInlineCrop((session) => {
      if (!session) return null;
      setFlexGridLayout((prev) => ({
        ...prev,
        boards: prev.boards.map((b) => {
          if (b.id !== session.boardId) return b;
          return {
            ...b,
            modules: b.modules.map((m) =>
              m.id === session.moduleId && m.type === "image"
                ? { ...m, w: session.prevW, h: session.prevH }
                : m,
            ),
          };
        }),
      }));
      return null;
    });
    setInlineCropSaving(false);
  }, []);

  const handleConfirmFlexCrop = useCallback(
    async (boardId: string, moduleId: string, result: FlexGridInlineCropResult) => {
      if (!user) return;
      setInlineCropSaving(true);
      setUploadingFlexModuleId(moduleId);
      setUploadingGallery(true);
      try {
        const url = await uploadProjectImage(result.file, user.id, folderRef.current, tier, {
          skipCompression: true,
          reporter: uploadReporter,
        });
        const frameAspect = result.frameAspectRatio;
        setFlexGridLayout((prev) => ({
          ...prev,
          boards: prev.boards.map((b) => {
            if (b.id !== boardId) return b;
            return {
              ...b,
              modules: b.modules.map((m) => {
                if (m.id !== moduleId || m.type !== "image") return m;
                // Keep first-upload URL so restore can go back to pre-crop.
                const originalUrl = m.originalUrl?.trim() || m.url?.trim() || url;
                if (typeof frameAspect === "number" && frameAspect > 0) {
                  const next = sizeModuleToAspect(m, frameAspect, prev.canvasWidth, b.height);
                  return { ...m, url, originalUrl, w: next.w, h: next.h };
                }
                return { ...m, url, originalUrl };
              }),
            };
          }),
        }));
        if (!cover) setCover(url);
        clearPublishFieldError("canvasImage");
        toast.success("ครอบภาพสำเร็จ");
        setFlexInlineCrop(null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "บันทึกภาพที่ครอบไม่สำเร็จ");
      } finally {
        setUploadingFlexModuleId(null);
        setUploadingGallery(false);
        setInlineCropSaving(false);
        resetUploadStage();
      }
    },
    [user, tier, cover, clearPublishFieldError, uploadReporter, resetUploadStage],
  );

  /** Restore module to the first uploaded image + its natural aspect (no re-upload). */
  const handleRestoreFlexOriginal = useCallback(async (boardId: string, moduleId: string) => {
    const board = flexGridLayoutRef.current.boards.find((b) => b.id === boardId);
    const mod = board?.modules.find((m) => m.id === moduleId);
    if (!mod || mod.type !== "image") return;
    const src = (mod.originalUrl || mod.url || "").trim();
    if (!src) {
      toast.error("ไม่พบภาพต้นฉบับ");
      return;
    }
    setInlineCropSaving(true);
    try {
      const { w, h } = await new Promise<{ w: number; h: number }>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => reject(new Error("โหลดภาพต้นฉบับไม่สำเร็จ"));
        img.src = src;
      });
      const ratio = w / Math.max(1, h);
      setFlexGridLayout((prev) => ({
        ...prev,
        boards: prev.boards.map((b) => {
          if (b.id !== boardId) return b;
          return {
            ...b,
            modules: b.modules.map((m) => {
              if (m.id !== moduleId || m.type !== "image") return m;
              const next = sizeModuleToAspect(m, ratio, prev.canvasWidth, b.height);
              return {
                ...m,
                url: src,
                originalUrl: m.originalUrl?.trim() || src,
                w: next.w,
                h: next.h,
              };
            }),
          };
        }),
      }));
      setFlexInlineCrop(null);
      toast.success("คืนภาพต้นฉบับแล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "คืนภาพต้นฉบับไม่สำเร็จ");
    } finally {
      setInlineCropSaving(false);
    }
  }, []);

  const handleModuleCropConfirm = useCallback(
    async (result: ModuleImageCropConfirmResult) => {
      if (!user || !moduleCropTarget) return;
      const { file, applyToAll, aspect, cornerRadiusPercent } = result;
      const { blockId, slotIndex, sourceUrl, gallerySlide } = moduleCropTarget;
      setUploadingBlockId(blockId);
      setUploadingGallery(true);
      try {
        if (applyToAll && gallerySlide) {
          const block = contentBlocks.find((b) => b.id === blockId);
          if (!block || block.type !== "image") throw new Error("ไม่พบโมดูลสไลด์");
          const urls = blockImageUrls(block).map((u) => u.trim()).filter(Boolean);
          if (urls.length < 2) throw new Error("ต้องมีอย่างน้อย 2 ภาพในสไลด์");

          const meta = communityMediaAspectMeta(normalizeCommunityMediaAspect(aspect));
          const primaryIndex =
            typeof slotIndex === "number" && slotIndex >= 0 && slotIndex < urls.length
              ? slotIndex
              : Math.max(0, urls.findIndex((u) => u === sourceUrl));

          const next: string[] = [];
          for (let i = 0; i < urls.length; i++) {
            let uploadFile = file;
            if (i !== primaryIndex) {
              const sourceFile = await urlToImageFile(urls[i]);
              const objectUrl = URL.createObjectURL(sourceFile);
              try {
                uploadFile = await cropImageUrlToAspectFile(
                  objectUrl,
                  meta.ratio,
                  `slide-${i + 1}.png`,
                  "image/png",
                  {
                    width: meta.exportW,
                    height: meta.exportH,
                    cornerRadiusPercent,
                  },
                );
              } finally {
                URL.revokeObjectURL(objectUrl);
              }
            }
            const url = await uploadProjectImage(uploadFile, user.id, folderRef.current, tier, {
              skipCompression: true,
              reporter: uploadReporter,
            });
            next.push(url);
          }

          setContentBlocks((prev) =>
            prev.map((b) =>
              b.id === blockId && b.type === "image"
                ? { ...b, mediaLayout: "gallery", urls: next, url: next[0] ?? "" }
                : b,
            ),
          );
          if (!cover && next[0]) setCover(next[0]);
          toast.success(`ครอบภาพทั้งสไลด์สำเร็จ (${next.length} ภาพ)`);
          return;
        }

        const url = await uploadProjectImage(file, user.id, folderRef.current, tier, {
          skipCompression: true,
          reporter: uploadReporter,
        });
        setContentBlocks((prev) =>
          prev.map((b) => {
            if (b.id !== blockId) return b;
            if (b.type === "image_text") {
              return { ...b, url };
            }
            if (b.type !== "image") return b;
            const urls = blockImageUrls(b).map((u) => u.trim());
            if (
              b.mediaLayout === "single" ||
              (!b.mediaLayout && urls.filter(Boolean).length <= 1 && typeof slotIndex !== "number")
            ) {
              return { ...b, type: "image", url, mediaLayout: b.mediaLayout ?? "single" };
            }
            const next = urls.length ? [...urls] : [sourceUrl];
            if (typeof slotIndex === "number" && slotIndex >= 0) {
              while (next.length <= slotIndex) next.push("");
              next[slotIndex] = url;
            } else {
              const idx = next.findIndex((u) => u === sourceUrl);
              if (idx >= 0) next[idx] = url;
              else next.push(url);
            }
            return {
              ...b,
              urls: next,
              url: next.find((u) => u.trim()) ?? url,
            };
          }),
        );
        toast.success("ครอบภาพสำเร็จ");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "บันทึกภาพที่ครอบไม่สำเร็จ");
      } finally {
        setUploadingBlockId(null);
        setUploadingGallery(false);
        setModuleCropFile(null);
        setModuleCropTarget(null);
        setModuleCropOpen(false);
        resetUploadStage();
      }
    },
    [user, moduleCropTarget, tier, contentBlocks, cover, clearPublishFieldError],
  );

  const closeModuleCrop = useCallback(() => {
    setModuleCropFile(null);
    setModuleCropTarget(null);
    setModuleCropOpen(false);
  }, []);

  return {
    moduleCropFile,
    moduleCropOpen,
    setModuleCropOpen,
    moduleCropTarget,
    closeModuleCrop,
    flexInlineCrop,
    inlineCropSaving,
    handleCropImage,
    handleBeginFlexCrop,
    handleCancelFlexCrop,
    handleConfirmFlexCrop,
    handleRestoreFlexOriginal,
    handleModuleCropConfirm,
  };
}
