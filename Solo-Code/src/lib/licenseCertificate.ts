import { supabase } from "@/integrations/supabase/client";
import type { Quotation } from "@/store/quotations";
import type { UsageRightsInput } from "@/lib/usageRightsSchema";

export async function createLicenseVerifyToken(input: {
  userId: string;
  quotation: Quotation;
  rights: UsageRightsInput;
  brandName?: string;
}) {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://solofreelancer.com";
  const summary = {
    quotation: {
      id: input.quotation.id,
      number: input.quotation.number,
      projectName: input.quotation.projectName,
      clientName: input.quotation.clientName,
    },
    rights: input.rights,
    brandName: input.brandName,
  };

  const { data, error } = await (supabase as any)
    .from("legal_license_tokens")
    .insert({
      user_id: input.userId,
      quotation_id: input.quotation.id,
      summary,
    })
    .select("token")
    .single();

  if (error) throw error;
  const token = (data as { token: string }).token;
  return `${origin}/license/${token}`;
}
