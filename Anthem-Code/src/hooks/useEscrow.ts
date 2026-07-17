import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  APLUS1_SOLO_PAYMENTS_CUTOVER_TH,
  SoloEcosystemDisabledError,
  isAplus1PaymentsEnabled,
} from "@/lib/aplus1Launch";

export type MarketplaceEscrow = {
  id: string;
  portal_token: string;
  title: string;
  amount_thb: number;
  status: string;
};

/**
 * @deprecated Solo `/pay/:token` escrow URLs are cut for Aplus1.
 * Hire money uses Omise + Aplus1 ledger (docs/payments-omise.md).
 */
export function escrowPayUrl(_portalToken: string): string {
  return "";
}

/** Legacy Solo escrow from hire — blocked; use Omise hire orders instead. */
export const useCreateEscrowFromHire = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (_hiringRequestId: string) => {
      if (!isAplus1PaymentsEnabled()) {
        throw new SoloEcosystemDisabledError(APLUS1_SOLO_PAYMENTS_CUTOVER_TH);
      }
      throw new Error(APLUS1_SOLO_PAYMENTS_CUTOVER_TH);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hire-notifications"] });
    },
    onError: (e: Error) => {
      toast.error(e.message || APLUS1_SOLO_PAYMENTS_CUTOVER_TH);
    },
  });
};
