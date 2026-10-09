import type { Tables } from "@/integrations/supabase/types";

export type DesignerCardData = {
  profile: Tables<"profiles">;
  projects: Tables<"projects">[];
  searchHaystack: string;
  /** Published works (not capped to the 6 cover thumbnails). */
  projectCount: number;
  /** Published creator packages (0 if none). */
  packageCount: number;
  /** Published creator objects (0 if none). */
  objectCount: number;
  /** Has at least one published creator package. */
  hasService: boolean;
};
