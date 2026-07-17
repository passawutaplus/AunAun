import { describe, expect, it } from "vitest";
import { parsePublicFeedStatsRpc } from "@/hooks/useFeedStats";

describe("parsePublicFeedStatsRpc", () => {
  it("accepts migrated RPC payload with successful_collabs", () => {
    expect(
      parsePublicFeedStatsRpc({
        designers: 10,
        projects: 20,
        hires: 3,
        successful_collabs: 7,
        collabs: 7,
      }),
    ).toEqual({
      designers: 10,
      projects: 20,
      hires: 3,
      successfulCollabs: 7,
    });
  });

  it("accepts successful_collabs of zero", () => {
    expect(
      parsePublicFeedStatsRpc({
        designers: 1,
        projects: 2,
        hires: 0,
        successful_collabs: 0,
        collabs: 0,
      }),
    ).toEqual({
      designers: 1,
      projects: 2,
      hires: 0,
      successfulCollabs: 0,
    });
  });

  it("rejects legacy payload that only has collabs (request count)", () => {
    expect(
      parsePublicFeedStatsRpc({
        designers: 10,
        projects: 20,
        hires: 3,
        collabs: 99,
      }),
    ).toBeNull();
  });

  it("rejects non-finite successful_collabs", () => {
    expect(
      parsePublicFeedStatsRpc({
        designers: 1,
        projects: 1,
        hires: 1,
        successful_collabs: Number.NaN,
      }),
    ).toBeNull();
    expect(
      parsePublicFeedStatsRpc({
        designers: 1,
        projects: 1,
        hires: 1,
        successful_collabs: "7",
      }),
    ).toBeNull();
  });

  it("unwraps array-wrapped RPC rows", () => {
    expect(
      parsePublicFeedStatsRpc([
        {
          designers: 4,
          projects: 5,
          hires: 1,
          successful_collabs: 2,
        },
      ]),
    ).toEqual({
      designers: 4,
      projects: 5,
      hires: 1,
      successfulCollabs: 2,
    });
  });
});
