import type { Entry } from "@/lib/i18n";
import { isSupportDemo } from "@/lib/support/flags";

/**
 * SAMECOR Shop catalogue. Only things SAMECOR makes itself, never member listings.
 * Real items are honest about their state: nothing here is purchasable until it has a real price,
 * stock and photos. The three `demo` items exist only to test the shop and are hidden outside demo mode.
 */
export type ProductStatus = "in_development" | "prototype" | "available" | "sold_out";
export type ProductCategory = "tools" | "desk";
export type ProductArt = "picker" | "twin" | "tray" | "stand" | "clip";

export type ProductVariant = { id: string; label: Entry; swatch: string };

export type ShopProduct = {
  slug: string;
  name: string;
  category: ProductCategory;
  status: ProductStatus;
  /** One friendly line under the name. */
  line: Entry;
  art: ProductArt;
  demo?: boolean;
  priceThb?: number;
  stock?: number;
  variants?: ProductVariant[];
  specs?: { label: Entry; value: Entry }[];
  externalUrl?: string;
  /** Founding Projects campaign page for this item, shown as a button when that module is on. */
  foundingPath?: string;
};

const INK: ProductVariant = { id: "ink", label: { th: "ดำ Ink", en: "Ink", zh: "墨黑" }, swatch: "#282929" };
const GREY: ProductVariant = { id: "grey", label: { th: "เทา Gallery", en: "Gallery grey", zh: "画廊灰" }, swatch: "#DADAD6" };
const RED: ProductVariant = { id: "red", label: { th: "แดง Samecor", en: "Samecor red", zh: "Samecor 红" }, swatch: "#EE3D29" };

const PRODUCTS: ShopProduct[] = [
  {
    slug: "picker",
    name: "Picker",
    category: "tools",
    status: "prototype",
    line: { th: "เครื่องจับสีพกพา ใช้คู่กับแอป Picker", en: "A pocket colour picker that works with the Picker app", zh: "便携取色器，搭配 Picker 应用使用" },
    art: "picker",
    externalUrl: "https://picker.samecor.com",
    foundingPath: "/founding/picker",
    specs: [
      { label: { th: "ขนาดต้นแบบ", en: "Prototype size", zh: "原型尺寸" }, value: { th: "ประมาณ 84 × 33 × 20 มม.", en: "About 84 × 33 × 20 mm", zh: "约 84 × 33 × 20 毫米" } },
      { label: { th: "ล็อตแรก", en: "First batch", zh: "首批" }, value: { th: "ตั้งเป้า 30 เครื่อง", en: "Aiming for 30 units", zh: "目标 30 台" } },
    ],
  },
  {
    slug: "twin",
    name: "Twin",
    category: "tools",
    status: "in_development",
    line: { th: "กำลังทำอยู่ เดี๋ยวมาเล่าให้ฟัง", en: "In the works. More soon.", zh: "正在制作中，敬请期待" },
    art: "twin",
  },
  {
    slug: "arc-tray",
    name: "Arc Tray",
    category: "desk",
    status: "available",
    demo: true,
    line: { th: "ถาดวางของจุกจิกบนโต๊ะ", en: "A small tray for the bits on your desk", zh: "收纳桌面小物的托盘" },
    art: "tray",
    priceThb: 290,
    stock: 12,
    variants: [INK, GREY, RED],
    specs: [
      { label: { th: "ขนาด", en: "Size", zh: "尺寸" }, value: { th: "180 × 90 × 18 มม.", en: "180 × 90 × 18 mm", zh: "180 × 90 × 18 毫米" } },
      { label: { th: "วัสดุ", en: "Material", zh: "材质" }, value: { th: "PETG พิมพ์ 3D", en: "3D-printed PETG", zh: "3D 打印 PETG" } },
    ],
  },
  {
    slug: "frame-stand",
    name: "Frame Stand",
    category: "desk",
    status: "available",
    demo: true,
    line: { th: "ที่ตั้งโปสการ์ดหรือภาพใบเล็ก", en: "A stand for postcards and small prints", zh: "明信片与小幅作品的展示架" },
    art: "stand",
    priceThb: 190,
    stock: 2,
    variants: [INK, GREY],
    specs: [
      { label: { th: "ขนาด", en: "Size", zh: "尺寸" }, value: { th: "120 × 40 × 30 มม.", en: "120 × 40 × 30 mm", zh: "120 × 40 × 30 毫米" } },
      { label: { th: "วัสดุ", en: "Material", zh: "材质" }, value: { th: "PETG พิมพ์ 3D", en: "3D-printed PETG", zh: "3D 打印 PETG" } },
    ],
  },
  {
    slug: "dot-clip",
    name: "Dot Clip",
    category: "desk",
    status: "available",
    demo: true,
    line: { th: "ตัวเก็บสายชาร์จ แพ็ก 3 ชิ้น", en: "Cable clips, pack of three", zh: "理线夹，三个装" },
    art: "clip",
    priceThb: 120,
    stock: 20,
    variants: [INK, RED],
    specs: [
      { label: { th: "ในแพ็ก", en: "In the pack", zh: "包装内含" }, value: { th: "3 ชิ้น พร้อมเทปกาว", en: "3 clips with adhesive pads", zh: "3 个，附背胶" } },
    ],
  },
];

/** What the shop shows right now: mock items only in demo mode. */
export function listProducts(demo: boolean = isSupportDemo()): ShopProduct[] {
  return PRODUCTS.filter((p) => demo || !p.demo);
}

export function findProduct(slug: string | undefined, demo: boolean = isSupportDemo()): ShopProduct | null {
  if (!slug) return null;
  return listProducts(demo).find((p) => p.slug === slug) ?? null;
}

/** True only when a product has a real price and something left to send. */
export function isPurchasable(p: ShopProduct | null | undefined): p is ShopProduct & { priceThb: number; stock: number } {
  return !!p && p.status === "available" && typeof p.priceThb === "number" && (p.stock ?? 0) > 0;
}

export function formatThb(amount: number): string {
  return `฿${amount.toLocaleString("en-US")}`;
}

const SHELF_RANK: Record<ProductStatus, number> = { available: 0, prototype: 1, in_development: 2, sold_out: 3 };

/** Things you can buy today come first, then what is still being made. */
export function sortForShelf(products: ShopProduct[]): ShopProduct[] {
  return [...products].sort((a, b) => SHELF_RANK[a.status] - SHELF_RANK[b.status]);
}

export const SHOP_CATEGORIES: readonly { id: ProductCategory; label: string }[] = [
  { id: "tools", label: "Tools" },
  { id: "desk", label: "Desk" },
];
