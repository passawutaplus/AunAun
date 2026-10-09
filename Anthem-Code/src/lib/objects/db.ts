import { supabase } from "@/integrations/supabase/client";
import {
  isObjectEdition,
  isObjectFulfillment,
  isObjectKind,
  isObjectOrderStatus,
  isObjectStatus,
  type CreatorObject,
  type ObjectDownload,
  type ObjectFinish,
  type ObjectOrder,
  type ObjectSpec,
} from "@/lib/objects/taxonomy";

export const CREATOR_OBJECTS_SELECT =
  "id, owner_id, title, code, summary, story, kind, subtype, material, fulfillment, edition, edition_label, price_thb, lead_time, cover_url, gallery_urls, finishes, specs, downloads, license_note, reference_project_ids, status, created_at, updated_at";

export const OBJECT_ORDERS_SELECT =
  "id, object_id, object_title, buyer_id, seller_id, qty, finish, note, status, tracking_code, unit_price_thb, amount_satang, platform_fee_satang, seller_net_satang, fulfillment, ship_name, ship_phone, ship_address, payment_status, charge_id, paid_at, received_at, seller_release, created_at, updated_at";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnthemTableClient = { from: (table: string) => any };

export function fromCreatorObjects() {
  return (supabase as unknown as AnthemTableClient).from("creator_objects");
}

export function fromObjectOrders() {
  return (supabase as unknown as AnthemTableClient).from("object_orders");
}

function asSpecs(value: unknown): ObjectSpec[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const label = String((item as { label?: unknown }).label ?? "").trim();
    const specValue = String((item as { value?: unknown }).value ?? "").trim();
    if (!label || !specValue) return [];
    return [{ label, value: specValue }];
  });
}

function asFinishes(value: unknown): ObjectFinish[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const name = String((item as { name?: unknown }).name ?? "").trim();
    const hex = String((item as { hex?: unknown }).hex ?? "").trim();
    if (!name) return [];
    const price = Number((item as { price_thb?: unknown }).price_thb);
    const stock = Number((item as { stock?: unknown }).stock);
    const sku = String((item as { sku?: unknown }).sku ?? "").trim();
    const note = String((item as { note?: unknown }).note ?? "").trim();
    const imageUrl = String((item as { image_url?: unknown }).image_url ?? "").trim();
    const finish: ObjectFinish = { name, hex: hex || "#c4a484" };
    if (imageUrl) finish.image_url = imageUrl;
    if (Number.isFinite(price) && price > 0) finish.price_thb = Math.round(price);
    if (Number.isFinite(stock) && stock >= 0 && (item as { stock?: unknown }).stock !== "" && (item as { stock?: unknown }).stock != null) {
      finish.stock = Math.round(stock);
    }
    if (sku) finish.sku = sku;
    if (note) finish.note = note;
    return [finish];
  });
}

function asDownloads(value: unknown): ObjectDownload[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const label = String((item as { label?: unknown }).label ?? "").trim();
    const url = String((item as { url?: unknown }).url ?? "").trim();
    if (!label || !url) return [];
    return [{ label, url }];
  });
}

export function mapCreatorObject(row: Record<string, unknown>): CreatorObject | null {
  const kind = String(row.kind ?? "");
  const fulfillment = String(row.fulfillment ?? "");
  const edition = String(row.edition ?? "");
  const status = String(row.status ?? "");
  if (!isObjectKind(kind) || !isObjectFulfillment(fulfillment) || !isObjectEdition(edition) || !isObjectStatus(status)) {
    return null;
  }
  return {
    id: String(row.id),
    owner_id: String(row.owner_id),
    title: String(row.title ?? ""),
    code: String(row.code ?? ""),
    summary: String(row.summary ?? ""),
    story: String(row.story ?? ""),
    kind,
    subtype: String(row.subtype ?? ""),
    material: String(row.material ?? ""),
    fulfillment,
    edition,
    edition_label: String(row.edition_label ?? ""),
    price_thb: Number(row.price_thb ?? 0),
    lead_time: String(row.lead_time ?? ""),
    cover_url: row.cover_url ? String(row.cover_url) : null,
    gallery_urls: Array.isArray(row.gallery_urls) ? row.gallery_urls.map(String) : [],
    finishes: asFinishes(row.finishes),
    specs: asSpecs(row.specs),
    downloads: asDownloads(row.downloads),
    license_note: String(row.license_note ?? ""),
    reference_project_ids: Array.isArray(row.reference_project_ids)
      ? row.reference_project_ids.map(String).filter(Boolean)
      : [],
    status,
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export function mapObjectOrder(row: Record<string, unknown>): ObjectOrder | null {
  const status = String(row.status ?? "");
  if (!isObjectOrderStatus(status)) return null;
  return {
    id: String(row.id),
    object_id: String(row.object_id),
    object_title: String(row.object_title ?? ""),
    buyer_id: String(row.buyer_id),
    seller_id: String(row.seller_id),
    qty: Number(row.qty ?? 1),
    finish: String(row.finish ?? ""),
    note: String(row.note ?? ""),
    status,
    tracking_code: String(row.tracking_code ?? ""),
    unit_price_thb: Number(row.unit_price_thb ?? 0),
    amount_satang: Number(row.amount_satang ?? 0),
    platform_fee_satang: Number(row.platform_fee_satang ?? 0),
    seller_net_satang: Number(row.seller_net_satang ?? 0),
    fulfillment: isObjectFulfillment(String(row.fulfillment ?? "")) ? (row.fulfillment as ObjectOrder["fulfillment"]) : "ready",
    ship_name: String(row.ship_name ?? ""),
    ship_phone: String(row.ship_phone ?? ""),
    ship_address: String(row.ship_address ?? ""),
    payment_status:
      row.payment_status === "paid" || row.payment_status === "refunded" ? row.payment_status : "unpaid",
    charge_id: String(row.charge_id ?? ""),
    paid_at: row.paid_at ? String(row.paid_at) : null,
    received_at: row.received_at ? String(row.received_at) : null,
    seller_release:
      row.seller_release === "pending" || row.seller_release === "available" ? row.seller_release : "held",
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export function objectErrorText(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message?: unknown }).message ?? "");
    if (message) return message;
  }
  return "ทำไม่สำเร็จ";
}

export function isObjectsTableMissing(error: unknown): boolean {
  const message = objectErrorText(error);
  return /creator_objects|object_orders|schema cache|does not exist|PGRST204|PGRST205|42P01|42703/i.test(message);
}
