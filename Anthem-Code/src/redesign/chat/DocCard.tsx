import { lazy, Suspense, useState } from "react";
import { useStudioDoc } from "@/hooks/useStudioDocuments";
import { formatOfferDateShort } from "@/lib/chatOffer";
import { docDisplayStatus } from "@/lib/documents/studioDocuments";
import { baht, type DocCard } from "./chatFormat";

const DocViewer = lazy(() => import("./DocViewer"));

/**
 * Studio document in a chat (quotation / invoice / receipt, old `__SAMECOR_DOC__:` pointer): kind, number, amount and
 * the live status like the old StudioDocCard; "ดูเอกสาร" opens the document. `compact` = one line for ChatDock.
 */
export default function DocCardView({ doc, compact = false }: { doc: DocCard; compact?: boolean }) {
  const card = doc.card;
  const { data: row } = useStudioDoc(card?.id);
  const [open, setOpen] = useState(false);
  const status = row ? docDisplayStatus(row) : null;
  const viewer =
    open && card ? (
      <Suspense fallback={null}>
        <DocViewer id={card.id} kind={doc.kind} number={doc.number} onClose={() => setOpen(false)} />
      </Suspense>
    ) : null;

  if (compact)
    return (
      <>
        {card ? (
          <button type="button" className="cd-bub cd-bub-link cd-doc" aria-haspopup="dialog" onClick={() => setOpen(true)}>
            {`${doc.kind} ${doc.number}${doc.net ? ` · ${baht(doc.net)}` : ""}`}
          </button>
        ) : (
          <span className="cd-bub">{doc.kind}</span>
        )}
        {viewer}
      </>
    );

  return (
    <span className="ch-docc">
      <span className="ch-docc-top">
        <span aria-hidden="true" className="ch-doc-ic">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.4" strokeLinejoin="round">
            <path d="M6.5 3.5h7l4 4v13h-11z" />
            <path d="M13.5 3.5v4h4M9 12.5h6M9 16h4" strokeLinecap="round" />
          </svg>
        </span>
        <span className="ch-wt">
          <span>{doc.kind}</span>
          <span>{doc.number || doc.kind}</span>
          {doc.title ? <span className="ch-cs">{doc.title}</span> : null}
        </span>
      </span>
      {doc.net ? <span className="ch-docc-amt">{baht(doc.net)}</span> : null}
      {status || card?.dueDate ? (
        <span className="ch-docc-meta">
          {status ? (
            <span className="ch-docc-st" data-tone={status.tone}>
              {status.label}
            </span>
          ) : null}
          {card?.dueDate && card.kind !== "receipt" ? <span>ครบกำหนด {formatOfferDateShort(card.dueDate)}</span> : null}
        </span>
      ) : null}
      {card ? (
        <button type="button" className="ch-docc-btn" aria-haspopup="dialog" onClick={() => setOpen(true)}>
          ดูเอกสาร
        </button>
      ) : null}
      {viewer}
    </span>
  );
}
