import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { isDemoMode } from "@/lib/demoMode";
import { isAplus1PaymentsEnabled } from "@/lib/aplus1Launch";
import type { BusinessDocument } from "@/lib/documents/documentPayload";
import { sharedDb } from "@/integrations/supabase/client";
import { isBenignQueryError } from "@/lib/supabaseErrors";
import {
  applyPreviewWithdraw,
  HIRE_WALLET_PREVIEW_STORAGE_KEY,
  parseHireWalletPreview,
  seedHireWalletPreview,
  shouldUseHireWalletPreview,
  type HireIncomeItem,
  type HirePayoutItem,
  type HireWalletReceipt,
  type HireWalletView,
} from "@/lib/payments/hireWallet";
import type { HireOrderStatus } from "@/lib/payments/types";

type HireOrderRow = {
  id: string;
  status: HireOrderStatus;
  seller_net_satang: number;
  job_price_satang: number;
  platform_fee_satang: number;
  platform_fee_percent?: number;
  wht_satang?: number;
  approved_at: string | null;
  available_at: string | null;
  buyer_id: string;
};

type HireDocRow = {
  hire_order_id: string;
  kind: "receipt" | "platform_fee_receipt";
  doc_number: string;
  snapshot: BusinessDocument | null;
};

function loadPreviewFromSession(): HireWalletView {
  if (typeof sessionStorage === "undefined") return seedHireWalletPreview();
  return parseHireWalletPreview(sessionStorage.getItem(HIRE_WALLET_PREVIEW_STORAGE_KEY)) ?? seedHireWalletPreview();
}

function persistPreview(view: HireWalletView) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(HIRE_WALLET_PREVIEW_STORAGE_KEY, JSON.stringify(view));
}

function walletBucketForStatus(status: HireOrderStatus): HireIncomeItem["walletBucket"] {
  if (status === "available") return "available";
  return "pending";
}

export function useHireWallet(
  userId: string | undefined,
  opts?: { forcePreview?: boolean },
) {
  const forcePreview = opts?.forcePreview === true;
  const [preview, setPreview] = useState<HireWalletView>(loadPreviewFromSession);

  const realQuery = useQuery({
    queryKey: ["hire-wallet", userId],
    enabled: !!userId && !forcePreview,
    queryFn: async (): Promise<Pick<HireWalletView, "income" | "payouts">> => {
      if (!userId) return { income: [], payouts: [] };
      try {
        const { data, error } = await sharedDb
          .from("hire_orders" as never)
          .select(
            "id, status, seller_net_satang, job_price_satang, platform_fee_satang, platform_fee_percent, wht_satang, approved_at, available_at, buyer_id",
          )
          .eq("seller_id", userId)
          .in("status", ["available", "awaiting_approval", "in_progress", "paid_pending"])
          .limit(40);

        if (error) {
          if (isBenignQueryError(error)) return { income: [], payouts: [] };
          throw error;
        }

        const rows = (data ?? []) as unknown as HireOrderRow[];
        const buyerIds = Array.from(new Set(rows.map((r) => r.buyer_id).filter(Boolean)));
        let nameById = new Map<string, string | null>();
        if (buyerIds.length) {
          const { data: buyers } = await sharedDb
            .from("profiles_public" as never)
            .select("id, display_name, username")
            .in("id", buyerIds);
          nameById = new Map(
            ((buyers as unknown as { id: string; display_name: string | null; username: string | null }[]) ?? []).map(
              (b) => [b.id, b.display_name || b.username || null],
            ),
          );
        }

        const orderIds = rows.map((r) => r.id);
        let docsByOrder = new Map<string, HireWalletReceipt[]>();
        if (orderIds.length) {
          const { data: docs, error: docsErr } = await sharedDb
            .from("hire_documents" as never)
            .select("hire_order_id, kind, doc_number, snapshot")
            .in("hire_order_id", orderIds)
            .in("kind", ["receipt", "platform_fee_receipt"]);
          if (!docsErr && docs) {
            docsByOrder = new Map();
            for (const doc of docs as HireDocRow[]) {
              if (doc.kind !== "receipt" && doc.kind !== "platform_fee_receipt") continue;
              if (!doc.snapshot) continue;
              const list = docsByOrder.get(doc.hire_order_id) ?? [];
              list.push({
                kind: doc.kind,
                docNumber: doc.doc_number,
                snapshot: doc.snapshot,
              });
              docsByOrder.set(doc.hire_order_id, list);
            }
          }
        }

        const income: HireIncomeItem[] = rows
          .map((r) => ({
            id: r.id,
            title: "งานจ้างบน Aplus1",
            buyerName: nameById.get(r.buyer_id) || "ผู้จ้าง",
            status: r.status,
            jobPriceSatang: r.job_price_satang || 0,
            platformFeeSatang: r.platform_fee_satang || 0,
            platformFeePercent: r.platform_fee_percent || 10,
            whtSatang: r.wht_satang || 0,
            sellerNetSatang: r.seller_net_satang || 0,
            occurredAt: r.available_at || r.approved_at,
            walletBucket: walletBucketForStatus(r.status),
            isPreview: false,
            receipts: docsByOrder.get(r.id) ?? [],
          }))
          .sort((a, b) => {
            const ta = Date.parse(a.occurredAt || "") || 0;
            const tb = Date.parse(b.occurredAt || "") || 0;
            return tb - ta;
          });

        return { income, payouts: [] as HirePayoutItem[] };
      } catch {
        return { income: [], payouts: [] };
      }
    },
  });

  const hasRealIncome = (realQuery.data?.income.length ?? 0) > 0;
  const usePreview =
    forcePreview ||
    (!realQuery.isLoading &&
      shouldUseHireWalletPreview({
        hasRealIncome,
        forcePreview: false,
        allowEmptyPreview:
          isDemoMode() || import.meta.env.DEV || !isAplus1PaymentsEnabled(),
      }));

  const realView = useMemo<HireWalletView>(() => {
    const income = realQuery.data?.income ?? [];
    const payouts = realQuery.data?.payouts ?? [];
    return {
      pendingSatang: income
        .filter((i) => i.walletBucket === "pending")
        .reduce((s, i) => s + i.sellerNetSatang, 0),
      availableSatang: income
        .filter((i) => i.walletBucket === "available")
        .reduce((s, i) => s + i.sellerNetSatang, 0),
      payoutReservedSatang: income
        .filter((i) => i.walletBucket === "transferring")
        .reduce((s, i) => s + i.sellerNetSatang, 0),
      paidOutSatang: income
        .filter((i) => i.walletBucket === "paid_out")
        .reduce((s, i) => s + i.sellerNetSatang, 0),
      income,
      payouts,
      isPreview: false,
      freeWithdrawalsUsedThisMonth: 0,
      bankName: "",
      accountLast4: "",
      accountName: "",
    };
  }, [realQuery.data]);

  const view = usePreview ? preview : realView;

  const requestPreviewWithdraw = useCallback((amountSatang: number) => {
    const result = applyPreviewWithdraw(preview, amountSatang);
    if (!result.ok) return result;
    setPreview(result.next);
    persistPreview(result.next);
    return result;
  }, [preview]);

  const resetPreview = useCallback(() => {
    const seeded = seedHireWalletPreview();
    setPreview(seeded);
    persistPreview(seeded);
  }, []);

  return {
    view,
    isLoading: !usePreview && realQuery.isLoading,
    isPreview: usePreview,
    requestPreviewWithdraw,
    resetPreview,
  };
}
