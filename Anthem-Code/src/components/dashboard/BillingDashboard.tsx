import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ChevronRight,
  Clock,
  Download,
  FileText,
  MessageCircle,
  Receipt,
  ScrollText,
  Search,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RecordPaymentDialog,
  StatusPill,
  StudioDocViewDialog,
  formatSatang,
} from "@/components/documents/StudioDocDialogs";
import { formatOfferDateShort } from "@/lib/chatOffer";
import {
  STUDIO_DOC_KIND_LABEL,
  docDisplayStatus,
  installmentTracks,
  isOverdue,
  studioDocsToCsv,
  summarizeStudioDocs,
  todayBangkok,
  type InstallmentTrack,
  type StudioDocKind,
  type StudioDocumentRow,
} from "@/lib/documents/studioDocuments";
import { cn } from "@/lib/utils";

const KIND_ICON = {
  quotation: FileText,
  invoice: ScrollText,
  receipt: Receipt,
} as const;

type StatusFilter =
  | "all"
  | "awaiting_reply"
  | "unpaid"
  | "overdue"
  | "paid"
  | "void";

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "ทุกสถานะ" },
  { id: "unpaid", label: "รอชำระ" },
  { id: "overdue", label: "เกินกำหนด" },
  { id: "paid", label: "ชำระแล้ว / ใบเสร็จ" },
  { id: "awaiting_reply", label: "รอลูกค้าตอบ" },
  { id: "void", label: "ยกเลิกแล้ว" },
];

function matchesStatus(d: StudioDocumentRow, f: StatusFilter) {
  switch (f) {
    case "all":
      return true;
    case "awaiting_reply":
      return d.kind === "quotation" && d.status === "sent";
    case "unpaid":
      return d.kind === "invoice" && d.status === "sent";
    case "overdue":
      return isOverdue(d);
    case "paid":
      return (
        d.kind === "receipt" || (d.kind === "invoice" && d.status === "paid")
      );
    case "void":
      return d.status === "void";
  }
}

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  tone = "neutral",
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "danger" | "success";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon
          className={cn(
            "h-4 w-4",
            tone === "danger" && "text-red-600 dark:text-red-400",
            tone === "success" && "text-emerald-600 dark:text-emerald-400",
          )}
          aria-hidden
        />
        {label}
      </div>
      <p
        className={cn(
          "mt-1.5 truncate text-xl font-semibold tabular-nums sm:text-2xl",
          tone === "danger" && "text-red-700 dark:text-red-300",
        )}
      >
        {value}
      </p>
      {sub ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
      ) : null}
    </div>
  );
}

function downloadCsv(docs: StudioDocumentRow[]) {
  const blob = new Blob([studioDocsToCsv(docs)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `samecor-documents-${todayBangkok()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** My Studio → เอกสารและรายรับ (presentational; data comes from useMyStudioDocs). */
export function BillingDashboard({
  docs,
  viewerId,
}: {
  docs: StudioDocumentRow[];
  viewerId: string | null;
}) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | StudioDocKind>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [year, setYear] = useState<string>("all");
  const [viewDoc, setViewDoc] = useState<StudioDocumentRow | null>(null);
  const [pay, setPay] = useState<{
    quote: StudioDocumentRow;
    track: InstallmentTrack;
    paidNos: number[];
  } | null>(null);

  const summary = useMemo(() => summarizeStudioDocs(docs), [docs]);
  const years = useMemo(
    () =>
      Array.from(new Set(docs.map((d) => d.issue_date.slice(0, 4))))
        .sort()
        .reverse(),
    [docs],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return docs.filter(
      (d) =>
        (kind === "all" || d.kind === kind) &&
        matchesStatus(d, status) &&
        (year === "all" || d.issue_date.startsWith(year)) &&
        (!q ||
          d.doc_number.toLowerCase().includes(q) ||
          d.title.toLowerCase().includes(q) ||
          (d.client_name || "").toLowerCase().includes(q)),
    );
  }, [docs, query, kind, status, year]);

  /** Things that need the freelancer today. */
  const attention = useMemo(() => {
    const rows = docs.filter(
      (d) =>
        d.status !== "void" &&
        ((d.kind === "invoice" &&
          d.status === "sent" &&
          (isOverdue(d) || !!d.client_marked_paid_at)) ||
          (d.kind === "quotation" && d.status === "sent")),
    );
    const rank = (d: StudioDocumentRow) =>
      d.client_marked_paid_at ? 0 : isOverdue(d) ? 1 : 2;
    return rows.sort((a, b) => rank(a) - rank(b)).slice(0, 6);
  }, [docs]);

  const clients = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        jobs: Set<string>;
        quoted: number;
        received: number;
        outstanding: number;
        last: string;
      }
    >();
    for (const d of docs) {
      if (d.status === "void") continue;
      const name = d.client_name?.trim() || "ไม่ระบุชื่อลูกค้า";
      const c = map.get(name) ?? {
        name,
        jobs: new Set(),
        quoted: 0,
        received: 0,
        outstanding: 0,
        last: "",
      };
      if (d.kind === "quotation") {
        c.jobs.add(d.id);
        if (d.status === "accepted") c.quoted += d.net_satang;
      }
      if (d.kind === "receipt") c.received += d.net_satang;
      if (d.kind === "invoice" && d.status === "sent")
        c.outstanding += d.net_satang;
      if (d.issue_date > c.last) c.last = d.issue_date;
      map.set(name, c);
    }
    return Array.from(map.values()).sort((a, b) =>
      b.last.localeCompare(a.last),
    );
  }, [docs]);

  const openRecordPayment = (invoice: StudioDocumentRow) => {
    const quote = docs.find((d) => d.id === invoice.quote_id);
    if (!quote) {
      setViewDoc(invoice);
      return;
    }
    const tracks = installmentTracks(quote, docs);
    const track = tracks.find((t) => t.no === invoice.installment_no);
    if (!track) {
      setViewDoc(invoice);
      return;
    }
    setPay({
      quote,
      track,
      paidNos: tracks.filter((t) => t.state === "paid").map((t) => t.no),
    });
  };

  if (docs.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
        <FileText
          className="mx-auto h-8 w-8 text-muted-foreground"
          aria-hidden
        />
        <h2 className="mt-3 text-base font-semibold">ยังไม่มีเอกสาร</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          ส่งใบเสนอราคาให้ลูกค้าในแชท แล้วใบแจ้งหนี้ ใบเสร็จ
          และยอดค้างรับทั้งหมดจะมารวมอยู่ที่นี่
        </p>
        <Button asChild className="mt-4">
          <Link to="/chat">ไปที่แชท</Link>
        </Button>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
        aria-label="สรุปยอด"
      >
        <StatTile
          icon={Wallet}
          label="ค้างรับ"
          value={formatSatang(summary.outstandingSatang)}
          sub={
            summary.clientMarkedCount
              ? `ลูกค้าแจ้งโอนแล้ว ${summary.clientMarkedCount} ใบ`
              : "จากใบแจ้งหนี้ที่ยังไม่ชำระ"
          }
        />
        <StatTile
          icon={AlertTriangle}
          label="เกินกำหนด"
          value={formatSatang(summary.overdueSatang)}
          sub={summary.overdueCount ? `${summary.overdueCount} ใบ` : "ไม่มี"}
          tone={summary.overdueCount ? "danger" : "neutral"}
        />
        <StatTile
          icon={Receipt}
          label="รับแล้วเดือนนี้"
          value={formatSatang(summary.receivedThisMonthSatang)}
          sub={`ทั้งปี ${formatSatang(summary.receivedThisYearSatang)}`}
          tone="success"
        />
        <StatTile
          icon={Clock}
          label="ใบเสนอราคารอตอบ"
          value={`${summary.quotesAwaiting} ใบ`}
          sub={
            summary.quotesAwaiting
              ? `มูลค่า ${formatSatang(summary.quotesAwaitingSatang)}`
              : "ไม่มี"
          }
        />
      </section>

      {attention.length > 0 ? (
        <section className="space-y-2" aria-labelledby="billing-attention">
          <h2 id="billing-attention" className="text-sm font-semibold">
            ต้องจัดการ
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {attention.map((d) => {
              const st = docDisplayStatus(d);
              return (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {d.client_name || "ลูกค้า"} · {d.title}
                    </p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {STUDIO_DOC_KIND_LABEL[d.kind]}
                      {d.installment_no
                        ? ` งวด ${d.installment_no}`
                        : ""} · {d.doc_number} · {formatSatang(d.net_satang)}
                      {d.due_date && d.kind === "invoice"
                        ? ` · ครบกำหนด ${formatOfferDateShort(d.due_date)}`
                        : ""}
                    </p>
                  </div>
                  <StatusPill status={st} />
                  <div className="flex gap-1.5">
                    {d.kind === "invoice" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant={
                          d.client_marked_paid_at ? "default" : "outline"
                        }
                        className="h-9"
                        onClick={() => openRecordPayment(d)}
                      >
                        บันทึกรับเงิน
                      </Button>
                    ) : null}
                    {d.conversation_id ? (
                      <Button
                        asChild
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-9"
                      >
                        <Link
                          to={`/chat/${d.conversation_id}`}
                          aria-label={`เปิดแชทกับ ${d.client_name || "ลูกค้า"}`}
                        >
                          <MessageCircle className="mr-1 h-4 w-4" aria-hidden />
                          {isOverdue(d) ? "ทวงในแชท" : "แชท"}
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <Tabs defaultValue="docs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="docs">เอกสาร</TabsTrigger>
            <TabsTrigger value="clients">ลูกค้า</TabsTrigger>
          </TabsList>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => downloadCsv(filtered)}
          >
            <Download className="mr-1.5 h-4 w-4" aria-hidden />
            ส่งออก CSV
          </Button>
        </div>

        <TabsContent value="docs" className="mt-3 space-y-3">
          <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto]">
            <label className="relative block">
              <span className="sr-only">ค้นหาเอกสาร</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาเลขที่ ชื่องาน หรือลูกค้า"
                className="pl-10 sm:text-sm"
              />
            </label>
            <div className="grid grid-cols-3 gap-2">
              <select
                aria-label="ประเภทเอกสาร"
                value={kind}
                onChange={(e) => setKind(e.target.value as typeof kind)}
                className="h-10 min-w-0 rounded-full border border-input bg-card px-3 text-sm"
              >
                <option value="all">ทุกประเภท</option>
                <option value="quotation">ใบเสนอราคา</option>
                <option value="invoice">ใบแจ้งหนี้</option>
                <option value="receipt">ใบเสร็จรับเงิน</option>
              </select>
              <select
                aria-label="สถานะ"
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusFilter)}
                className="h-10 min-w-0 rounded-full border border-input bg-card px-3 text-sm"
              >
                {STATUS_FILTERS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
              <select
                aria-label="ปี"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="h-10 min-w-0 rounded-full border border-input bg-card px-3 text-sm"
              >
                <option value="all">ทุกปี</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {Number(y) + 543}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              ไม่พบเอกสารตามตัวกรองนี้
              <button
                type="button"
                className="ml-2 underline underline-offset-2 hover:text-foreground"
                onClick={() => {
                  setQuery("");
                  setKind("all");
                  setStatus("all");
                  setYear("all");
                }}
              >
                ล้างตัวกรอง
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="hidden grid-cols-[20px_minmax(0,1.6fr)_minmax(0,1fr)_96px_96px_120px_120px_16px] gap-3 border-b border-border bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground md:grid">
                <span />
                <span>เอกสาร</span>
                <span>ลูกค้า</span>
                <span>วันที่</span>
                <span>ครบกำหนด</span>
                <span className="text-right">ยอดสุทธิ</span>
                <span>สถานะ</span>
                <span />
              </div>
              <ul className="divide-y divide-border">
                {filtered.map((d) => {
                  const Icon = KIND_ICON[d.kind];
                  return (
                    <li key={d.id}>
                      <button
                        type="button"
                        onClick={() => setViewDoc(d)}
                        className={cn(
                          "grid w-full grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3 text-left hover:bg-muted/50 md:grid-cols-[20px_minmax(0,1.6fr)_minmax(0,1fr)_96px_96px_120px_120px_16px]",
                          d.status === "void" && "opacity-60",
                        )}
                      >
                        <Icon
                          className="h-4 w-4 text-muted-foreground"
                          aria-hidden
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {d.title}
                          </span>
                          <span className="block truncate text-xs tabular-nums text-muted-foreground">
                            {STUDIO_DOC_KIND_LABEL[d.kind]}
                            {d.installment_no
                              ? ` งวด ${d.installment_no}/${d.installment_total ?? ""}`
                              : ""}{" "}
                            · {d.doc_number}
                            <span className="md:hidden">
                              {" "}
                              · {d.client_name || "—"}
                            </span>
                          </span>
                        </span>
                        <span className="hidden truncate text-sm md:block">
                          {d.client_name || "—"}
                        </span>
                        <span className="hidden text-sm tabular-nums text-muted-foreground md:block">
                          {formatOfferDateShort(d.issue_date)}
                        </span>
                        <span className="hidden text-sm tabular-nums text-muted-foreground md:block">
                          {d.due_date && d.kind !== "receipt"
                            ? formatOfferDateShort(d.due_date)
                            : "—"}
                        </span>
                        <span className="row-span-2 flex flex-col items-end gap-1 md:row-span-1 md:contents">
                          <span className="text-sm font-semibold tabular-nums md:text-right">
                            {formatSatang(d.net_satang)}
                          </span>
                          <span>
                            <StatusPill status={docDisplayStatus(d)} />
                          </span>
                        </span>
                        <ChevronRight
                          className="hidden h-4 w-4 text-muted-foreground md:block"
                          aria-hidden
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            ยอดสุทธิ = ยอดที่ลูกค้าโอนจริงหลังหัก ณ ที่จ่าย · SAMECOR
            ไม่ได้รับหรือถือเงิน ใช้ข้อมูลนี้ประกอบการยื่นภาษีได้
          </p>
        </TabsContent>

        <TabsContent value="clients" className="mt-3">
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {clients.map((c) => (
              <li
                key={c.name}
                className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_repeat(3,120px)] sm:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.jobs.size} งาน · ล่าสุด{" "}
                    {c.last ? formatOfferDateShort(c.last) : "—"}
                  </p>
                </div>
                <p className="text-sm tabular-nums sm:text-right">
                  <span className="text-xs text-muted-foreground sm:block">
                    มูลค่างานที่ตกลง{" "}
                  </span>
                  {formatSatang(c.quoted)}
                </p>
                <p className="text-sm tabular-nums sm:text-right">
                  <span className="text-xs text-muted-foreground sm:block">
                    รับแล้ว{" "}
                  </span>
                  {formatSatang(c.received)}
                </p>
                <p
                  className={cn(
                    "text-sm tabular-nums sm:text-right",
                    c.outstanding > 0 && "font-semibold",
                  )}
                >
                  <span className="text-xs font-normal text-muted-foreground sm:block">
                    ค้างรับ{" "}
                  </span>
                  {formatSatang(c.outstanding)}
                </p>
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>

      <StudioDocViewDialog
        doc={viewDoc}
        open={!!viewDoc}
        onOpenChange={(o) => !o && setViewDoc(null)}
        viewerIsOwner={!!viewDoc && viewDoc.owner_id === viewerId}
      />
      {pay ? (
        <RecordPaymentDialog
          key={`${pay.quote.id}-${pay.track.no}`}
          quote={pay.quote}
          track={pay.track}
          paidNos={pay.paidNos}
          open
          onOpenChange={(o) => !o && setPay(null)}
        />
      ) : null}
    </div>
  );
}
