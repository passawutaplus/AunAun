import { lazy, Suspense, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useIssueQuotation } from "@/hooks/useStudioDocuments";
import {
  emptyParty,
  encodeChatOffer,
  offerInstallmentAmounts,
  offerItemsSubtotal,
  offerWhtAmount,
  PAYMENT_PLAN_PRESETS,
  planFromPreset,
  summarizeOfferItems,
  type ChatOfferLineItem,
  type ChatOfferPayload,
  type PaymentPlanPresetId,
} from "@/lib/chatOffer";
import { allocateDocNumber } from "@/lib/documents/numbering";
import { offerToQuotationDocument } from "@/lib/documents/offerToDocument";
import { addDaysYmd, todayBangkok, type StudioDocumentRow } from "@/lib/documents/studioDocuments";
import { getChatPeople } from "@/server/queries/chatRooms";
import ChatSheet from "./ChatSheet";
import { baht } from "./chatFormat";
import { useChatActions, type ChatRoom } from "./useChatStore";
import "../styles/chat-tools.css";

const Paper = lazy(() => import("@/components/documents/DocumentPaper").then((m) => ({ default: m.PrintableDocumentPaper })));

type Preset = Exclude<PaymentPlanPresetId, "custom">;
type Item = { id: string; name: string; qty: string; price: string };

const newItem = (): Item => ({ id: `li-${Math.random().toString(36).slice(2, 9)}`, name: "", qty: "1", price: "" });
const num = (v: string) => {
  const n = Number(v.replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * ทำใบเสนอราคา in a chat (the old offer dialog, short): what the work is, the price lines, how it is paid, until when
 * it holds. Sending records the quotation (studio_documents) and posts the quotation card; the two people pay each
 * other directly (free launch, no platform payment).
 */
export default function QuoteSheet({ room, onClose, say }: { room: Pick<ChatRoom, "id" | "other">; onClose: () => void; say: (t: string) => void }) {
  const { user } = useAuth();
  const uid = user?.id;
  const actions = useChatActions();
  const issue = useIssueQuotation();
  const me = useQuery({ queryKey: ["sc-chat-me", uid], enabled: !!uid, staleTime: 5 * 60_000, queryFn: () => getChatPeople([uid!]) });

  const [title, setTitle] = useState("");
  const [items, setItems] = useState<Item[]>(() => [newItem()]);
  const [preset, setPreset] = useState<Preset>("once");
  const [validUntil, setValidUntil] = useState(() => addDaysYmd(todayBangkok(), 14));
  const [endDate, setEndDate] = useState("");
  const [client, setClient] = useState(room.other.name);
  const [corp, setCorp] = useState(false);
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  /** The row of a send whose chat card failed: a retry posts the card again instead of a second quotation. */
  const [made, setMade] = useState<StudioDocumentRow | null>(null);

  const plan = useMemo(() => planFromPreset(preset), [preset]);
  const lines: ChatOfferLineItem[] = items
    .filter((it) => it.name.trim() && num(it.price) > 0)
    .map((it) => ({ id: it.id, name: it.name.trim().slice(0, 120), description: "", quantity: num(it.qty) || 1, unitPrice: Math.round(num(it.price)) }));
  const amount = Math.round(offerItemsSubtotal(lines));
  const wht = corp ? offerWhtAmount(amount, 3) : 0;
  const issuerRow = uid ? me.data?.[uid] : undefined;
  const issuerName = (issuerRow?.display_name || issuerRow?.username || "").trim();
  const clientName = client.trim().slice(0, 120);

  const payload: ChatOfferPayload = {
    v: 4,
    title: title.trim().slice(0, 120),
    amount,
    currency: "THB",
    deliverables: summarizeOfferItems(lines),
    items: lines,
    validUntil: validUntil || null,
    endDate: endDate || null,
    dueDate: endDate || null,
    clientName: clientName || null,
    issuerName: issuerName || null,
    party: {
      issuer: { ...emptyParty("individual"), name: issuerName || null },
      client: corp ? { ...emptyParty("corporate"), companyName: clientName || null, name: clientName || null } : { ...emptyParty("individual"), name: clientName || null },
    },
    paymentMode: plan.length > 1 ? "deposit" : "full",
    depositPercent: plan[0]?.percent ?? 100,
    paymentPlan: plan,
    whtEnabled: corp,
    whtApplicable: corp,
    whtRate: 3,
    clientNotes: notes.trim().slice(0, 800) || null,
  };
  // One formula for every installment (also used by the invoice and receipt later).
  const rows = offerInstallmentAmounts(payload);
  const missing = !payload.title ? "ใส่ชื่องานก่อนนะ" : !lines.length ? "ใส่รายการกับราคาอย่างน้อย 1 รายการนะ" : !clientName ? "ใส่ชื่อลูกค้าก่อนนะ" : "";

  const setItem = (id: string, patch: Partial<Item>) => setItems((list) => list.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const send = async () => {
    if (busy) return;
    if (missing) {
      setErr(missing);
      return;
    }
    setBusy(true);
    setErr("");
    try {
      let doc = made;
      if (!doc) {
        const number = await allocateDocNumber("quotation");
        doc = await issue.mutateAsync({ offer: { ...payload, number }, conversationId: room.id });
        setMade(doc);
      }
      await actions.sendCard(room.id, encodeChatOffer({ ...(doc.offer ?? payload), number: doc.doc_number, docId: doc.id }));
      say("ส่งใบเสนอราคาแล้ว");
      onClose();
    } catch (e) {
      setErr(e instanceof Error && e.message ? e.message : "ส่งไม่สำเร็จ ลองอีกครั้งนะ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ChatSheet label={{ id: "ct-q-h" }} onClose={onClose} wide>
      <div className="cs-doc-hd">
        <div>
          <p id="ct-q-h" className="cs-h">
            ทำใบเสนอราคา
          </p>
          <p className="cs-sub">ส่งให้ {room.other.name} ในแชทนี้ เขากดตกลงได้เลย แล้วค่อยออกใบแจ้งหนี้ทีละงวด</p>
        </div>
        <button type="button" className="cs-x" aria-label="ปิด" title="ปิด" onClick={onClose}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {preview ? (
        <div className="ct-preview">
          <Suspense fallback={<p className="cs-state">กำลังเปิด…</p>}>
            <Paper doc={offerToQuotationDocument({ ...payload, number: made?.doc_number }, { draft: !made })} />
          </Suspense>
        </div>
      ) : (
        <div className="ct-form">
          <label className="ct-f">
            <span>ชื่องาน</span>
            <input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น โปสเตอร์งานนิทรรศการ" />
          </label>

          <fieldset className="ct-f ct-items">
            <legend>รายการ</legend>
            {items.map((it, k) => (
              <div key={it.id} className="ct-item">
                <label className="ct-item-name">
                  <span className="sc-sr">รายการที่ {k + 1}</span>
                  <input value={it.name} maxLength={120} onChange={(e) => setItem(it.id, { name: e.target.value })} placeholder="รายการ" />
                </label>
                <label className="ct-item-qty">
                  <span className="sc-sr">จำนวน</span>
                  <input inputMode="decimal" value={it.qty} onChange={(e) => setItem(it.id, { qty: e.target.value })} aria-label={`จำนวน รายการที่ ${k + 1}`} />
                </label>
                <label className="ct-item-price">
                  <span className="sc-sr">ราคาต่อหน่วย (บาท)</span>
                  <input inputMode="decimal" value={it.price} onChange={(e) => setItem(it.id, { price: e.target.value })} placeholder="ราคา" aria-label={`ราคา รายการที่ ${k + 1}`} />
                </label>
                {items.length > 1 ? (
                  <button type="button" className="ct-ib" aria-label={`ลบรายการที่ ${k + 1}`} title="ลบรายการ" onClick={() => setItems((list) => list.filter((x) => x.id !== it.id))}>
                    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                ) : null}
              </div>
            ))}
            {items.length < 20 ? (
              <button type="button" className="ct-add" onClick={() => setItems((list) => [...list, newItem()])}>
                + เพิ่มรายการ
              </button>
            ) : null}
          </fieldset>

          <fieldset className="ct-f">
            <legend>แบ่งจ่าย</legend>
            <div className="ct-chips">
              {PAYMENT_PLAN_PRESETS.map((p) => (
                <button key={p.id} type="button" className="ct-chip" aria-pressed={preset === p.id} onClick={() => setPreset(p.id)}>
                  {p.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="ct-two">
            <label className="ct-f">
              <span>ใช้ได้ถึง</span>
              <input type="date" value={validUntil} min={todayBangkok()} onChange={(e) => setValidUntil(e.target.value)} />
            </label>
            <label className="ct-f">
              <span>ส่งงานภายใน (ถ้ามี)</span>
              <input type="date" value={endDate} min={todayBangkok()} onChange={(e) => setEndDate(e.target.value)} />
            </label>
          </div>

          <label className="ct-f">
            <span>ชื่อลูกค้าบนเอกสาร</span>
            <input value={client} maxLength={120} onChange={(e) => setClient(e.target.value)} />
          </label>
          <label className="ct-check">
            <input type="checkbox" checked={corp} onChange={(e) => setCorp(e.target.checked)} />
            <span>ลูกค้าเป็นบริษัท · หัก ณ ที่จ่าย 3%</span>
          </label>

          <label className="ct-f">
            <span>หมายเหตุถึงลูกค้า (ถ้ามี)</span>
            <textarea rows={2} maxLength={800} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>
      )}

      <div className="ct-sum" aria-live="polite">
        <div className="ct-sum-row">
          <span>รวม</span>
          <span>{baht(amount)}</span>
        </div>
        {wht ? (
          <div className="ct-sum-row ct-sum-sub">
            <span>หัก ณ ที่จ่าย 3%</span>
            <span>−{baht(wht)}</span>
          </div>
        ) : null}
        {rows.length > 1
          ? rows.map((r) => (
              <div key={r.no} className="ct-sum-row ct-sum-sub">
                <span>
                  งวด {r.no} · {r.installment.label} ({r.installment.percent}%)
                </span>
                <span>{baht(r.net)}</span>
              </div>
            ))
          : null}
        <p className="ct-note">โอนกันเองโดยตรงนะ SAMECOR ไม่ได้รับเงินแทน</p>
      </div>

      {err ? (
        <p role="alert" className="ct-err">
          {err}
        </p>
      ) : null}
      <div className="cs-acts ct-acts">
        <button type="button" className="cs-cancel" onClick={() => setPreview((v) => !v)} aria-pressed={preview}>
          {preview ? "กลับไปแก้" : "ดูตัวอย่าง"}
        </button>
        <button type="button" className="ct-go" disabled={busy} onClick={() => void send()}>
          {busy ? "กำลังส่ง…" : "ส่งใบเสนอราคา"}
        </button>
      </div>
    </ChatSheet>
  );
}
