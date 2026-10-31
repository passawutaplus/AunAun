import { describe, expect, it } from "vitest";
import { PER_CATEGORY, SHOWCASE, SHOWCASE_CATEGORIES, buildShowcase, type LandingWork } from "./showcase";

const FEATURED = ["3a08479e-ec0b-40bd-b54c-cb1a2724460a", "acfff42e-8539-4979-a7a3-7ca439e26f68"];

const member = (id: string, category: string): LandingWork => ({ id, title: id, category, src: `/${id}.jpg`, href: `/project/${id}` });

describe("buildShowcase", () => {
  it("has the same number of examples in every category", () => {
    for (const category of SHOWCASE_CATEGORIES) {
      expect(SHOWCASE.filter((w) => w.category === category)).toHaveLength(PER_CATEGORY);
    }
  });

  it("shows 15 tiles under All from every category, none twice", () => {
    const { all } = buildShowcase([]);
    expect(all).toHaveLength(15);
    expect(new Set(all.map((w) => w.id)).size).toBe(15);
    for (const category of SHOWCASE_CATEGORIES) {
      expect(all.filter((w) => w.category === category).length).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps a category at ten tiles when member works join in", () => {
    const members = FEATURED.map((id) => member(id, "Photography"));
    const { byCategory } = buildShowcase(members);
    expect(byCategory.Photography).toHaveLength(PER_CATEGORY);
    expect(byCategory.Photography.filter((w) => w.href)).toHaveLength(2);
  });

  it("leaves out member works from other categories", () => {
    const { all } = buildShowcase([member(FEATURED[0], "Typography")]);
    expect(all.some((w) => w.id === FEATURED[0])).toBe(false);
  });

  it("leaves out member works nobody picked", () => {
    const { byCategory } = buildShowcase([member("x", "Photography")]);
    expect(byCategory.Photography.some((w) => w.href)).toBe(false);
  });

  it("gives every clip a video", () => {
    const { byCategory } = buildShowcase([]);
    expect(byCategory["Video / Film"].every((w) => w.video?.endsWith(".mp4"))).toBe(true);
  });
});
