import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useConversationStudioDocs, useIssueInvoice, useRecordPayment } from "@/hooks/useStudioDocuments";
import {
  addDaysYmd,
  INSTALLMENT_STATE_LABEL,
  installmentTracks,
  PAYMENT_METHODS,
  satangToThb,
  todayBangkok,
  type StudioDocumentRow,
} from "@/lib/documents/studioDocuments";
import ChatSheet from "./ChatSheet";
import { baht } from "./chatFormat";
import { useChatActions } from "./useChatStore";
import "../styles/chat-tools.css";

type Mode = "invoice" | "receipt";

/**
 * ใบแจ้งหนี้ / ใบเสร็จ of one installment of a quotation (old IssueInvoiceDialog / RecordPaymentDialog, short):
 * pick the quotation (when the chat has more than one) and the installment; amounts come from the quotation's plan
 * (offerInstallmentAmounts, the one formula). The hooks post the document card in the chat themselves.
 */
export default function InstallmentSheet({
  mode,
  roomId,
  quote: fixed = null,
  presetNo,
  onClose,
  say,
  onNeedQuote,
}: {
  mode: Mode;
  roomId: string | null;
  /** Opened from a quotation (its viewer): no quotation to pick. */
  quote?: StudioDocumentRow | null;
  presetNo?: number;
  onClose: () => void;
  say: (t: string) => void;
  /** No quotation of mine in this chat yet: "ทำใบเสนอราคา" opens that instead. */
  onNeedQuote?: () => void;
}) {
  const { user } = useAuth();
  const docsQ = useConversationStudioDocs(roomId);
  const docs = useMemo(() => docsQ.data ?? [], [docsQ.data]);
  const actions = useChatActions();
  const invoice = useIssueInvoice();
  const record = useRecordPayment();

  const quotes = useMemo(
    () => (fixed ? [fixed] : docs.filter((d) => d.kind === "quotation" && d.owner_id === user?.id && (d.status === "sent" || d.status === "accepted")).reverse()),
    [fixed, docs, user?.id],
  );
  const [quoteId, setQuoteId] = useState<string | null>(fixed?.id ?? null);
  const quote = quotes.find((q) => q.id === quoteId) ?? quotes[0] ?? null;
  const tracks = useMemo(() => (quote ? installmentTracks(quote, docs) : []), [quote, docs]);
  const open = tracks.filter((t) => t.state !== "paid");
  const [pick, setPick] = useState<number | null>(presetNo ?? null);
  const no = pick && tracks.some((t) => t.no === pick && t.state !== "paid") ? pick : (mode === "invoice" ? open.find((t) => t.state === "pending") : null)?.no ?? open[0]?.no ?? null;
  const track = tracks.find((t) => t.no === no) ?? null;

  const [due, setDue] = useState(() => addDaysYmd(todayBangkok(), 7));
  const [paidDate, setPaidDate] = useState(todayBangkok);
  const [method, setMethod] = useState<string>("bank_transfer");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const title = mode === "invoice" ? "ออกใบแจ้งหนี้" : "บันทึกรับเงิน · ออกใบเสร็จ";
  const paidNos = tracks.filter((t) => t.state === "paid").map((t) => t.no);

  const go = async () => {
    if (busy || !quote || !track) return;
    setBusy(true);
    setErr("");
    try {
      if (mode === "invoice") {
        await invoice.mutateAsync({ quote, installmentNo: track.no, dueDate: due || null, notes: notes.trim() || null, paidNos });
      } else {
        await record.mutateAsync({ quote, installmentNo: track.no, invoice: track.invoice, paidDate: paidDate || todayBangkok(), method, paidNos });
      }
      if (quote.conversation_id) actions.refreshRoom(quote.conversation_id);
      say(mode === "invoice" ? "ส่งใบแจ้งหนี้แล้ว" : "ออกใบเสร็จแล้ว");
      onClose();
    } catch (e) {
      setErr(e instanceof Error && e.message ? e.message : "ทำไม่สำเร็จ ลองอีกครั้งนะ");
    } finally {
      setBusy(false);
    }
  };

  const body = docsQ.isLoading && !fixed ? (
    <p className="cs-state" role="status">
      กำลังโหลด…
    </p>
  ) : !quote ? (
    <div className="ct-empty">
      <p>ยังไม่มีใบเสนอราคาของคุณในแชทนี้นะ ทำใบเสนอราคาก่อน แล้วค่อยออก{mode === "invoice" ? "ใบแจ้งหนี้" : "ใบเสร็จ"}ทีละงวด</p>
      {onNeedQuote ? (
        <button type="button" className="ct-go" onClick={onNeedQuote}>
          ทำใบเสนอราคา
        </button>
      ) : null}
    </div>
  ) : (
    <div className="ct-form">
      {quotes.length > 1 ? (
        <fieldset className="ct-f">
          <legend>ใบเสนอราคา</legend>
          <div className="cr-opts">
            {quotes.map((q) => (
              <label key={q.id} className="cr-opt" data-on={q.id === quote.id || undefined}>
                <input
                  type="radio"
                  name="ct-quote"
                  checked={q.id === quote.id}
                  onChange={() => {
                    setQuoteId(q.id);
                    setPick(null);
                  }}
                />
                <span className="ct-opt-t">
                  <span>{q.title}</span>
                  <span>
                    {q.doc_number} · {baht(satangToThb(q.net_satang))}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <p className="ct-quote">
          <span>{quote.title}</span>
          <span>
            {quote.doc_number} · {baht(satangToThb(quote.net_satang))}
          </span>
        </p>
      )}

      <fieldset className="ct-f">
        <legend>งวด</legend>
        <div className="cr-opts">
          {tracks.map((t) => {
            const st = INSTALLMENT_STATE_LABEL[t.state];
            const off = t.state === "paid";
            return (
              <label key={t.no} className="cr-opt" data-on={t.no === no || undefined} data-off={off || undefined}>
                <input type="radio" name="ct-no" checked={t.no === no} disabled={off} onChange={() => setPick(t.no)} />
                <span className="ct-opt-t">
                  <span>
                    {tracks.length > 1 ? `งวด ${t.no} · ` : ""}
                    {t.installment.label}
                  </span>
                  <span>
                    {baht(t.net)} · <span data-tone={st.tone}>{st.label}</span>
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {mode === "invoice" ? (
        <>
          <label className="ct-f">
            <span>ครบกำหนดชำระ</span>
            <input type="date" value={due} min={todayBangkok()} onChange={(e) => setDue(e.target.value)} />
          </label>
          <label className="ct-f">
            <span>โน้ตบนใบแจ้งหนี้ (ถ้ามี)</span>
            <textarea rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="เช่น เลขบัญชีที่ให้โอน" />
          </label>
        </>
      ) : (
        <div className="ct-two">
          <label className="ct-f">
            <span>ได้รับเงินวันที่</span>
            <input type="date" value={paidDate} max={todayBangkok()} onChange={(e) => setPaidDate(e.target.value)} />
          </label>
          <label className="ct-f">
            <span>รับเงินทาง</span>
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {track?.state === "client_marked" && mode === "receipt" ? <p className="ct-fact" data-tone="warning">เขาแจ้งว่าโอนงวดนี้แล้ว เช็กยอดก่อนนะ</p> : null}
      <p className="ct-note">{mode === "invoice" ? "เขาโอนให้คุณโดยตรงนะ SAMECOR ไม่ได้รับเงินแทน" : "ออกใบเสร็จเมื่อได้รับเงินจริงแล้วเท่านั้นนะ"}</p>
    </div>
  );

  return (
    <ChatSheet label={{ id: "ct-i-h" }} onClose={onClose} wide>
      <div className="cs-doc-hd">
        <div>
          <p id="ct-i-h" className="cs-h">
            {title}
          </p>
          {track ? <p className="cs-sub">{`${tracks.length > 1 ? `งวด ${track.no}/${tracks.length} · ` : ""}${baht(track.net)}`}</p> : null}
        </div>
        <button type="button" className="cs-x" aria-label="ปิด" title="ปิด" onClick={onClose}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      {body}
      {err ? (
        <p role="alert" className="ct-err">
          {err}
        </p>
      ) : null}
      {quote ? (
        <div className="cs-acts ct-acts">
          <button type="button" className="cs-cancel" onClick={onClose}>
            ยกเลิก
          </button>
          <button type="button" className="ct-go" disabled={busy || !track} onClick={() => void go()}>
            {busy ? "กำลังส่ง…" : !track ? "จ่ายครบทุกงวดแล้ว" : mode === "invoice" ? "ส่งใบแจ้งหนี้" : "ออกใบเสร็จ"}
          </button>
        </div>
      ) : null}
    </ChatSheet>
  );
}
