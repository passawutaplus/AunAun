import { useMemo, useState } from "react";
import SectionHeader from "@/components/admin/SectionHeader";
import KpiCard from "@/components/admin/KpiCard";
import DataTable, { type Column } from "@/components/admin/DataTable";
import { SearchBar, useSearch } from "@/components/admin/SearchBar";
import AdminExportButton from "@/components/admin/AdminExportButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Banknote,
  Percent,
  RefreshCw,
  Wallet,
  Webhook,
} from "lucide-react";
import { satangToThb } from "@/lib/payments/fees";
import { formatMoneyLabel } from "@/lib/payments/fxDisplay";
import { formatThaiDate } from "@/lib/format";
import {
  useFinanceOverview,
  useFinanceHireOrders,
  useFinancePayments,
  useFinanceBalances,
  useFinanceLedger,
  useFinancePayouts,
  useFinanceRecipients,
  useFinanceRefunds,
  useFinanceDisputes,
  useFinanceProviderEvents,
  useFinanceConfig,
  useFinanceMutations,
  type HireOrderRow,
  type PaymentRow,
  type BalanceRow,
  type LedgerRow,
  type PayoutRow,
  type RecipientRow,
  type RefundRow,
  type DisputeRow,
  type ProviderEventRow,
} from "@/hooks/admin/useAdminFinance";
import { CompactLoader } from "@/components/ui/BanterLoader";

function thb(satang: number | null | undefined) {
  return formatMoneyLabel(satangToThb(satang ?? 0), "THB");
}

function shortId(id: string | null | undefined) {
  if (!id) return "—";
  return id.slice(0, 8);
}

export default function AdminFinancePage() {
  const overview = useFinanceOverview();
  const mutations = useFinanceMutations();
  const [tab, setTab] = useState("orders");
  const [orderStatus, setOrderStatus] = useState("");
  const [detailOrder, setDetailOrder] = useState<HireOrderRow | null>(null);
  const [feePercent, setFeePercent] = useState("");
  const [fxRate, setFxRate] = useState("");
  const [adjustUserId, setAdjustUserId] = useState("");
  const [adjustAmountThb, setAdjustAmountThb] = useState("");
  const [adjustNote, setAdjustNote] = useState("");

  const ordersQ = useFinanceHireOrders(orderStatus || undefined);
  const paymentsQ = useFinancePayments();
  const balancesQ = useFinanceBalances();
  const ledgerQ = useFinanceLedger(
    detailOrder ? { hireOrderId: detailOrder.id } : undefined,
  );
  const ledgerAllQ = useFinanceLedger();
  const payoutsQ = useFinancePayouts();
  const recipientsQ = useFinanceRecipients();
  const refundsQ = useFinanceRefunds();
  const disputesQ = useFinanceDisputes();
  const webhooksQ = useFinanceProviderEvents(true);
  const configQ = useFinanceConfig();

  const ov = overview.data;
  const schemaMissing = overview.isSuccess && overview.data === null;

  const orderSearch = useSearch(ordersQ.data ?? [], [
    "buyer_name",
    "seller_name",
    "status",
    "id",
  ]);
  const balanceSearch = useSearch(balancesQ.data ?? [], ["user_name", "user_id"]);
  const payoutSearch = useSearch(payoutsQ.data ?? [], ["user_name", "status", "id"]);
  const ledgerSearch = useSearch(ledgerAllQ.data ?? [], [
    "user_name",
    "entry_type",
    "note",
  ]);

  const orderCols: Column<HireOrderRow>[] = useMemo(
    () => [
      {
        key: "created",
        header: "สร้าง",
        render: (r) => (
          <span className="font-mono text-[11px]">{formatThaiDate(r.created_at)}</span>
        ),
      },
      {
        key: "parties",
        header: "ผู้ซื้อ / ผู้ขาย",
        render: (r) => (
          <div className="text-xs">
            <div>{r.buyer_name}</div>
            <div className="text-admin-muted">→ {r.seller_name}</div>
          </div>
        ),
      },
      {
        key: "status",
        header: "สถานะ",
        render: (r) => <Badge variant="outline">{r.status}</Badge>,
      },
      {
        key: "price",
        header: "ราคางาน",
        render: (r) => <span className="tabular-nums">{thb(r.job_price_satang)}</span>,
      },
      {
        key: "fee",
        header: "ค่าธรรมเนียม",
        render: (r) => (
          <span className="tabular-nums text-xs">
            {thb(r.platform_fee_satang)} ({r.platform_fee_percent}%)
          </span>
        ),
      },
      {
        key: "method",
        header: "วิธีจ่าย",
        render: (r) => r.payment_method ?? "—",
      },
      {
        key: "act",
        header: "",
        render: (r) => (
          <Button size="sm" variant="ghost" onClick={() => setDetailOrder(r)}>
            รายละเอียด
          </Button>
        ),
      },
    ],
    [],
  );

  const paymentCols: Column<PaymentRow>[] = [
    {
      key: "created",
      header: "เวลา",
      render: (r) => <span className="font-mono text-[11px]">{formatThaiDate(r.created_at)}</span>,
    },
    {
      key: "charge",
      header: "Charge",
      render: (r) => (
        <span className="font-mono text-[11px]">{r.provider_charge_id ?? shortId(r.id)}</span>
      ),
    },
    { key: "method", header: "วิธี", render: (r) => r.method },
    {
      key: "status",
      header: "สถานะ",
      render: (r) => <Badge variant="outline">{r.status}</Badge>,
    },
    {
      key: "amt",
      header: "ยอด",
      render: (r) => <span className="tabular-nums">{thb(r.amount_satang)}</span>,
    },
    {
      key: "order",
      header: "ออเดอร์",
      render: (r) => (
        <span className="font-mono text-[11px]">
          {shortId(r.hire_order_id)} · {r.order_status}
        </span>
      ),
    },
  ];

  const balanceCols: Column<BalanceRow>[] = [
    { key: "user", header: "ผู้ใช้", render: (r) => r.user_name },
    {
      key: "pending",
      header: "รอตรวจสอบ",
      render: (r) => <span className="tabular-nums">{thb(r.pending_satang)}</span>,
    },
    {
      key: "avail",
      header: "พร้อมถอน",
      render: (r) => <span className="tabular-nums">{thb(r.available_satang)}</span>,
    },
    {
      key: "reserved",
      header: "กำลังโอน",
      render: (r) => <span className="tabular-nums">{thb(r.payout_reserved_satang)}</span>,
    },
    {
      key: "out",
      header: "โอนแล้ว",
      render: (r) => <span className="tabular-nums">{thb(r.paid_out_satang)}</span>,
    },
    {
      key: "disp",
      header: "ข้อพิพาท",
      render: (r) => <span className="tabular-nums">{thb(r.disputed_satang)}</span>,
    },
  ];

  const ledgerCols: Column<LedgerRow>[] = [
    {
      key: "t",
      header: "เวลา",
      render: (r) => <span className="font-mono text-[11px]">{formatThaiDate(r.created_at)}</span>,
    },
    { key: "user", header: "ผู้ใช้", render: (r) => r.user_name },
    {
      key: "type",
      header: "ประเภท",
      render: (r) => <Badge variant="secondary">{r.entry_type}</Badge>,
    },
    {
      key: "amt",
      header: "ยอด",
      render: (r) => (
        <span className="tabular-nums">
          {r.direction < 0 ? "−" : "+"}
          {thb(r.amount_satang)}
        </span>
      ),
    },
    {
      key: "order",
      header: "ออเดอร์",
      render: (r) => <span className="font-mono text-[11px]">{shortId(r.hire_order_id)}</span>,
    },
    { key: "note", header: "หมายเหตุ", render: (r) => r.note ?? "—" },
  ];

  const payoutCols: Column<PayoutRow>[] = [
    {
      key: "t",
      header: "เวลา",
      render: (r) => <span className="font-mono text-[11px]">{formatThaiDate(r.created_at)}</span>,
    },
    { key: "user", header: "ผู้ใช้", render: (r) => r.user_name },
    {
      key: "status",
      header: "สถานะ",
      render: (r) => <Badge variant="outline">{r.status}</Badge>,
    },
    { key: "kind", header: "ชนิด", render: (r) => r.kind },
    {
      key: "amt",
      header: "โอน",
      render: (r) => <span className="tabular-nums">{thb(r.transfer_satang)}</span>,
    },
    {
      key: "fee",
      header: "ค่าธรรมเนียมถอน",
      render: (r) => <span className="tabular-nums">{thb(r.fee_satang)}</span>,
    },
    {
      key: "tid",
      header: "Transfer ID",
      render: (r) => (
        <span className="font-mono text-[11px]">{r.provider_transfer_id ?? "—"}</span>
      ),
    },
    {
      key: "act",
      header: "",
      render: (r) =>
        r.status === "failed" ? (
          <Button
            size="sm"
            variant="outline"
            disabled={mutations.retryPayout.isPending}
            onClick={() => mutations.retryPayout.mutate(r.id)}
          >
            รีทราย
          </Button>
        ) : null,
    },
  ];

  const recipientCols: Column<RecipientRow>[] = [
    { key: "user", header: "ผู้ใช้", render: (r) => r.user_name },
    { key: "bank", header: "ธนาคาร", render: (r) => r.bank_code ?? "—" },
    { key: "name", header: "ชื่อบัญชี", render: (r) => r.account_name ?? "—" },
    {
      key: "last4",
      header: "เลขท้าย",
      render: (r) => <span className="font-mono">****{r.account_last4 ?? "????"}</span>,
    },
    {
      key: "v",
      header: "ยืนยัน",
      render: (r) => (
        <Badge variant={r.verified ? "default" : "secondary"}>
          {r.verified ? "ผ่าน" : "รอตรวจ"}
        </Badge>
      ),
    },
    {
      key: "act",
      header: "",
      render: (r) => (
        <div className="flex gap-1">
          {!r.verified && (
            <Button
              size="sm"
              disabled={mutations.verifyRecipient.isPending}
              onClick={() => mutations.verifyRecipient.mutate(r.id)}
            >
              ยืนยัน
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            disabled={mutations.rejectRecipient.isPending}
            onClick={() => {
              const note = window.prompt("เหตุผล (ถ้ามี)") ?? "";
              mutations.rejectRecipient.mutate({ id: r.id, note });
            }}
          >
            ปฏิเสธ
          </Button>
        </div>
      ),
    },
  ];

  const refundCols: Column<RefundRow>[] = [
    {
      key: "t",
      header: "เวลา",
      render: (r) => <span className="font-mono text-[11px]">{formatThaiDate(r.created_at)}</span>,
    },
    {
      key: "order",
      header: "ออเดอร์",
      render: (r) => <span className="font-mono text-[11px]">{shortId(r.hire_order_id)}</span>,
    },
    {
      key: "amt",
      header: "ยอดคืน",
      render: (r) => <span className="tabular-nums">{thb(r.amount_satang)}</span>,
    },
    {
      key: "status",
      header: "สถานะ",
      render: (r) => <Badge variant="outline">{r.status}</Badge>,
    },
    { key: "terms", header: "เงื่อนไข", render: (r) => r.money_terms ?? "—" },
    {
      key: "rid",
      header: "Omise refund",
      render: (r) => (
        <span className="font-mono text-[11px]">{r.provider_refund_id ?? "—"}</span>
      ),
    },
  ];

  const disputeCols: Column<DisputeRow>[] = [
    {
      key: "t",
      header: "เปิด",
      render: (r) => <span className="font-mono text-[11px]">{formatThaiDate(r.created_at)}</span>,
    },
    {
      key: "order",
      header: "ออเดอร์",
      render: (r) => (
        <span className="font-mono text-[11px]">
          {shortId(r.hire_order_id)} · {r.order_status}
        </span>
      ),
    },
    {
      key: "status",
      header: "สถานะ",
      render: (r) => <Badge variant="outline">{r.status}</Badge>,
    },
    { key: "reason", header: "เหตุผล", render: (r) => r.reason ?? "—" },
    {
      key: "act",
      header: "",
      render: (r) =>
        r.status === "open" ? (
          <div className="flex flex-wrap gap-1">
            <Button
              size="sm"
              disabled={mutations.resolveDispute.isPending}
              onClick={() => {
                const resolution = window.prompt("บันทึกมติ / เหตุผลปิดเคส") ?? "resolved";
                mutations.resolveDispute.mutate({
                  id: r.id,
                  resolution,
                  releaseToAvailable: true,
                });
              }}
            >
              ปิด + ปล่อยยอด
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={mutations.resolveDispute.isPending}
              onClick={() => {
                const resolution = window.prompt("บันทึกมติ (ไม่ปล่อยยอด)") ?? "resolved_hold";
                mutations.resolveDispute.mutate({
                  id: r.id,
                  resolution,
                  releaseToAvailable: false,
                });
              }}
            >
              ปิดอย่างเดียว
            </Button>
          </div>
        ) : (
          <span className="text-xs text-admin-muted">{r.resolution ?? "—"}</span>
        ),
    },
  ];

  const webhookCols: Column<ProviderEventRow>[] = [
    {
      key: "t",
      header: "รับแล้ว",
      render: (r) => <span className="font-mono text-[11px]">{formatThaiDate(r.created_at)}</span>,
    },
    { key: "type", header: "ประเภท", render: (r) => r.event_type },
    {
      key: "eid",
      header: "Event ID",
      render: (r) => <span className="font-mono text-[11px]">{r.provider_event_id}</span>,
    },
    {
      key: "err",
      header: "ข้อผิดพลาด",
      render: (r) => (
        <span className="text-xs text-destructive max-w-[220px] truncate block">
          {r.process_error ?? (r.processed_at ? "—" : "ยังไม่ประมวลผล")}
        </span>
      ),
    },
    {
      key: "act",
      header: "",
      render: (r) => (
        <Button
          size="sm"
          variant="outline"
          disabled={mutations.reprocessEvent.isPending}
          onClick={() => mutations.reprocessEvent.mutate(r.id)}
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          Reprocess
        </Button>
      ),
    },
  ];

  const flags = (configQ.data?.flags ?? {}) as Record<string, boolean>;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="การเงิน Omise + Ledger"
        description="ตรวจสอบ hire money THB (แยกจากกระเป๋า PX) · ไม่เรียก Omise จากเบราว์เซอร์"
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void overview.refetch();
            }}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            รีเฟรช
          </Button>
        }
      />

      {!schemaMissing && overview.isLoading && <CompactLoader label="โหลดภาพรวมการเงิน…" />}

      {schemaMissing && (
        <div className="rounded-sm border border-dashed border-admin-border p-4 text-sm text-admin-muted">
          ยังไม่มี RPC / ตารางการเงิน — apply{" "}
          <code className="text-xs">scripts/ecosystem/aplus1-omise-payments.sql</code> แล้ว{" "}
          <code className="text-xs">scripts/ecosystem/aplus1-admin-finance.sql</code>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="รอตรวจสอบ (รวม)" value={thb(ov?.pending_satang_sum)} icon={Wallet} />
        <KpiCard label="พร้อมถอน (รวม)" value={thb(ov?.available_satang_sum)} icon={Banknote} accent />
        <KpiCard
          label="คิวโอน"
          value={ov?.payout_queued_count ?? "—"}
          icon={Banknote}
          delta={ov?.payout_failed_count ? `ล้มเหลว ${ov.payout_failed_count}` : undefined}
        />
        <KpiCard
          label="Webhook ค้าง"
          value={ov?.webhook_unprocessed_count ?? "—"}
          icon={AlertTriangle}
          accent={(ov?.webhook_unprocessed_count ?? 0) > 0}
        />
        <KpiCard label="ข้อพิพาทเปิด" value={ov?.open_disputes ?? "—"} icon={AlertTriangle} />
        <KpiCard label="จ่ายแล้ว 24 ชม." value={ov?.paid_orders_24h ?? "—"} icon={Wallet} />
        <KpiCard label="GMV 30 วัน" value={thb(ov?.gmv_paid_satang_30d)} icon={Banknote} />
        <KpiCard
          label="รายได้ fee 30 วัน"
          value={thb(ov?.platform_fee_satang_30d)}
          icon={Percent}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="orders">ออเดอร์ / ชำระ</TabsTrigger>
          <TabsTrigger value="ledger">ยอด / Ledger</TabsTrigger>
          <TabsTrigger value="payouts">ถอน / ผู้รับ</TabsTrigger>
          <TabsTrigger value="refunds">คืนเงิน / ข้อพิพาท</TabsTrigger>
          <TabsTrigger value="webhooks">
            Webhook
            {(ov?.webhook_unprocessed_count ?? 0) > 0 && (
              <Badge className="ml-1 h-5 px-1.5" variant="destructive">
                {ov?.webhook_unprocessed_count}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="config">ตั้งค่า</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4 mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <SearchBar
              value={orderSearch.q}
              onChange={orderSearch.setQ}
              placeholder="ค้นหาผู้ซื้อ/ผู้ขาย/สถานะ…"
            />
            <select
              className="h-9 rounded-sm border border-admin-border bg-admin-surface px-2 text-sm"
              value={orderStatus}
              onChange={(e) => setOrderStatus(e.target.value)}
            >
              <option value="">ทุกสถานะ</option>
              {[
                "awaiting_payment",
                "paid_pending",
                "awaiting_approval",
                "available",
                "refunded",
                "disputed",
                "cancelled",
              ].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <AdminExportButton
              filename="hire-orders.csv"
              rows={(orderSearch.filtered ?? []).map((r) => ({
                id: r.id,
                status: r.status,
                buyer: r.buyer_name,
                seller: r.seller_name,
                job_thb: satangToThb(r.job_price_satang),
                fee_thb: satangToThb(r.platform_fee_satang),
                created_at: r.created_at,
              }))}
            />
          </div>
          <DataTable
            columns={orderCols}
            rows={orderSearch.filtered}
            empty="ยังไม่มี hire order"
          />
          <h3 className="text-sm font-medium pt-2">Payments (Omise charges)</h3>
          <DataTable
            columns={paymentCols}
            rows={paymentsQ.data ?? []}
            empty="ยังไม่มี payment"
          />
        </TabsContent>

        <TabsContent value="ledger" className="space-y-4 mt-4">
          <SearchBar
            value={balanceSearch.q}
            onChange={balanceSearch.setQ}
            placeholder="ค้นหายอดตามชื่อ…"
          />
          <DataTable
            columns={balanceCols}
            rows={balanceSearch.filtered}
            empty="ยังไม่มี account balance"
          />
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-medium">Ledger entries</h3>
            <SearchBar
              value={ledgerSearch.q}
              onChange={ledgerSearch.setQ}
              placeholder="ค้นหา entry…"
            />
            <AdminExportButton
              filename="ledger.csv"
              rows={(ledgerSearch.filtered ?? []).map((r) => ({
                id: r.id,
                user: r.user_name,
                type: r.entry_type,
                amount_thb: satangToThb(r.amount_satang) * r.direction,
                note: r.note,
                created_at: r.created_at,
              }))}
            />
          </div>
          <DataTable
            columns={ledgerCols}
            rows={ledgerSearch.filtered}
            empty="ยังไม่มี ledger entry"
          />

          <section className="rounded-sm border border-admin-border p-4 space-y-2">
            <h3 className="text-sm font-medium">ปรับยอดด้วยมือ (มี audit)</h3>
            <p className="text-xs text-admin-muted">
              ห้ามแก้ยอดตรงใน DB — ใช้ manual_adjustment เท่านั้น · ไม่ auto-fix จาก reconcile
            </p>
            <div className="flex flex-wrap gap-2 items-end">
              <div>
                <label className="text-[10px] text-admin-muted">User ID</label>
                <Input
                  className="w-64"
                  value={adjustUserId}
                  onChange={(e) => setAdjustUserId(e.target.value)}
                  placeholder="uuid"
                />
              </div>
              <div>
                <label className="text-[10px] text-admin-muted">จำนวน THB</label>
                <Input
                  className="w-28"
                  value={adjustAmountThb}
                  onChange={(e) => setAdjustAmountThb(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] text-admin-muted">หมายเหตุ</label>
                <Input
                  className="w-48"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                />
              </div>
              <Button
                type="button"
                size="sm"
                disabled={mutations.manualAdjust.isPending}
                onClick={() => {
                  const thbAmt = Number(adjustAmountThb);
                  if (!adjustUserId || !Number.isFinite(thbAmt) || thbAmt <= 0) return;
                  mutations.manualAdjust.mutate({
                    userId: adjustUserId.trim(),
                    amountSatang: Math.round(thbAmt * 100),
                    direction: 1,
                    bucket: "available",
                    note: adjustNote,
                  });
                }}
              >
                เพิ่ม available
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={mutations.manualAdjust.isPending}
                onClick={() => {
                  const thbAmt = Number(adjustAmountThb);
                  if (!adjustUserId || !Number.isFinite(thbAmt) || thbAmt <= 0) return;
                  mutations.manualAdjust.mutate({
                    userId: adjustUserId.trim(),
                    amountSatang: Math.round(thbAmt * 100),
                    direction: -1,
                    bucket: "available",
                    note: adjustNote,
                  });
                }}
              >
                ลด available
              </Button>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="payouts" className="space-y-4 mt-4">
          <SearchBar
            value={payoutSearch.q}
            onChange={payoutSearch.setQ}
            placeholder="ค้นหาคำขอถอน…"
          />
          <DataTable
            columns={payoutCols}
            rows={payoutSearch.filtered}
            empty="ยังไม่มีคำขอถอน"
          />
          <h3 className="text-sm font-medium pt-2">บัญชีรับเงิน</h3>
          <DataTable
            columns={recipientCols}
            rows={recipientsQ.data ?? []}
            empty="ยังไม่มี recipient"
          />
        </TabsContent>

        <TabsContent value="refunds" className="space-y-4 mt-4">
          <h3 className="text-sm font-medium">Refunds</h3>
          <DataTable columns={refundCols} rows={refundsQ.data ?? []} empty="ยังไม่มี refund" />
          <h3 className="text-sm font-medium pt-2">Disputes</h3>
          <DataTable
            columns={disputeCols}
            rows={disputesQ.data ?? []}
            empty="ยังไม่มีข้อพิพาท"
          />
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4 mt-4">
          <p className="text-xs text-admin-muted flex items-center gap-2">
            <Webhook className="w-3.5 h-3.5" />
            แสดงเฉพาะ event ที่ยังไม่ประมวลผลหรือมี error — กระทบยอด Omise vs ledger ให้แจ้งทีม
            ห้าม auto-adjust
          </p>
          <DataTable
            columns={webhookCols}
            rows={webhooksQ.data ?? []}
            empty="ไม่มี webhook ค้าง"
          />
        </TabsContent>

        <TabsContent value="config" className="space-y-4 mt-4">
          <section className="rounded-sm border border-admin-border p-4 space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <Percent className="w-4 h-4" /> ค่าธรรมเนียมแพลตฟอร์ม
            </h3>
            <p className="text-xs text-admin-muted">
              ปัจจุบัน:{" "}
              {configQ.data?.fee
                ? `${configQ.data.fee.platform_fee_percent}% (${configQ.data.fee.version})`
                : "— (รอ migration)"}
            </p>
            <div className="flex flex-wrap gap-2 items-end">
              <div>
                <label className="text-[10px] text-admin-muted">เปอร์เซ็นต์ใหม่</label>
                <Input
                  className="w-28"
                  value={feePercent}
                  onChange={(e) => setFeePercent(e.target.value)}
                  placeholder={String(configQ.data?.fee?.platform_fee_percent ?? 10)}
                />
              </div>
              <Button
                type="button"
                size="sm"
                disabled={mutations.updateFee.isPending}
                onClick={() => {
                  const n = Number(feePercent);
                  if (!Number.isFinite(n)) return;
                  mutations.updateFee.mutate({ platformFeePercent: n });
                }}
              >
                บันทึก fee
              </Button>
            </div>
          </section>

          <section className="rounded-sm border border-admin-border p-4 space-y-3">
            <h3 className="font-medium">เรทแสดงผล USD / THB (ไม่ใช่ PX)</h3>
            <p className="text-xs text-admin-muted">
              ล่าสุด:{" "}
              {configQ.data?.fx_usd?.rate != null
                ? `${configQ.data.fx_usd.rate} (${configQ.data.fx_usd.source ?? "—"})`
                : "—"}
            </p>
            <div className="flex flex-wrap gap-2 items-end">
              <div>
                <label className="text-[10px] text-admin-muted">USD ต่อ 1 THB</label>
                <Input
                  className="w-36"
                  value={fxRate}
                  onChange={(e) => setFxRate(e.target.value)}
                  placeholder="0.028"
                />
              </div>
              <Button
                type="button"
                size="sm"
                disabled={mutations.upsertFx.isPending}
                onClick={() => {
                  const n = Number(fxRate);
                  if (!Number.isFinite(n) || n <= 0) return;
                  mutations.upsertFx.mutate({ rate: n });
                }}
              >
                บันทึกเรท
              </Button>
            </div>
          </section>

          <section className="rounded-sm border border-admin-border p-4 space-y-3">
            <h3 className="font-medium">Feature flags (DB)</h3>
            <p className="text-xs text-admin-muted">
              Live charge/transfer ยังถูกบล็อกที่ server จนกว่า{" "}
              <code className="text-[10px]">OMISE_MARKETPLACE_APPROVED=true</code> (env — อ่านอย่างเดียวจาก
              deploy)
            </p>
            <div className="grid sm:grid-cols-2 gap-2 text-sm">
              {(
                [
                  ["omise_payments_enabled", "เปิด Omise payments"],
                  ["omise_promptpay_enabled", "PromptPay"],
                  ["omise_card_enabled", "บัตร"],
                  ["manual_payout_enabled", "ถอนมือ"],
                  ["auto_payout_enabled", "ถอนอัตโนมัติรายสัปดาห์"],
                  ["end_of_month_sweep_enabled", "EOM sweep"],
                  ["live_marketplace_payments_enabled", "Live marketplace UI"],
                  ["display_currency_enabled", "สลับสกุลแสดงผล"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={Boolean(flags[key])}
                    onChange={(e) =>
                      mutations.updateFlags.mutate({ [key]: e.target.checked })
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </section>
        </TabsContent>
      </Tabs>

      <Dialog open={!!detailOrder} onOpenChange={(o) => !o && setDetailOrder(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>รายละเอียดออเดอร์</DialogTitle>
          </DialogHeader>
          {detailOrder && (
            <div className="space-y-3 text-sm">
              <p className="font-mono text-xs break-all">{detailOrder.id}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-admin-muted">ผู้ซื้อ</span>
                  <p>{detailOrder.buyer_name}</p>
                </div>
                <div>
                  <span className="text-admin-muted">ผู้ขาย</span>
                  <p>{detailOrder.seller_name}</p>
                </div>
                <div>
                  <span className="text-admin-muted">สถานะ</span>
                  <p>{detailOrder.status}</p>
                </div>
                <div>
                  <span className="text-admin-muted">วิธีจ่าย</span>
                  <p>{detailOrder.payment_method ?? "—"}</p>
                </div>
                <div>
                  <span className="text-admin-muted">ราคางาน</span>
                  <p className="tabular-nums">{thb(detailOrder.job_price_satang)}</p>
                </div>
                <div>
                  <span className="text-admin-muted">สุทธิผู้ขาย</span>
                  <p className="tabular-nums">{thb(detailOrder.seller_net_satang)}</p>
                </div>
                <div>
                  <span className="text-admin-muted">ค่าธรรมเนียม</span>
                  <p className="tabular-nums">{thb(detailOrder.platform_fee_satang)}</p>
                </div>
                <div>
                  <span className="text-admin-muted">จ่ายแล้ว</span>
                  <p>{detailOrder.paid_at ? formatThaiDate(detailOrder.paid_at) : "—"}</p>
                </div>
              </div>
              <h4 className="font-medium text-xs pt-2">Ledger ของออเดอร์นี้</h4>
              <DataTable
                columns={ledgerCols}
                rows={ledgerQ.data ?? []}
                empty="ยังไม่มี entry สำหรับออเดอร์นี้"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
