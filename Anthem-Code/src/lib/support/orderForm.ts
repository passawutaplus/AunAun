import type { BagRow, BagSummary } from "@/lib/support/bag";

/** Who an order goes to: field rules shared by the bag page, the server call and their tests. */
export type BuyerDetails = {
  name: string;
  phone: string;
  address: string;
  /** Optional: LINE ID or email, so the team can reach the buyer. */
  contact: string;
  note: string;
};

export const BUYER_LIMITS = { name: 100, phone: 20, address: 500, contact: 120, note: 300 } as const;
export const EMPTY_BUYER: BuyerDetails = { name: "", phone: "", address: "", contact: "", note: "" };

export type BuyerField = "name" | "phone" | "address";
/** DOM id of a buyer field (the page focuses the first one that is wrong). */
export const buyerFieldId = (name: keyof BuyerDetails): string => `buyer-${name}`;
export type BuyerErrors = Partial<Record<BuyerField, true>>;

/** Same rule as anthem.place_shop_order: digits, spaces and dashes, may start with "+". */
const PHONE = /^[0-9+][0-9 -]{7,18}$/;
const MIN_ADDRESS = 10;

export function normaliseBuyer(v: BuyerDetails): BuyerDetails {
  return {
    name: v.name.trim().slice(0, BUYER_LIMITS.name),
    phone: v.phone.trim().slice(0, BUYER_LIMITS.phone),
    address: v.address.trim().slice(0, BUYER_LIMITS.address),
    contact: v.contact.trim().slice(0, BUYER_LIMITS.contact),
    note: v.note.trim().slice(0, BUYER_LIMITS.note),
  };
}

export function validateBuyer(v: BuyerDetails): BuyerErrors {
  const n = normaliseBuyer(v);
  const errors: BuyerErrors = {};
  if (!n.name) errors.name = true;
  if (!PHONE.test(n.phone)) errors.phone = true;
  if (n.address.length < MIN_ADDRESS) errors.address = true;
  return errors;
}

/** One row of an order as the server stores it (and as the team sees it in LINE). */
export type OrderItemPayload = { slug: string; name: string; variant: string; qty: number; unit_thb: number };

export function orderItemsPayload(summary: BagSummary, variantLabel: (row: BagRow) => string | null): OrderItemPayload[] {
  return summary.rows.map((r) => ({
    slug: r.slug,
    name: r.product?.name ?? r.slug,
    variant: variantLabel(r) ?? "",
    qty: r.qty,
    unit_thb: r.unitThb,
  }));
}
