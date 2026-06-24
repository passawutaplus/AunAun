import type { Tables } from "@/integrations/supabase/types";

export type DesignerCardData = {
  profile: Tables<"profiles">;
  projects: Tables<"projects">[];
  searchHaystack: string;
};
