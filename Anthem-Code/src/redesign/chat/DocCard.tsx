import { lazy, Suspense, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useStudioDoc } from "@/hooks/useStudioDocuments";
import { formatOfferDateShort } from "@/lib/chatOffer";
import { docDisplayStatus } from "@/lib/documents/studioDocuments";
import { baht, type DocCard, type OfferCard } from "./chatFormat";

const DocViewer = lazy(() => import("./DocViewer"));

const DocIcon = () => (
  <span aria-hidden="true" className="ch-doc-ic">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.4" strokeLinejoin="round">
      <path d="M6.5 3.5h7l4 4v13h-11z" />
      <path d="M13.5 3.5v4h4M9 12.5h6M9 16h4" strokeLinecap="round" />
    </svg>
  </span>
);

/**
 * Studio document in a chat (invoice / receipt, `__SAMECOR_DOC__:` pointer): kind, number, amount and the live status
 * like the old StudioDocCard; the button opens the document and what this person can do with it (DocViewer).
 * `compact` = one line for ChatDock.
 */
export default function DocCardView({ doc, compact = false }: { doc: DocCard; compact?: boolean }) {
  const { user } = useAuth();
  const card = doc.card;
  const { data: row } = useStudioDoc(card?.id);
  const [open, setOpen] = useState(false);
  const status = row ? docDisplayStatus(row) : null;
  const toPay = !!row && row.owner_id !== user?.id && row.kind === "invoice" && row.status === "sent" && !row.client_marked_paid_at;
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
            {`${doc.kind} ${doc.number}${doc.net ? ` · ${baht(doc.net)}` : ""}${status ? ` · ${status.label}` : ""}`}
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
        <DocIcon />
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
          {toPay ? "ดูและแจ้งว่าโอนแล้ว" : "ดูเอกสาร"}
        </button>
      ) : null}
      {viewer}
    </span>
  );
}

/**
 * Quotation in a chat (`__APLUS1_OFFER__:`): title, what the client pays, the plan and the live status of its
 * studio document. The other side answers from the viewer (ตกลง / ยังไม่ตกลง); an old hire offer without a document
 * is shown only.
 */
export function OfferCardView({ offer, compact = false }: { offer: OfferCard; compact?: boolean }) {
  const { user } = useAuth();
  const { data: row } = useStudioDoc(offer.docId);
  const [open, setOpen] = useState(false);
  const status = row ? docDisplayStatus(row) : null;
  const toAnswer = !!row && row.owner_id !== user?.id && row.kind === "quotation" && row.status === "sent";
  const viewer = open ? (
    <Suspense fallback={null}>
      <DocViewer id={offer.docId} kind="ใบเสนอราคา" number={offer.number} offer={offer.offer} onClose={() => setOpen(false)} />
    </Suspense>
  ) : null;

  if (compact)
    return (
      <>
        <button type="button" className="cd-bub cd-bub-link cd-doc" aria-haspopup="dialog" onClick={() => setOpen(true)}>
          {`ใบเสนอราคา ${offer.title} · ${baht(offer.net)}${status ? ` · ${status.label}` : ""}`}
        </button>
        {viewer}
      </>
    );

  return (
    <span className="ch-docc">
      <span className="ch-docc-top">
        <DocIcon />
        <span className="ch-wt">
          <span>ใบเสนอราคา{offer.number ? ` · ${offer.number}` : ""}</span>
          <span>{offer.title}</span>
          {offer.parts > 1 ? <span className="ch-cs">แบ่งจ่าย {offer.parts} งวด</span> : null}
        </span>
      </span>
      <span className="ch-docc-amt">{baht(offer.net)}</span>
      {status || offer.validUntil ? (
        <span className="ch-docc-meta">
          {status ? (
            <span className="ch-docc-st" data-tone={status.tone}>
              {status.label}
            </span>
          ) : null}
          {offer.validUntil && (!row || row.status === "sent") ? <span>ใช้ได้ถึง {formatOfferDateShort(offer.validUntil)}</span> : null}
        </span>
      ) : null}
      <button type="button" className="ch-docc-btn" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        {toAnswer ? "ดูและตอบ" : "ดูใบเสนอราคา"}
      </button>
      {viewer}
    </span>
  );
}
