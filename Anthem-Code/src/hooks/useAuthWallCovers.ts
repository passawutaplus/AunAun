import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Static fallback so the wall is never empty (offline, no published works yet). */
const FALLBACK = [
  "/auth-wall/orbit-14.webp",
  "/auth-wall/orbit-13.webp",
  "/auth-wall/orbit-12.webp",
  "/auth-wall/orbit-15.webp",
];

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** `count` random published-work covers for the sign-in popup (fetched only while it is open). */
export function useAuthWallCovers(count: number, enabled: boolean): string[] {
  const { data } = useQuery({
    queryKey: ["auth-wall-covers"],
    enabled,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("projects")
        .select("cover_url")
        .eq("status", "Published")
        .not("cover_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      const urls = (rows ?? [])
        .map((r) => (r.cover_url ?? "").trim())
        .filter((u) => /^https?:\/\//.test(u));
      return shuffle(Array.from(new Set(urls))).slice(0, 18);
    },
  });
  const urls = data && data.length >= count ? data : FALLBACK;
  return Array.from({ length: count }, (_, i) => urls[i % urls.length]!);
}
