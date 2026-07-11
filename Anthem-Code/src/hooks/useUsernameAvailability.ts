import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isReservedPublicHandle } from "@/lib/reservedHandles";

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
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

export async function assertUsernameAvailable(username: string, excludeUserId?: string) {
  const normalized = normalizeUsername(username);
  if (normalized.length < 2) {
    throw new Error("ชื่อผู้ใช้ต้องมีอย่างน้อย 2 ตัวอักษร");
  }
  if (!/^[a-z0-9_.]+$/.test(normalized)) {
    throw new Error("ใช้ได้เฉพาะ a-z, 0-9, _ และ .");
  }
  if (isReservedPublicHandle(normalized)) {
    throw new Error("ชื่อผู้ใช้นี้สงวนไว้ — ลองชื่ออื่น");
  }
  if (await isUsernameTaken(normalized, excludeUserId)) {
    throw new Error("ชื่อผู้ใช้นี้ถูกใช้แล้ว — ลองชื่ออื่น");
  }
}
