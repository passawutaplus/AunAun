import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { resolveOwnerPortalBranding } from "@/lib/documentTheme/resolveOwnerBranding.server";
import { throwClientError } from "@/lib/security";

const TokenSchema = z.object({ token: z.string().uuid() });

/** Public portal branding for brief share links (tier-gated Powered by). */
export const getPublicBriefPortalBranding = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => TokenSchema.parse(data))
  .handler(async ({ data }) => {
    const { data: brief, error } = await supabaseAdmin
      .from("design_briefs")
      .select("user_id")
      .eq("share_token", data.token)
      .maybeSingle();
    if (error) throwClientError("brief.getPublicBriefPortalBranding", error);
    if (!brief?.user_id) return { portal: null };
    const portal = await resolveOwnerPortalBranding(brief.user_id as string);
    return { portal };
  });
