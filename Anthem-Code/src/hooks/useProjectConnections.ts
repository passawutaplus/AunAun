import { useMemo } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { useCreatorServices, CREATOR_SERVICES_REF_PROJECTS_MAX } from "@/hooks/useCreatorServices";
import { useMyObjects } from "@/hooks/useCreatorObjects";
import { fromCreatorServices } from "@/lib/creatorServicesDb";
import { fromCreatorObjects } from "@/lib/objects/db";

/** Mirrors PROJECT_REF_MAX in ObjectEditorDialog. */
export const OBJECT_REF_PROJECTS_MAX = 3;

export type ConnectKind = "service" | "object";

export type ConnectItem = {
  key: string;
  kind: ConnectKind;
  id: string;
  title: string;
  coverUrl: string | null;
  published: boolean;
  refs: string[];
  max: number;
};

export const connectKey = (kind: ConnectKind, id: string) => `${kind}:${id}`;

/** The owner's own packages and objects, as one list the editor can tick. */
export function useProjectConnectItems(ownerId: string | undefined) {
  const services = useCreatorServices(ownerId, { includeDrafts: true });
  const objects = useMyObjects(ownerId);
  const items = useMemo<ConnectItem[]>(() => {
    const s = (services.data ?? []).map((row): ConnectItem => ({
      key: connectKey("service", row.id),
      kind: "service",
      id: row.id,
      title: row.title,
      coverUrl: row.cover_url,
      published: row.status === "Published",
      refs: row.reference_project_ids ?? [],
      max: CREATOR_SERVICES_REF_PROJECTS_MAX,
    }));
    const o = (objects.data ?? []).map((row): ConnectItem => ({
      key: connectKey("object", row.id),
      kind: "object",
      id: row.id,
      title: row.title,
      coverUrl: row.cover_url,
      published: row.status === "Published",
      refs: row.reference_project_ids ?? [],
      max: OBJECT_REF_PROJECTS_MAX,
    }));
    return [...s, ...o];
  }, [services.data, objects.data]);
  return { items, loading: services.isLoading || objects.isLoading };
}

/**
 * Adds/removes this project in each item's reference_project_ids so it matches the ticked keys.
 * Only touches rows whose membership actually changes. Returns how many rows failed.
 */
export async function syncProjectConnections(args: {
  projectId: string;
  ownerId: string;
  selected: Set<string>;
  items: ConnectItem[];
  queryClient: QueryClient;
}): Promise<number> {
  const { projectId, ownerId, selected, items, queryClient } = args;
  let failed = 0;
  for (const item of items) {
    const has = item.refs.includes(projectId);
    const want = selected.has(item.key);
    if (has === want) continue;
    if (want && item.refs.length >= item.max) {
      failed += 1;
      continue;
    }
    const refs = want ? [...item.refs, projectId] : item.refs.filter((id) => id !== projectId);
    const table = item.kind === "service" ? fromCreatorServices() : fromCreatorObjects();
    const { error } = await table
      .update({ reference_project_ids: refs, updated_at: new Date().toISOString() })
      .eq("id", item.id)
      .eq("owner_id", ownerId);
    if (error) failed += 1;
  }
  void queryClient.invalidateQueries({ queryKey: ["creator-services"] });
  void queryClient.invalidateQueries({ queryKey: ["creator-objects"] });
  return failed;
}
