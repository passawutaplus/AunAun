import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import SectionHeader from "@/components/admin/SectionHeader";
import DataTable, { Column } from "@/components/admin/DataTable";
import StatusPill from "@/components/admin/StatusPill";
import KpiCard from "@/components/admin/KpiCard";
import AdminExportButton from "@/components/admin/AdminExportButton";
import { SearchBar, useSearch } from "@/components/admin/SearchBar";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRejectCashout } from "@/hooks/admin/useAdminMutations";
import { Wallet, ArrowDownLeft, ArrowUpRight, Gift } from "lucide-react";
import { formatThaiDate } from "@/lib/format";
import { notifyAnthem } from "@/lib/notifyAnthem";

interface LedgerRow {
  id: string;
  created_at: string;
  entry_type: string;
  user_id: string;
  user_name: string | null;
  amount_px: number;
  direction: string;
  status: string;
  note: string | null;
}

export default function AdminWalletPage() {
  const qc = useQueryClient();
  const rejectCashout = useAdminRejectCashout();

  const overview = useQuery({
    queryKey: ["admin-gift-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_gift_overview");
      if (error) throw error;
      return data as {
        gift_volume_px: number;
        topup_total_px: number;
        cashout_pending: number;
        cashout_net_total_px: number;
      };
    },
  });

  const ledger = useQuery({
    queryKey: ["admin-wallet-ledger"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_wallet_ledger", { _limit: 300 });
      if (error) throw error;
      return (data ?? []) as LedgerRow[];
    },
  });

  const wallets = useQuery({
    queryKey: ["admin-wallets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallets")
        .select("user_id, purchased_px, earned_px, balance_px, lifetime_earned_px, lifetime_spent_px, updated_at")
        .order("balance_px", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("admin_mark_cashout_paid", { _id: id });
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      notifyAnthem({ event: "cashout", request_id: id, status: "paid" });
      toast.success("ทำเครื่องหมายว่าจ่ายแล้ว");
      qc.invalidateQueries({ queryKey: ["admin-wallet-ledger"] });
      qc.invalidateQueries({ queryKey: ["admin-gift-overview"] });
      qc.invalidateQueries({ queryKey: ["admin-alert-counts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { q, setQ, filtered } = useSearch(ledger.data, ["entry_type", "user_name", "status", "note"]);
  const pendingCashouts = useMemo(
    () => (ledger.data ?? []).filter((r) => r.entry_type === "cashout" && r.status === "pending"),
    [ledger.data],
  );

  const cols: Column<LedgerRow>[] = [
    { key: "type", header: "ประเภท", render: (r) => <StatusPill status={r.entry_type} tone="muted" /> },
    {
      key: "user",
      header: "ผู้ใช้",
      render: (r) => (
        <Link to={`/u/${r.user_id}`} className="text-sm hover:text-admin-accent">
          {r.user_name || r.user_id.slice(0, 8) + "…"}
        </Link>
      ),
    },
    {
      key: "amount",
      header: "จำนวน",
      render: (r) => (
        <span className={`font-mono tabular-nums ${r.direction === "in" ? "text-green-600" : "text-admin-fg"}`}>
          {r.direction === "in" ? "+" : "−"}{r.amount_px.toLocaleString()} PX
        </span>
      ),
    },
    { key: "status", header: "สถานะ", render: (r) => <StatusPill status={r.status} tone={r.status === "pending" ? "accent" : "muted"} /> },
    { key: "note", header: "หมายเหตุ", render: (r) => <span className="text-xs text-admin-muted truncate max-w-[200px] block">{r.note || "—"}</span> },
    { key: "at", header: "เมื่อ", render: (r) => <span className="font-mono text-xs">{formatThaiDate(r.created_at)}</span> },
    {
      key: "act",
      header: "",
      render: (r) =>
        r.entry_type === "cashout" && r.status === "pending" ? (
          <div className="flex gap-1">
            <button
              type="button"
              className="text-xs text-admin-accent hover:underline"
              onClick={() => markPaid.mutate(r.id)}
            >
              จ่ายแล้ว
            </button>
            <button
              type="button"
              className="text-xs text-destructive hover:underline"
              onClick={() =>
                rejectCashout.mutate(
                  { id: r.id },
                  { onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-wallet-ledger"] }) },
                )
              }
            >
              ปฏิเสธ
            </button>
          </div>
        ) : null,
    },
  ];

  const ov = overview.data;

  return (
    <div>
      <SectionHeader
        eyebrow="wallet / ledger"
        title="กระเป๋าเงิน & Ledger"
        description="ติดตามเงินเข้า-ออกทั้งระบบ"
        actions={
          <AdminExportButton rows={(filtered ?? []) as unknown as Record<string, unknown>[]} filename="wallet-ledger.csv" />
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Gift volume" value={ov?.gift_volume_px?.toLocaleString() ?? "—"} icon={Gift} />
        <KpiCard label="Top-ups" value={ov?.topup_total_px?.toLocaleString() ?? "—"} icon={ArrowDownLeft} accent />
        <KpiCard label="Cashout pending" value={ov?.cashout_pending ?? pendingCashouts.length} icon={Wallet} accent />
        <KpiCard label="Cashout paid (net)" value={ov?.cashout_net_total_px?.toLocaleString() ?? "—"} icon={ArrowUpRight} />
      </div>

      {pendingCashouts.length > 0 && (
        <div className="mb-4 border border-admin-accent/30 bg-admin-accent/5 rounded-sm px-4 py-3 text-sm text-admin-fg">
          มีคำขอถอนเงินรอดำเนินการ <strong>{pendingCashouts.length}</strong> รายการ
        </div>
      )}

      <SectionHeader eyebrow="ledger" title="ธุรกรรมล่าสุด" actions={<SearchBar value={q} onChange={setQ} placeholder="ค้นหา ledger" />} />
      <DataTable columns={cols} rows={filtered} loading={ledger.isLoading} rowKey={(r) => `${r.entry_type}-${r.id}`} empty="ยังไม่มีธุรกรรม" />

      <div className="mt-8">
        <SectionHeader eyebrow="balances" title="ยอดคงเหลือสูงสุด (Top 100)" />
        <DataTable
          columns={[
            { key: "user", header: "User", render: (r: (typeof wallets.data)[0]) => (
              <Link to={`/u/${r.user_id}`} className="font-mono text-xs text-admin-accent">{r.user_id.slice(0, 8)}…</Link>
            )},
            { key: "bal", header: "Balance", render: (r) => <span className="font-mono">{r.balance_px?.toLocaleString()} PX</span> },
            { key: "earned", header: "Earned", render: (r) => <span className="font-mono text-xs">{r.earned_px?.toLocaleString()}</span> },
            { key: "purchased", header: "Purchased", render: (r) => <span className="font-mono text-xs">{r.purchased_px?.toLocaleString()}</span> },
          ]}
          rows={wallets.data}
          loading={wallets.isLoading}
          rowKey={(r) => r.user_id}
          empty="ยังไม่มีกระเป๋า"
        />
      </div>
    </div>
  );
}
