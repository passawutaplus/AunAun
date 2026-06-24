import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { loadAvatarPoolManifest, setAvatarPoolUrls } from "@/lib/avatarPool";

type AvatarPoolRow = { url: string };

const poolDb = supabase as unknown as {
  from: (table: "avatar_pool") => {
    select: (columns: string) => {
      eq: (column: string, value: boolean) => {
        order: (column: string) => Promise<{ data: AvatarPoolRow[] | null; error: Error | null }>;
      };
    };
  };
};

async function fetchAvatarPoolUrls(): Promise<string[]> {
  const { data, error } = await poolDb
    .from("avatar_pool")
    .select("url")
    .eq("active", true)
    .order("id");

  if (!error && data?.length) {
    const urls = data.map((r) => r.url).filter(Boolean);
    setAvatarPoolUrls(urls);
    return urls;
  }

  const manifest = await loadAvatarPoolManifest();
  return manifest.urls;
}

export function useAvatarPool() {
  return useQuery({
    queryKey: ["avatar-pool"],
    queryFn: fetchAvatarPoolUrls,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
  });
}
