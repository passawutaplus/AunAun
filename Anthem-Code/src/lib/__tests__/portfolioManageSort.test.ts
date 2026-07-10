import { describe, expect, it } from "vitest";
import { sortManageProjects, type ProjectManageSortMode } from "@/lib/portfolioManageSort";
import type { Project } from "@/data/projectTypes";
import type { ProjectManageStats } from "@/hooks/usePortfolioProjectStats";

const baseProject = (id: string, overrides: Partial<Project> = {}): Project => ({
  id,
  title: id,
  image: "",
  gallery: [],
  category: "Graphic / Branding",
  owner: "You",
  ownerAvatar: "",
  likes: 0,
  views: 0,
  comments: 0,
  bookmarked: false,
  status: "Published",
  publishedDate: "2026-07-01T00:00:00",
  tools: [],
  ...overrides,
});

describe("sortManageProjects", () => {
  it("sorts by newest published date", () => {
    const projects = [
      baseProject("a", { publishedDate: "2026-07-01T00:00:00" }),
      baseProject("b", { publishedDate: "2026-07-10T00:00:00" }),
    ];
    const sorted = sortManageProjects(projects, "newest", {});
    expect(sorted.map((p) => p.id)).toEqual(["b", "a"]);
  });

  it("sorts by hire count from stats map", () => {
    const projects = [baseProject("a"), baseProject("b")];
    const stats: Record<string, ProjectManageStats> = {
      a: {
        views7d: 0,
        views30d: 0,
        hireCount: 1,
        collabCount: 0,
        bookmarkCount: 0,
        collectionSaveCount: 0,
        commentCount: 0,
      },
      b: {
        views7d: 0,
        views30d: 0,
        hireCount: 5,
        collabCount: 0,
        bookmarkCount: 0,
        collectionSaveCount: 0,
        commentCount: 0,
      },
    };
    const sorted = sortManageProjects(projects, "hires", stats);
    expect(sorted.map((p) => p.id)).toEqual(["b", "a"]);
  });

  it("supports every sort mode without throwing", () => {
    const projects = [baseProject("a"), baseProject("b")];
    const modes: ProjectManageSortMode[] = [
      "newest",
      "oldest",
      "likes",
      "views",
      "hires",
      "collabs",
      "collection_saves",
      "comments",
    ];
    for (const mode of modes) {
      expect(() => sortManageProjects(projects, mode, {})).not.toThrow();
    }
  });
});
