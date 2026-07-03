/** Aplus1 in-app upgrade / checkout — disabled at initial launch unless env enables it. */
export function isAplus1UpgradeEnabled(): boolean {
  return import.meta.env.VITE_APLUS1_UPGRADE_ENABLED === "true";
}

export const UPGRADE_PATH = "/upgrade";

export const UPGRADE_COMING_SOON_TH =
  "แพ็ก Pro บน Aplus1 กำลังจะเปิดให้สมัครเร็ว ๆ นี้ — ใช้งานฟรีและ Pixel ได้ตามปกติ";
