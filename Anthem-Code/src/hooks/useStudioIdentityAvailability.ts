import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isReservedPublicHandle } from "@/lib/reservedHandles";

export type StudioIdentityAvailability = {
  nameTaken: boolean;
  slugTaken: boolean;
};

async function isStudioNameTaken(name: string): Promise<boolean> {
  const trimmed = name.trim();
  if (trimmed.length < 2) return false;

  const [{ data: studio }, { count: formationCount, error: formationError }] = await Promise.all([
    supabase.from("studios").select("id").ilike("name", trimmed).limit(1).maybeSingle(),
    supabase
      .from("studio_formation_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .ilike("proposed_name", trimmed),
  ]);

  if (studio) return true;
  if (!formationError && (formationCount ?? 0) > 0) return true;
  return false;
}

async function isStudioSlugTaken(slug: string): Promise<boolean> {
  const normalized = slug.trim().toLowerCase();
  if (normalized.length < 2) return false;
  if (isReservedPublicHandle(normalized)) return true;

  const [{ data: studio }, { count: formationCount, error: formationError }] = await Promise.all([
    supabase.from("studios").select("id").eq("slug", normalized).limit(1).maybeSingle(),
    supabase
      .from("studio_formation_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .eq("proposed_slug", normalized),
  ]);

  if (studio) return true;
  if (!formationError && (formationCount ?? 0) > 0) return true;
  return false;
}

/** Debounced name/slug duplicate check against live studios + pending formations. */
export function useStudioIdentityAvailability(name: string, slug: string) {
  const trimmedName = name.trim();
  const normalizedSlug = slug.trim().toLowerCase();

  return useQuery({
    queryKey: ["studio-identity-available", trimmedName, normalizedSlug],
    enabled: trimmedName.length >= 2 || normalizedSlug.length >= 2,
    staleTime: 30_000,
    queryFn: async (): Promise<StudioIdentityAvailability> => {
      const [nameTaken, slugTaken] = await Promise.all([
        trimmedName.length >= 2 ? isStudioNameTaken(trimmedName) : Promise.resolve(false),
        normalizedSlug.length >= 2 ? isStudioSlugTaken(normalizedSlug) : Promise.resolve(false),
      ]);
      return { nameTaken, slugTaken };
    },
  });
}

export async function assertStudioIdentityAvailable(name: string, slug: string) {
  const trimmedName = name.trim();
  const normalizedSlug = slug.trim().toLowerCase();

  if (!normalizedSlug) {
    throw new Error("กรุณาตั้ง Slug สำหรับ URL (ภาษาอังกฤษหรือตัวเลข)");
  }
  if (normalizedSlug.length < 2) {
    throw new Error("Slug ต้องมีอย่างน้อย 2 ตัวอักษร");
  }

  if (isReservedPublicHandle(normalizedSlug)) {
    throw new Error("Slug นี้สงวนไว้ — ลอง slug อื่น");
  }

  const { nameTaken, slugTaken } = await (async () => {
    const [n, s] = await Promise.all([
      isStudioNameTaken(trimmedName),
      isStudioSlugTaken(normalizedSlug),
    ]);
    return { nameTaken: n, slugTaken: s };
  })();

  if (nameTaken) throw new Error("ชื่อ Studio นี้มีคนใช้แล้ว — ลองชื่ออื่น");
  if (slugTaken) throw new Error("Slug นี้ถูกใช้แล้ว — ลอง slug อื่น");
}
