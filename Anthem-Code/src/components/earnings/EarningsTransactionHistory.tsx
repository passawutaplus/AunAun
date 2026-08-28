import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Eye, FileText, Search } from "lucide-react";
import { InlineLoader } from "@/components/ui/BanterLoader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DocumentPaper } from "@/components/documents/DocumentPaper";
import { formatThaiDate } from "@/lib/format";
import { satangToThb } from "@/lib/payments/fees";
import { formatMoneyLabel } from "@/lib/payments/fxDisplay";
import {
  countLedgerByKind,
  countLedgerByStatus,
  filterHireLedger,
  hireLedgerEmptyCopy,
  hireLedgerToCsv,
  HIRE_INCOME_FILTERS,
  HIRE_LEDGER_KINDS,
  HIRE_LEDGER_PERIODS,
  incomeBucketLabelTh,
  payoutStatusLabelTh,
  rowMatchesStatus,
  summarizeHireIncome,
  summarizeHirePayouts,
  type HireIncomeFilter,
  type HireIncomeItem,
  type HireLedgerKind,
  type HireLedgerPeriod,
  type HireLedgerRow,
  type HirePayoutItem,
  type HireWalletReceipt,
} from "@/lib/payments/hireWallet";
import { docKindLabelTh } from "@/lib/documents/numbering";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 5;

type Props = {
  income: HireIncomeItem[];
  payouts: HirePayoutItem[];
  isLoading?: boolean;
  isPreview?: boolean;
  status: HireIncomeFilter;
  onStatusChange: (filter: HireIncomeFilter) => void;
};

function money(satang: number) {
  return formatMoneyLabel(satangToThb(satang), "THB");
}

function bucketPillClass(bucket: HireIncomeItem["walletBucket"]): string {
  switch (bucket) {
    case "pending":
      return "bg-amber-500/10 text-amber-800 dark:text-amber-300";
    case "available":
      return "bg-primary/10 text-primary";
    case "transferring":
      return "bg-sky-500/10 text-sky-800 dark:text-sky-300";
    case "paid_out":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function payoutPillClass(status: HirePayoutItem["status"]): string {
  if (status === "completed") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (status === "failed") return "bg-destructive/10 text-destructive";
  if (status === "processing" || status === "queued") {
    return "bg-sky-500/10 text-sky-800 dark:text-sky-300";
  }
  return "bg-muted text-muted-foreground";
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Unified hire wallet history: formula strip, type tabs, table on desktop, cards on mobile. */
export function EarningsTransactionHistory({
  income,
  payouts,
  isLoading,
  isPreview,
  status,
  onStatusChange,
}: Props) {
  const [kind, setKind] = useState<HireLedgerKind>("all");
  const [period, setPeriod] = useState<HireLedgerPeriod>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<HireLedgerRow | null>(null);
  const [openReceipt, setOpenReceipt] = useState<HireWalletReceipt | null>(null);

  const kindCounts = useMemo(() => countLedgerByKind(income, payouts), [income, payouts]);

  const scoped = useMemo(
    () =>
      filterHireLedger({
        income,
        payouts,
        kind,
        status: "all",
        period,
        query,
      }),
    [income, payouts, kind, period, query],
  );
  const statusCounts = useMemo(() => countLedgerByStatus(scoped), [scoped]);
  const visible = useMemo(
    () => scoped.filter((row) => rowMatchesStatus(row, status)),
    [scoped, status],
  );

  const visibleIncome = useMemo(
    () => visible.filter((row) => row.kind === "income").map((row) => row.income),
    [visible],
  );
  const visiblePayouts = useMemo(
    () => visible.filter((row) => row.kind === "payout").map((row) => row.payout),
    [visible],
  );
  const incomeSummary = useMemo(() => summarizeHireIncome(visibleIncome), [visibleIncome]);
  const payoutSummary = useMemo(() => summarizeHirePayouts(visiblePayouts), [visiblePayouts]);
  const showPayoutFormula = kind === "payout" || (kind === "all" && visibleIncome.length === 0 && visiblePayouts.length > 0);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const pageRows = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [kind, status, period, query]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const statusOptions =
    kind === "payout"
      ? HIRE_INCOME_FILTERS.filter((opt) => opt.id === "all" || opt.id === "transferring" || opt.id === "paid_out")
      : HIRE_INCOME_FILTERS;

  const emptyCopy = hireLedgerEmptyCopy({
    kind,
    status,
    period,
    hasQuery: query.trim().length > 0,
  });

  const selectKind = (next: HireLedgerKind) => {
    setKind(next);
    if (next === "payout" && (status === "pending" || status === "available")) {
      onStatusChange("all");
    }
  };

  const dialogOpen = !!detail || !!openReceipt;

  return (
    <section className="space-y-4 rounded-2xl glass-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-medium text-foreground">ประวัติ</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            รายได้จากงานจ้างและการถอนเข้าบัญชี
            {isPreview ? " · รายการตัวอย่าง" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="ช่วงเวลา" className="flex gap-1">
            {HIRE_LEDGER_PERIODS.map((opt) => {
              const active = period === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setPeriod(opt.id)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-full"
            disabled={visible.length === 0}
            onClick={() =>
              downloadCsv(
                `aplus1-wallet-${new Date().toISOString().slice(0, 10)}.csv`,
                hireLedgerToCsv(visible),
              )
            }
          >
            <Download className="h-3.5 w-3.5" />
            ส่งออก
          </Button>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="ประเภทประวัติ"
        className="flex gap-1 border-b border-border/70"
      >
        {HIRE_LEDGER_KINDS.map((opt) => {
          const active = kind === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectKind(opt.id)}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                active
                  ? "border-primary font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
              <span className="ml-1 tabular-nums text-xs text-muted-foreground">{kindCounts[opt.id]}</span>
            </button>
          );
        })}
      </div>

      {visible.length > 0 ? (
        <FormulaStrip showPayout={showPayoutFormula} income={incomeSummary} payout={payoutSummary} />
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor="wallet-history-search" className="mb-1 block text-[11px] text-muted-foreground">
            ค้นหา
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="wallet-history-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ชื่องาน / เลขใบเสร็จ / บัญชี"
              className="h-9 pl-9"
            />
          </div>
        </div>
        <div
          role="tablist"
          aria-label="กรองสถานะเงิน"
          className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide"
        >
          {statusOptions.map((opt) => {
            const active = status === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onStatusChange(opt.id)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                {opt.label}
                <span className={cn("ml-1 tabular-nums", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {statusCounts[opt.id]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <InlineLoader className="py-6" />
      ) : visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{emptyCopy}</p>
      ) : (
        <>
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[88px]">ประเภท</TableHead>
                  <TableHead>รายการ</TableHead>
                  <TableHead>วันที่</TableHead>
                  <TableHead className="text-right">รายได้</TableHead>
                  <TableHead className="text-right">ค่าธรรมเนียม</TableHead>
                  <TableHead className="text-right">สุทธิ</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">การดำเนินการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((row) => (
                  <TableRow key={`${row.kind}-${row.id}`}>
                    <TableCell>
                      <TypePill kind={row.kind} />
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <p className="truncate font-medium">{rowTitle(row)}</p>
                      <p className="truncate text-xs text-muted-foreground">{rowSubtitle(row)}</p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {row.at ? formatThaiDate(row.at) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{money(rowGross(row))}</TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {rowFee(row) > 0 ? `−${money(rowFee(row))}` : "—"}
                      {row.kind === "income" && row.income.whtSatang > 0 ? (
                        <p className="text-[10px]">หัก ณ ที่จ่าย −{money(row.income.whtSatang)}</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{money(rowNet(row))}</TableCell>
                    <TableCell>
                      <StatusPill row={row} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary"
                        onClick={() => setDetail(row)}
                        aria-label="ดูรายละเอียด"
                        title="ดูรายละเอียด"
                      >
                        <Eye className="h-4 w-4" aria-hidden />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="space-y-2 lg:hidden">
            {pageRows.map((row) => (
              <li key={`${row.kind}-${row.id}`} className="rounded-xl border border-border/60 bg-background/40 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <TypePill kind={row.kind} />
                      <StatusPill row={row} />
                    </div>
                    <p className="mt-1.5 truncate text-sm font-medium">{rowTitle(row)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {rowSubtitle(row)}
                      {row.at ? ` · ${formatThaiDate(row.at)}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums">{money(rowNet(row))}</p>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  รายได้ {money(rowGross(row))}
                  {rowFee(row) > 0 ? ` · ค่าธรรมเนียม −${money(rowFee(row))}` : ""}
                  {row.kind === "income" && row.income.whtSatang > 0
                    ? ` · หัก ณ ที่จ่าย −${money(row.income.whtSatang)}`
                    : ""}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mt-1 h-8 w-8 text-primary"
                  onClick={() => setDetail(row)}
                  aria-label="ดูรายละเอียด"
                  title="ดูรายละเอียด"
                >
                  <Eye className="h-4 w-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
            <p>
              ทั้งหมด {visible.length} รายการ
              {visible.length > PAGE_SIZE ? ` · หน้า ${page}/${pageCount}` : ""}
            </p>
            {visible.length > PAGE_SIZE ? (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="ก่อนหน้า"
                  title="ก่อนหน้า"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  disabled={page >= pageCount}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  aria-label="ถัดไป"
                  title="ถัดไป"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            ) : null}
          </div>
        </>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDetail(null);
            setOpenReceipt(null);
          }
        }}
      >
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto rounded-2xl p-0">
          {openReceipt ? (
            <>
              <DialogHeader className="px-4 pt-4">
                <DialogTitle className="text-base">{docKindLabelTh(openReceipt.kind)}</DialogTitle>
                <DialogDescription>
                  {openReceipt.docNumber}
                  {isPreview ? " · เอกสารตัวอย่าง" : ""}
                </DialogDescription>
              </DialogHeader>
              <div className="p-4">
                {detail?.kind === "income" ? (
                  <button
                    type="button"
                    className="mb-3 text-xs text-primary underline-offset-2 hover:underline"
                    onClick={() => setOpenReceipt(null)}
                  >
                    กลับไปรายละเอียดรายการ
                  </button>
                ) : null}
                <DocumentPaper doc={openReceipt.snapshot} />
              </div>
            </>
          ) : detail?.kind === "income" ? (
            <IncomeDetail
              row={detail.income}
              isPreview={isPreview}
              onOpenReceipt={setOpenReceipt}
            />
          ) : detail?.kind === "payout" ? (
            <PayoutDetail row={detail.payout} isPreview={isPreview} />
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function FormulaStrip({
  showPayout,
  income,
  payout,
}: {
  showPayout: boolean;
  income: ReturnType<typeof summarizeHireIncome>;
  payout: ReturnType<typeof summarizeHirePayouts>;
}) {
  const cells = showPayout
    ? [
        { label: "สุทธิ", value: money(payout.transferSatang), accent: true },
        { label: "จากกระเป๋า", value: money(payout.amountSatang), accent: false },
        {
          label: "ค่าโอน",
          value: payout.feeSatang > 0 ? `−${money(payout.feeSatang)}` : "฿0",
          accent: false,
        },
      ]
    : [
        { label: "สุทธิ", value: money(income.netSatang), accent: true },
        { label: "ราคางาน", value: money(income.revenueSatang), accent: false },
        { label: "ค่าธรรมเนียม", value: `−${money(income.platformFeeSatang)}`, accent: false },
        ...(income.whtSatang > 0
          ? [{ label: "หัก ณ ที่จ่าย", value: `−${money(income.whtSatang)}`, accent: false }]
          : []),
      ];

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground">
        {showPayout
          ? "สุทธิเข้าบัญชี = ยอดถอน − ค่าธรรมเนียมโอน"
          : income.whtSatang > 0
            ? "สุทธิ = ราคางาน − ค่าธรรมเนียมแพลตฟอร์ม − หัก ณ ที่จ่าย"
            : "สุทธิ = ราคางาน − ค่าธรรมเนียมแพลตฟอร์ม 10%"}
      </p>
      <div className={cn("grid gap-2", cells.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3")}>
        {cells.map((cell) => (
          <div
            key={cell.label}
            className={cn(
              "rounded-lg border px-3 py-2.5",
              cell.accent ? "border-primary/30 bg-primary/5" : "border-border/70 bg-background/60",
            )}
          >
            <p className="text-[11px] text-muted-foreground">{cell.label}</p>
            <p className="mt-0.5 text-base font-semibold tabular-nums sm:text-lg">{cell.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TypePill({ kind }: { kind: HireLedgerRow["kind"] }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
        kind === "income" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
      )}
    >
      {kind === "income" ? "งานจ้าง" : "การถอน"}
    </span>
  );
}

function StatusPill({ row }: { row: HireLedgerRow }) {
  if (row.kind === "income") {
    return (
      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px]", bucketPillClass(row.income.walletBucket))}>
        {incomeBucketLabelTh(row.income.walletBucket)}
      </span>
    );
  }
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px]", payoutPillClass(row.payout.status))}>
      {payoutStatusLabelTh(row.payout.status)}
    </span>
  );
}

function rowTitle(row: HireLedgerRow) {
  return row.kind === "income" ? row.income.title : `ถอนเข้า ${row.payout.bankName}`;
}

function rowSubtitle(row: HireLedgerRow) {
  if (row.kind === "income") return `จาก ${row.income.buyerName}`;
  return row.payout.accountLast4 ? `****${row.payout.accountLast4}` : row.payout.bankName;
}

function rowGross(row: HireLedgerRow) {
  return row.kind === "income" ? row.income.jobPriceSatang : row.payout.amountSatang;
}

function rowFee(row: HireLedgerRow) {
  return row.kind === "income" ? row.income.platformFeeSatang : row.payout.feeSatang;
}

function rowNet(row: HireLedgerRow) {
  return row.kind === "income" ? row.income.sellerNetSatang : row.payout.transferSatang;
}

function BreakdownRow({
  label,
  value,
  muted,
  strong,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className={muted ? "text-muted-foreground" : "text-foreground/80"}>{label}</dt>
      <dd className={`tabular-nums ${strong ? "font-semibold text-foreground" : "text-foreground"}`}>{value}</dd>
    </div>
  );
}

function IncomeDetail({
  row,
  isPreview,
  onOpenReceipt,
}: {
  row: HireIncomeItem;
  isPreview?: boolean;
  onOpenReceipt: (doc: HireWalletReceipt) => void;
}) {
  return (
    <>
      <DialogHeader className="px-4 pt-4">
        <DialogTitle className="text-base">{row.title}</DialogTitle>
        <DialogDescription>
          จาก {row.buyerName}
          {row.occurredAt ? ` · ${formatThaiDate(row.occurredAt)}` : ""}
          {isPreview ? " · รายการตัวอย่าง" : ""}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 p-4">
        <dl className="space-y-1 text-sm">
          <BreakdownRow label="ราคางาน" value={money(row.jobPriceSatang)} />
          <BreakdownRow
            label={`ค่าธรรมเนียมแพลตฟอร์ม ${row.platformFeePercent}%`}
            value={`−${money(row.platformFeeSatang)}`}
            muted
          />
          {row.whtSatang > 0 ? (
            <BreakdownRow label="หัก ณ ที่จ่าย 3%" value={`−${money(row.whtSatang)}`} muted />
          ) : null}
          <div className="border-t border-border/60 pt-1">
            <BreakdownRow label="สุทธิเข้ากระเป๋า" value={money(row.sellerNetSatang)} strong />
          </div>
        </dl>
        {row.receipts.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {row.receipts.map((doc) => (
              <Button
                key={`${row.id}-${doc.kind}-${doc.docNumber}`}
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-full text-[11px]"
                onClick={() => onOpenReceipt(doc)}
              >
                <FileText className="h-3.5 w-3.5" />
                {doc.kind === "platform_fee_receipt" ? "ใบเสร็จค่าธรรมเนียม" : "ใบเสร็จงาน"}
                <span className="tabular-nums text-muted-foreground">{doc.docNumber}</span>
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">ยังไม่มีใบเสร็จสำหรับรายการนี้</p>
        )}
      </div>
    </>
  );
}

function PayoutDetail({ row, isPreview }: { row: HirePayoutItem; isPreview?: boolean }) {
  return (
    <>
      <DialogHeader className="px-4 pt-4">
        <DialogTitle className="text-base">รายละเอียดการถอน</DialogTitle>
        <DialogDescription>
          {row.bankName}
          {row.accountLast4 ? ` · ****${row.accountLast4}` : ""}
          {isPreview ? " · รายการตัวอย่าง" : ""}
        </DialogDescription>
      </DialogHeader>
      <div className="p-4">
        <dl className="space-y-1 text-sm">
          <BreakdownRow label="จากยอดในกระเป๋า" value={money(row.amountSatang)} />
          <BreakdownRow
            label="ค่าธรรมเนียมโอน"
            value={row.feeSatang > 0 ? `−${money(row.feeSatang)}` : "ไม่มี"}
            muted
          />
          <div className="border-t border-border/60 pt-1">
            <BreakdownRow label="สุทธิเข้าบัญชี" value={money(row.transferSatang)} strong />
          </div>
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          ขอถอน {formatThaiDate(row.createdAt)}
          {row.completedAt ? ` · โอนแล้ว ${formatThaiDate(row.completedAt)}` : " · ยังไม่เข้าบัญชี — รอบโอนรายสัปดาห์ ไม่ใช่วันเดียวกัน"}
        </p>
      </div>
    </>
  );
}
