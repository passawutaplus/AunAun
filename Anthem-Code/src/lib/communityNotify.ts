import { supabase } from "@/integrations/supabase/client";

type CommunityNotifyKind =
  | "community_like"
  | "community_comment"
  | "community_reply"
  | "community_tag"
  | "community_mention"
  | "project_collab_invite";

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

export async function notifyCommunityTaggedUsers(input: {
  authorId: string;
  authorName: string;
  postId: string;
  postTitle: string;
  taggedUserIds: string[];
}) {
  const recipients = input.taggedUserIds.filter((id) => id && id !== input.authorId);
  if (!recipients.length) return;

  const link = `/community/${input.postId}`;
  const title = recipients.length === 1 ? "มีคนแท็กคุณในโพสต์" : "มีคนแท็กคุณในโพสต์ชุมชน";
  const body =
    recipients.length === 1
      ? `${input.authorName} แท็กคุณใน "${input.postTitle}"`
      : `${input.authorName} แท็กคุณและอีก ${recipients.length - 1} คนใน "${input.postTitle}"`;

  await Promise.all(
    recipients.map((recipientId) =>
      notifyCommunityEvent({
        recipientId,
        kind: "community_tag",
        title,
        body,
        link,
        metadata: { post_id: input.postId },
      }),
    ),
  );
}
