import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_SIMILAR_ASPECTS,
  extractFeaturesForUrls,
  extractImageFeatures,
  scoreVisualSimilarity,
  type ProjectMeta,
  type SimilarAspect,
} from "@/lib/visualSimilarity";

export type { SimilarAspect } from "@/lib/visualSimilarity";
export { DEFAULT_SIMILAR_ASPECTS, SIMILAR_ASPECTS } from "@/lib/visualSimilarity";

export interface SimilarImage {
  project_id: string;
  title: string;
  category: string;
  owner_id: string;
  image_url: string;
  similarity: number;
}

type CandidateRow = {
  id: string;
  title: string;
  category: string;
  owner_id: string;
  gallery_urls: string[] | null;
  cover_url: string | null;
  tags: string[] | null;
  tools: string[] | null;
  description: string | null;
};

function pickImage(row: CandidateRow, imageIndex = 0): string {
  const gallery = row.gallery_urls ?? [];
  return gallery[imageIndex] ?? gallery[0] ?? row.cover_url ?? "";
}

function toMeta(row: CandidateRow, imageUrl: string): ProjectMeta {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    owner_id: row.owner_id,
    tags: row.tags ?? [],
    tools: row.tools ?? [],
    description: row.description ?? "",
    image_url: imageUrl,
  };
}

export const useSimilarImages = (
  projectId: string | undefined,
  aspects: SimilarAspect[] = DEFAULT_SIMILAR_ASPECTS,
  imageIndex = 0,
) =>
  useQuery({
    queryKey: ["similar-images", projectId, aspects, imageIndex],
    enabled: !!projectId && aspects.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<SimilarImage[]> => {
      const { data: source, error: srcErr } = await supabase
        .from("projects")
        .select(
          "id, title, category, owner_id, gallery_urls, cover_url, tags, tools, description, status",
        )
        .eq("id", projectId!)
        .maybeSingle();
      if (srcErr || !source) throw srcErr ?? new Error("project not found");

      const sourceImage = pickImage(source as CandidateRow, imageIndex);
      const sourceMeta = toMeta(source as CandidateRow, sourceImage);

      let q = supabase
        .from("projects")
        .select("id, title, category, owner_id, gallery_urls, cover_url, tags, tools, description")
        .eq("status", "Published")
        .neq("id", projectId!)
        .limit(100);

      if (source.category) q = q.eq("category", source.category);

      const { data: primary, error: candErr } = await q;
      if (candErr) throw candErr;

      let candidates = (primary ?? []) as CandidateRow[];

      if (candidates.length < 12) {
        const { data: extra } = await supabase
          .from("projects")
          .select("id, title, category, owner_id, gallery_urls, cover_url, tags, tools, description")
          .eq("status", "Published")
          .neq("id", projectId!)
          .limit(80);
        const seen = new Set(candidates.map((c) => c.id));
        for (const row of (extra ?? []) as CandidateRow[]) {
          if (!seen.has(row.id)) {
            candidates.push(row);
            seen.add(row.id);
          }
        }
      }

      const srcFeatures = sourceImage ? await extractImageFeatures(sourceImage) : null;
      const imageUrls = candidates.map((c) => pickImage(c)).filter(Boolean);
      const featureMap = await extractFeaturesForUrls(imageUrls);

      const scored = candidates
        .map((row) => {
          const image_url = pickImage(row);
          if (!image_url) return null;
          const meta = toMeta(row, image_url);
          const similarity = scoreVisualSimilarity(
            sourceMeta,
            meta,
            srcFeatures,
            featureMap.get(image_url) ?? null,
            aspects,
          );
          return {
            project_id: row.id,
            title: row.title,
            category: row.category,
            owner_id: row.owner_id,
            image_url,
            similarity,
          };
        })
        .filter((x): x is SimilarImage => x != null && x.similarity >= 0.12)
        .sort((a, b) => b.similarity - a.similarity);

      return scored.slice(0, 30);
    },
  });
