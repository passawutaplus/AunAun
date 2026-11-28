import { supabase } from "@/integrations/supabase/client";

export type WorkSearchText = {
  id: string;
  title: string | null;
  sc_category: string | null;
  owner_id: string | null;
  tags: string[] | null;
  tools: string[] | null;
  description: string | null;
};

/**
 * Words of the newest published works, newest first: the search panel matches tags, tools and description;
 * the home grid's text filter (`?find=`) matches all of them.
 */
export async function getWorkSearchText(limit = 400): Promise<WorkSearchText[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("projects") as any)
    .select("id, title, sc_category, owner_id, tags, tools, description")
    .eq("status", "Published")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as WorkSearchText[];
}

/** One cache for the search panel and the home grid's text filter; read only once something is typed. */
export const workSearchTextQuery = {
  queryKey: ["sc-search-text"] as const,
  queryFn: () => getWorkSearchText(),
  staleTime: 5 * 60_000,
};
