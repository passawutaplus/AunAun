import { describe, expect, it } from "vitest";
import { keepPageInstance, pageTransitionKey } from "../PageTransition";

describe("pageTransitionKey", () => {
  it("keys ordinary pages by path and keeps shells stable", () => {
    expect(pageTransitionKey("/exhibition")).toBe("/exhibition");
    expect(pageTransitionKey("/chat/abc")).toBe("/chat");
    expect(pageTransitionKey("/forum/x")).toBe("/forum");
    expect(pageTransitionKey("/admin/users")).toBeNull();
  });

  it("first save of a new work keeps the mounted editor", () => {
    const before = pageTransitionKey("/portfolio/new");
    keepPageInstance("/portfolio/new", "/portfolio/w1/edit");
    expect(pageTransitionKey("/portfolio/w1/edit")).toBe(before);
  });

  it("the next new work starts on a fresh page", () => {
    const first = pageTransitionKey("/portfolio/w1/edit");
    const second = pageTransitionKey("/portfolio/new");
    expect(second).not.toBe(first);
    keepPageInstance("/portfolio/new", "/portfolio/w2/edit");
    expect(pageTransitionKey("/portfolio/w2/edit")).toBe(second);
    expect(pageTransitionKey("/portfolio/new")).not.toBe(second);
    expect(pageTransitionKey("/portfolio/w1/edit")).toBe(first);
  });

  it("other works are still keyed by their own path", () => {
    expect(pageTransitionKey("/portfolio/w9/edit")).toBe("/portfolio/w9/edit");
  });
});
