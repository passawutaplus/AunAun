/**
 * Settings → "ดาวน์โหลดข้อมูลของฉัน" (PDPA, redesign/lib/exportMyData.ts): what goes in the file.
 * Same read as the old AccountPrivacySection export; RLS limits it to the owner.
 */
import { supabase } from "@/integrations/supabase/client";
import { OWN_PROFILE_SELECT } from "@/lib/dbSelects";

/** The signed-in person's own profile row (every field the owner may see). */
export async function getMyProfileForExport(userId: string): Promise<unknown> {
  const { data, error } = await supabase.from("profiles").select(OWN_PROFILE_SELECT).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data;
}
