import { describe, expect, it } from "vitest";
import { insertHouseAd } from "@/lib/insertHouseAd";

const projects = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    kind: "project" as const,
    data: { id: String(i) },
    key: String(i),
  }));

describe("insertHouseAd", () => {
  it("inserts one card after 4 rows plus column offset", () => {
    const mixed = insertHouseAd(projects(20), { columns: 4, afterRows: 4, columnOffset: 1 });
    const houseAt = mixed.findIndex((item) => item.kind === "house");
    expect(mixed.filter((item) => item.kind === "house")).toHaveLength(1);
    expect(houseAt).toBe(17);
  });

  it("skips when there are fewer than 4 rows of works", () => {
    const mixed = insertHouseAd(projects(12), { columns: 4, afterRows: 4, columnOffset: 0 });
    expect(mixed.some((item) => item.kind === "house")).toBe(false);
  });

  it("clamps the slot when the fifth row is short", () => {
    const mixed = insertHouseAd(projects(16), { columns: 4, afterRows: 4, columnOffset: 3 });
    expect(mixed.findIndex((item) => item.kind === "house")).toBe(16);
  });
});
