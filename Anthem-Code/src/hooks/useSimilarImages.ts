import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SimilarMode = "ai" | "image";

export interface SimilarImage {
  project_id: string;
  title: string;
  category: string;
  owner_id: string;
  image_url: string;
  similarity: number;
}

export const useSimilarImages = (projectId: string | undefined, mode: SimilarMode = "ai") =>
  useQuery({
    queryKey: ["similar-images", projectId, mode],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("similar-images", {
        body: { project_id: projectId, mode },
      });
      if (error) throw error;
      return (data?.images ?? []) as SimilarImage[];
    },
  });
