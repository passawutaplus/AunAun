import { describe, expect, it, beforeEach } from "vitest";
import {
  pickPoolUrlBySeed,
  pickRandomPoolUrl,
  setAvatarPoolUrls,
  getGuestAvatarUrl,
  displayInitial,
  displayInitials,
} from "@/lib/avatarPool";

describe("avatarPool", () => {
  beforeEach(() => {
    setAvatarPoolUrls(["https://cdn/a.png", "https://cdn/b.png", "https://cdn/c.png"]);
    sessionStorage.clear();
  });

  it("picks stable url by seed", () => {
    const a = pickPoolUrlBySeed("phatsawut");
    const b = pickPoolUrlBySeed("phatsawut");
    expect(a).toBe(b);
    expect(a).toMatch(/^https:\/\/cdn\//);
  });

  it("returns random pool url", () => {
    expect(pickRandomPoolUrl()).toMatch(/^https:\/\/cdn\//);
  });

  it("stores guest avatar in sessionStorage", () => {
    const first = getGuestAvatarUrl();
    const second = getGuestAvatarUrl();
    expect(first).toBe(second);
  });

  it("formats display initial", () => {
    expect(displayInitial("ภัส")).toBe("ภ");
    expect(displayInitial("")).toBe("?");
  });

  it("formats two-letter default initials from username", () => {
    expect(displayInitials("nutth")).toBe("NU");
    expect(displayInitials("@nutth")).toBe("NU");
    expect(displayInitials("a")).toBe("A");
    expect(displayInitials("")).toBe("?");
    expect(displayInitials("passawut")).toBe("PA");
  });
});
