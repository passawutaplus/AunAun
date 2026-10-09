/**
 * Mark an object order paid from a verified provider charge (Payso, once wired).
 * `charge` is the provider charge normalised to { id, paid, status, amount (satang), metadata }.
 * Amount and buyer must match the order row. Service role only.
 */

async function rest(cfg, { method, query, body, prefer }) {
  const q = query ? `?${query}` : "";
  const headers = {
    apikey: cfg.key,
    Authorization: `Bearer ${cfg.key}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "Accept-Profile": "anthem",
    "Content-Profile": "anthem",
  };
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(`${cfg.url}/rest/v1/object_orders${q}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { ok: res.ok, status: res.status, data };
}

function metaValue(meta, key) {
  if (!meta || typeof meta !== "object") return "";
  const value = meta[key];
  return value != null ? String(value).trim() : "";
}

export async function markObjectOrderPaidFromCharge(cfg, charge) {
  const orderId = metaValue(charge?.metadata, "object_order_id");
  if (!orderId || !charge?.id) return { skipped: "no_object_order" };
  if (charge.paid !== true && String(charge.status || "").toLowerCase() !== "successful") {
    return { skipped: "not_paid" };
  }

  const got = await rest(cfg, {
    method: "GET",
    query: `id=eq.${encodeURIComponent(orderId)}&select=id,amount_satang,payment_status,buyer_id,status`,
  });
  const row = Array.isArray(got.data) ? got.data[0] : null;
  if (!got.ok || !row) return { skipped: "order_missing", status: got.status };

  if (row.payment_status === "paid") return { skipped: "already_paid", orderId };

  const buyerId = metaValue(charge.metadata, "buyer_user_id");
  if (buyerId && String(row.buyer_id) !== buyerId) return { skipped: "buyer_mismatch", orderId };

  const charged = Number(charge.amount);
  if (!Number.isInteger(charged) || charged !== Number(row.amount_satang)) {
    return { skipped: "amount_mismatch", orderId };
  }

  const now = new Date().toISOString();
  const patched = await rest(cfg, {
    method: "PATCH",
    query: `id=eq.${encodeURIComponent(orderId)}&payment_status=eq.unpaid`,
    prefer: "return=representation",
    body: {
      payment_status: "paid",
      status: "confirmed",
      charge_id: String(charge.id),
      paid_at: now,
      seller_release: "pending",
      updated_at: now,
    },
  });
  if (!patched.ok) return { skipped: "patch_failed", orderId, status: patched.status };
  return { orderId, objectOrderUpdated: true };
}
