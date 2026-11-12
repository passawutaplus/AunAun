import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { setLang, tr, type Entry } from "@/lib/i18n";
import { CHAT_HIRE, formatHireDate } from "@/lib/i18n/chatHire";
import HirePaidCard from "@/components/chat/HirePaidCard";
import type { HirePaidChatPayload } from "@/lib/hirePaymentChat";

const vars = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort().join(",");

afterEach(() => {
  cleanup();
  setLang("th");
});

describe("CHAT_HIRE dictionary", () => {
  it("has every language and the same placeholders in each", () => {
    for (const [key, entry] of Object.entries(CHAT_HIRE) as [string, Entry][]) {
      for (const lang of ["th", "en", "zh"] as const) {
        expect(entry[lang]?.trim(), `${key}.${lang}`).toBeTruthy();
        expect(vars(entry[lang]), `${key}.${lang} placeholders`).toBe(vars(entry.th));
      }
    }
  });

  it("never says AI in any language", () => {
    for (const [key, entry] of Object.entries(CHAT_HIRE) as [string, Entry][]) {
      for (const lang of ["th", "en", "zh"] as const) {
        expect(/\bAI\b/.test(entry[lang]), `${key}.${lang}`).toBe(false);
      }
    }
  });
});

describe("hire cards follow the app language", () => {
  const payload = {
    offerTitle: "Logo design",
    offerAmountThb: 5000,
    paidAmountThb: 5000,
    orderId: null,
  } as unknown as HirePaidChatPayload;

  it("paid card title is translated, Thai stays as written", () => {
    setLang("en");
    const { unmount } = render(<HirePaidCard payload={payload} />);
    expect(screen.getByText(tr(CHAT_HIRE.paidTitle, undefined, "en"))).toBeTruthy();
    expect(screen.queryByText(CHAT_HIRE.paidTitle.th)).toBeNull();
    unmount();

    setLang("th");
    render(<HirePaidCard payload={payload} />);
    expect(screen.getByText(CHAT_HIRE.paidTitle.th)).toBeTruthy();
  });

  it("dates keep the short Thai form and show the full year elsewhere", () => {
    expect(formatHireDate(null)).toBe("—");
    expect(formatHireDate("2026-07-13", "en")).toMatch(/13 Jul 2026/);
    expect(formatHireDate("2026-07-13", "th")).toMatch(/69$/);
  });
});
