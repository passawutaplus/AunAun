import { describe, expect, it } from "vitest";
import { CSV_UTF8_BOM, toCsvForExcel } from "@/lib/csv";
import { createZipBlob, packTablesToCsvFiles } from "@/lib/admin/dataExport";

describe("dataExport", () => {
  it("packs tables into csv files with UTF-8 BOM for Excel Thai", () => {
    const files = packTablesToCsvFiles({
      generated_at: "2026-07-11T00:00:00Z",
      days: 30,
      pack: "full",
      row_limit: 5000,
      users: [{ user_id: "a", email: "a@b.c", display_name: "สมชาย" }],
      likes: [],
    });
    expect(files.some((f) => f.name === "_meta.json")).toBe(true);
    const users = files.find((f) => f.name.startsWith("users_") && f.name.endsWith(".csv"));
    expect(users?.content.startsWith(CSV_UTF8_BOM)).toBe(true);
    expect(users?.content).toContain("user_id");
    expect(users?.content).toContain("สมชาย");
    const likes = files.find((f) => f.name.startsWith("likes_"));
    expect(likes?.content.startsWith(CSV_UTF8_BOM)).toBe(true);
  });

  it("toCsvForExcel prefixes BOM", () => {
    const csv = toCsvForExcel([{ msg: "สวัสดี" }]);
    expect(csv.startsWith(CSV_UTF8_BOM)).toBe(true);
    expect(csv).toContain("สวัสดี");
  });

  it("builds a zip blob", () => {
    const blob = createZipBlob([
      { name: "a.csv", content: `${CSV_UTF8_BOM}x,y\n1,2\n` },
      { name: "b.csv", content: CSV_UTF8_BOM },
    ]);
    expect(blob.type).toBe("application/zip");
    expect(blob.size).toBeGreaterThan(40);
  });
});
