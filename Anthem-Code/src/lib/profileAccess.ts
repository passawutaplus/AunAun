import { supabase } from "@/integrations/supabase/client";
import { PUBLIC_PROFILE_SELECT } from "@/lib/dbSelects";

/** PostgREST view — safe public profile columns only. */
export const PROFILES_PUBLIC_TABLE = "profiles_public" as const;
export const PROFILES_PRIVATE_TABLE = "profiles" as const;

export function profileReadTable(viewerId: string | undefined, targetUserId: string): string {
  return viewerId && viewerId === targetUserId ? PROFILES_PRIVATE_TABLE : PROFILES_PUBLIC_TABLE;
}

export function isOwnProfile(viewerId: string | undefined, targetUserId: string): boolean {
  return !!viewerId && viewerId === targetUserId;
}

type ProfileQuery = ReturnType<typeof supabase.from>;

/** Pick profiles vs profiles_public for read queries. */
export function profileReadFrom(viewerId: string | undefined, targetUserId: string): ProfileQuery {
  return supabase.from(profileReadTable(viewerId, targetUserId) as "profiles");
}

/** Batch public profile reads (feed, chat, credits). */
export function profilesPublicFrom(): ProfileQuery {
  return supabase.from(PROFILES_PUBLIC_TABLE as "profiles");
}

export const PUBLIC_PROFILE_READ_SELECT = PUBLIC_PROFILE_SELECT;
