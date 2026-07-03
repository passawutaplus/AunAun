import { describe, expect, it } from "vitest";
import type { CommunityPost } from "@/hooks/useCommunityPosts";
import { mergeCommunityFeedShowcase } from "@/lib/communityFeedShowcase";

function post(id: string, withMedia: boolean): CommunityPost {
  return {
    id,
    author_id: "a",
    post_kind: "tip",
    title: id,
    body: id,
    category: "Graphic / Branding",
    tags: [],
    tools: [],
    gallery_urls: withMedia ? ["https://example.com/a.jpg"] : [],
    video_urls: [],
    mentioned_project_ids: [],
    tagged_user_ids: [],
    media_aspect: "square",
    question_topic: null,
    status: "published",
    reply_count: 0,
    like_count: 0,
    view_count: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

describe("mergeCommunityFeedShowcase", () => {
  it("interleaves text-only showcase posts when feed is media-only", () => {
    const merged = mergeCommunityFeedShowcase(
      [post("live-1", true), post("live-2", true), post("live-3", true)],
      [post("show-1", false), post("show-2", false)],
    );
    expect(merged.map((p) => p.id)).toEqual([
      "live-1",
      "live-2",
      "show-1",
      "live-3",
      "show-2",
    ]);
  });

  it("skips merge when feed already has text-only posts", () => {
    const live = [post("live-1", true), post("live-2", false)];
    const merged = mergeCommunityFeedShowcase(live, [post("show-1", false)]);
    expect(merged).toBe(live);
  });
});
