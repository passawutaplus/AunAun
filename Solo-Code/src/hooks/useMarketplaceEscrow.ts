import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";

const escrowRpc = (fn: string, args?: Record<string, unknown>) =>
  (
    supabase as unknown as {
      rpc: (
        fn: string,
        args?: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: Error | null }>;
    }
  ).rpc(fn, args);

export type MarketplaceEscrow = {
  id: string;
  freelancer_user_id: string;
  hiring_request_id: string | null;
  quotation_id: string | null;
  client_name: string;
  client_email: string;
  title: string;
  amount_thb: number;
  platform_fee_pct: number;
  platform_fee_thb: number;
  net_payout_thb: number;
  portal_token: string;
  status: string;
  funded_at: string | null;
  approved_at: string | null;
  released_at: string | null;
  disputed_at: string | null;
  dispute_reason: string | null;
  created_at: string;
};

const PAY_ORIGIN =
  typeof window !== "undefined" ? window.location.origin : "https://solofreelancer.com";

export function escrowPayUrl(portalToken: string) {
  return `${PAY_ORIGIN}/pay/${portalToken}`;
}

export const useMyEscrows = () =>
  useQuery({
    queryKey: ["my-escrows"],
    queryFn: async () => {
      const { data, error } = await escrowRpc("list_my_escrows");
      if (error) throw error;
      return (data ?? []) as MarketplaceEscrow[];
    },
  });

export const useCreateEscrowFromQuotation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { quotationId: string; amountThb: number }) => {
      const { data, error } = await escrowRpc("create_escrow_from_quotation", {
        _quotation_id: vars.quotationId,
        _amount_thb: vars.amountThb,
      });
      if (error) throw error;
      return data as MarketplaceEscrow;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["my-escrows"] });
      const url = escrowPayUrl(row.portal_token);
      void navigator.clipboard?.writeText(url);
      toast.success("สร้างลิงก์ Escrow แล้ว — คัดลอกลิงก์ให้ลูกค้าแล้ว", {
        description: url,
      });
    },
    onError: (e: Error) => {
      if (e.message.includes("CONNECT_REQUIRED")) {
        toast.error("เชื่อม Stripe Connect ก่อนรับเงิน Escrow (Settings → รับชำระออนไลน์)");
      } else {
        toast.error(e.message);
      }
    },
  });
};

export async function releaseEscrowViaApi(escrowId: string): Promise<string> {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) throw new Error("กรุณาเข้าสู่ระบบ");

  const res = await fetch(`${PAY_ORIGIN}/api/payments/escrow/release`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ escrowId, environment: getStripeEnvironment() }),
  });
  const json = (await res.json()) as { transferId?: string; error?: string };
  if (!res.ok || json.error || !json.transferId) {
    throw new Error(json.error ?? "ปล่อยเงินล้มเหลว");
  }
  return json.transferId;
}

export const useAdminEscrows = () =>
  useQuery({
    queryKey: ["admin-escrows"],
    queryFn: async () => {
      const { data, error } = await escrowRpc("admin_list_escrows", { _limit: 100 });
      if (error) throw error;
      return (data ?? []) as MarketplaceEscrow[];
    },
  });

export const useAdminDisputeEscrow = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; action: "release" | "refund" | "reopen"; note?: string }) => {
      const { data, error } = await escrowRpc("admin_dispute_escrow", {
        _escrow_id: vars.id,
        _action: vars.action,
        _note: vars.note ?? "",
      });
      if (error) throw error;
      if (vars.action === "release") {
        await releaseEscrowViaApi(vars.id);
      }
      return data as MarketplaceEscrow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-escrows"] });
      qc.invalidateQueries({ queryKey: ["my-escrows"] });
      toast.success("อัปเดต Escrow แล้ว");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};
