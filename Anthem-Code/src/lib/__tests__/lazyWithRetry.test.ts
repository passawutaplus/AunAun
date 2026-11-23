import { describe, expect, it } from "vitest";
import { loadChunk } from "@/lib/lazyWithRetry";

const PENDING = Symbol("pending");
const settleOrPending = <T>(p: Promise<T>) =>
  Promise.race([p, new Promise<typeof PENDING>((resolve) => setTimeout(() => resolve(PENDING), 20))]);

describe("loadChunk", () => {
  it("returns the loaded module", async () => {
    const mod = { default: () => null };
    await expect(loadChunk(() => Promise.resolve(mod))).resolves.toBe(mod);
  });

  it("keeps suspending when Vite resolves a cancelled preload with undefined", async () => {
    const factory = () => Promise.resolve(undefined as unknown as { default: () => null });
    await expect(settleOrPending(loadChunk(factory))).resolves.toBe(PENDING);
  });

  it("still throws errors that are not chunk load errors", async () => {
    await expect(loadChunk(() => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
  });
});
