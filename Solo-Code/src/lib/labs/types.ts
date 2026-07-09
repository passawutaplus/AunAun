import type { LucideIcon } from "lucide-react";

export type LabsCategoryId = "visual" | "files" | "delivery" | "developer";

export type LabsToolStatus = "live" | "beta" | "preview";

export type LabsToolDef = {
  id: string;
  title: string;
  description: string;
  category: LabsCategoryId;
  route: string;
  icon: LucideIcon;
  status: LabsToolStatus;
  /** ประมาณเวลาใช้งาน (นาที) */
  durationMin?: number;
  keywords?: string[];
};

export type LabsCategoryDef = {
  id: LabsCategoryId;
  title: string;
  titleEn?: string;
  description: string;
  icon: LucideIcon;
};

export type LabsExportAction = {
  label: string;
  disabled?: boolean;
  onExport: () => void | Promise<void>;
};

export type LabsWorkbenchStatus = {
  fileCount: number;
  processing: boolean;
  processingLabel?: string;
  lastAction?: string;
  privacyNote: string;
};

export type ExportPreset = {
  id: string;
  label: string;
  width?: number;
  height?: number;
  format: "png" | "jpg" | "webp";
  quality?: number;
};

export type LabsFileItemStatus = "pending" | "processing" | "done" | "error";

export type LabsFileItem = {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  width?: number;
  height?: number;
  targetFormat: "jpeg" | "png" | "webp" | "original";
  status: LabsFileItemStatus;
  error?: string;
  outputBlob?: Blob;
  estimatedSize?: number;
};

export type LabsActionId =
  | "resize"
  | "compress"
  | "convert"
  | "cropSocial"
  | "removeExif"
  | "watermark"
  | "rename";

export type LabsActionStackItem = {
  id: LabsActionId;
  enabled: boolean;
  label: string;
  settings: Record<string, unknown>;
};

export type MockupPresetId =
  | "browser"
  | "desktop"
  | "mobile"
  | "tablet"
  | "social"
  | "beforeAfter";

export type MockupQuickPresetId =
  | "clientPresentation"
  | "portfolioCaseStudy"
  | "socialPreview"
  | "beforeAfter";

export type DeliveryProjectType =
  | "design"
  | "website"
  | "video"
  | "document"
  | "code"
  | "custom";

export type DeliveryPackFolder = {
  id: string;
  label: string;
  files: { id: string; name: string; file?: File }[];
};
