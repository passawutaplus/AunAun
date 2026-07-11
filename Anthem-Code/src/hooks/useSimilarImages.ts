import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mediaItemsFromBlocks, parseContentBlocks } from "@/lib/projectContentBlocks";
import {
  DEFAULT_SIMILAR_ASPECTS,
  blendSemanticVisual,
  dedupeSimilarResults,
  extractFeaturesForUrls,
  extractImageFeatures,
  scoreVisualSimilarity,
  type ProjectMeta,
  type ScoredSimilar,
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
  content_blocks?: unknown;
  tags: string[] | null;
  tools: string[] | null;
  description: string | null;
};

const MAX_IMAGES_PER_CANDIDATE = 3;
const MAX_FEATURE_URLS = 48;
const MIN_SCORE = 0.14;
const RESULT_LIMIT = 30;

/** Prefer canvas images, then legacy gallery, then cover — order matches project detail. */
export function projectImageUrls(row: {
  gallery_urls?: string[] | null;
  cover_url?: string | null;
  content_blocks?: unknown;
}): string[] {
  const fromBlocks = mediaItemsFromBlocks(parseContentBlocks(row.content_blocks))
    .filter((m) => m.kind === "image")
    .map((m) => m.url.trim())
    .filter(Boolean);

  const seen = new Set<string>(fromBlocks);
  const urls = [...fromBlocks];

  for (const u of row.gallery_urls ?? []) {
    const url = (u ?? "").trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }

  const cover = (row.cover_url ?? "").trim();
  if (cover && !seen.has(cover)) urls.push(cover);

  return urls;
}

function pickImages(row: CandidateRow, preferredIndex = 0): string[] {
  const urls = projectImageUrls(row);
  if (!urls.length) return [];
  if (preferredIndex > 0 && preferredIndex < urls.length) {
    return [urls[preferredIndex], ...urls.filter((_, i) => i !== preferredIndex)].slice(
      0,
      MAX_IMAGES_PER_CANDIDATE,
    );
  }
  return urls.slice(0, MAX_IMAGES_PER_CANDIDATE);
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

const SIMILAR_PROJECT_SELECT =
  "id, title, category, owner_id, gallery_urls, cover_url, content_blocks, tags, tools, description";

type SemanticHit = { project_id: string; similarity: number; image_url?: string };

async function fetchSemanticScores(projectId: string): Promise<Map<string, SemanticHit>> {
  const map = new Map<string, SemanticHit>();
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return map;

    const { data, error } = await supabase.functions.invoke("similar-images", {
      body: { project_id: projectId, mode: "ai" },
    });
    if (error || !data) return map;

    const images = (data as { images?: SemanticHit[] }).images ?? [];
    for (const hit of images) {
      if (!hit?.project_id) continue;
      const prev = map.get(hit.project_id);
      if (!prev || hit.similarity > prev.similarity) map.set(hit.project_id, hit);
    }
  } catch {
    // Guest / offline / function unavailable — visual-only fallback.
  }
  return map;
}

function tagOverlapScore(src: CandidateRow, cand: CandidateRow): number {
  const a = new Set([...(src.tags ?? []), ...(src.tools ?? [])].map((t) => t.toLowerCase()));
  if (!a.size) return 0;
  let hit = 0;
  for (const t of [...(cand.tags ?? []), ...(cand.tools ?? [])]) {
    if (a.has(t.toLowerCase())) hit += 1;
  }
  return hit / a.size;
}

async function loadCandidates(source: CandidateRow & { status?: string }): Promise<CandidateRow[]> {
  let q = supabase
    .from("projects")
    .select(SIMILAR_PROJECT_SELECT)
    .eq("status", "Published")
    .neq("id", source.id)
    .limit(100);

  if (source.category) q = q.eq("category", source.category);

  const { data: primary, error: candErr } = await q;
  if (candErr) throw candErr;

  let candidates = (primary ?? []) as unknown as CandidateRow[];

  // Prefer tag/tool overlap within the category pool when we have headroom.
  if (candidates.length > 20) {
    candidates = [...candidates].sort(
      (a, b) => tagOverlapScore(source, b) - tagOverlapScore(source, a),
    );
  }

  if (candidates.length < 16) {
    const { data: extra } = await supabase
      .from("projects")
      .select(SIMILAR_PROJECT_SELECT)
      .eq("status", "Published")
      .neq("id", source.id)
      .limit(80);
    const seen = new Set(candidates.map((c) => c.id));
    const extras = ((extra ?? []) as unknown as CandidateRow[])
      .filter((row) => !seen.has(row.id))
      .sort((a, b) => tagOverlapScore(source, b) - tagOverlapScore(source, a));
    for (const row of extras) {
      candidates.push(row);
      seen.add(row.id);
      if (candidates.length >= 120) break;
    }
  }

  return candidates;
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
        .select(`${SIMILAR_PROJECT_SELECT}, status`)
        .eq("id", projectId!)
        .maybeSingle();
      if (srcErr || !source) throw srcErr ?? new Error("project not found");

      const sourceRow = source as unknown as CandidateRow;
      const sourceImages = pickImages(sourceRow, imageIndex);
      const sourceImage = sourceImages[0] ?? "";
      const sourceMeta = toMeta(sourceRow, sourceImage);

      const [candidates, semanticMap, srcFeatures] = await Promise.all([
        loadCandidates(sourceRow),
        fetchSemanticScores(projectId!),
        sourceImage ? extractImageFeatures(sourceImage) : Promise.resolve(null),
      ]);

      // Seed candidate list with semantic hits that may be outside the category window.
      const byId = new Map(candidates.map((c) => [c.id, c]));
      const missingSemanticIds = [...semanticMap.keys()].filter((id) => !byId.has(id)).slice(0, 24);
      if (missingSemanticIds.length) {
        const { data: more } = await supabase
          .from("projects")
          .select(SIMILAR_PROJECT_SELECT)
          .eq("status", "Published")
          .in("id", missingSemanticIds);
        for (const row of (more ?? []) as unknown as CandidateRow[]) {
          if (!byId.has(row.id)) {
            candidates.push(row);
            byId.set(row.id, row);
          }
        }
      }

      const urlBudget: string[] = [];
      const candidateImageSets = new Map<string, string[]>();
      for (const row of candidates) {
        const imgs = pickImages(row);
        if (!imgs.length) continue;
        candidateImageSets.set(row.id, imgs);
        for (const u of imgs) {
          if (urlBudget.length >= MAX_FEATURE_URLS) break;
          urlBudget.push(u);
        }
        if (urlBudget.length >= MAX_FEATURE_URLS) break;
      }

      const featureMap = await extractFeaturesForUrls(urlBudget, MAX_FEATURE_URLS);

      const scored: ScoredSimilar[] = [];
      for (const row of candidates) {
        const imgs = candidateImageSets.get(row.id) ?? pickImages(row);
        if (!imgs.length) continue;

        let best: ScoredSimilar | null = null;
        for (const image_url of imgs) {
          const meta = toMeta(row, image_url);
          const candFeatures = featureMap.get(image_url) ?? null;
          const visual = scoreVisualSimilarity(
            sourceMeta,
            meta,
            srcFeatures,
            candFeatures,
            aspects,
          );
          const sem = semanticMap.get(row.id)?.similarity;
          const similarity = blendSemanticVisual(visual, sem, aspects);
          const candidate: ScoredSimilar = {
            project_id: row.id,
            title: row.title,
            category: row.category,
            owner_id: row.owner_id,
            image_url,
            similarity,
            dHash: candFeatures?.dHash,
          };
          if (!best || candidate.similarity > best.similarity) best = candidate;
        }
        if (best && best.similarity >= MIN_SCORE) scored.push(best);
      }

      // If semantic returned a preferred image URL for a project, prefer it when scores are close.
      for (const item of scored) {
        const semHit = semanticMap.get(item.project_id);
        if (semHit?.image_url && semHit.image_url !== item.image_url) {
          const altFeatures = featureMap.get(semHit.image_url);
          if (altFeatures) {
            const meta = toMeta(byId.get(item.project_id)!, semHit.image_url);
            const visual = scoreVisualSimilarity(sourceMeta, meta, srcFeatures, altFeatures, aspects);
            const altScore = blendSemanticVisual(visual, semHit.similarity, aspects);
            if (altScore >= item.similarity - 0.03) {
              item.image_url = semHit.image_url;
              item.similarity = Math.max(item.similarity, altScore);
              item.dHash = altFeatures.dHash;
            }
          }
        }
      }

      return dedupeSimilarResults(scored, RESULT_LIMIT).map(
        ({ project_id, title, category, owner_id, image_url, similarity }) => ({
          project_id,
          title,
          category,
          owner_id,
          image_url,
          similarity,
        }),
      );
    },
  });
