import { describe, expect, it } from "vitest";
import {
  CATEGORY_PARENTS,
  categorySubTag,
  formatCategoryBreadcrumb,
  inferTaxonomySelection,
  mergeCategorySubTag,
  parentIdForProjectCategory,
  parentSubsWithOther,
  projectMatchesStyleTags,
  projectMatchesSubs,
  resolveDbCategory,
  stripCategorySubTags,
} from "@/data/categoryTaxonomy";
import { PROJECT_CATEGORIES } from "@/data/projectTypes";

describe("categoryTaxonomy", () => {
  it("covers every project category exactly once", () => {
    const leaves = CATEGORY_PARENTS.flatMap((p) => p.leaves);
    expect(new Set(leaves).size).toBe(leaves.length);
    for (const cat of PROJECT_CATEGORIES) {
      expect(leaves).toContain(cat);
    }
  });

  it("uses short English parent labels", () => {
    const labels = CATEGORY_PARENTS.map((p) => p.label);
    expect(labels).toContain("UX/UI");
    expect(labels).toContain("Architecture");
    expect(labels).toContain("Industrial");
    expect(labels).not.toContain("Spatial");
    expect(labels).not.toContain("Digital");
  });

  it("uses single-topic subcategory labels without slash pairs", () => {
    for (const p of CATEGORY_PARENTS) {
      for (const s of p.subs) {
        expect(s.label).not.toMatch(/\//);
      }
    }
  });

  it("ends every parent subcategory list with Other", () => {
    for (const p of CATEGORY_PARENTS) {
      const subs = parentSubsWithOther(p);
      expect(subs.at(-1)?.label).toBe("Other");
      expect(subs.at(-1)?.id).toBe(`${p.id}-other`);
    }
  });

  it("maps project category to parent", () => {
    expect(parentIdForProjectCategory("UI/UX")).toBe("uiux");
    expect(parentIdForProjectCategory("Graphic")).toBe("graphic");
    expect(parentIdForProjectCategory("Architecture / Interior")).toBe("architecture");
    expect(parentIdForProjectCategory("Product / Industrial")).toBe("industrial");
    expect(parentIdForProjectCategory("unknown")).toBeNull();
  });

  it("resolves db category and breadcrumb from taxonomy selection", () => {
    expect(resolveDbCategory("graphic", "logo")).toBe("Graphic / Branding");
    expect(resolveDbCategory("uiux", "website")).toBe("Web / App");
    const tags = mergeCategorySubTag(["cool"], "logo");
    expect(tags).toContain(categorySubTag("logo"));
    expect(formatCategoryBreadcrumb("Graphic / Branding", tags)).toBe("Graphic > Logo");
    expect(formatCategoryBreadcrumb("Graphic / Branding", [])).toBe("Graphic");
    expect(stripCategorySubTags(tags)).toEqual(["cool"]);
  });

  it("infers selection from saved fields", () => {
    expect(inferTaxonomySelection("UI/UX", [categorySubTag("dashboard")])).toEqual({
      parentId: "uiux",
      subId: "dashboard",
    });
    expect(inferTaxonomySelection("Photography", [])).toEqual({
      parentId: "photography",
      subId: null,
    });
  });

  it("matches style tags via aliases", () => {
    expect(projectMatchesStyleTags(["Logo", "branding"], ["logo"])).toBe(true);
    expect(projectMatchesStyleTags(["packaging"], ["logo"])).toBe(false);
    expect(projectMatchesStyleTags([], ["logo"])).toBe(false);
    expect(projectMatchesStyleTags(["x"], [])).toBe(true);
  });

  it("matches subs by category, tags, or catsub machine tag", () => {
    expect(projectMatchesSubs("Graphic / Branding", [], ["branding"])).toBe(true);
    expect(projectMatchesSubs("UI/UX", ["logo"], ["logo"])).toBe(true);
    expect(projectMatchesSubs("Photography", [categorySubTag("logo")], ["logo"])).toBe(true);
    expect(projectMatchesSubs("Photography", [], ["logo"])).toBe(false);
  });
});
