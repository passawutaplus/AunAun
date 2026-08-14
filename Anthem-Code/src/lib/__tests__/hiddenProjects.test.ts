import { beforeEach, describe, expect, it } from "vitest";
import { getHiddenProjectIds, hideProjectId, resetHiddenProjectsForTests } from "../hiddenProjects";

describe("hiddenProjects", () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetHiddenProjectsForTests();
  });

  it("stores a hidden project id locally", () => {
    hideProjectId("proj-1");
    expect(getHiddenProjectIds().has("proj-1")).toBe(true);
    expect(JSON.parse(window.localStorage.getItem("aplus1:hidden-projects") ?? "[]")).toContain("proj-1");
  });
});
