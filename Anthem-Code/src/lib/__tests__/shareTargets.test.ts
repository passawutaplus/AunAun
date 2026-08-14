import { describe, expect, it, vi, afterEach } from "vitest";
import {
  SHARE_TARGETS,
  messengerHref,
  sharePageHost,
} from "@/lib/shareTargets";

describe("shareTargets", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds direct share URLs for Facebook, LINE, WhatsApp, X, and email", () => {
    const url = "https://aplus1.app/project/1";
    const title = "ถา+โถม";
    const hrefOf = (key: string) => SHARE_TARGETS.find((t) => t.key === key)?.href(url, title);

    expect(hrefOf("facebook")).toContain("facebook.com/sharer");
    expect(hrefOf("line")).toContain("line.me");
    expect(hrefOf("whatsapp")).toContain("api.whatsapp.com/send");
    expect(hrefOf("whatsapp")).toContain(encodeURIComponent("ถา+โถม"));
    expect(hrefOf("x")).toContain("twitter.com/intent/tweet");
    expect(hrefOf("email")).toMatch(/^mailto:\?subject=/);
  });

  it("does not invent Instagram or WeChat share URLs", () => {
    const hrefOf = (key: string) =>
      SHARE_TARGETS.find((t) => t.key === key)?.href("https://aplus1.app/project/1", "งาน");
    expect(hrefOf("instagram")).toBeNull();
    expect(hrefOf("wechat")).toBeNull();
  });

  it("uses Messenger deep link only on mobile", () => {
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" });
    expect(messengerHref("https://aplus1.app/project/1")).toContain("fb-messenger://share");

    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" });
    expect(messengerHref("https://aplus1.app/project/1")).toBeNull();
  });

  it("reads a clean host for the preview card", () => {
    expect(sharePageHost("https://www.aplus1.app/project/1")).toBe("aplus1.app");
    expect(sharePageHost("not-a-url")).toBe("not-a-url");
  });
});
