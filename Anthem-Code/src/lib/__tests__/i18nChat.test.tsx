import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { setLang, type Entry } from "@/lib/i18n";
import { CHAT } from "@/lib/i18n/chat";
import { ChatFilterRail } from "@/components/chat/ChatFilterRail";
import { DateSeparator } from "@/components/chat/MessageBubble";

const vars = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort().join(",");

afterEach(() => {
  cleanup();
  setLang("th");
});

describe("CHAT dictionary", () => {
  it("has every language and the same placeholders in each", () => {
    for (const [key, entry] of Object.entries(CHAT) as [string, Entry][]) {
      for (const lang of ["th", "en", "zh"] as const) {
        expect(entry[lang]?.trim(), `${key}.${lang}`).toBeTruthy();
        expect(vars(entry[lang]), `${key}.${lang} placeholders`).toBe(vars(entry.th));
      }
    }
  });
});

describe("chat shell follows the app language", () => {
  it("filter tabs: Thai stays as it was, English and Chinese are translated", () => {
    setLang("th");
    const { unmount } = render(<ChatFilterRail tab="all" onTabChange={() => {}} />);
    expect(screen.getByRole("button", { name: "งานจ้าง" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "ALL" })).toBeTruthy();
    unmount();

    setLang("en");
    render(<ChatFilterRail tab="all" onTabChange={() => {}} />);
    expect(screen.getByRole("group", { name: "Conversation type" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Hire" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Collab" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Groups" })).toBeTruthy();
    cleanup();

    setLang("zh");
    render(<ChatFilterRail tab="all" onTabChange={() => {}} />);
    expect(screen.getByRole("button", { name: "合作" })).toBeTruthy();
  });

  it("date separator says Today in the app language", () => {
    const now = new Date().toISOString();
    setLang("en");
    const { unmount } = render(<DateSeparator date={now} />);
    expect(screen.getByText("Today")).toBeTruthy();
    unmount();
    setLang("th");
    render(<DateSeparator date={now} />);
    expect(screen.getByText("วันนี้")).toBeTruthy();
  });
});
