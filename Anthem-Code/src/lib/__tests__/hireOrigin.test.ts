import { describe, expect, it } from "vitest";
import { countHiresByOrigin, filterHiresByOrigin, hireHasPackageOrigin } from "@/lib/hireOrigin";

describe("hireOrigin", () => {
  const brief = { id: "1", service_id: null };
  const pack = { id: "2", service_id: "svc-1" };
  const rows = [brief, pack];

  it("detects package origin from service_id", () => {
    expect(hireHasPackageOrigin(brief)).toBe(false);
    expect(hireHasPackageOrigin(pack)).toBe(true);
  });

  it("filters brief vs package", () => {
    expect(filterHiresByOrigin(rows, "all")).toEqual(rows);
    expect(filterHiresByOrigin(rows, "project")).toEqual([brief]);
    expect(filterHiresByOrigin(rows, "package")).toEqual([pack]);
  });

  it("counts origins", () => {
    expect(countHiresByOrigin(rows)).toEqual({ all: 2, project: 1, package: 1 });
  });
});
