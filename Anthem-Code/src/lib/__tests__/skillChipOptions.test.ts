import { describe, expect, it } from "vitest";
import { canonicalizeSkillChip } from "@/data/skillChipOptions";

describe("canonicalizeSkillChip", () => {
  it("maps Thai catalog skills onto English labels", () => {
    expect(canonicalizeSkillChip("ออกแบบแพ็กเกจ")).toBe("Package Design");
    expect(canonicalizeSkillChip("ทำแบรนดิ้ง")).toBe("Branding");
    expect(canonicalizeSkillChip("Package Design")).toBe("Package Design");
  });

  it("keeps a custom skill as typed", () => {
    expect(canonicalizeSkillChip("Exhibition design")).toBe("Exhibition design");
  });
});
