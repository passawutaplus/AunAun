import { useQuery } from "@tanstack/react-query";
import { getPublishedProjectsByOwners, getRecentSignups } from "@/server";
import { ACTIVATION_DAYS, computeActivation, type ActivationFunnel } from "./activation";

const DAY_MS = 86_400_000;

/**
 * Real north-star numbers for /admin/growth, read-only from profiles + projects.
 * On error the UI shows UNAVAILABLE (never a guess).
 */
export function useActivationFunnel(windowDays = ACTIVATION_DAYS) {
  return useQuery({
    queryKey: ["growth-activation", windowDays],
    staleTime: 5 * 60_000,
    retry: 1,
    queryFn: async (): Promise<ActivationFunnel> => {
      const now = Date.now();
      const signups = await getRecentSignups(new Date(now - windowDays * DAY_MS).toISOString());
      const ids = signups.map((r) => r.user_id).filter((id): id is string => !!id);
      const projects = await getPublishedProjectsByOwners(ids);
      return computeActivation(signups, projects, now, windowDays);
    },
  });
}
