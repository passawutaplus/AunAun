/** Compact a document/order code for search (ignore #, spaces, dashes). */
export function compactHireSearchToken(value: string): string {
  return value.trim().toLowerCase().replace(/[#\s-]/g, "");
}

export function matchesHireInboxSearch(input: {
  query: string;
  clientName?: string | null;
  email?: string | null;
  orderCode?: string | null;
  orderId?: string | null;
  requestId?: string | null;
}): boolean {
  const raw = input.query.trim().toLowerCase();
  if (!raw) return true;
  const compact = compactHireSearchToken(raw);

  const name = (input.clientName ?? "").toLowerCase();
  const email = (input.email ?? "").toLowerCase();
  if (name.includes(raw) || email.includes(raw)) return true;

  if (!compact) return false;
  const code = compactHireSearchToken(input.orderCode ?? "");
  const orderId = compactHireSearchToken(input.orderId ?? "");
  const requestId = compactHireSearchToken(input.requestId ?? "");
  return (
    (!!code && code.includes(compact)) ||
    (!!orderId && orderId.includes(compact)) ||
    (!!requestId && requestId.includes(compact))
  );
}
