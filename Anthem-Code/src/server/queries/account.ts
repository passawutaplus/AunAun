/** The signed-in person's own account rows for the new design (welcome step, Settings). */
import { supabase } from "@/integrations/supabase/client";
import { profilesPublicFrom } from "@/lib/profileAccess";

export type OnboardingRow = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  sc_categories: string[] | null;
  feed_interests: string[] | null;
  feed_interests_at: string | null;
  profile_onboarding_at: string | null;
};

/** What the welcome step ("Nice to meet you": name + CATEGORY) needs to know. */
export async function getMyOnboarding(userId: string): Promise<OnboardingRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, username, display_name, sc_categories, feed_interests, feed_interests_at, profile_onboarding_at" as "*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as OnboardingRow | null) ?? null;
}

export type MyAccountRow = {
  user_id: string;
  username: string | null;
  username_changed_at: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

/** Handle and its lock date for Settings → Account. */
export async function getMyAccount(userId: string): Promise<MyAccountRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, username, username_changed_at, display_name, avatar_url" as "*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as MyAccountRow | null) ?? null;
}

export type DeleteRequestRow = { id: string; status: string; requested_at: string; scheduled_purge_at: string | null };

/** The open account-deletion request, if any (not completed, rejected or cancelled). */
export async function getMyDeleteRequest(): Promise<DeleteRequestRow | null> {
  const { data, error } = await supabase
    .from("privacy_requests" as never)
    .select("id, request_type, status, requested_at, scheduled_purge_at")
    .eq("request_type", "delete")
    .order("requested_at", { ascending: false })
    .limit(1);
  if (error) return null;
  const row = ((data ?? []) as Array<DeleteRequestRow & { request_type: string }>)[0];
  return row && !["completed", "rejected", "cancelled"].includes(row.status) ? row : null;
}

/** How many devices are signed in to this account (needs the step 7 SQL); null when unknown. */
export async function getMySessionCount(): Promise<number | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("my_session_count");
  if (error || typeof data !== "number") return null;
  return data;
}

export type MySettings = { chat: boolean; comment: boolean; follow: boolean; event: boolean; greet_from: "everyone" | "following" };

export const DEFAULT_SETTINGS: MySettings = { chat: true, comment: true, follow: true, event: true, greet_from: "everyone" };

/** Settings → Notifications / "who can greet me" (step 7c SQL); defaults until that SQL has run. */
export async function getMySettings(): Promise<MySettings & { ready: boolean }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("get_my_settings");
  if (error || !data || typeof data !== "object") return { ...DEFAULT_SETTINGS, ready: false };
  return { ...DEFAULT_SETTINGS, ...(data as Partial<MySettings>), ready: true };
}

/** profiles.public_visibility of the signed-in person (holds the "creators" and "search" switches). */
export async function getMyVisibility(userId: string): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.from("profiles").select("public_visibility" as "*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  const pv = (data as { public_visibility?: unknown } | null)?.public_visibility;
  return pv && typeof pv === "object" ? (pv as Record<string, unknown>) : {};
}

export type BlockedPerson = { user_id: string; name: string; username: string | null; avatar_url: string | null };

/** People I blocked, newest first, with their public name. */
export async function getBlockedPeople(userId: string): Promise<BlockedPerson[]> {
  const { data, error } = await supabase
    .from("user_blocks" as never)
    .select("blocked_id, created_at")
    .eq("blocker_id", userId)
    .order("created_at", { ascending: false });
  if (error) return [];
  const ids = ((data ?? []) as Array<{ blocked_id: string }>).map((r) => r.blocked_id);
  if (!ids.length) return [];
  const { data: people } = await profilesPublicFrom()
    .select("user_id, display_name, username, avatar_url" as "*")
    .in("user_id", ids);
  const byId = new Map(((people ?? []) as unknown as Array<{ user_id: string; display_name: string | null; username: string | null; avatar_url: string | null }>).map((p) => [p.user_id, p]));
  return ids.map((id) => {
    const p = byId.get(id);
    return { user_id: id, name: p?.display_name?.trim() || p?.username || "ผู้ใช้ Samecor", username: p?.username ?? null, avatar_url: p?.avatar_url ?? null };
  });
}
