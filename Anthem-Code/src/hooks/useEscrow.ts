import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SO1O_APP_URL } from "@/lib/productLinks";

export type MarketplaceEscrow = {
  id: string;
  portal_token: string;
  title: string;
  amount_thb: number;
  status: string;
};

export function escrowPayUrl(portalToken: string) {
  const base = SO1O_APP_URL.replace(/\/$/, "");
  return `${base}/pay/${portalToken}`;
}

export const useCreateEscrowFromHire = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (hiringRequestId: string) => {
      const { data, error } = await supabase.rpc("create_escrow_from_hire", {
        _hiring_request_id: hiringRequestId,
      });
      if (error) throw error;
      return data as MarketplaceEscrow;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["hire-notifications"] });
      const url = escrowPayUrl(row.portal_token);
      void navigator.clipboard?.writeText(url);
      toast.success("สร้าง Escrow จากคำขอจ้างแล้ว (ทางเลือก)", {
        description: `${url} · โอนตรงนอก Escrow แพลตฟอร์มไม่รับประกัน`,
      });
    },
    onError: (e: Error) => {
      if (e.message.includes("CONNECT_REQUIRED")) {
        toast.error("เชื่อม Stripe Connect ที่หน้า Earnings ก่อนรับเงิน");
      } else if (e.message.includes("INVALID_AMOUNT")) {
        toast.error("ต้องมีงบประมาณในคำขอจ้างก่อนสร้าง Escrow");
      } else {
        toast.error(e.message);
      }
    },
  });
};
