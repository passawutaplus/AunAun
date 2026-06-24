import type { StripeEnv } from "@/lib/stripe.server";
import sandboxCatalog from "../../scripts/stripe/catalog.sandbox.json";
import liveCatalog from "../../scripts/stripe/catalog.live.json";

type CatalogFile = {
  mode?: string;
  products?: Record<string, { prices?: Record<string, string> }>;
};

const CATALOGS: Record<StripeEnv, CatalogFile> = {
  sandbox: sandboxCatalog as CatalogFile,
  live: liveCatalog as CatalogFile,
};

/** Resolve Stripe Price id from synced catalog JSON (fallback when lookup_key list is empty). */
export function getCatalogStripePriceId(env: StripeEnv, lookupKey: string): string | null {
  const catalog = CATALOGS[env];
  if (!catalog?.products) return null;
  for (const group of Object.values(catalog.products)) {
    const id = group.prices?.[lookupKey];
    if (id) return id;
  }
  return null;
}
