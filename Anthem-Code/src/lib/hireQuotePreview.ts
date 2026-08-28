/** Latest hire_quotes row is previewable on the inbox card. */
export function hireQuoteHasPreview(quote: { status?: string | null } | null | undefined): boolean {
  if (!quote) return false;
  const status = quote.status?.trim();
  if (!status) return true;
  return status !== "draft" && status !== "declined" && status !== "cancelled";
}

export type HireQuoteLockRow = {
  status?: string | null;
  expires_at?: string | null;
};

export function hireQuoteIsExpiredSent(quote: HireQuoteLockRow | null | undefined): boolean {
  if (quote?.status?.trim() !== "sent") return false;
  if (!quote.expires_at) return false;
  return new Date(quote.expires_at).getTime() <= Date.now();
}

/** Declined / cancelled / expired sent — freelancer may create a new quotation. */
export function hireQuoteIsTerminalForNewOffer(quote: HireQuoteLockRow | null | undefined): boolean {
  const status = quote?.status?.trim();
  return status === "declined" || status === "cancelled" || hireQuoteIsExpiredSent(quote);
}

/**
 * Hide "ทำใบเสนอราคา" when a live quote already exists — including chat-only
 * offers and mock accounting packs (เอกสารตัวอย่าง) that have no hire_orders row.
 * After a declined/expired quote or a finished order, a new quote is allowed.
 */
export function hireQuoteCreateLocked(opts: {
  quote?: HireQuoteLockRow | null;
  hasOrder?: boolean;
  orderBlocksNewQuote?: boolean;
  hasChatOffer?: boolean;
}): boolean {
  if (opts.orderBlocksNewQuote) return true;
  if (hireQuoteIsTerminalForNewOffer(opts.quote)) return false;
  const quotePending =
    opts.quote?.status?.trim() === "sent" && !hireQuoteIsExpiredSent(opts.quote);
  if (quotePending) return true;
  if (hireQuoteHasPreview(opts.quote) && !opts.hasOrder) return true;
  if (opts.hasChatOffer && !opts.hasOrder) return true;
  return false;
}
