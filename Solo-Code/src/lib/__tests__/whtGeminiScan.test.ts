import { describe, expect, it } from "vitest";

// Test JSON parsing logic via a minimal mirror of the helper
function parseJsonResponse(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  const body = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(body) as Record<string, unknown>;
}

describe("Gemini JSON response parsing", () => {
  it("parses raw JSON", () => {
    const out = parseJsonResponse('{"payerName":"บริษัท ABC","whtAmount":600}');
    expect(out.payerName).toBe("บริษัท ABC");
    expect(out.whtAmount).toBe(600);
  });

  it("parses fenced JSON", () => {
    const out = parseJsonResponse('```json\n{"whtAmountTextThai":"หกร้อยบาทถ้วน"}\n```');
    expect(out.whtAmountTextThai).toBe("หกร้อยบาทถ้วน");
  });
});
