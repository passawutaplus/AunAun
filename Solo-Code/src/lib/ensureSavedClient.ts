import { supabase } from "@/integrations/supabase/client";

export type EnsureClientInput = {
  userId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  sourceNote?: string;
};

/** Upsert CRM client from ecosystem handoff — match by email, then name. Never throws. */
export async function ensureSavedClient(
  input: EnsureClientInput,
): Promise<{ id: string; created: boolean } | null> {
  const name = input.name.trim();
  if (!name) return null;

  const email = input.email?.trim().toLowerCase() || null;
  const phone = input.phone?.trim() || null;

  try {
    if (email) {
      const { data: byEmail } = await supabase
        .from("saved_clients")
        .select("id, phone, email")
        .eq("user_id", input.userId)
        .ilike("email", email)
        .maybeSingle();

      if (byEmail) {
        const patch: { phone?: string; email?: string } = {};
        if (phone && !byEmail.phone) patch.phone = phone;
        if (!byEmail.email) patch.email = email;
        if (Object.keys(patch).length) {
          await supabase.from("saved_clients").update(patch).eq("id", byEmail.id);
        }
        return { id: byEmail.id, created: false };
      }
    }

    const { data: byName } = await supabase
      .from("saved_clients")
      .select("id")
      .eq("user_id", input.userId)
      .ilike("name", name)
      .maybeSingle();

    if (byName) {
      if (email || phone) {
        await supabase
          .from("saved_clients")
          .update({
            ...(email ? { email } : {}),
            ...(phone ? { phone } : {}),
          })
          .eq("id", byName.id);
      }
      return { id: byName.id, created: false };
    }

    const { data, error } = await supabase
      .from("saved_clients")
      .insert({
        user_id: input.userId,
        name,
        email,
        phone,
        notes: input.sourceNote ?? null,
        tags: ["ecosystem-handoff"],
      })
      .select("id")
      .single();

    if (error) {
      console.warn("[ensureSavedClient] insert failed", error.message);
      return null;
    }
    return { id: data.id as string, created: true };
  } catch (err) {
    console.warn("[ensureSavedClient] failed", err);
    return null;
  }
}
