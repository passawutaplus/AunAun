import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiClient } from "./ai";
import type { Candidate } from "./adapters/types";
import { CC0_URL } from "./config";
import { processCandidate, type ItemOutcome } from "./pipeline";
import type { SeederRepo } from "./repo";

/** A creator's own work shared to Discover (table creator_submissions). */
export type Submission = {
  id: string;
  user_id: string;
  asset_path: string;
  title: string;
  credit_name: string;
  license: "cc0" | "cc-by" | "cc-by-sa";
  link_url: string | null;
};

const LICENSE_URL: Record<Submission["license"], string> = {
  cc0: CC0_URL,
  "cc-by": "https://creativecommons.org/licenses/by/4.0/",
  "cc-by-sa": "https://creativecommons.org/licenses/by-sa/4.0/",
};
const LICENSE_LABEL: Record<Submission["license"], string> = { cc0: "CC0", "cc-by": "CC BY 4.0", "cc-by-sa": "CC BY-SA 4.0" };

/** Maps a submission onto the same Candidate shape the museum adapters produce, so the very same gates and AI run on it. */
export function candidateFromSubmission(sub: Submission, siteUrl: string, storageBase: string): Candidate {
  const site = siteUrl.replace(/\/$/, "");
  const attribution = `"${sub.title}", by ${sub.credit_name}, shared by the creator on A+ Vault, ${LICENSE_LABEL[sub.license]}.`;
  const objectUrl = sub.link_url || `${site}/discover`;
  return {
    source: "creator",
    sourceId: sub.id,
    sourceUrl: objectUrl,
    originalImageUrl: `${storageBase.replace(/\/$/, "")}/storage/v1/object/vault-assets/${sub.asset_path}`,
    title: sub.title,
    license: sub.license,
    licenseUrl: LICENSE_URL[sub.license],
    attribution,
    attributionJson: {
      artist: sub.credit_name,
      title: sub.title,
      date: "",
      credit_line: attribution,
      institution: "A+ Vault creators",
      institution_url: site,
      object_url: objectUrl,
    },
    sourceMeta: { creator_user_id: sub.user_id, submission_id: sub.id },
  };
}

export type SubmissionResult = { status: "published" | "not_published"; reason: string | null; itemId: string | null; outcome: ItemOutcome["status"] };

/** Outcomes -> what the creator sees. Nothing is picked by hand: it either clears the automatic bar or it does not. */
export function submissionVerdict(outcome: ItemOutcome): { status: SubmissionResult["status"]; reason: string | null } {
  if (outcome.status === "published") return { status: "published", reason: null };
  if (outcome.status === "review") return { status: "not_published", reason: outcome.reason };
  return { status: "not_published", reason: outcome.reason };
}

export type CreatorDeps = { db: SupabaseClient; repo: SeederRepo; ai: AiClient; siteUrl: string; storageBase: string };

export async function processSubmission(sub: Submission, deps: CreatorDeps): Promise<SubmissionResult> {
  const { db, repo, ai } = deps;
  const candidate = candidateFromSubmission(sub, deps.siteUrl, deps.storageBase);
  const categories = await repo.categories();
  const outcome = await processCandidate(candidate, { category: categories.includes("illustration") ? "illustration" : categories[0] ?? "illustration", categories }, {
    repo,
    ai,
    // The image lives in the creator's private folder, not at a public URL.
    download: async () => {
      const { data, error } = await db.storage.from("vault-assets").download(sub.asset_path);
      if (error || !data) throw new Error(`download ${sub.asset_path}: ${error?.message ?? "empty"}`);
      return Buffer.from(await data.arrayBuffer());
    },
  });
  const verdict = submissionVerdict(outcome);
  const { data: row } = await db.from("discover_items").select("id").eq("source", "creator").eq("source_id", sub.id).maybeSingle();
  const itemId = (row?.id as string | undefined) ?? null;
  await db
    .from("creator_submissions")
    .update({ status: verdict.status, reject_reason: verdict.reason, discover_item_id: itemId, updated_at: new Date().toISOString() })
    .eq("id", sub.id);
  return { ...verdict, itemId, outcome: outcome.status };
}

/** Pending submissions, oldest first. */
export async function pendingSubmissions(db: SupabaseClient, limit = 10): Promise<Submission[]> {
  const { data, error } = await db
    .from("creator_submissions")
    .select("id, user_id, asset_path, title, credit_name, license, link_url")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`pendingSubmissions: ${error.message}`);
  return (data ?? []) as Submission[];
}
