import { hireQuoteHasPreview } from "@/lib/hireQuotePreview";

export type InboxDocChip = {
  key: string;
  kindLabel: string;
  number: string;
};

export function hireDocKindShort(kind: string): string {
  switch (kind) {
    case "quotation":
    case "quote":
      return "QT";
    case "invoice":
      return "INV";
    case "receipt":
      return "RCP";
    case "platform_fee_receipt":
      return "FEE";
    case "wht_cert":
      return "WHT";
    default:
      return kind.slice(0, 3).toUpperCase();
  }
}

export function quoteDocNumber(
  quote:
    | {
        doc_number?: string | null;
        payload?: { number?: string | null } | null;
      }
    | null
    | undefined,
): string | null {
  const n = quote?.doc_number?.trim() || quote?.payload?.number?.trim();
  return n || null;
}

export function buildInboxDocChips(opts: {
  quote?: {
    status?: string | null;
    doc_number?: string | null;
    payload?: { number?: string | null } | null;
  } | null;
  docs?: { id: string; kind: string; doc_number: string }[];
}): InboxDocChip[] {
  const chips: InboxDocChip[] = [];
  const seen = new Set<string>();
  const add = (key: string, kindLabel: string, number: string) => {
    const token = `${kindLabel}:${number}`;
    if (seen.has(token)) return;
    seen.add(token);
    chips.push({ key, kindLabel, number });
  };

  if (hireQuoteHasPreview(opts.quote)) {
    add("quote", "QT", quoteDocNumber(opts.quote) || "ใบเสนอราคา");
  }
  for (const doc of opts.docs ?? []) {
    const number = doc.doc_number?.trim();
    if (!number) continue;
    add(doc.id, hireDocKindShort(doc.kind), number);
  }
  return chips;
}
