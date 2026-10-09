export const OBJECT_KINDS = [
  { id: "texts", label: "ข้อความ", heading: "Texts" },
  { id: "made", label: "วัตถุ", heading: "Objects" },
  { id: "art-toy", label: "อาร์ตทอย", heading: "Art Toy" },
  { id: "prints", label: "ภาพพิมพ์", heading: "Prints" },
  { id: "files", label: "ไฟล์", heading: "Files" },
] as const;

export type ObjectKind = (typeof OBJECT_KINDS)[number]["id"];

export const OBJECT_SUBTYPES: Record<ObjectKind, { id: string; label: string }[]> = {
  texts: [
    { id: "book", label: "หนังสือ" },
    { id: "zine", label: "ซีน" },
    { id: "type", label: "ตัวอักษร" },
    { id: "essay", label: "บทความ" },
  ],
  prints: [
    { id: "art-print", label: "ภาพพิมพ์อาร์ต" },
    { id: "poster", label: "โปสเตอร์" },
    { id: "photo", label: "ภาพถ่ายพิมพ์" },
    { id: "press", label: "ริโซ / สกรีน" },
  ],
  made: [
    { id: "object", label: "วัตถุเล็ก" },
    { id: "light", label: "โคม" },
    { id: "furniture", label: "เฟอร์นิเจอร์" },
    { id: "textile", label: "ผ้า" },
    { id: "wear", label: "สวมใส่" },
  ],
  "art-toy": [
    { id: "figure", label: "ฟิกเกอร์" },
    { id: "sofubi", label: "ซอฟุบิ" },
    { id: "vinyl", label: "ไวนิล" },
    { id: "blind", label: "กล่องสุ่ม" },
  ],
  files: [
    { id: "template", label: "เทมเพลต" },
    { id: "print-file", label: "ไฟล์พร้อมพิมพ์" },
    { id: "pattern", label: "แพตเทิร์น" },
    { id: "model", label: "ไฟล์ 3D" },
  ],
};

export const OBJECT_MATERIALS = [
  { id: "paper", label: "กระดาษ" },
  { id: "wood", label: "ไม้" },
  { id: "metal", label: "โลหะ" },
  { id: "ceramic", label: "เซรามิก" },
  { id: "glass", label: "แก้ว" },
  { id: "textile", label: "ผ้า" },
  { id: "mixed", label: "ผสม" },
] as const;

export const OBJECT_FORMATS = [
  { id: "pdf", label: "PDF" },
  { id: "figma", label: "Figma" },
  { id: "print-ready", label: "PNG / print-ready" },
  { id: "3d", label: "3D" },
  { id: "pack", label: "แพ็กหลายไฟล์" },
] as const;

export type ObjectAxis = (typeof OBJECT_MATERIALS)[number]["id"] | (typeof OBJECT_FORMATS)[number]["id"];

export const OBJECT_FULFILLMENTS = [
  { id: "ready", label: "พร้อมส่ง" },
  { id: "made_to_order", label: "พร้อมส่ง" },
  { id: "preorder", label: "พรีออเดอร์" },
  { id: "download", label: "ดาวน์โหลด" },
] as const;

/** Choices shown on the shop. Made-to-order stock counts as in stock. */
export const SHOP_SALE_OPTIONS = [
  { id: "ready", label: "พร้อมส่ง" },
  { id: "preorder", label: "พรีออเดอร์" },
] as const;

/** Same snapshot rate as hire. PromptPay PSP cost stays with the platform. */
export const OBJECT_PLATFORM_FEE_PERCENT = 10;

export type ObjectFulfillment = (typeof OBJECT_FULFILLMENTS)[number]["id"];

export const OBJECT_EDITIONS = [
  { id: "open", label: "ไม่จำกัด" },
  { id: "limited", label: "จำกัดจำนวน" },
  { id: "unique", label: "ชิ้นเดียว" },
] as const;

export type ObjectEdition = (typeof OBJECT_EDITIONS)[number]["id"];

export const OBJECT_STATUSES = [
  { id: "Draft", label: "แบบร่าง" },
  { id: "Published", label: "เผยแพร่" },
  { id: "Paused", label: "พักขาย" },
] as const;

export type ObjectStatus = (typeof OBJECT_STATUSES)[number]["id"];

export const OBJECT_ORDER_STATUSES = [
  { id: "unpaid", label: "รอชำระ" },
  { id: "inquiry", label: "รอตอบ" },
  { id: "confirmed", label: "ต้องจัดส่ง" },
  { id: "preparing", label: "กำลังแพ็ก" },
  { id: "shipped", label: "ส่งแล้ว" },
  { id: "completed", label: "สำเร็จ" },
  { id: "cancelled", label: "ยกเลิก" },
] as const;

export type ObjectOrderStatus = (typeof OBJECT_ORDER_STATUSES)[number]["id"];

export type ObjectSpec = { label: string; value: string };
export type ObjectFinish = {
  name: string;
  hex: string;
  image_url?: string;
  price_thb?: number;
  stock?: number;
  sku?: string;
  note?: string;
};
export type ObjectDownload = { label: string; url: string };

export type CreatorObject = {
  id: string;
  owner_id: string;
  title: string;
  code: string;
  summary: string;
  story: string;
  kind: ObjectKind;
  subtype: string;
  material: string;
  fulfillment: ObjectFulfillment;
  edition: ObjectEdition;
  edition_label: string;
  price_thb: number;
  lead_time: string;
  cover_url: string | null;
  gallery_urls: string[];
  finishes: ObjectFinish[];
  specs: ObjectSpec[];
  downloads: ObjectDownload[];
  license_note: string;
  /** Published portfolio projects this object comes from. */
  reference_project_ids: string[];
  status: ObjectStatus;
  created_at: string;
  updated_at: string;
  maker_name?: string;
  maker_username?: string | null;
  sample?: boolean;
};

export type ObjectOrder = {
  id: string;
  object_id: string;
  object_title: string;
  buyer_id: string;
  seller_id: string;
  qty: number;
  finish: string;
  note: string;
  status: ObjectOrderStatus;
  tracking_code: string;
  unit_price_thb: number;
  amount_satang: number;
  platform_fee_satang: number;
  seller_net_satang: number;
  fulfillment: ObjectFulfillment;
  ship_name: string;
  ship_phone: string;
  ship_address: string;
  payment_status: "unpaid" | "paid" | "refunded";
  charge_id: string;
  paid_at: string | null;
  received_at: string | null;
  seller_release: "held" | "pending" | "available";
  created_at: string;
  updated_at: string;
};

export type ObjectFilter = {
  kind: ObjectKind | "any";
  subtype: string | "any";
  axis: string | "any";
  fulfillment: ObjectFulfillment | "any";
  edition: ObjectEdition | "any";
  maxPrice: number | null;
  search: string;
};

/** Shop bar sort. `default` keeps catalog order. */
export type ObjectPriceSort = "default" | "low" | "high";

export function isObjectKind(value: string): value is ObjectKind {
  return OBJECT_KINDS.some((item) => item.id === value);
}

export function isObjectFulfillment(value: string): value is ObjectFulfillment {
  return OBJECT_FULFILLMENTS.some((item) => item.id === value);
}

export function isObjectEdition(value: string): value is ObjectEdition {
  return OBJECT_EDITIONS.some((item) => item.id === value);
}

export function isObjectStatus(value: string): value is ObjectStatus {
  return OBJECT_STATUSES.some((item) => item.id === value);
}

export function isObjectOrderStatus(value: string): value is ObjectOrderStatus {
  return OBJECT_ORDER_STATUSES.some((item) => item.id === value);
}

export function kindLabel(kind: string): string {
  return OBJECT_KINDS.find((item) => item.id === kind)?.label ?? kind;
}

export function kindHeading(kind: string): string {
  return OBJECT_KINDS.find((item) => item.id === kind)?.heading ?? kindLabel(kind);
}

export function subtypeLabel(kind: string, subtype: string): string {
  if (!isObjectKind(kind)) return subtype;
  return OBJECT_SUBTYPES[kind].find((item) => item.id === subtype)?.label ?? subtype;
}

export function axisOptions(kind: ObjectKind | "any") {
  if (kind === "files") return [...OBJECT_FORMATS];
  if (kind === "any") return [...OBJECT_MATERIALS, ...OBJECT_FORMATS];
  return [...OBJECT_MATERIALS];
}

export function axisLabel(id: string): string {
  return (
    OBJECT_MATERIALS.find((item) => item.id === id)?.label ??
    OBJECT_FORMATS.find((item) => item.id === id)?.label ??
    id
  );
}

export function fulfillmentLabel(id: string): string {
  return OBJECT_FULFILLMENTS.find((item) => item.id === id)?.label ?? id;
}

/** Shop tag. Download files have no sale chip. Older made-to-order rows read as in stock. */
export function shopSaleLabel(fulfillment: string): string {
  if (fulfillment === "download") return "";
  if (fulfillment === "preorder") return "พรีออเดอร์";
  return "พร้อมส่ง";
}

export function sellerReleaseLabel(release: string): string {
  if (release === "available") return "พร้อมถอนตามรอบ Payso";
  if (release === "pending") return "เงินรอผู้ซื้อกดรับของ";
  return "";
}

export function editionLabel(id: string): string {
  return OBJECT_EDITIONS.find((item) => item.id === id)?.label ?? id;
}

/**
 * A run is sold out when both sides of the edition count match, such as "1/1" or "40 / 40".
 * "12 / 40" still has copies left and stays on the shop.
 */
export function isEditionSoldOut(edition: string, label: string): boolean {
  if (edition === "open") return false;
  const raw = label.trim().replace(/^edition\s*:\s*/i, "");
  const match = raw.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!match) return false;
  const taken = Number(match[1]);
  const total = Number(match[2]);
  return total > 0 && taken === total;
}

/** Limited runs read as "Edition : 80", without unit words such as ชิ้น or เล่ม. */
export function formatEditionQuantity(edition: string, label: string): string {
  if (edition === "open") return "";
  const raw = label.trim();
  if (edition !== "limited") return raw || editionLabel(edition);
  const qty = raw
    .replace(/^edition\s*:\s*/i, "")
    .replace(/ชิ้น|เล่ม/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return qty ? `Edition : ${qty}` : editionLabel(edition);
}

export function statusLabel(id: string): string {
  return OBJECT_STATUSES.find((item) => item.id === id)?.label ?? id;
}

export function orderStatusLabel(id: string): string {
  return OBJECT_ORDER_STATUSES.find((item) => item.id === id)?.label ?? id;
}

export function formatBaht(amount: number): string {
  return `฿${Math.max(0, Math.round(amount)).toLocaleString("th-TH")}`;
}

export function parsePairLines(text: string): ObjectSpec[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const [label, ...rest] = line.split("|");
      const value = rest.join("|").trim();
      const name = label.trim();
      if (!name || !value) return [];
      return [{ label: name, value }];
    });
}

export function pairLinesToText(rows: ObjectSpec[]): string {
  return rows.map((row) => `${row.label} | ${row.value}`).join("\n");
}

export function parseFinishLines(text: string): ObjectFinish[] {
  return parsePairLines(text).map((row) => ({ name: row.label, hex: row.value }));
}

export function finishLinesToText(rows: ObjectFinish[]): string {
  return rows.map((row) => `${row.name} | ${row.hex}`).join("\n");
}

export function objectPublishBlockReason(opts: {
  hasPublishedProject: boolean;
  kycApproved: boolean;
}): string | null {
  if (!opts.hasPublishedProject) return "เผยแพร่ผลงานอย่างน้อย 1 ชิ้นก่อนลงขาย";
  if (!opts.kycApproved) return "ยืนยันตัวตนก่อนลงขาย";
  return null;
}

function matchesFulfillmentFilter(itemFulfillment: string, filterFulfillment: string): boolean {
  if (itemFulfillment === filterFulfillment) return true;
  return filterFulfillment === "ready" && itemFulfillment === "made_to_order";
}

export function sortObjectsByPrice<T extends { price_thb: number }>(items: T[], sort: ObjectPriceSort): T[] {
  if (sort === "default") return items;
  const direction = sort === "low" ? 1 : -1;
  return [...items].sort((a, b) => (a.price_thb - b.price_thb) * direction);
}

export function filterObjects<T extends Pick<CreatorObject, "title" | "summary" | "code" | "kind" | "subtype" | "material" | "fulfillment" | "edition" | "price_thb" | "maker_name">>(
  items: T[],
  filter: ObjectFilter,
): T[] {
  const q = filter.search.trim().toLowerCase();
  return items.filter((item) => {
    if (filter.kind !== "any" && item.kind !== filter.kind) return false;
    if (filter.subtype !== "any" && item.subtype !== filter.subtype) return false;
    if (filter.axis !== "any" && item.material !== filter.axis) return false;
    if (filter.fulfillment !== "any" && !matchesFulfillmentFilter(item.fulfillment, filter.fulfillment)) return false;
    if (filter.edition !== "any" && item.edition !== filter.edition) return false;
    if (filter.maxPrice != null && item.price_thb > filter.maxPrice) return false;
    if (!q) return true;
    const hay = [item.title, item.summary, item.code, item.maker_name ?? ""].join(" ").toLowerCase();
    return hay.includes(q);
  });
}

export function isSampleObjectId(id: string): boolean {
  return id.startsWith("sample-");
}
