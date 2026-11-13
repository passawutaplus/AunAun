import { findProduct, isPurchasable, type ShopProduct } from "@/lib/support/catalog";

/** One row of the bag. Prices are never stored here: they are read from the catalogue every time. */
export type BagLine = { slug: string; variantId: string | null; qty: number };

export const MAX_QTY_PER_LINE = 5;
/** Flat rate used by the demo checkout only. Real shipping is worked out at checkout. */
export const DEMO_SHIPPING_THB = 50;

export const lineKey = (l: Pick<BagLine, "slug" | "variantId">): string => `${l.slug}::${l.variantId ?? ""}`;

/** How many of one item are in the bag in its other colours (stock is shared between colours). */
function otherColours(lines: BagLine[], slug: string, key: string): number {
  return lines.reduce((n, l) => (l.slug === slug && lineKey(l) !== key ? n + l.qty : n), 0);
}

function cap(qty: number, product: ShopProduct | null, taken: number): number {
  const left = (product?.stock ?? 0) - taken;
  return Math.max(0, Math.min(Math.floor(qty), MAX_QTY_PER_LINE, left));
}

/** Adds to an existing row when the same item and colour is already in the bag. */
export function addToBag(lines: BagLine[], add: BagLine, demo?: boolean): BagLine[] {
  const product = findProduct(add.slug, demo);
  if (!isPurchasable(product)) return lines;
  const key = lineKey(add);
  const existing = lines.find((l) => lineKey(l) === key);
  const qty = cap((existing?.qty ?? 0) + add.qty, product, otherColours(lines, add.slug, key));
  // Same array back means "nothing was added" (not for sale, or already at the limit).
  if (qty <= 0 || qty === existing?.qty) return lines;
  return existing
    ? lines.map((l) => (lineKey(l) === key ? { ...l, qty } : l))
    : [...lines, { slug: add.slug, variantId: add.variantId, qty }];
}

export function setLineQty(lines: BagLine[], key: string, qty: number, demo?: boolean): BagLine[] {
  return lines
    .map((l) => (lineKey(l) === key ? { ...l, qty: cap(qty, findProduct(l.slug, demo), otherColours(lines, l.slug, key)) } : l))
    .filter((l) => l.qty > 0);
}

export function removeLine(lines: BagLine[], key: string): BagLine[] {
  return lines.filter((l) => lineKey(l) !== key);
}

export type BagRow = BagLine & {
  key: string;
  product: ShopProduct | null;
  unitThb: number;
  lineThb: number;
  /** The most this row can hold right now (per-row limit, and stock left after the other colours). */
  maxQty: number;
  /** The item can no longer be bought (removed, sold out, or fewer left than asked for). */
  problem: "gone" | "sold_out" | "not_enough" | null;
};

export type BagSummary = {
  rows: BagRow[];
  count: number;
  subtotalThb: number;
  shippingThb: number;
  totalThb: number;
  canCheckout: boolean;
};

/** Everything the bag page shows, re-checked against the catalogue (never trust a stored price). */
export function summariseBag(lines: BagLine[], demo?: boolean): BagSummary {
  const rows: BagRow[] = lines.map((l) => {
    const product = findProduct(l.slug, demo);
    const unitThb = product?.priceThb ?? 0;
    const problem: BagRow["problem"] = !product
      ? "gone"
      : !isPurchasable(product)
        ? "sold_out"
        : l.qty + otherColours(lines, l.slug, lineKey(l)) > (product.stock ?? 0)
          ? "not_enough"
          : null;
    const maxQty = cap(MAX_QTY_PER_LINE, product, otherColours(lines, l.slug, lineKey(l)));
    return { ...l, key: lineKey(l), product, unitThb, lineThb: problem === "gone" ? 0 : unitThb * l.qty, maxQty, problem };
  });
  const good = rows.filter((r) => !r.problem);
  const subtotalThb = good.reduce((s, r) => s + r.lineThb, 0);
  const shippingThb = good.length ? DEMO_SHIPPING_THB : 0;
  return {
    rows,
    count: rows.reduce((s, r) => s + r.qty, 0),
    subtotalThb,
    shippingThb,
    totalThb: subtotalThb + shippingThb,
    canCheckout: rows.length > 0 && rows.every((r) => !r.problem),
  };
}

/** The receipt shown after ordering. Kept in this browser tab only; the order itself lives on the server. */
export type DemoOrder = {
  ref: string;
  createdAt: string;
  rows: { name: string; variant: string | null; qty: number; lineThb: number }[];
  subtotalThb: number;
  shippingThb: number;
  totalThb: number;
};

const ORDERS_KEY = "samecor-shop-demo-orders";

function readOrders(): DemoOrder[] {
  try {
    const raw = window.sessionStorage.getItem(ORDERS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as DemoOrder[]) : [];
  } catch {
    return [];
  }
}

export function makeDemoRef(random: () => number = Math.random): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i += 1) out += chars[Math.floor(random() * chars.length)];
  return `DEMO-${out}`;
}

/** Saves the receipt for the order page. `ref` is the reference the server gave (a DEMO- one when there is none). */
export function placeDemoOrder(
  summary: BagSummary,
  variantLabel: (row: BagRow) => string | null,
  ref: string = makeDemoRef(),
): DemoOrder | null {
  if (!summary.canCheckout) return null;
  const order: DemoOrder = {
    ref,
    createdAt: new Date().toISOString(),
    rows: summary.rows.map((r) => ({ name: r.product?.name ?? r.slug, variant: variantLabel(r), qty: r.qty, lineThb: r.lineThb })),
    subtotalThb: summary.subtotalThb,
    shippingThb: summary.shippingThb,
    totalThb: summary.totalThb,
  };
  try {
    window.sessionStorage.setItem(ORDERS_KEY, JSON.stringify([order, ...readOrders()].slice(0, 20)));
  } catch {
    /* storage blocked: the order page then says it cannot find the order */
  }
  return order;
}

export function findDemoOrder(ref: string | undefined): DemoOrder | null {
  if (!ref) return null;
  return readOrders().find((o) => o.ref === ref) ?? null;
}
