import { supabase } from "@/integrations/supabase/client";

const REPORT_EVIDENCE_BUCKET = "report-evidence";

/** Store `{bucket}:{path}` — never a public URL. */
export function encodeReportEvidenceRef(path: string): string {
  return `${REPORT_EVIDENCE_BUCKET}:${path}`;
}

export function parseReportEvidenceRef(ref: string): { bucket: string; path: string } | null {
  const i = ref.indexOf(":");
  if (i <= 0) return null;
  return { bucket: ref.slice(0, i), path: ref.slice(i + 1) };
}

export async function signedReportEvidenceUrl(
  ref: string,
  expiresIn = 3600,
): Promise<string | null> {
  const parsed = parseReportEvidenceRef(ref);
  if (!parsed) return null;
  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}

export async function deleteReportEvidenceRef(ref: string): Promise<void> {
  const parsed = parseReportEvidenceRef(ref);
  if (!parsed) return;
  await supabase.storage.from(parsed.bucket).remove([parsed.path]);
}

/** Resolve stored evidence url/ref to a fetchable URL for the owner. */
export async function resolveReportEvidenceUrl(stored: string): Promise<string | null> {
  if (stored.startsWith("http://") || stored.startsWith("https://")) {
    return stored;
  }
  return signedReportEvidenceUrl(stored);
}
