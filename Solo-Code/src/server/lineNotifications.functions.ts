import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sendLineTestSamplesForUser } from "@/server/lineTestSamples.server";

export const sendLineTestSamples = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return sendLineTestSamplesForUser(context.userId);
  });
