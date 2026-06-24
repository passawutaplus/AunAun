/**
 * @deprecated Phase 0 of Anthem ↔ So1o consolidation.
 *
 * Both apps should use one Supabase project and `subscription_tier` on
 * `profiles` (see docs/ecosystem-unified-account.md). This module is a thin
 * re-export of the primary client until legacy imports are removed.
 *
 * Do NOT add new imports of `sharedStorage` / `SHARED_MEDIA_BUCKET`. Use
 * `supabase` from `@/integrations/supabase/client` directly. Remaining
 * imports here will be migrated and this file deleted in Phase 2.
 */
import { supabase } from "./client";

export const sharedStorage = supabase;
export const SHARED_MEDIA_BUCKET = "project-media" as const;
export const SHARED_STORAGE_URL = "" as const;
