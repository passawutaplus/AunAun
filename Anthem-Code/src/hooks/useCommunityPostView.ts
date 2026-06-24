import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isCategoryAllowed } from "@/lib/cookieConsent";

export function useCommunityPostView(postId: string | undefined) {
  useEffect(() => {
    if (!postId || !isCategoryAllowed("analytics")) return;
    const key = `community-viewed:${postId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    void (supabase.rpc as (name: string, args: object) => ReturnType<typeof supabase.rpc>)(
      "increment_community_post_view",
      { _post_id: postId },
    ).then(() => {}, () => {});
  }, [postId]);
}
