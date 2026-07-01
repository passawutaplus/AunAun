import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  buildIncomeCsvContent,
  buildTaxSummaryText,
  computeAccountantPreflight,
  defaultPackItems,
} from "@/components/dashboard/tax/buildAccountantPack";
import type { IncomeRecord } from "@/data/mockData";
import { estimateTax } from "@/components/dashboard/tax/taxMath";

const sampleIncomes: IncomeRecord[] = [
  {
    id: "1",
    month: "2026-01",
    client: "Client A",
    gross: 50000,
    withholding: 1500,
    whtRate: 3,
    certificateReceived: true,
    certificateStoragePath: "user/abc.pdf",
  },
];

describe("buildAccountantPack", () => {
  it("buildTaxSummaryText includes year and gross", () => {
    const est = estimateTax({
      incomes: sampleIncomes,
      expenseMethod: "lumpsum",
      workExpensesTotal: 0,
      personalDeduction: 60000,
      activeDeductions: 0,
    });
    const text = buildTaxSummaryText({
      year: 2026,
      incomes: sampleIncomes,
      est,
      expenseMethod: "lumpsum",
      brandName: "Test Brand",
    });
    expect(text).toContain("2026");
    expect(text).toContain("Test Brand");
    expect(text).toContain("50,000");
  });

  it("buildIncomeCsvContent has header row", () => {
    const csv = buildIncomeCsvContent(sampleIncomes);
    expect(csv.split("\n")[0]).toContain("เดือน");
    expect(csv).toContain("Client A");
  });

  it("computeAccountantPreflight counts WHT files", () => {
    const pf = computeAccountantPreflight(sampleIncomes, []);
    expect(pf.incomeCount).toBe(1);
    expect(pf.whtWithFile).toBe(1);
    expect(pf.whtMissing).toHaveLength(0);
  });

  it("defaultPackItems includes wht when path exists", () => {
    const items = defaultPackItems(sampleIncomes, []);
    expect(items.some((x) => x.kind === "wht")).toBe(true);
    expect(items.some((x) => x.kind === "readme")).toBe(true);
  });
});

describe("docZip integration", () => {
  it("can build zip with readme and csv paths", async () => {
    const { buildZipBlob } = await import("../docZip");
    const blob = await buildZipBlob([
      { path: "so1o-tax-2026/00-README.txt", data: "hello" },
      { path: "so1o-tax-2026/01-income-detail.csv", data: "a,b" },
    ]);
    const zip = await JSZip.loadAsync(blob);
    expect(zip.file("so1o-tax-2026/00-README.txt")).toBeTruthy();
    expect(zip.file("so1o-tax-2026/01-income-detail.csv")).toBeTruthy();
  });
});
