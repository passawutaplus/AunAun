export const SUPPORT_SLOT_MAX = 50;

export const supportSlotsRemaining = (uniqueSupporters: number) =>
  Math.max(0, SUPPORT_SLOT_MAX - uniqueSupporters);

export const isSupportSlotsFull = (uniqueSupporters: number) =>
  uniqueSupporters >= SUPPORT_SLOT_MAX;
