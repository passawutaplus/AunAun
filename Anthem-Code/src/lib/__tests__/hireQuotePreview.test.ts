import { describe, expect, it } from "vitest";
import {
  hireQuoteCreateLocked,
  hireQuoteHasPreview,
  hireQuoteIsTerminalForNewOffer,
} from "@/lib/hireQuotePreview";

describe("hireQuoteHasPreview", () => {
  it("hides draft / declined / cancelled quotes", () => {
    expect(hireQuoteHasPreview(null)).toBe(false);
    expect(hireQuoteHasPreview({ status: "draft" })).toBe(false);
    expect(hireQuoteHasPreview({ status: "declined" })).toBe(false);
    expect(hireQuoteHasPreview({ status: "cancelled" })).toBe(false);
  });

  it("shows sent and accepted quotes", () => {
    expect(hireQuoteHasPreview({ status: "sent" })).toBe(true);
    expect(hireQuoteHasPreview({ status: "accepted" })).toBe(true);
    expect(hireQuoteHasPreview({ status: "paid" })).toBe(true);
  });
});

describe("hireQuoteCreateLocked", () => {
  it("locks a pending sent quote", () => {
    expect(
      hireQuoteCreateLocked({
        quote: { status: "sent", expires_at: new Date(Date.now() + 86_400_000).toISOString() },
      }),
    ).toBe(true);
  });

  it("unlocks after the sent quote expires", () => {
    expect(
      hireQuoteCreateLocked({
        quote: { status: "sent", expires_at: new Date(Date.now() - 1000).toISOString() },
        hasChatOffer: true,
      }),
    ).toBe(false);
    expect(
      hireQuoteIsTerminalForNewOffer({
        status: "sent",
        expires_at: new Date(Date.now() - 1000).toISOString(),
      }),
    ).toBe(true);
  });

  it("unlocks declined quotes even if the old offer is still in chat", () => {
    expect(
      hireQuoteCreateLocked({
        quote: { status: "declined" },
        hasChatOffer: true,
      }),
    ).toBe(false);
  });

  it("locks accepted/paid quotes with no order row (mock เอกสารตัวอย่าง)", () => {
    expect(hireQuoteCreateLocked({ quote: { status: "accepted" } })).toBe(true);
    expect(hireQuoteCreateLocked({ quote: { status: "paid" } })).toBe(true);
    expect(hireQuoteCreateLocked({ hasChatOffer: true })).toBe(true);
  });

  it("locks while an order is still active", () => {
    expect(
      hireQuoteCreateLocked({
        quote: { status: "accepted" },
        hasOrder: true,
        orderBlocksNewQuote: true,
        hasChatOffer: true,
      }),
    ).toBe(true);
  });

  it("allows a new quote after the order is finished", () => {
    expect(
      hireQuoteCreateLocked({
        quote: { status: "accepted" },
        hasOrder: true,
        orderBlocksNewQuote: false,
        hasChatOffer: true,
      }),
    ).toBe(false);
  });

  it("shows the create button when nothing has been sent", () => {
    expect(hireQuoteCreateLocked({})).toBe(false);
  });
});
