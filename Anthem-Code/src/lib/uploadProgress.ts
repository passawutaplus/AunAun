/**
 * Shared progress-reporting shape for upload/compression pipelines.
 * `onStage` announces what's happening right now (Thai, short); `onPercent`
 * reports 0–100 progress within that stage when it's actually measurable
 * (ffmpeg transcode, browser-image-compression). Both are optional so every
 * upload* function stays usable without wiring UI.
 */
export type UploadStageReporter = {
  onStage?: (label: string) => void;
  onPercent?: (pct: number) => void;
};

export const UPLOAD_STAGE = {
  checkingVideo: "กำลังตรวจสอบไฟล์วิดีโอ...",
  repairingVideo: "กำลังซ่อมไฟล์วิดีโอที่เสียหาย...",
  preparingTranscoder: "กำลังเตรียมตัวแปลงไฟล์ (ครั้งแรกอาจใช้เวลาสักครู่)...",
  transcodingHevc: "กำลังแปลงวิดีโอ HEVC เป็น H.264 ให้เล่นได้ทุกเครื่อง...",
  compressingVideo: "กำลังบีบอัดวิดีโอให้ไฟล์เล็กลง...",
  compressingVideoMore: "ไฟล์ยังใหญ่ กำลังบีบอัดเพิ่มเติม...",
  compressingGif: "กำลังแปลง GIF เป็นวิดีโอ (ไฟล์เล็กลง 10–20 เท่า)...",
  convertingHeic: "กำลังแปลงรูปจาก iPhone (HEIC) ให้เปิดได้ทุกเครื่อง...",
  compressingImage: "กำลังบีบอัดรูปภาพให้ไฟล์เล็กลง...",
  uploadingImage: "กำลังอัปโหลดรูปภาพ...",
  uploadingVideo: "กำลังอัปโหลดวิดีโอ...",
  uploadingGif: "กำลังอัปโหลด GIF...",
  uploadingModel3d: "กำลังอัปโหลดไฟล์ 3D...",
} as const;
