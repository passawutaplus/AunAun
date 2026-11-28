/**
 * My Studio › Documents (owner 2026-11-28): quotations, invoices and receipts. The ones I issued come from the old
 * hook (useMyStudioDocs); the ones others sent me are read here. Row-level security already limits
 * `studio_documents` to rows where I am the client or in the chat, so "not mine" = sent to me.
 */
import { sharedDb } from "@/integrations/supabase/db";
import type { StudioDocumentRow } from "@/lib/documents/studioDocuments";

export async function getReceivedStudioDocs(me: string): Promise<StudioDocumentRow[]> {
  const { data, error } = await sharedDb
    .from("studio_documents" as never)
    .select("*")
    .neq("owner_id" as never, me as never)
    .neq("status" as never, "draft" as never)
    .order("created_at" as never, { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as unknown as StudioDocumentRow[];
}
