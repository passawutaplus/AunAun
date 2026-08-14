import { useSyncExternalStore } from "react";
import {
  getHiddenProjectIds,
  getHiddenProjectIdsSnapshot,
  subscribeHiddenProjects,
} from "@/lib/hiddenProjects";

export function useHiddenProjectIds(): Set<string> {
  return useSyncExternalStore(subscribeHiddenProjects, getHiddenProjectIds, getHiddenProjectIdsSnapshot);
}
