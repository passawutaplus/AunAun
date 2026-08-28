import { describe, expect, it } from "vitest";
import { mapCollabRequestIdsWithPlans } from "@/lib/collabInboxPlans";

describe("mapCollabRequestIdsWithPlans", () => {
  it("returns empty when there is a conversation but no saved plan", () => {
    expect(
      mapCollabRequestIdsWithPlans(
        [{ id: "conv-1", request_id: "req-1" }],
        [],
      ),
    ).toEqual({});
  });

  it("maps only request ids whose conversation has a persisted plan", () => {
    expect(
      mapCollabRequestIdsWithPlans(
        [
          { id: "conv-plan", request_id: "req-accepted" },
          { id: "conv-empty", request_id: "req-pending" },
          { id: "conv-orphan", request_id: null },
        ],
        ["conv-plan"],
      ),
    ).toEqual({ "req-accepted": "conv-plan" });
  });
});
