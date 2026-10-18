import { useMemo } from "react";
import { DocumentPaper } from "@/components/documents/DocumentPaper";
import type { ChatOfferPayload } from "@/lib/chatOffer";
import { offerToQuotationDocument } from "@/lib/documents/offerToDocument";

type Props = {
  offer: ChatOfferPayload;
  issuerName?: string;
  issuerEmail?: string;
  className?: string;
  /** Unsent quotation — shows a "ร่าง" watermark. */
  draft?: boolean;
};

/** Quotation paper for in-chat offers — same renderer as invoices and receipts. */
export function ChatOfferPreview({ offer, issuerName, issuerEmail, className, draft }: Props) {
  const doc = useMemo(
    () =>
      offerToQuotationDocument(
        {
          ...offer,
          issuerName: offer.issuerName || issuerName || null,
          issuerEmail: offer.issuerEmail || issuerEmail || null,
        },
        { draft },
      ),
    [offer, issuerName, issuerEmail, draft],
  );
  return <DocumentPaper doc={doc} className={className} />;
}
