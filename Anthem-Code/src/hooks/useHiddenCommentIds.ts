import { useSyncExternalStore } from "react";
import { getHiddenCommentIds, getHiddenCommentIdsSnapshot, subscribeHiddenComments } from "@/lib/hiddenComments";

export function useHiddenCommentIds(): Set<string> {
  return useSyncExternalStore(subscribeHiddenComments, getHiddenCommentIds, getHiddenCommentIdsSnapshot);
}
