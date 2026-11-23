import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import vercelConfig from "../../../vercel.json";
import {
  IMAGE_PROXY_QUALITIES,
  IMAGE_PROXY_WIDTHS,
  buildProxyImageUrl,
  isProxyableImageUrl,
  originalFromProxyUrl,
  proxiedImageSrcSet,
  proxiedImageUrl,
  responsiveImageProps,
  snapProxyQuality,
  snapProxyWidth,
} from "../imageProxy";
import { naturalFeedCoverUrl, heroFeedCoverSrcSet } from "../feedProjectCover";
import { socialPreviewImage } from "../../../api/seo-preview.js";

const COVER =
  "https://zkflkpbmbozrchqncpzi.supabase.co/storage/v1/object/public/project-media/anthem/u/p/cover.png";

describe("imageProxy config", () => {
  it("matches the sizes and qualities Vercel allows", () => {
    expect(vercelConfig.images.sizes).toEqual([...IMAGE_PROXY_WIDTHS]);
    expect(vercelConfig.images.qualities).toEqual([...IMAGE_PROXY_QUALITIES]);
  });

  it("only lets the optimizer fetch this project's public storage", () => {
    const [pattern] = vercelConfig.images.remotePatterns;
    const host = new RegExp(pattern.hostname);
    const path = new RegExp(pattern.pathname);
    const u = new URL(COVER);
    expect(host.test(u.hostname)).toBe(true);
    expect(path.test(u.pathname)).toBe(true);
    expect(host.test("zkflkpbmbozrchqncpzi.supabase.co.example.com")).toBe(false);
    expect(path.test("/storage/v1/object/sign/project-media/x.png")).toBe(false);
  });
});

describe("imageProxy helpers", () => {
  it("snaps to allowed widths and qualities", () => {
    expect(snapProxyWidth(280)).toBe(384);
    expect(snapProxyWidth(640)).toBe(640);
    expect(snapProxyWidth(5000)).toBe(1920);
    expect(snapProxyQuality(68)).toBe(70);
    expect(snapProxyQuality(78)).toBe(80);
  });

  it("only proxies raster images from public storage", () => {
    expect(isProxyableImageUrl(COVER)).toBe(true);
    expect(isProxyableImageUrl(COVER.replace(".png", ".mp4"))).toBe(false);
    expect(isProxyableImageUrl(COVER.replace(".png", ".gif"))).toBe(false);
    expect(isProxyableImageUrl(COVER.replace(".png", ".svg"))).toBe(false);
    expect(isProxyableImageUrl(COVER.replace("/public/", "/sign/"))).toBe(false);
    expect(isProxyableImageUrl("https://images.unsplash.com/photo-1.jpg")).toBe(false);
    expect(isProxyableImageUrl("/brand/og-image.png")).toBe(false);
  });

  it("round-trips the original URL", () => {
    const proxied = buildProxyImageUrl(COVER, 640, 75);
    expect(proxied).toBe(`/_vercel/image?url=${encodeURIComponent(COVER)}&w=640&q=75`);
    expect(originalFromProxyUrl(proxied)).toBe(COVER);
    expect(originalFromProxyUrl(COVER)).toBeNull();
  });
});

describe("imageProxy in production builds", () => {
  beforeEach(() => vi.stubEnv("PROD", true));
  afterEach(() => vi.unstubAllEnvs());

  it("resizes feed covers instead of loading the original", () => {
    expect(naturalFeedCoverUrl(COVER)).toBe(buildProxyImageUrl(COVER, 640, 70));
    expect(heroFeedCoverSrcSet(COVER)).toContain("&w=1920&q=70 1920w");
  });

  it("builds srcset and responsive props", () => {
    const set = proxiedImageSrcSet(COVER, [600, 640, 1000]);
    expect(set.split(", ").map((s) => s.split(" ")[1])).toEqual(["640w", "1080w"]);
    const props = responsiveImageProps(COVER, "100vw");
    expect(props.src).toBe(buildProxyImageUrl(COVER, 1920, 85));
    expect(props.sizes).toBe("100vw");
  });

  it("leaves other URLs alone and can be switched off", () => {
    const video = COVER.replace(".png", ".mp4");
    expect(proxiedImageUrl(video, 640)).toBe(video);
    expect(responsiveImageProps(video, "100vw")).toEqual({ src: video });
    vi.stubEnv("VITE_IMAGE_PROXY", "off");
    expect(proxiedImageUrl(COVER, 640)).toBe(COVER);
  });
});

describe("imageProxy outside production", () => {
  it("keeps originals on the dev server", () => {
    expect(proxiedImageUrl(COVER, 640)).toBe(COVER);
    expect(proxiedImageSrcSet(COVER, [640])).toBe("");
  });
});

describe("socialPreviewImage", () => {
  it("sends crawlers a 1200 px copy of storage images", () => {
    expect(socialPreviewImage(COVER, "https://samecor.com/showcase/1")).toBe(
      `https://samecor.com/_vercel/image?url=${encodeURIComponent(COVER)}&w=1200&q=80`,
    );
    expect(socialPreviewImage("https://samecor.com/brand/og-image.png", "https://samecor.com/")).toBe(
      "https://samecor.com/brand/og-image.png",
    );
  });
});
