import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { studioDocKeys, useMyStudioDocs } from "@/hooks/useStudioDocuments";
import { formatOfferDateShort } from "@/lib/chatOffer";
import {
  docDisplayStatus,
  isOverdue,
  satangToThb,
  STUDIO_DOC_KIND_LABEL,
  studioDocsToCsv,
  summarizeStudioDocs,
  todayBangkok,
  type StudioDocKind,
  type StudioDocumentRow,
} from "@/lib/documents/studioDocuments";
import { getChatPeople } from "@/server/queries/chatRooms";
import { getReceivedStudioDocs } from "@/server/queries/studioDocs";
import { baht } from "../chat/chatFormat";
import ScLoader from "../main/ScLoader";
import { SC_LINKS } from "../routes";
import LoadError from "../shell/LoadError";
import "../styles/studio-docs.css";

const DocViewer = lazy(() => import("../chat/DocViewer"));

type View = "issued" | "received";
type Kind = "all" | StudioDocKind;
type St = "all" | "awaiting_reply" | "unpaid" | "overdue" | "paid" | "void";

const KINDS: ReadonlyArray<readonly [Kind, string]> = [
  ["all", "All"],
  ["quotation", "Quotation"],
  ["invoice", "Invoice"],
  ["receipt", "Receipt"],
];
/** Old billing page status filter (BillingDashboard matchesStatus). */
const STATUSES: ReadonlyArray<readonly [St, string]> = [
  ["all", "ทุกสถานะ"],
  ["awaiting_reply", "รอตอบ"],
  ["unpaid", "รอชำระ"],
  ["overdue", "เกินกำหนด"],
  ["paid", "ชำระแล้ว / ใบเสร็จ"],
  ["void", "ยกเลิกแล้ว"],
];

function matches(d: StudioDocumentRow, st: St) {
  if (st === "awaiting_reply") return d.kind === "quotation" && d.status === "sent";
  if (st === "unpaid") return d.kind === "invoice" && d.status === "sent";
  if (st === "overdue") return isOverdue(d);
  if (st === "paid") return d.kind === "receipt" || (d.kind === "invoice" && d.status === "paid");
  if (st === "void") return d.status === "void";
  return true;
}

const kindLabel = (d: StudioDocumentRow) =>
  `${STUDIO_DOC_KIND_LABEL[d.kind]}${d.installment_no && (d.installment_total ?? 1) > 1 ? ` · งวด ${d.installment_no}/${d.installment_total}` : ""}`;

const Icon = ({ kind }: { kind: StudioDocKind }) => (
  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 3.5h7l4 4v13h-11z" />
    <path d="M13.5 3.5v4h4" />
    {kind === "receipt" ? <path d="M9 14l2 2 4-4" /> : kind === "invoice" ? <path d="M9 12.5h6M9 16h6" /> : <path d="M9 12.5h6M9 16h4" />}
  </svg>
);

/**
 * My Studio › Documents (old `/dashboard/billing` "เอกสารและรายรับ"): quotations, invoices and receipts I issued in
 * chats, and the ones others sent me; filters, the numbers that are still open, CSV for tax time. Each opens the
 * same viewer as in the chat. These are the creators' own records: SAMECOR takes no payment (free launch).
 */
export default function StudioDocuments({ uid, say }: { uid: string; say: (t: string) => void }) {
  const [view, setView] = useState<View>("issued");
  const [kind, setKind] = useState<Kind>("all");
  const [st, setSt] = useState<St>("all");
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState<StudioDocumentRow | null>(null);

  const mine = useMyStudioDocs();
  // Under studioDocKeys.all, so every document change (answer, invoice, receipt) reads it again.
  const received = useQuery({
    queryKey: [...studioDocKeys.all, "received", uid],
    enabled: view === "received",
    staleTime: 15_000,
    queryFn: () => getReceivedStudioDocs(uid),
  });
  const q = view === "issued" ? mine : received;
  const docs = useMemo(() => q.data ?? [], [q.data]);

  const ownerIds = useMemo(() => (view === "received" ? [...new Set(docs.map((d) => d.owner_id))].sort() : []), [docs, view]);
  const people = useQuery({ queryKey: ["sc-studio-doc-people", ownerIds], enabled: ownerIds.length > 0, staleTime: 5 * 60_000, queryFn: () => getChatPeople(ownerIds) });
  const who = (d: StudioDocumentRow) => {
    if (view === "issued") return d.client_name?.trim() ? `ถึง ${d.client_name.trim()}` : "";
    const p = people.data?.[d.owner_id];
    const name = p?.display_name?.trim() || (p?.username ? `@${p.username}` : "");
    return name ? `จาก ${name}` : "";
  };

  const needle = term.trim().toLowerCase();
  const rows = docs.filter(
    (d) =>
      (kind === "all" || d.kind === kind) &&
      matches(d, st) &&
      (!needle || [d.doc_number, d.title, d.client_name ?? ""].some((v) => v.toLowerCase().includes(needle))),
  );
  const sum = view === "issued" ? summarizeStudioDocs(docs) : null;

  const csv = () => {
    const blob = new Blob([studioDocsToCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `samecor-documents-${todayBangkok()}.csv`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  return (
    <div className="ms-docs">
      <div className="ms-seg" role="group" aria-label="เอกสาร">
        {(
          [
            ["issued", "ที่ฉันออก"],
            ["received", "ที่ส่งถึงฉัน"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" aria-pressed={view === k} onClick={() => setView(k)}>
            {label}
          </button>
        ))}
      </div>

      {sum && docs.length ? (
        <div className="ms-dsum">
          <div>
            <span>ยังไม่ได้รับ</span>
            <b>{baht(satangToThb(sum.outstandingSatang))}</b>
          </div>
          <div data-red={sum.overdueCount ? "" : undefined}>
            <span>เกินกำหนด{sum.overdueCount ? ` ${sum.overdueCount} ใบ` : ""}</span>
            <b>{baht(satangToThb(sum.overdueSatang))}</b>
          </div>
          <div>
            <span>ได้รับเดือนนี้</span>
            <b>{baht(satangToThb(sum.receivedThisMonthSatang))}</b>
          </div>
          <div>
            <span>ใบเสนอราคารอตอบ</span>
            <b>{sum.quotesAwaiting}</b>
          </div>
        </div>
      ) : null}

      <div className="ms-bar ms-dbar">
        {KINDS.map(([k, label]) => (
          <button key={k} type="button" className={kind === k ? "ms-pill ms-pill-on" : "ms-pill"} aria-pressed={kind === k} onClick={() => setKind(k)}>
            {label}
          </button>
        ))}
        <label className="ms-dsel">
          <span className="sc-sr">สถานะ</span>
          <select value={st} onChange={(e) => setSt(e.target.value as St)}>
            {STATUSES.map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="ms-dq">
          <span className="sc-sr">ค้นหาเอกสาร</span>
          <input type="search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="ค้นหาเลขที่ ชื่องาน ลูกค้า" />
        </label>
        {view === "issued" && rows.length ? (
          <button type="button" className="ms-pill ms-dcsv" lang="en" onClick={csv}>
            Export CSV
          </button>
        ) : null}
      </div>

      {q.isPending ? (
        <ScLoader label="กำลังโหลด" />
      ) : q.isError && !q.data ? (
        <LoadError onRetry={() => void q.refetch()} />
      ) : !docs.length ? (
        <div className="ms-ev-empty">
          <p>{view === "issued" ? "ยังไม่มีเอกสารเลย ทำใบเสนอราคาได้จาก + ในแชทนะ" : "ยังไม่มีใครส่งเอกสารมานะ"}</p>
          {view === "issued" ? (
            <Link to={SC_LINKS.chat} className="ms-ev-new">
              ไปที่แชท
            </Link>
          ) : null}
        </div>
      ) : (
        <div>
          {rows.map((d) => {
            const status = docDisplayStatus(d);
            const by = who(d);
            return (
              <div key={d.id} className="ms-evr ms-dcr">
                <button type="button" className="ms-dcr-a" aria-haspopup="dialog" onClick={() => setOpen(d)}>
                  <span className="ms-dck" data-k={d.kind}>
                    <Icon kind={d.kind} />
                  </span>
                  <span className="ms-evtx">
                    <span className="ms-evk">
                      {kindLabel(d)} · {d.doc_number}
                    </span>
                    <span className="ms-evt ms-dct">{d.title || "—"}</span>
                    <span className="ms-evp">{[by, formatOfferDateShort(d.issue_date)].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className="ms-dcm">
                    <span className="ms-dca">{baht(satangToThb(d.net_satang))}</span>
                    <span className="ms-dcs" data-tone={status.tone}>
                      {status.label}
                    </span>
                  </span>
                </button>
                {d.conversation_id ? (
                  <Link to={`${SC_LINKS.chat}/${d.conversation_id}`} className="ms-cc ms-dchat" aria-label={`ไปที่แชทของ ${d.doc_number}`} title="ไปที่แชท">
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
                      <path d="M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-4 3.5v-3.5h0.5a2 2 0 0 1-2-2z" />
                    </svg>
                  </Link>
                ) : null}
              </div>
            );
          })}
          {rows.length ? null : <p className="ms-dash">ไม่มีเอกสารที่ตรงกัน</p>}
        </div>
      )}

      {open ? (
        <Suspense fallback={null}>
          <DocViewer id={open.id} kind={kindLabel(open)} number={open.doc_number} onClose={() => setOpen(null)} say={say} />
        </Suspense>
      ) : null}
    </div>
  );
}
