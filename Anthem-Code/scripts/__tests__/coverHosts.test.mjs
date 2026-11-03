import { describe, expect, it } from "vitest";
import { coverHostAllowlist, isAllowedCoverUrl } from "../../api/_cover-hosts.js";

describe("push-collage cover host allow-list (SEC-14)", () => {
  const allowed = coverHostAllowlist("https://abc123.supabase.co", "cdn.example.com, Other.Example.org");

  it("allows the Supabase project host, Unsplash and the env extras (case-insensitive)", () => {
    expect([...allowed]).toEqual([
      "images.unsplash.com",
      "abc123.supabase.co",
      "cdn.example.com",
      "other.example.org",
    ]);
    expect(
      isAllowedCoverUrl("https://abc123.supabase.co/storage/v1/object/public/project-media/a.webp", allowed),
    ).toBe(true);
    expect(isAllowedCoverUrl("https://IMAGES.unsplash.com/photo-1?w=800", allowed)).toBe(true);
    expect(isAllowedCoverUrl("https://cdn.example.com/x.jpg", allowed)).toBe(true);
  });

  it("rejects other hosts, http, credentials, ports and IP literals", () => {
    expect(isAllowedCoverUrl("https://evil.example.net/x.jpg", allowed)).toBe(false);
    expect(isAllowedCoverUrl("http://abc123.supabase.co/x.jpg", allowed)).toBe(false);
    expect(isAllowedCoverUrl("https://user:pw@abc123.supabase.co/x.jpg", allowed)).toBe(false);
    expect(isAllowedCoverUrl("https://abc123.supabase.co:8443/x.jpg", allowed)).toBe(false);
    expect(isAllowedCoverUrl("https://169.254.169.254/latest/meta-data", allowed)).toBe(false);
    expect(isAllowedCoverUrl("https://[::1]/x.jpg", allowed)).toBe(false);
    expect(isAllowedCoverUrl("https://localhost/x.jpg", allowed)).toBe(false);
    expect(isAllowedCoverUrl("not a url", allowed)).toBe(false);
    expect(isAllowedCoverUrl(null, allowed)).toBe(false);
  });

  it("falls back to the static hosts when no Supabase URL is configured", () => {
    expect([...coverHostAllowlist("", "")]).toEqual(["images.unsplash.com"]);
  });
});
