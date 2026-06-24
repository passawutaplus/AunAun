import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const imageStatsKey = (projectId: string, imageUrl: string) =>
  ["image-stats", projectId, imageUrl] as const;

export const useImageStats = (projectId: string | undefined, imageUrl: string | undefined) => {
  return useQuery({
    queryKey: ["image-stats", projectId, imageUrl],
    enabled: !!projectId && !!imageUrl,
    staleTime: 30_000,
    queryFn: async () => {
      const [likes, shares] = await Promise.all([
        supabase.rpc("image_like_count", { _project_id: projectId!, _image_url: imageUrl! }),
        supabase.rpc("image_share_count", { _project_id: projectId!, _image_url: imageUrl! }),
      ]);
      if (likes.error) throw likes.error;
      if (shares.error) throw shares.error;
      return {
        likes: Number(likes.data ?? 0),
        shares: Number(shares.data ?? 0),
      };
    },
  });
};

export const logImageShare = async (
  projectId: string,
  imageUrl: string,
  platform: string,
  userId?: string | null
) => {
  await supabase.from("image_shares").insert({
    project_id: projectId,
    image_url: imageUrl,
    platform,
    user_id: userId ?? null,
  });
};
