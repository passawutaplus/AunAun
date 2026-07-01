import { describe, expect, it } from "vitest";
import { buildBatchFilename, slugSegment } from "@/lib/docLabBatchRename";

describe("docLabBatchRename", () => {
  it("slugSegment strips unsafe chars", () => {
    expect(slugSegment("  Acme Co.  ")).toBe("Acme-Co.");
  });

  it("buildBatchFilename applies tokens", () => {
    expect(
      buildBatchFilename({
        pattern: "{client}-{project}-{date}-{n}",
        client: "บริษัท A",
        project: "Logo Design",
        date: "2026-07-01",
        index: 0,
      }),
    ).toBe("บริษัท-A-Logo-Design-2026-07-01-01.pdf");
  });

  it("keeps extension when pattern already has one", () => {
    expect(
      buildBatchFilename({
        pattern: "{name}.pdf",
        client: "x",
        project: "y",
        date: "2026-01-01",
        originalName: "mockup.png",
        ext: "pdf",
      }),
    ).toBe("mockup.pdf");
  });
});
