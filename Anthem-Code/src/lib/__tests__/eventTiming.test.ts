import { afterEach, describe, expect, it, vi } from "vitest";
import { eventTiming } from "@/lib/exhibitionEvents";

describe("eventTiming", () => {
  afterEach(() => vi.useRealTimers());

  it("splits events into now / soon / done around today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-15T12:00:00"));
    expect(eventTiming({ starts_on: "2026-11-10", ends_on: "2026-11-20" })).toBe("now");
    expect(eventTiming({ starts_on: "2026-11-15", ends_on: null })).toBe("now");
    expect(eventTiming({ starts_on: "2026-12-01", ends_on: "2026-12-05" })).toBe("soon");
    expect(eventTiming({ starts_on: null, ends_on: null })).toBe("soon");
    expect(eventTiming({ starts_on: "2026-11-01", ends_on: "2026-11-14" })).toBe("done");
  });
});
