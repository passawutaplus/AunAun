import { useQuery } from "@tanstack/react-query";
import { Briefcase } from "lucide-react";
import { InlineLoader } from "@/components/ui/BanterLoader";
import { sharedDb } from "@/integrations/supabase/client";
import { formatThaiDate } from "@/lib/format";
import { satangToThb } from "@/lib/payments/fees";
import { formatMoneyLabel } from "@/lib/payments/fxDisplay";
import { labelHireOrderStatus } from "@/hooks/useHireOrderFlow";
import type { HireOrderStatus } from "@/lib/payments/types";
import { isBenignQueryError } from "@/lib/supabaseErrors";

type PlatformIncomeRow = {
  id: string;
  status: HireOrderStatus;
  seller_net_satang: number;
  job_price_satang: number;
  platform_fee_satang: number;
  approved_at: string | null;
  available_at: string | null;
  buyer_id: string;
  buyer_name?: string | null;
};

type Props = {
  userId: string | undefined;
};

/** Successful / released hire jobs — amount credited per order. */
export function EarningsPlatformIncomeHistory({ userId }: Props) {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["platform-hire-income", userId],
    enabled: !!userId,
    queryFn: async (): Promise<PlatformIncomeRow[]> => {
      if (!userId) return [];
      try {
        const { data, error } = await sharedDb
          .from("hire_orders")
          .select(
            "id, status, seller_net_satang, job_price_satang, platform_fee_satang, approved_at, available_at, buyer_id",
          )
          .eq("seller_id", userId)
          .in("status", ["available", "awaiting_approval", "in_progress", "paid_pending"])
          .limit(40);

        if (error) {
          if (isBenignQueryError(error)) return [];
          throw error;
        }

        const rows = (data ?? []) as Omit<PlatformIncomeRow, "buyer_name">[];
        const buyerIds = Array.from(new Set(rows.map((r) => r.buyer_id).filter(Boolean)));
        let nameById = new Map<string, string | null>();
        if (buyerIds.length) {
          const { data: buyers } = await sharedDb
            .from("profiles_public")
            .select("id, display_name, username")
            .in("id", buyerIds);
          nameById = new Map(
            (buyers ?? []).map((b) => [
              b.id as string,
              (b.display_name as string | null) || (b.username as string | null) || null,
            ]),
          );
        }

        return rows
          .map((r) => ({
            ...r,
            buyer_name: nameById.get(r.buyer_id) ?? null,
          }))
          .sort((a, b) => {
            const ta = Date.parse(a.available_at || a.approved_at || "") || 0;
            const tb = Date.parse(b.available_at || b.approved_at || "") || 0;
            return tb - ta;
          });
      } catch {
        return [];
      }
    },
  });

  return (
    <section className="rounded-2xl glass-panel p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Briefcase className="w-5 h-5 text-primary" />
        <h2 className="font-medium text-foreground">ประวัติรายได้จากแพลตฟอร์ม</h2>
        {items.length > 0 && (
          <span className="text-xs text-muted-foreground">({items.length})</span>
        )}
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        งานจ้างที่สำเร็จหรืออยู่ระหว่างรับเงิน — แสดงยอดสุทธิที่โอนเข้าต่อรายการ
      </p>

      {isLoading ? (
        <InlineLoader className="py-6" />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">ยังไม่มีรายได้จากงานจ้าง</p>
      ) : (
        <ul className="space-y-2">
          {items.map((row) => {
            const netThb = satangToThb(row.seller_net_satang || 0);
            const grossThb = satangToThb(row.job_price_satang || 0);
            const when = row.available_at || row.approved_at;
            const released = row.status === "available";

            return (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/60 bg-background/40"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium tabular-nums">
                    {formatMoneyLabel(netThb, "THB")}
                    <span className="text-xs text-muted-foreground font-normal ml-2">
                      จากงาน {formatMoneyLabel(grossThb, "THB")}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {row.buyer_name ? `จาก ${row.buyer_name}` : "งานจ้างบน Aplus1"}
                    {released ? " · โอนเข้าแล้ว" : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className={
                      released
                        ? "text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                    }
                  >
                    {labelHireOrderStatus(row.status)}
                  </span>
                  {when ? (
                    <p className="text-[10px] text-muted-foreground mt-1">{formatThaiDate(when)}</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
