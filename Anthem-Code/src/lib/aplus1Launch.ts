/** Aplus1 ↔ So1o ecosystem — disabled at launch until env enables it. */
export function isSoloEcosystemEnabled(): boolean {
  return (
    import.meta.env.VITE_SOLO_ECOSYSTEM_ENABLED === "true" ||
    import.meta.env.VITE_APLUS1_UPGRADE_ENABLED === "true"
  );
}

/** @deprecated Use isSoloEcosystemEnabled — kept for existing call sites. */
export const isAplus1UpgradeEnabled = isSoloEcosystemEnabled;

export const UPGRADE_PATH = "/upgrade";

export const UPGRADE_COMING_SOON_TH =
  "แพ็ก Pro บน Aplus1 กำลังจะเปิดให้สมัครเร็ว ๆ นี้ — ใช้งานฟรีและ Pixel ได้ตามปกติ";

export const SOLO_ECOSYSTEM_COMING_SOON_TH =
  "การเชื่อมต่อ So1o Freelancer กำลังจะเปิดเร็ว ๆ นี้ — ใช้ Aplus1 โพสต์ผลงาน แชท และรับงานได้ตามปกติ";

export const SOLO_ECOSYSTEM_COMING_SOON_SHORT = "So1o — เร็ว ๆ นี้";

export const APLUS1_PAYMENTS_DISABLED_TH =
  "การชำระเงินผ่าน Stripe กำลังจะเปิดเร็ว ๆ นี้ — รับของขวัญและ daily px ใช้ได้ตามปกติ";

/** Stripe checkout / Connect / cashout / boost / ads — can be enabled separately from Solo UI links. */
export function isAplus1PaymentsEnabled(): boolean {
  if (import.meta.env.VITE_APLUS1_PAYMENTS_ENABLED === "false") {
    return false;
  }
  if (
    import.meta.env.VITE_APLUS1_PAYMENTS_ENABLED === "true" ||
    isSoloEcosystemEnabled()
  ) {
    return true;
  }
  // Production builds (aplus1.app + aplus1-demo): payments on unless opted out
  return import.meta.env.PROD;
}

export class SoloEcosystemDisabledError extends Error {
  constructor(message = SOLO_ECOSYSTEM_COMING_SOON_TH) {
    super(message);
    this.name = "SoloEcosystemDisabledError";
  }
}

export function assertSoloEcosystemEnabled(): void {
  if (!isSoloEcosystemEnabled()) {
    throw new SoloEcosystemDisabledError();
  }
}

export function assertAplus1PaymentsEnabled(): void {
  if (!isAplus1PaymentsEnabled()) {
    throw new SoloEcosystemDisabledError(APLUS1_PAYMENTS_DISABLED_TH);
  }
}
