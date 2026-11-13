import { tr, type Lang } from "@/lib/i18n";
import { SUPPORT } from "@/lib/i18n/support";
import { formatThb, isPurchasable, type ShopProduct } from "@/lib/support/catalog";

const LOW_STOCK = 3;

/** "฿290 · พร้อมส่ง", "฿190 · เหลือ 2 ชิ้น", "ต้นแบบ · ยังไม่วางขาย", … */
export function productStatusText(p: ShopProduct, lang: Lang): string {
  if (isPurchasable(p)) return `${formatThb(p.priceThb)} · ${stockText(p.stock, lang)}`;
  if (p.status === "prototype") return tr(SUPPORT.stPrototype, undefined, lang);
  if (p.status === "in_development") return tr(SUPPORT.stInDev, undefined, lang);
  return tr(SUPPORT.stSoldOut, undefined, lang);
}

/** "พร้อมส่ง", or "เหลือ 2 ชิ้น" when only a few are left. */
export function stockText(stock: number, lang: Lang): string {
  return stock <= LOW_STOCK ? tr(SUPPORT.stLow, { n: stock }, lang) : tr(SUPPORT.stAvailable, undefined, lang);
}
