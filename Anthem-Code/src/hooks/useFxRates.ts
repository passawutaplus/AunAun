import { useQuery } from "@tanstack/react-query";
import { getDailyFxRates, type DailyFxBundle } from "@/lib/payments/fxDaily";

/** Daily FX rates (Asia/Bangkok day) — display only. */
export function useFxRates() {
  return useQuery<DailyFxBundle>({
    queryKey: ["fx-rates-daily"],
    queryFn: getDailyFxRates,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
