import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type FinanceOverview = {
  pending_satang_sum: number;
  available_satang_sum: number;
  payout_reserved_satang_sum: number;
  paid_out_satang_sum: number;
  disputed_satang_sum: number;
  payout_queued_count: number;
  payout_failed_count: number;
  webhook_unprocessed_count: number;
  open_disputes: number;
  refunds_pending: number;
  paid_orders_24h: number;
  platform_fee_satang_30d: number;
  gmv_paid_satang_30d: number;
  recipients_unverified: number;
};

export type HireOrderRow = {
  id: string;
  hiring_request_id: string | null;
  buyer_id: string;
  seller_id: string;
  buyer_name: string;
  seller_name: string;
  status: string;
  job_price_satang: number;
  buyer_pays_satang: number;
  seller_net_satang: number;
  platform_fee_satang: number;
  platform_fee_percent: number;
  payment_method: string | null;
  paid_at: string | null;
  approved_at: string | null;
  available_at: string | null;
  created_at: string;
};

export type PaymentRow = {
  id: string;
  hire_order_id: string;
  provider: string;
  provider_charge_id: string | null;
  method: string;
  status: string;
  amount_satang: number;
  paid_at: string | null;
  failed_at: string | null;
  created_at: string;
  order_status: string;
  buyer_id: string;
  seller_id: string;
};

export type BalanceRow = {
  user_id: string;
  user_name: string;
  pending_satang: number;
  available_satang: number;
  payout_reserved_satang: number;
  paid_out_satang: number;
  disputed_satang: number;
  updated_at: string;
};

export type LedgerRow = {
  id: string;
  user_id: string;
  user_name: string;
  hire_order_id: string | null;
  payment_id: string | null;
  payout_request_id: string | null;
  entry_type: string;
  amount_satang: number;
  direction: number;
  note: string | null;
  created_at: string;
};

export type PayoutRow = {
  id: string;
  user_id: string;
  user_name: string;
  recipient_id: string | null;
  status: string;
  kind: string;
  amount_satang: number;
  fee_satang: number;
  transfer_satang: number;
  provider_transfer_id: string | null;
  failure_reason: string | null;
  created_at: string;
  completed_at: string | null;
};

export type RecipientRow = {
  id: string;
  user_id: string;
  user_name: string;
  provider: string;
  provider_recipient_id: string | null;
  bank_code: string | null;
  account_name: string | null;
  account_last4: string | null;
  verified: boolean;
  verified_at: string | null;
  created_at: string;
};

export type RefundRow = {
  id: string;
  hire_order_id: string;
  payment_id: string | null;
  cancel_request_id: string | null;
  amount_satang: number;
  status: string;
  provider_refund_id: string | null;
  money_terms: string | null;
  created_at: string;
};

export type DisputeRow = {
  id: string;
  hire_order_id: string;
  status: string;
  reason: string | null;
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
  order_status: string;
  seller_id: string;
  buyer_id: string;
};

export type ProviderEventRow = {
  id: string;
  provider: string;
  provider_event_id: string;
  event_type: string;
  processed_at: string | null;
  process_error: string | null;
  created_at: string;
};

export type PaymentConfig = {
  flags: Record<string, unknown> | null;
  fee: {
    id: string;
    version: string;
    platform_fee_percent: number;
    card_fee_passed_to_buyer: boolean;
    card_surcharge_percent: number;
  } | null;
  fx_usd: { rate: number | null; as_of: string | null; source: string | null };
};

async function rpcOrEmpty<T>(name: string, args?: Record<string, unknown>): Promise<T[]> {
  const { data, error } = await supabase.rpc(name as never, args as never);
  if (error) {
    // Tables/RPCs may not be applied yet — surface empty rather than crash the page.
    if (
      error.message?.includes("does not exist") ||
      error.code === "PGRST202" ||
      error.code === "42883"
    ) {
      return [];
    }
    throw error;
  }
  return (data ?? []) as T[];
}

export function useFinanceOverview() {
  return useQuery({
    queryKey: ["admin-finance-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_finance_overview" as never);
      if (error) {
        if (error.message?.includes("does not exist") || error.code === "PGRST202") {
          return null;
        }
        throw error;
      }
      return data as FinanceOverview;
    },
    refetchInterval: 30_000,
  });
}

export function useFinanceHireOrders(status?: string) {
  return useQuery({
    queryKey: ["admin-finance-orders", status ?? "all"],
    queryFn: () =>
      rpcOrEmpty<HireOrderRow>("admin_list_hire_orders", {
        _status: status || null,
        _limit: 200,
      }),
  });
}

export function useFinancePayments(status?: string) {
  return useQuery({
    queryKey: ["admin-finance-payments", status ?? "all"],
    queryFn: () =>
      rpcOrEmpty<PaymentRow>("admin_list_payments", {
        _status: status || null,
        _limit: 200,
      }),
  });
}

export function useFinanceBalances() {
  return useQuery({
    queryKey: ["admin-finance-balances"],
    queryFn: () => rpcOrEmpty<BalanceRow>("admin_list_account_balances", { _limit: 200 }),
  });
}

export function useFinanceLedger(opts?: { userId?: string; hireOrderId?: string }) {
  return useQuery({
    queryKey: ["admin-finance-ledger", opts?.userId ?? "", opts?.hireOrderId ?? ""],
    queryFn: () =>
      rpcOrEmpty<LedgerRow>("admin_finance_ledger", {
        _user_id: opts?.userId || null,
        _hire_order_id: opts?.hireOrderId || null,
        _limit: 300,
      }),
  });
}

export function useFinancePayouts(status?: string) {
  return useQuery({
    queryKey: ["admin-finance-payouts", status ?? "all"],
    queryFn: () =>
      rpcOrEmpty<PayoutRow>("admin_list_payout_requests", {
        _status: status || null,
        _limit: 200,
      }),
  });
}

export function useFinanceRecipients(verified?: boolean | null) {
  return useQuery({
    queryKey: ["admin-finance-recipients", verified === undefined ? "all" : String(verified)],
    queryFn: () =>
      rpcOrEmpty<RecipientRow>("admin_list_recipients", {
        _verified: verified ?? null,
        _limit: 200,
      }),
  });
}

export function useFinanceRefunds() {
  return useQuery({
    queryKey: ["admin-finance-refunds"],
    queryFn: () => rpcOrEmpty<RefundRow>("admin_list_refunds", { _limit: 200 }),
  });
}

export function useFinanceDisputes() {
  return useQuery({
    queryKey: ["admin-finance-disputes"],
    queryFn: () => rpcOrEmpty<DisputeRow>("admin_list_disputes", { _limit: 200 }),
  });
}

export function useFinanceProviderEvents(unprocessedOnly = false) {
  return useQuery({
    queryKey: ["admin-finance-webhooks", unprocessedOnly],
    queryFn: () =>
      rpcOrEmpty<ProviderEventRow>("admin_list_provider_events", {
        _unprocessed_only: unprocessedOnly,
        _limit: 200,
      }),
  });
}

export function useFinanceConfig() {
  return useQuery({
    queryKey: ["admin-finance-config"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_get_payment_config" as never);
      if (error) {
        if (error.message?.includes("does not exist") || error.code === "PGRST202") {
          return null;
        }
        throw error;
      }
      return data as PaymentConfig;
    },
  });
}

function invalidateFinance(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["admin-finance-overview"] });
  void qc.invalidateQueries({ queryKey: ["admin-finance-orders"] });
  void qc.invalidateQueries({ queryKey: ["admin-finance-payments"] });
  void qc.invalidateQueries({ queryKey: ["admin-finance-balances"] });
  void qc.invalidateQueries({ queryKey: ["admin-finance-ledger"] });
  void qc.invalidateQueries({ queryKey: ["admin-finance-payouts"] });
  void qc.invalidateQueries({ queryKey: ["admin-finance-recipients"] });
  void qc.invalidateQueries({ queryKey: ["admin-finance-refunds"] });
  void qc.invalidateQueries({ queryKey: ["admin-finance-disputes"] });
  void qc.invalidateQueries({ queryKey: ["admin-finance-webhooks"] });
  void qc.invalidateQueries({ queryKey: ["admin-finance-config"] });
  void qc.invalidateQueries({ queryKey: ["admin-alert-counts"] });
}

export function useFinanceMutations() {
  const qc = useQueryClient();

  const onErr = (e: Error) => toast.error(e.message || "ดำเนินการไม่สำเร็จ");

  return {
    updateFee: useMutation({
      mutationFn: async (input: {
        platformFeePercent: number;
        cardSurchargePercent?: number;
        cardFeePassedToBuyer?: boolean;
      }) => {
        const { error } = await supabase.rpc("admin_update_fee_config" as never, {
          _platform_fee_percent: input.platformFeePercent,
          _card_surcharge_percent: input.cardSurchargePercent ?? 0,
          _card_fee_passed_to_buyer: input.cardFeePassedToBuyer ?? true,
          _version: null,
        } as never);
        if (error) throw error;
      },
      onSuccess: () => {
        toast.success("บันทึกค่าธรรมเนียมแล้ว (มีผลออเดอร์ใหม่)");
        invalidateFinance(qc);
      },
      onError: onErr,
    }),
    upsertFx: useMutation({
      mutationFn: async (input: { rate: number; source?: string }) => {
        const { error } = await supabase.rpc("admin_upsert_fx_rate" as never, {
          _quote_currency: "USD",
          _rate: input.rate,
          _source: input.source ?? "admin",
        } as never);
        if (error) throw error;
      },
      onSuccess: () => {
        toast.success("บันทึกเรท USD แล้ว");
        invalidateFinance(qc);
      },
      onError: onErr,
    }),
    updateFlags: useMutation({
      mutationFn: async (patch: Record<string, boolean>) => {
        const { error } = await supabase.rpc("admin_update_payment_flags" as never, {
          _patch: patch,
        } as never);
        if (error) throw error;
      },
      onSuccess: () => {
        toast.success("อัปเดตฟlag แล้ว");
        invalidateFinance(qc);
      },
      onError: onErr,
    }),
    verifyRecipient: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.rpc("admin_verify_recipient" as never, { _id: id } as never);
        if (error) throw error;
      },
      onSuccess: () => {
        toast.success("ยืนยันบัญชีรับเงินแล้ว");
        invalidateFinance(qc);
      },
      onError: onErr,
    }),
    rejectRecipient: useMutation({
      mutationFn: async (input: { id: string; note?: string }) => {
        const { error } = await supabase.rpc("admin_reject_recipient" as never, {
          _id: input.id,
          _note: input.note ?? "",
        } as never);
        if (error) throw error;
      },
      onSuccess: () => {
        toast.success("ปฏิเสธบัญชีรับเงินแล้ว");
        invalidateFinance(qc);
      },
      onError: onErr,
    }),
    resolveDispute: useMutation({
      mutationFn: async (input: {
        id: string;
        resolution: string;
        releaseToAvailable: boolean;
      }) => {
        const { error } = await supabase.rpc("admin_resolve_dispute" as never, {
          _id: input.id,
          _resolution: input.resolution,
          _release_to_available: input.releaseToAvailable,
        } as never);
        if (error) throw error;
      },
      onSuccess: () => {
        toast.success("ปิดข้อพิพาทแล้ว");
        invalidateFinance(qc);
      },
      onError: onErr,
    }),
    manualAdjust: useMutation({
      mutationFn: async (input: {
        userId: string;
        amountSatang: number;
        direction: 1 | -1;
        bucket: "pending" | "available" | "disputed";
        note?: string;
      }) => {
        const { error } = await supabase.rpc("admin_manual_ledger_adjustment" as never, {
          _user_id: input.userId,
          _amount_satang: input.amountSatang,
          _direction: input.direction,
          _bucket: input.bucket,
          _note: input.note ?? "",
        } as never);
        if (error) throw error;
      },
      onSuccess: () => {
        toast.success("บันทึกการปรับยอด (audit) แล้ว");
        invalidateFinance(qc);
      },
      onError: onErr,
    }),
    reprocessEvent: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.rpc("admin_mark_provider_event_reprocess" as never, {
          _id: id,
        } as never);
        if (error) throw error;
      },
      onSuccess: () => {
        toast.success("ตั้งคิว reprocess webhook แล้ว");
        invalidateFinance(qc);
      },
      onError: onErr,
    }),
    retryPayout: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.rpc("admin_retry_failed_payout" as never, {
          _id: id,
        } as never);
        if (error) throw error;
      },
      onSuccess: () => {
        toast.success("สร้างคิวถอนใหม่แล้ว");
        invalidateFinance(qc);
      },
      onError: onErr,
    }),
  };
}
