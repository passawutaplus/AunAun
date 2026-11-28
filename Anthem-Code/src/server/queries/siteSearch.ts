import { supabase } from "@/integrations/supabase/client";

export type WorkSearchText = {
  id: string;
  tags: string[] | null;
  tools: string[] | null;
  description: string | null;
};

/** Words of the newest published works that the search panel also matches (tags, tools, description). */
export async function getWorkSearchText(limit = 400): Promise<WorkSearchText[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("projects") as any)
    .select("id, tags, tools, description")
    .eq("status", "Published")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as WorkSearchText[];
}
