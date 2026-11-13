import { anthemDb } from "@/integrations/supabase/client";
import type { BagSummary } from "@/lib/support/bag";
import { normaliseBuyer, orderItemsPayload, type BuyerDetails } from "@/lib/support/orderForm";

function refOrThrow(data: unknown, error: unknown, fn: string): string {
  if (error) throw error;
  if (typeof data !== "string" || !data) throw new Error(`${fn} returned no reference`);
  return data;
}

/**
 * Records an order for the team to follow up (pay by transfer); no money moves here.
 * `anthem.place_shop_order` (migration 20261113120000) refuses real orders until the shop is opened,
 * always accepts test ones, and alerts the admin LINE group. Returns the order reference.
 */
export async function placeShopOrder(
  summary: BagSummary,
  variantLabel: (row: BagSummary["rows"][number]) => string | null,
  buyer: BuyerDetails,
  isTest: boolean,
): Promise<string> {
  const b = normaliseBuyer(buyer);
  const { data, error } = await anthemDb.rpc(
    "place_shop_order" as never,
    {
      _items: orderItemsPayload(summary, variantLabel),
      _shipping_thb: summary.shippingThb,
      _buyer_name: b.name,
      _buyer_phone: b.phone,
      _buyer_contact: b.contact,
      _ship_address: b.address,
      _note: b.note,
      _is_test: isTest,
    } as never,
  );
  return refOrThrow(data, error, "place_shop_order");
}

/** Records a donation pledge (amount, and a name only when the giver asked to be shown). Returns its reference. */
export async function pledgeDonation(
  amountThb: number,
  showName: boolean,
  displayName: string,
  isTest: boolean,
): Promise<string> {
  const { data, error } = await anthemDb.rpc(
    "pledge_donation" as never,
    {
      _amount_thb: amountThb,
      _show_name: showName,
      _display_name: showName ? displayName.trim().slice(0, 60) : "",
      _is_test: isTest,
    } as never,
  );
  return refOrThrow(data, error, "pledge_donation");
}
