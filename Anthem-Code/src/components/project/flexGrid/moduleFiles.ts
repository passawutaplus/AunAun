import { isVideoFile } from "@/lib/videoAccept";
import { isModel3dFile } from "@/lib/model3dAccept";
import { isGifFile } from "@/lib/uploadProjectGif";
import { toast } from "sonner";

/** Which upload kind a file / drag payload maps to for a Full Grid module. */
export const PROJECT_GIF_ACCEPT = "image/gif,.gif";

export type ModuleUploadKind = "image" | "gif" | "video" | "model3d";

export function isFileDrag(dt: DataTransfer): boolean {
  return Array.from(dt.types).includes("Files");
}

export function mediaKindFromFile(file: File): ModuleUploadKind | null {
  if (isVideoFile(file)) return "video";
  if (isModel3dFile(file)) return "model3d";
  if (isGifFile(file)) return "gif";
  if (file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|avif)$/i.test(file.name)) {
    return "image";
  }
  return null;
}

/** Best-effort type probe while dragging (files may be empty until drop). */
export function mediaKindFromDataTransfer(dt: DataTransfer): ModuleUploadKind | null {
  if (dt.files?.length) return mediaKindFromFile(dt.files[0]!);
  for (const item of Array.from(dt.items ?? [])) {
    if (item.kind !== "file") continue;
    const t = item.type.toLowerCase();
    if (t.startsWith("video/")) return "video";
    if (t === "image/gif") return "gif";
    if (t.includes("stl") || t.includes("obj") || t === "model/stl" || t === "model/obj") {
      return "model3d";
    }
    if (t.startsWith("image/")) return "image";
  }
  return null;
}

export function fileMatchesKind(kind: ModuleUploadKind, file: File): boolean {
  if (kind === "video") return isVideoFile(file);
  if (kind === "gif") return isGifFile(file);
  if (kind === "model3d") return isModel3dFile(file);
  if (isVideoFile(file) || isModel3dFile(file)) return false;
  return file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|avif|heic|heif|hif)$/i.test(file.name);
}

export function pickFileForKind(kind: ModuleUploadKind, list: FileList | null | undefined): File | null {
  if (!list?.length) return null;
  return Array.from(list).find((f) => fileMatchesKind(kind, f)) ?? null;
}

export function toastWrongModuleFile(kind: ModuleUploadKind) {
  if (kind === "video") toast.error("โมดูลวิดีโอรับเฉพาะไฟล์วิดีโอ");
  else if (kind === "gif") toast.error("โมดูล GIF รับเฉพาะไฟล์ .gif");
  else if (kind === "model3d") toast.error("โมดูล 3D รับเฉพาะไฟล์ .stl และ .obj");
  else toast.error("โมดูลภาพรับเฉพาะไฟล์รูปภาพ");
}
