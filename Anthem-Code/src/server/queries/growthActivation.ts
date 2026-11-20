/**
 * Growth Engine north-star inputs — pure async, no React. Read-only, used by /admin/growth.
 * Admin session: RLS returns every profile; without one, rows may be hidden.
 */
import { supabase } from "@/integrations/supabase/client";
import type { PublishedProjectRow, SignupRow } from "@/lib/growth/activation";

const CHUNK = 150;

/** Profiles created since `sinceIso`, with the fields the core-profile check needs. */
export async function getRecentSignups(sinceIso: string): Promise<SignupRow[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, created_at, avatar_url, role, bio, skills")
    .gte("created_at", sinceIso)
    .limit(2000);
  if (error) throw error;
  return (data ?? []) as SignupRow[];
}

/** Published projects of these owners (owner_id = auth user id). */
export async function getPublishedProjectsByOwners(ownerIds: string[]): Promise<PublishedProjectRow[]> {
  const out: PublishedProjectRow[] = [];
  for (let i = 0; i < ownerIds.length; i += CHUNK) {
    const { data, error } = await supabase
      .from("projects")
      .select("owner_id, created_at")
      .eq("status", "Published")
      .in("owner_id", ownerIds.slice(i, i + CHUNK));
    if (error) throw error;
    out.push(...((data ?? []) as PublishedProjectRow[]));
  }
  return out;
}
