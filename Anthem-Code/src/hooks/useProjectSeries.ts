import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ProjectSeries = {
  id: string;
  owner_id: string;
  title: string;
  summary: string;
  client_label: string;
  year: number | null;
  is_public: boolean;
  cover_project_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  item_count?: number;
  published_count?: number;
  covers?: string[];
};

export type ProjectSeriesItemProject = {
  id: string;
  title: string;
  cover_url: string | null;
  gallery_urls: string[] | null;
  status: string;
  category?: string | null;
  likes?: number | null;
  views?: number | null;
  created_at?: string | null;
};

export type ProjectSeriesItem = {
  series_id: string;
  project_id: string;
  position: number;
  role_label: string;
  added_at: string;
  project: ProjectSeriesItemProject | null;
};

export type ProjectSeriesForProject = {
  series: ProjectSeries;
  items: ProjectSeriesItem[];
};

function seriesTable() {
  return supabase.from("project_series" as never);
}

function itemsTable() {
  return supabase.from("project_series_items" as never);
}

function projectThumb(p: { cover_url?: string | null; gallery_urls?: string[] | null } | null | undefined) {
  return p?.cover_url || p?.gallery_urls?.[0] || null;
}

type ProjectMeta = {
  id: string;
  title: string;
  cover_url: string | null;
  gallery_urls: string[] | null;
  status: string;
  category?: string | null;
  likes?: number | null;
  views?: number | null;
  created_at?: string | null;
};

async function fetchProjectsByIds(projectIds: string[]): Promise<Map<string, ProjectMeta>> {
  const map = new Map<string, ProjectMeta>();
  if (!projectIds.length) return map;
  const unique = [...new Set(projectIds)];
  const { data, error } = await supabase
    .from("projects")
    .select("id, title, cover_url, gallery_urls, status, category, likes, views, created_at")
    .in("id", unique);
  if (error) return map;
  for (const row of (data ?? []) as ProjectMeta[]) {
    map.set(row.id, row);
  }
  return map;
}

async function fetchSeriesItemRows(seriesIds: string[]): Promise<
  Array<{ series_id: string; project_id: string; position: number; role_label: string; added_at: string }>
> {
  if (!seriesIds.length) return [];
  const { data, error } = await itemsTable()
    .select("series_id, project_id, position, role_label, added_at")
    .in("series_id", seriesIds)
    .order("position", { ascending: true });
  if (error) return [];
  return (data ?? []) as Array<{
    series_id: string;
    project_id: string;
    position: number;
    role_label: string;
    added_at: string;
  }>;
}

async function enrichSeriesList(rows: ProjectSeries[]): Promise<ProjectSeries[]> {
  const ids = rows.map((r) => r.id);
  const itemRows = await fetchSeriesItemRows(ids);
  const projectMap = await fetchProjectsByIds(itemRows.map((r) => r.project_id));

  const total: Record<string, number> = {};
  const published: Record<string, number> = {};
  const covers: Record<string, string[]> = {};

  for (const row of itemRows) {
    total[row.series_id] = (total[row.series_id] ?? 0) + 1;
    const project = projectMap.get(row.project_id);
    if (project?.status === "Published") {
      published[row.series_id] = (published[row.series_id] ?? 0) + 1;
      const arr = covers[row.series_id] ?? (covers[row.series_id] = []);
      if (arr.length < 4) {
        const url = projectThumb(project);
        if (url) arr.push(url);
      }
    }
  }

  return rows.map((s) => ({
    ...s,
    item_count: total[s.id] ?? 0,
    published_count: published[s.id] ?? 0,
    covers: covers[s.id] ?? [],
  }));
}

function mapItemsWithProjects(
  itemRows: Array<{
    series_id: string;
    project_id: string;
    position: number;
    role_label: string;
    added_at: string;
  }>,
  projectMap: Map<string, ProjectMeta>,
): ProjectSeriesItem[] {
  return itemRows.map((r) => ({
    series_id: r.series_id,
    project_id: r.project_id,
    position: Number(r.position ?? 0),
    role_label: String(r.role_label ?? ""),
    added_at: String(r.added_at ?? ""),
    project: projectMap.get(r.project_id) ?? null,
  }));
}

/** Owner list — includes empty series. */
export const useMyProjectSeries = (ownerId: string | undefined) =>
  useQuery({
    queryKey: ["project-series", ownerId],
    enabled: !!ownerId,
    queryFn: async (): Promise<ProjectSeries[]> => {
      const { data, error } = await seriesTable()
        .select("*")
        .eq("owner_id", ownerId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return enrichSeriesList((data ?? []) as ProjectSeries[]);
    },
  });

/** Public profile — only public series that have ≥1 published project. */
export const usePublicProjectSeries = (ownerId: string | undefined) =>
  useQuery({
    queryKey: ["project-series-public", ownerId],
    enabled: !!ownerId,
    queryFn: async (): Promise<ProjectSeries[]> => {
      const { data, error } = await seriesTable()
        .select("*")
        .eq("owner_id", ownerId!)
        .eq("is_public", true)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const enriched = await enrichSeriesList((data ?? []) as ProjectSeries[]);
      return enriched.filter((s) => (s.published_count ?? 0) > 0);
    },
  });

export const useProjectSeries = (id: string | undefined) =>
  useQuery({
    queryKey: ["project-series-one", id],
    enabled: !!id,
    queryFn: async (): Promise<ProjectSeries | null> => {
      const { data, error } = await seriesTable().select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const enriched = await enrichSeriesList([data as ProjectSeries]);
      return enriched[0] ?? null;
    },
  });

export const useProjectSeriesItems = (seriesId: string | undefined) =>
  useQuery({
    queryKey: ["project-series-items", seriesId],
    enabled: !!seriesId,
    queryFn: async (): Promise<ProjectSeriesItem[]> => {
      const itemRows = await fetchSeriesItemRows([seriesId!]);
      const projectMap = await fetchProjectsByIds(itemRows.map((r) => r.project_id));
      return mapItemsWithProjects(itemRows, projectMap);
    },
  });

/** Series + siblings for a project detail page. */
export const useSeriesForProject = (projectId: string | undefined) =>
  useQuery({
    queryKey: ["project-series-for-project", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<ProjectSeriesForProject | null> => {
      const { data: link, error: linkErr } = await itemsTable()
        .select("series_id")
        .eq("project_id", projectId!)
        .maybeSingle();
      if (linkErr) throw linkErr;
      if (!link) return null;
      const seriesId = (link as { series_id: string }).series_id;

      const { data: series, error: sErr } = await seriesTable()
        .select("*")
        .eq("id", seriesId)
        .maybeSingle();
      if (sErr) throw sErr;
      if (!series) return null;

      const itemRows = await fetchSeriesItemRows([seriesId]);
      const projectMap = await fetchProjectsByIds(itemRows.map((r) => r.project_id));

      return {
        series: series as ProjectSeries,
        items: mapItemsWithProjects(itemRows, projectMap),
      };
    },
  });

export const useCreateProjectSeries = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      ownerId: string;
      title: string;
      summary?: string;
      clientLabel?: string;
      year?: number | null;
      isPublic?: boolean;
    }) => {
      const { data, error } = await seriesTable()
        .insert({
          owner_id: input.ownerId,
          title: input.title.trim(),
          summary: (input.summary ?? "").trim(),
          client_label: (input.clientLabel ?? "").trim(),
          year: input.year ?? null,
          is_public: input.isPublic ?? true,
        } as never)
        .select()
        .single();
      if (error) throw error;
      return data as ProjectSeries;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["project-series", vars.ownerId] });
      qc.invalidateQueries({ queryKey: ["project-series-public", vars.ownerId] });
    },
  });
};

export const useUpdateProjectSeries = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      patch: Partial<Pick<ProjectSeries, "title" | "summary" | "client_label" | "year" | "is_public" | "cover_project_id">>;
    }) => {
      const { error } = await seriesTable().update(input.patch as never).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-series"] });
      qc.invalidateQueries({ queryKey: ["project-series-public"] });
      qc.invalidateQueries({ queryKey: ["project-series-one"] });
      qc.invalidateQueries({ queryKey: ["project-series-for-project"] });
    },
  });
};

export const useDeleteProjectSeries = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await seriesTable().delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-series"] });
      qc.invalidateQueries({ queryKey: ["project-series-public"] });
      qc.invalidateQueries({ queryKey: ["project-series-for-project"] });
      toast.success("ลบชุดผลงานแล้ว");
    },
  });
};

export const useAddProjectsToSeries = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { seriesId: string; projectIds: string[] }) => {
      if (!input.projectIds.length) return;

      const { data: existing } = await itemsTable()
        .select("position")
        .eq("series_id", input.seriesId)
        .order("position", { ascending: false })
        .limit(1);
      let nextPos = existing?.[0] ? Number((existing[0] as { position: number }).position) + 1 : 0;

      const rows = input.projectIds.map((projectId) => {
        const row = { series_id: input.seriesId, project_id: projectId, position: nextPos, role_label: "" };
        nextPos += 1;
        return row;
      });

      const { error } = await itemsTable().insert(rows as never);
      if (error) {
        if (`${error.message}`.includes("project_series_items_project_unique") || error.code === "23505") {
          throw new Error("ผลงานบางชิ้นอยู่ในชุดอื่นแล้ว — เอาออกจากชุดเดิมก่อน");
        }
        throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["project-series"] });
      qc.invalidateQueries({ queryKey: ["project-series-public"] });
      qc.invalidateQueries({ queryKey: ["project-series-one", vars.seriesId] });
      qc.invalidateQueries({ queryKey: ["project-series-items", vars.seriesId] });
      qc.invalidateQueries({ queryKey: ["project-series-for-project"] });
    },
  });
};

export const useRemoveProjectFromSeries = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { seriesId: string; projectId: string }) => {
      const { error } = await itemsTable()
        .delete()
        .eq("series_id", input.seriesId)
        .eq("project_id", input.projectId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["project-series"] });
      qc.invalidateQueries({ queryKey: ["project-series-public"] });
      qc.invalidateQueries({ queryKey: ["project-series-items", vars.seriesId] });
      qc.invalidateQueries({ queryKey: ["project-series-for-project", vars.projectId] });
      qc.invalidateQueries({ queryKey: ["project-series-for-project"] });
    },
  });
};

/** Move project into a series, or remove from series when seriesId is null. */
export async function assignProjectToSeries(input: {
  projectId: string;
  seriesId: string | null;
}): Promise<void> {
  const { data: current, error: curErr } = await itemsTable()
    .select("series_id")
    .eq("project_id", input.projectId)
    .maybeSingle();
  if (curErr) throw curErr;

  const currentSeriesId = (current as { series_id?: string } | null)?.series_id ?? null;
  const nextSeriesId = input.seriesId?.trim() || null;

  if (currentSeriesId === nextSeriesId) return;

  if (currentSeriesId) {
    const { error } = await itemsTable()
      .delete()
      .eq("series_id", currentSeriesId)
      .eq("project_id", input.projectId);
    if (error) throw error;
  }

  if (nextSeriesId) {
    const { data: existing } = await itemsTable()
      .select("position")
      .eq("series_id", nextSeriesId)
      .order("position", { ascending: false })
      .limit(1);
    const nextPos = existing?.[0] ? Number((existing[0] as { position: number }).position) + 1 : 0;
    const { error } = await itemsTable().insert({
      series_id: nextSeriesId,
      project_id: input.projectId,
      position: nextPos,
      role_label: "",
    } as never);
    if (error) {
      if (`${error.message}`.includes("project_series_items_project_unique") || error.code === "23505") {
        throw new Error("ผลงานนี้อยู่ในชุดอื่นแล้ว");
      }
      throw error;
    }
  }
}

export const useAssignProjectToSeries = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: assignProjectToSeries,
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["project-series"] });
      qc.invalidateQueries({ queryKey: ["project-series-public"] });
      qc.invalidateQueries({ queryKey: ["project-series-items"] });
      qc.invalidateQueries({ queryKey: ["project-series-for-project", vars.projectId] });
      qc.invalidateQueries({ queryKey: ["project-series-for-project"] });
    },
  });
};
