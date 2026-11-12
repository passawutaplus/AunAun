import { beforeAll, describe, expect, it } from "vitest";
import {
  hasThumb,
  installThumbFallback,
  originalPathFromThumb,
  originalUrlFromThumb,
  thumbPathFor,
  thumbUrlFor,
  thumbablePath,
} from "@/lib/mediaThumb";
import { heroFeedCoverSrcSet, naturalFeedCoverUrl, optimizedFeedImageUrl } from "@/lib/feedProjectCover";

const BASE = "https://x.supabase.co/storage/v1/object/public/project-media";
const WORK = "anthem/e4318e64-9eb1-4f29-9c44-af9082801abe/53c933d1-5de4-4de3-aa5f-2e7f8e5d8479/fca66cd1.png";
const AVATAR = "anthem/e4318e64-9eb1-4f29-9c44-af9082801abe/avatar/7a5b4ad8.png";

describe("small-copy naming", () => {
  it("cards get 640px, avatars 128px, next to the original", () => {
    expect(thumbPathFor(WORK)).toBe(`${WORK}.w640.webp`);
    expect(thumbPathFor(AVATAR)).toBe(`${AVATAR}.w128.webp`);
    expect(originalPathFromThumb(`${WORK}.w640.webp`)).toBe(WORK);
    expect(originalPathFromThumb(WORK)).toBeNull();
  });

  it("only our own images get one", () => {
    expect(hasThumb(WORK)).toBe(true);
    expect(hasThumb(`${WORK}.w640.webp`)).toBe(false);
    expect(hasThumb("anthem/chat/1e238d53/a.png")).toBe(false);
    expect(hasThumb("anthem/kyc/e4318e64/id.jpg")).toBe(false);
    expect(hasThumb("anthem/e4318e64/53c933d1/clip.mp4")).toBe(false);
    expect(hasThumb("e4318e64/legacy/a.png")).toBe(false);
  });
});

describe("small-copy urls", () => {
  it("maps a public project-media url and drops the query", () => {
    expect(thumbablePath(`${BASE}/${WORK}`)).toBe(WORK);
    expect(thumbUrlFor(`${BASE}/${WORK}?t=1`)).toBe(`${BASE}/${WORK}.w640.webp`);
    expect(thumbUrlFor(`${BASE}/${AVATAR}`)).toBe(`${BASE}/${AVATAR}.w128.webp`);
  });

  it("leaves other urls alone", () => {
    for (const url of [
      "https://images.unsplash.com/photo-1?w=800",
      "https://x.supabase.co/storage/v1/object/public/discover-media/a.webp",
      `${BASE}/${WORK}.w640.webp`,
      `${BASE}/anthem/e4318e64/53c933d1/clip.mp4`,
      "",
    ]) {
      expect(thumbUrlFor(url)).toBe(url);
    }
    expect(thumbUrlFor(null)).toBe("");
  });

  it("finds the original behind a small copy", () => {
    expect(originalUrlFromThumb(`${BASE}/${WORK}.w640.webp`)).toBe(`${BASE}/${WORK}`);
    expect(originalUrlFromThumb(`${BASE}/${WORK}.w640.webp?x=1`)).toBe(`${BASE}/${WORK}`);
    expect(originalUrlFromThumb(`${BASE}/${WORK}`)).toBeNull();
    expect(originalUrlFromThumb("https://example.com/a.png.w640.webp")).toBeNull();
  });
});

describe("feed image urls", () => {
  it("cards load the small copy, wide requests keep the original", () => {
    expect(naturalFeedCoverUrl(`${BASE}/${WORK}`)).toBe(`${BASE}/${WORK}.w640.webp`);
    expect(optimizedFeedImageUrl(`${BASE}/${WORK}`, { width: 1400 })).toBe(`${BASE}/${WORK}`);
    expect(heroFeedCoverSrcSet(`${BASE}/${WORK}`)).toBe(
      `${BASE}/${WORK}.w640.webp 720w, ${BASE}/${WORK} 1100w, ${BASE}/${WORK} 1400w`,
    );
  });
});

describe("missing small copy", () => {
  beforeAll(() => installThumbFallback());

  it("falls back to the original and keeps the component's own onError out of it", () => {
    const img = document.createElement("img");
    let ownHandlerRuns = 0;
    img.addEventListener("error", () => {
      ownHandlerRuns += 1;
    });
    img.src = `${BASE}/${WORK}.w640.webp`;
    img.srcset = `${BASE}/${WORK}.w640.webp 720w, ${BASE}/${WORK} 1100w`;
    document.body.appendChild(img);

    img.dispatchEvent(new Event("error"));
    expect(img.src).toBe(`${BASE}/${WORK}`);
    expect(img.srcset).toBe(`${BASE}/${WORK} 720w, ${BASE}/${WORK} 1100w`);
    expect(ownHandlerRuns).toBe(0);

    // The original failing too is a real failure: left alone, and the component is told.
    img.dispatchEvent(new Event("error"));
    expect(img.src).toBe(`${BASE}/${WORK}`);
    expect(ownHandlerRuns).toBe(1);
  });

  it("ignores images that are not small copies", () => {
    const img = document.createElement("img");
    img.src = "https://example.com/a.png";
    document.body.appendChild(img);
    img.dispatchEvent(new Event("error"));
    expect(img.src).toBe("https://example.com/a.png");
    expect(img.dataset.thumbFallback).toBeUndefined();
  });
});
