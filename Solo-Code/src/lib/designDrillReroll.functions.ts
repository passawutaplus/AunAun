import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  executeDrillReroll,
  getDrillRerollStatus,
} from "@/lib/designDrillRerollServer";

export const fetchDrillRerollStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => getDrillRerollStatus(context.userId));

export const requestDrillReroll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => executeDrillReroll(context.userId));
