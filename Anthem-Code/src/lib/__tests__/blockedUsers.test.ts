import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { fetchBlockedUserIds, isBlockedBetween, withoutBlocked } from "@/lib/blockedUsers";

type Result = { data: unknown; error: unknown };

/** Minimal stand-in for the supabase client: `rpc` resolves to `rpcResult`, table queries to `tableResult`. */
function fakeClient(rpcResult: Result, tableResult: Result = { data: [], error: null }) {
  const calls: { rpc: unknown[][]; or: string[]; eq: unknown[][] } = { rpc: [], or: [], eq: [] };
  const builder = {
    select: () => builder,
    eq: (...args: unknown[]) => {
      calls.eq.push(args);
      return builder;
    },
    or: (filter: string) => {
      calls.or.push(filter);
      return builder;
    },
    limit: () => builder,
    then: (resolve: (r: Result) => unknown) => Promise.resolve(tableResult).then(resolve),
  };
  const client = {
    rpc: (...args: unknown[]) => {
      calls.rpc.push(args);
      return Promise.resolve(rpcResult);
    },
    from: () => builder,
  };
  return { client: client as never, calls };
}

describe("fetchBlockedUserIds", () => {
  it("returns ids from both directions via the RPC", async () => {
    const { client, calls } = fakeClient({ data: ["blocked-by-me", "blocked-me"], error: null });
    const ids = await fetchBlockedUserIds("me", client);
    expect([...ids].sort()).toEqual(["blocked-by-me", "blocked-me"]);
    expect(calls.rpc[0][0]).toBe("get_blocked_user_ids");
  });

  it("accepts row-shaped RPC payloads and never includes the viewer", async () => {
    const { client } = fakeClient({
      data: [{ get_blocked_user_ids: "a" }, { get_blocked_user_ids: "me" }],
      error: null,
    });
    expect([...(await fetchBlockedUserIds("me", client))]).toEqual(["a"]);
  });

  it("falls back to the viewer's own blocks when the RPC is missing", async () => {
    const { client, calls } = fakeClient(
      { data: null, error: { message: "function not found" } },
      { data: [{ blocked_id: "x" }], error: null },
    );
    expect([...(await fetchBlockedUserIds("me", client))]).toEqual(["x"]);
    expect(calls.eq).toContainEqual(["blocker_id", "me"]);
  });

  it("throws when the fallback query fails", async () => {
    const { client } = fakeClient(
      { data: null, error: { message: "nope" } },
      { data: null, error: new Error("boom") },
    );
    await expect(fetchBlockedUserIds("me", client)).rejects.toThrow("boom");
  });
});

describe("isBlockedBetween", () => {
  it("uses the RPC answer", async () => {
    const { client, calls } = fakeClient({ data: true, error: null });
    await expect(isBlockedBetween("me", "them", client)).resolves.toBe(true);
    expect(calls.rpc[0]).toEqual(["is_blocked_with", { _other: "them" }]);
  });

  it("falls back to a query that covers both directions", async () => {
    const { client, calls } = fakeClient(
      { data: null, error: { message: "missing" } },
      { data: [{ blocker_id: "them" }], error: null },
    );
    await expect(isBlockedBetween("me", "them", client)).resolves.toBe(true);
    expect(calls.or[0]).toContain("and(blocker_id.eq.me,blocked_id.eq.them)");
    expect(calls.or[0]).toContain("and(blocker_id.eq.them,blocked_id.eq.me)");
  });

  it("is false when no block exists", async () => {
    const { client } = fakeClient({ data: false, error: null });
    await expect(isBlockedBetween("me", "them", client)).resolves.toBe(false);
  });
});

describe("withoutBlocked", () => {
  const items = [
    { id: 1, owner_id: "a" },
    { id: 2, owner_id: "b" },
    { id: 3, owner_id: null },
  ];

  it("drops items owned by blocked users and keeps ownerless items", () => {
    expect(withoutBlocked(items, new Set(["a"]), (i) => i.owner_id).map((i) => i.id)).toEqual([2, 3]);
  });

  it("returns the same array when nothing is blocked", () => {
    expect(withoutBlocked(items, new Set(), (i) => i.owner_id)).toBe(items);
    expect(withoutBlocked(items, undefined, (i) => i.owner_id)).toBe(items);
  });
});
