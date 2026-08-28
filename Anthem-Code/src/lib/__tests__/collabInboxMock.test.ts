import { describe, expect, it } from "vitest";
import { catalogProjectId, catalogUserId } from "@/lib/communityCatalogIds";
import { isUuidLike } from "@/lib/uuid";
import {
  buildCollabInboxMockRequests,
  collabInboxMockProjects,
  isCollabInboxMockId,
  mergeCollabInboxMocks,
} from "@/lib/collabInboxMock";

describe("collabInboxMock", () => {
  it("tags mock request ids", () => {
    expect(isCollabInboxMockId("mock-collab-pending-pim")).toBe(true);
    expect(isCollabInboxMockId("real-uuid")).toBe(false);
  });

  it("uses seeded catalog senders and published works", () => {
    const rows = buildCollabInboxMockRequests(catalogUserId(0));
    expect(rows.length).toBeGreaterThanOrEqual(4);
    const pending = rows.find((r) => r.status === "pending" && r.project_id)!;
    expect(isUuidLike(pending.sender_id)).toBe(true);
    expect(pending.sender_id).toBe(catalogUserId(2));
    expect(pending.project_id).toBe(catalogProjectId(0));
    expect(pending.attached_project_ids).toContain(catalogProjectId(2));
    expect(collabInboxMockProjects()[pending.attached_project_ids[0]!]?.title).toBeTruthy();
  });

  it("does not send a mock invite from the logged-in catalog user", () => {
    const rows = buildCollabInboxMockRequests(catalogUserId(2));
    expect(rows.some((r) => r.sender_id === catalogUserId(2))).toBe(false);
  });

  it("prepends mocks without duplicating ids", () => {
    const mock = buildCollabInboxMockRequests("user-1")[0]!;
    const merged = mergeCollabInboxMocks([mock, { id: "live-1" }], "user-1");
    expect(merged.filter((r) => r.id === mock.id)).toHaveLength(1);
    expect(merged.some((r) => r.id === "live-1")).toBe(true);
  });
});

describe("isUuidLike", () => {
  it("accepts demo catalog ids that isUuid rejects", () => {
    expect(isUuidLike(catalogUserId(2))).toBe(true);
    expect(isUuidLike(catalogProjectId(2))).toBe(true);
    expect(isUuidLike("mock-sender-pim")).toBe(false);
  });
});
