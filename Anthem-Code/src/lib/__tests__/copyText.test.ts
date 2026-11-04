import { afterEach, describe, expect, it, vi } from "vitest";
import { copyText } from "../copyText";

describe("copyText", () => {
  afterEach(() => vi.restoreAllMocks());

  it("uses the Clipboard API when it works", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    await copyText("hello");
    expect(writeText).toHaveBeenCalledWith("hello");
    vi.unstubAllGlobals();
  });

  it("falls back to execCommand when the Clipboard API is refused", async () => {
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    const exec = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", { value: exec, configurable: true });
    await copyText("https://samecor.com/exhibition/1");
    expect(exec).toHaveBeenCalledWith("copy");
    expect(document.querySelector("textarea")).toBeNull();
    vi.unstubAllGlobals();
  });

  it("rejects when every method fails", async () => {
    vi.stubGlobal("navigator", { ...navigator, clipboard: undefined });
    Object.defineProperty(document, "execCommand", { value: vi.fn().mockReturnValue(false), configurable: true });
    await expect(copyText("x")).rejects.toThrow();
    vi.unstubAllGlobals();
  });
});
