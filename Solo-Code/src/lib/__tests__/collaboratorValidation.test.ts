import { describe, expect, it } from "vitest";
import { ensureSingleLead, validateCollaboratorRevenue } from "@/lib/collaboratorValidation";

describe("validateCollaboratorRevenue", () => {
  it("accepts empty revenue splits", () => {
    expect(validateCollaboratorRevenue([{ revenuePercent: null }])).toEqual({ ok: true });
  });

  it("requires total 100%", () => {
    expect(validateCollaboratorRevenue([{ revenuePercent: 60 }, { revenuePercent: 30 }])).toEqual({
      ok: false,
      message: expect.stringContaining("100%"),
    });
  });

  it("accepts total 100%", () => {
    expect(validateCollaboratorRevenue([{ revenuePercent: 70 }, { revenuePercent: 30 }])).toEqual({
      ok: true,
    });
  });
});

describe("ensureSingleLead", () => {
  it("requires exactly one lead", () => {
    expect(ensureSingleLead([{ role: "member" }, { role: "member" }])).toEqual({
      ok: false,
      message: "ต้องมี Lead 1 คนเท่านั้น",
    });
    expect(ensureSingleLead([{ role: "lead" }])).toEqual({ ok: true });
  });
});
