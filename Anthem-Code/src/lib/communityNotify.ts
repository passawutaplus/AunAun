import { supabase } from "@/integrations/supabase/client";

type CommunityNotifyKind = "community_like" | "community_comment" | "community_reply";

export async function notifyCommunityEvent(input: {
  recipientId: string;
  kind: CommunityNotifyKind;
  title: string;
  body: string;
  link: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await (supabase.rpc as (name: string, args: object) => ReturnType<typeof supabase.rpc>)(
      "notify_community_event",
      {
        _recipient_id: input.recipientId,
        _kind: input.kind,
        _title: input.title,
        _body: input.body,
        _link: input.link,
        _metadata: input.metadata ?? {},
      },
    );
  } catch {
    /* non-blocking */
  }
}
