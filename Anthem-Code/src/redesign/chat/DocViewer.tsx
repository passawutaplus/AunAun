import { lazy, Suspense, useState } from "react";
import { PrintableDocumentPaper } from "@/components/documents/DocumentPaper";
import { useAuth } from "@/hooks/useAuth";
import { useClientRespondDoc, useStudioDoc, useVoidStudioDoc } from "@/hooks/useStudioDocuments";
import {
  formatOfferDateShort,
  offerAcceptMessage,
  offerDeclineWithReasonMessage,
  QUOTE_DECLINE_REASONS,
  type ChatOfferPayload,
  type QuoteDeclineReasonId,
} from "@/lib/chatOffer";
import { offerToQuotationDocument } from "@/lib/documents/offerToDocument";
import { docDisplayStatus, satangToThb, STUDIO_DOC_KIND_LABEL, type StudioDocumentRow } from "@/lib/documents/studioDocuments";
import ChatSheet from "./ChatSheet";
import { baht } from "./chatFormat";
import { useChatActions } from "./useChatStore";
import "../styles/chat-tools.css";

const InstallmentSheet = lazy(() => import("./InstallmentSheet"));

type Step = "view" | "decline" | "paid" | "void" | { mode: "invoice" | "receipt"; quote: StudioDocumentRow; no?: number };

const errText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

/**
 * A studio document opened from its chat card or from My Studio › Documents: the paper (PDF / print) and what this
 * person can do with it, like the old chat — the other side accepts or declines a quotation, says "โอนแล้ว" on an
 * invoice; the one who made it sends invoices, records payments (→ receipt) or cancels. Money goes between the two
 * people directly (free launch).
 */
export default function DocViewer({
  id,
  kind,
  number,
  offer = null,
  onClose,
  say,
}: {
  /** studio_documents id; null = an old quotation without a row (shown from the message, nothing to answer). */
  id: string | null;
  kind: string;
  number: string;
  offer?: ChatOfferPayload | null;
  onClose: () => void;
  say?: (t: string) => void;
}) {
  const { user } = useAuth();
  const { data: row, isLoading, isError, refetch } = useStudioDoc(id);
  const quoteQ = useStudioDoc(row && row.kind !== "quotation" ? row.quote_id : null);
  const actions = useChatActions();
  const respond = useClientRespondDoc();
  const voidDoc = useVoidStudioDoc();
  const [step, setStep] = useState<Step>("view");
  const [reason, setReason] = useState<QuoteDeclineReasonId>("revise_details");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  if (typeof step === "object")
    return (
      <Suspense fallback={null}>
        <InstallmentSheet mode={step.mode} roomId={step.quote.conversation_id} quote={step.quote} presetNo={step.no} onClose={onClose} say={say ?? (() => undefined)} />
      </Suspense>
    );

  const status = row ? docDisplayStatus(row) : null;
  const owner = !!row && row.owner_id === user?.id;
  const quote = row?.kind === "quotation" ? row : quoteQ.data ?? null;
  const paperOffer = row?.offer ?? offer;
  const net = row ? satangToThb(row.net_satang) : 0;
  const label = row ? STUDIO_DOC_KIND_LABEL[row.kind] : kind;

  const canAnswer = !!row && !owner && row.kind === "quotation" && row.status === "sent";
  const canSayPaid = !!row && !owner && row.kind === "invoice" && row.status === "sent" && !row.client_marked_paid_at;
  const canBill = owner && row?.kind === "quotation" && (row.status === "sent" || row.status === "accepted");
  const canRecord = owner && row?.kind === "invoice" && row.status === "sent" && !!quote;
  const canVoid = owner && !!row && row.status !== "void";

  const done = (t: string) => {
    if (say) {
      say(t);
      onClose();
    } else {
      setMsg(t);
      setStep("view");
    }
  };
  const run = async (fn: () => Promise<void>, fallback: string) => {
    if (busy) return;
    setBusy(true);
    setMsg("");
    try {
      await fn();
    } catch (e) {
      setMsg(errText(e, fallback));
    } finally {
      setBusy(false);
    }
  };
  /** Tells the chat too (old chat did): the card already shows the new status. */
  const tell = (text: string) => (row?.conversation_id ? actions.sendText(row.conversation_id, text).catch(() => undefined) : Promise.resolve());

  const accept = () =>
    run(async () => {
      await respond.mutateAsync({ docId: row!.id, action: "accept" });
      if (row!.offer) await tell(offerAcceptMessage(row!.offer));
      done("ตกลงใบเสนอราคาแล้ว");
    }, "ตอบไม่สำเร็จ ลองอีกครั้งนะ");
  const decline = () =>
    run(async () => {
      await respond.mutateAsync({ docId: row!.id, action: "decline", note: note.trim() || undefined });
      if (row!.offer) await tell(offerDeclineWithReasonMessage(row!.offer, reason, note));
      done("ส่งคำตอบแล้ว");
    }, "ตอบไม่สำเร็จ ลองอีกครั้งนะ");
  const markPaid = () =>
    run(async () => {
      await respond.mutateAsync({ docId: row!.id, action: "mark_paid", note: note.trim() || undefined });
      await tell(`โอนแล้วนะ · ${label} ${row!.doc_number} · ${baht(net)}${note.trim() ? `\n${note.trim()}` : ""}`);
      done("แจ้งแล้ว รอเขายืนยันแล้วออกใบเสร็จให้นะ");
    }, "แจ้งไม่สำเร็จ ลองอีกครั้งนะ");
  const cancelDoc = () =>
    run(async () => {
      await voidDoc.mutateAsync(row!);
      done(`ยกเลิก${label}แล้ว`);
    }, "ยกเลิกไม่สำเร็จ ลองอีกครั้งนะ");

  const head = (
    <div className="cs-doc-hd">
      <div>
        <p id="cs-doc-h" className="cs-h">
          {label}
          {status ? ` · ${status.label}` : ""}
        </p>
        <p className="cs-sub">{[row?.doc_number || number, row?.title || paperOffer?.title].filter(Boolean).join(" · ")}</p>
      </div>
      <button type="button" className="cs-x" aria-label="ปิดเอกสาร" title="ปิด" onClick={onClose}>
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );

  let panel = null;
  if (step === "decline")
    panel = (
      <div className="ct-panel">
        <p className="ct-panel-h">ยังไม่ตกลงเพราะอะไรดี</p>
        <div className="cr-opts" role="radiogroup" aria-label="เหตุผล">
          {QUOTE_DECLINE_REASONS.map((r) => (
            <label key={r.id} className="cr-opt" data-on={reason === r.id || undefined}>
              <input type="radio" name="ct-dec" checked={reason === r.id} onChange={() => setReason(r.id)} />
              <span>{r.label}</span>
            </label>
          ))}
        </div>
        <label className="ct-f">
          <span>บอกเขาเพิ่ม (ถ้ามี)</span>
          <textarea rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="cs-acts">
          <button type="button" className="cs-cancel" onClick={() => setStep("view")}>
            กลับ
          </button>
          <button type="button" className="ct-go" disabled={busy} onClick={() => void decline()}>
            ส่งคำตอบ
          </button>
        </div>
      </div>
    );
  else if (step === "paid")
    panel = (
      <div className="ct-panel">
        <p className="ct-panel-h">แจ้งว่าโอน {baht(net)} แล้ว</p>
        <p className="ct-note">ส่งสลิปเป็นรูปในแชทได้เลยนะ เขาจะเช็กแล้วออกใบเสร็จให้</p>
        <label className="ct-f">
          <span>โน้ต (ถ้ามี)</span>
          <textarea rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น โอนจากบัญชีกสิกร 14:20" />
        </label>
        <div className="cs-acts">
          <button type="button" className="cs-cancel" onClick={() => setStep("view")}>
            กลับ
          </button>
          <button type="button" className="ct-go" disabled={busy} onClick={() => void markPaid()}>
            แจ้งว่าโอนแล้ว
          </button>
        </div>
      </div>
    );
  else if (step === "void")
    panel = (
      <div className="ct-panel">
        <p className="ct-panel-h">ยกเลิก{label}นี้ไหม</p>
        <p className="ct-note">ยังเปิดดูได้ แต่จะขึ้นว่ายกเลิกแล้วนะ{row?.kind === "receipt" ? " ใบแจ้งหนี้ของงวดนี้จะกลับไปรอชำระ" : ""}</p>
        <div className="cs-acts">
          <button type="button" className="cs-cancel" onClick={() => setStep("view")}>
            ไม่ยกเลิก
          </button>
          <button type="button" className="ct-go ct-go-red" disabled={busy} onClick={() => void cancelDoc()}>
            ยกเลิก{label}
          </button>
        </div>
      </div>
    );
  else if (canAnswer || canSayPaid || canBill || canRecord || canVoid)
    panel = (
      <div className="ct-docacts">
        {canAnswer ? (
          <>
            <button type="button" className="ct-go" disabled={busy} onClick={() => void accept()}>
              ตกลง
            </button>
            <button type="button" className="ct-line" disabled={busy} onClick={() => setStep("decline")}>
              ยังไม่ตกลง
            </button>
          </>
        ) : null}
        {canSayPaid ? (
          <button type="button" className="ct-go" onClick={() => setStep("paid")}>
            แจ้งว่าโอนแล้ว
          </button>
        ) : null}
        {canBill && row ? (
          <>
            <button type="button" className="ct-go" onClick={() => setStep({ mode: "invoice", quote: row })}>
              ออกใบแจ้งหนี้
            </button>
            <button type="button" className="ct-line" onClick={() => setStep({ mode: "receipt", quote: row })}>
              บันทึกรับเงิน
            </button>
          </>
        ) : null}
        {canRecord && quote && row ? (
          <button type="button" className="ct-go" onClick={() => setStep({ mode: "receipt", quote, no: row.installment_no ?? undefined })}>
            บันทึกรับเงิน · ออกใบเสร็จ
          </button>
        ) : null}
        {canVoid ? (
          <button type="button" className="ct-line ct-line-red" onClick={() => setStep("void")}>
            ยกเลิกใบนี้
          </button>
        ) : null}
      </div>
    );

  const facts = row ? (
    <>
      {row.client_marked_paid_at && row.status === "sent" ? (
        <p className="ct-fact" data-tone="warning">
          {owner ? "เขาแจ้งว่าโอนแล้ว" : "คุณแจ้งว่าโอนแล้ว"} · {formatOfferDateShort(row.client_marked_paid_at.slice(0, 10))}
          {owner ? " เช็กยอดแล้วกดบันทึกรับเงินได้เลย" : ""}
        </p>
      ) : null}
      {row.client_payment_note ? <p className="ct-fact">โน้ตจากอีกฝ่าย: {row.client_payment_note}</p> : null}
    </>
  ) : null;

  return (
    <ChatSheet label={{ id: "cs-doc-h" }} onClose={onClose} wide>
      {head}
      {msg ? (
        <p role="status" className="ct-msg">
          {msg}
        </p>
      ) : null}
      {facts}
      {panel}
      {id && isLoading ? (
        <p className="cs-state" role="status">
          กำลังเปิดเอกสาร…
        </p>
      ) : id && isError ? (
        <div className="sc-load-error" role="alert">
          <p>เปิดเอกสารไม่ขึ้น ลองใหม่อีกทีนะ</p>
          <button type="button" className="sc-load-error-btn" onClick={() => void refetch()}>
            ลองใหม่
          </button>
        </div>
      ) : row?.snapshot ? (
        <PrintableDocumentPaper doc={row.snapshot} />
      ) : paperOffer ? (
        <>
          {!row ? <p className="ct-note ct-note-c">ใบเสนอราคานี้ดูได้อย่างเดียวนะ</p> : null}
          <PrintableDocumentPaper doc={offerToQuotationDocument(paperOffer)} />
        </>
      ) : (
        <p className="cs-state" role="status">
          เปิดเอกสารนี้ไม่ได้นะ อาจถูกยกเลิกไปแล้ว หรือคุณไม่ได้อยู่ในงานนี้
        </p>
      )}
    </ChatSheet>
  );
}
