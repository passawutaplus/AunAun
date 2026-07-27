import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isReservedPublicHandle } from "@/lib/reservedHandles";

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Derive a handle from a display/Username label (spaces → _, drop invalid chars). */
export function deriveUsernameFromLabel(raw: string): string {
  return normalizeUsername(raw)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._\s-]/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[._]+|[._]+$/g, "")
    .slice(0, 30);
}

async function isUsernameTaken(username: string, excludeUserId?: string): Promise<boolean> {
  const normalized = normalizeUsername(username);
  if (normalized.length < 2) return false;
  if (isReservedPublicHandle(normalized)) return true;

  const { data, error } = await supabase
    .from("profiles_public")
    .select("user_id")
    .eq("username", normalized)
    .limit(2);
  if (error) throw error;

  const takenByOther = (data ?? []).some(
    (row) => row.user_id && row.user_id !== excludeUserId,
  );
  return takenByOther;
}

/** Debounced username duplicate check — excludes the current user's handle. */
export function useUsernameAvailability(username: string, excludeUserId?: string) {
  const normalized = normalizeUsername(username);

  return useQuery({
    queryKey: ["username-available", normalized, excludeUserId],
    enabled: normalized.length >= 2,
    staleTime: 30_000,
    queryFn: async () => {
      const taken = await isUsernameTaken(normalized, excludeUserId);
      const reserved = isReservedPublicHandle(normalized);
      return { taken, reserved };
    },
  });
}

export type UsernameCheckResult =
  | { ok: true; username: string }
  | { ok: false; username: string; reason: "short" | "format" | "reserved" | "taken" | "error"; message: string };

/** Imperative availability check (for click-to-verify UX). */
export async function checkUsernameAvailability(
  username: string,
  excludeUserId?: string,
): Promise<UsernameCheckResult> {
  const normalized = normalizeUsername(username);
  if (normalized.length < 2) {
    return {
      ok: false,
      username: normalized,
      reason: "short",
      message: "ชื่อผู้ใช้ต้องมีอย่างน้อย 2 ตัวอักษร",
    };
  }
  if (!/^[a-z0-9_.]+$/.test(normalized)) {
    return {
      ok: false,
      username: normalized,
      reason: "format",
      message: "ใช้ได้เฉพาะ a-z, 0-9, _ และ .",
    };
  }
  if (isReservedPublicHandle(normalized)) {
    return {
      ok: false,
      username: normalized,
      reason: "reserved",
      message: "ชื่อผู้ใช้นี้สงวนไว้ — ลองชื่ออื่น",
    };
  }
  try {
    if (await isUsernameTaken(normalized, excludeUserId)) {
      return {
        ok: false,
        username: normalized,
        reason: "taken",
        message: "ชื่อผู้ใช้นี้ถูกใช้แล้ว — ลองชื่ออื่น",
      };
    }
  } catch {
    return {
      ok: false,
      username: normalized,
      reason: "error",
      message: "เช็คไม่สำเร็จ — ลองอีกครั้ง",
    };
  }
  return { ok: true, username: normalized };
}

export async function assertUsernameAvailable(username: string, excludeUserId?: string) {
  const result = await checkUsernameAvailability(username, excludeUserId);
  if (!result.ok) throw new Error(result.message);
}
