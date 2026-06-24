// Vitest setup — runs before every test file.
import "@testing-library/jest-dom/vitest";
import { vi, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// matchMedia mock (jsdom doesn't ship one)
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

// IntersectionObserver mock
if (typeof window !== "undefined" && !("IntersectionObserver" in window)) {
  // @ts-expect-error - test stub
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };
}

afterEach(() => {
  cleanup();
});
