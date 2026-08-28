import { describe, expect, it } from "vitest";
import { buildInboxDocChips, hireDocKindShort } from "@/lib/inboxDocChips";

describe("hireDocKindShort", () => {
  it("maps hire document kinds to short labels", () => {
    expect(hireDocKindShort("quotation")).toBe("QT");
    expect(hireDocKindShort("invoice")).toBe("INV");
    expect(hireDocKindShort("receipt")).toBe("RCP");
  });
});

describe("buildInboxDocChips", () => {
  it("returns empty when there is no quote or document", () => {
    expect(buildInboxDocChips({})).toEqual([]);
    expect(buildInboxDocChips({ quote: { status: "draft" } })).toEqual([]);
  });

  it("shows a sent quote even without hire_documents", () => {
    expect(
      buildInboxDocChips({
        quote: { status: "sent", doc_number: "QT-2026-0001" },
      }),
    ).toEqual([{ key: "quote", kindLabel: "QT", number: "QT-2026-0001" }]);
  });

  it("dedupes quote against an issued quotation row", () => {
    expect(
      buildInboxDocChips({
        quote: { status: "accepted", doc_number: "QT-2026-0001" },
        docs: [{ id: "d1", kind: "quotation", doc_number: "QT-2026-0001" }],
      }),
    ).toEqual([{ key: "quote", kindLabel: "QT", number: "QT-2026-0001" }]);
  });

  it("keeps invoice and receipt after the quote", () => {
    expect(
      buildInboxDocChips({
        quote: { status: "paid", payload: { number: "QT-2026-0002" } },
        docs: [
          { id: "inv", kind: "invoice", doc_number: "INV-2026-0001" },
          { id: "rcp", kind: "receipt", doc_number: "RCP-2026-0001" },
        ],
      }),
    ).toEqual([
      { key: "quote", kindLabel: "QT", number: "QT-2026-0002" },
      { key: "inv", kindLabel: "INV", number: "INV-2026-0001" },
      { key: "rcp", kindLabel: "RCP", number: "RCP-2026-0001" },
    ]);
  });
});
