import { toast } from "sonner";
import {
  COMMUNITY_MODERATION_CONTEXTS,
  COMMUNITY_TAG_BLOCKED_MSG,
  type CommunityModerationContext,
} from "@/data/communityModerationPolicy";
import { detectCommunitySpam, detectProfanity, maskProfanity } from "@/lib/profanity";
import {
  prepareModeratedContent,
  type ModeratedSubmitOptions,
  type ModerationCheck,
} from "@/hooks/useModeration";

export { COMMUNITY_MODERATION_CONTEXTS };

export async function moderateCommunityText(
  raw: string,
  context: CommunityModerationContext,
  opts: Pick<ModeratedSubmitOptions, "blockOnProfanity" | "maskOnProfanity">,
  checkCanPost: () => Promise<ModerationCheck>,
  recordStrike: (ctx: string) => Promise<unknown>,
): Promise<string | null> {
  if (detectCommunitySpam(raw)) {
    toast.error("เนื้อหาน่าสงสัยว่าเป็น spam — กรุณาแก้ไขก่อนโพสต์");
    return null;
  }
  return prepareModeratedContent(
    raw,
    { context, ...opts },
    checkCanPost,
    recordStrike,
  );
}

export async function moderateCommunityPost(input: {
  title: string;
  body: string;
  tags: string[];
  checkCanPost: () => Promise<ModerationCheck>;
  recordStrike: (ctx: string) => Promise<unknown>;
}): Promise<{ title: string; body: string; tags: string[] } | null> {
  const title = await moderateCommunityText(
    input.title,
    COMMUNITY_MODERATION_CONTEXTS.post_title,
    { maskOnProfanity: true, blockOnProfanity: false },
    input.checkCanPost,
    input.recordStrike,
  );
  if (!title) return null;

  const body = await moderateCommunityText(
    input.body,
    COMMUNITY_MODERATION_CONTEXTS.post_body,
    { maskOnProfanity: true, blockOnProfanity: false },
    input.checkCanPost,
    input.recordStrike,
  );
  if (!body) return null;

  const tags: string[] = [];
  for (const tag of input.tags) {
    const trimmed = tag.trim();
    if (!trimmed) continue;
    const { hasProfanity } = detectProfanity(trimmed);
    if (hasProfanity) {
      toast.error(COMMUNITY_TAG_BLOCKED_MSG);
      await input.recordStrike(COMMUNITY_MODERATION_CONTEXTS.post_tag);
      return null;
    }
    if (detectCommunitySpam(trimmed)) {
      toast.error("แท็กมีรูปแบบ spam — กรุณาแก้ไข");
      return null;
    }
    tags.push(trimmed);
  }

  return { title, body, tags };
}

export async function moderateCommunityComment(
  content: string,
  isReply: boolean,
  checkCanPost: () => Promise<ModerationCheck>,
  recordStrike: (ctx: string) => Promise<unknown>,
): Promise<string | null> {
  return moderateCommunityText(
    content,
    isReply ? COMMUNITY_MODERATION_CONTEXTS.reply : COMMUNITY_MODERATION_CONTEXTS.comment,
    { maskOnProfanity: true, blockOnProfanity: false },
    checkCanPost,
    recordStrike,
  );
}

export function previewMasked(text: string): string {
  return maskProfanity(text);
}
