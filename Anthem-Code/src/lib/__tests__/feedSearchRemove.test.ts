import { beforeEach, describe, expect, it } from "vitest";
import { getFeedSearchQueries, recordFeedSearch, removeFeedSearch } from "@/lib/feedSearchSignals";

describe("removeFeedSearch", () => {
  beforeEach(() => localStorage.clear());

  it("drops one query regardless of case and keeps the rest", () => {
    recordFeedSearch("u1", "poster");
    recordFeedSearch("u1", "Logo");
    removeFeedSearch("u1", "LOGO");
    expect(getFeedSearchQueries("u1")).toEqual(["poster"]);
  });

  it("only touches the given history", () => {
    recordFeedSearch("u1", "poster");
    recordFeedSearch("u1:creators", "poster");
    removeFeedSearch("u1:creators", "poster");
    expect(getFeedSearchQueries("u1")).toEqual(["poster"]);
    expect(getFeedSearchQueries("u1:creators")).toEqual([]);
  });
});
