/** Session Brand Kit — Creative Labs */

export const BRAND_KIT_KEY = "so1o.brandKit";

export type BrandKit = {
  name: string;
  hexes: string[];
  fonts?: string;
  moodNote?: string;
  updatedAt: string;
};

export function loadBrandKit(): BrandKit | null {
  try {
    const raw = sessionStorage.getItem(BRAND_KIT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BrandKit;
  } catch {
    return null;
  }
}

export function saveBrandKit(kit: BrandKit): void {
  try {
    sessionStorage.setItem(BRAND_KIT_KEY, JSON.stringify(kit));
  } catch {
    /* noop */
  }
}
