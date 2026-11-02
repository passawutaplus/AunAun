import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: vi.fn() },
}));

import { supabase } from "@/integrations/supabase/client";
import { postChatSystemEvent } from "@/lib/chatSystemEvents";

describe("postChatSystemEvent", () => {
  beforeEach(() => vi.mocked(supabase.rpc).mockReset());

  it("sends only the event kind and ids, never message text", async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: "msg-1", error: null } as never);

    const id = await postChatSystemEvent({ conversationId: "conv-1", event: "hire_paid", refId: "order-1" });

    expect(id).toBe("msg-1");
    expect(supabase.rpc).toHaveBeenCalledWith("post_chat_system_event", {
      p_conversation_id: "conv-1",
      p_event: "hire_paid",
      p_ref_id: "order-1",
      p_fields: null,
    });
  });

  it("passes collab plan field keys", async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: "msg-2", error: null } as never);

    await postChatSystemEvent({ conversationId: "conv-1", event: "collab_plan_edited", fields: ["what", "roles"] });

    expect(vi.mocked(supabase.rpc).mock.calls[0][1]).toMatchObject({ p_ref_id: null, p_fields: ["what", "roles"] });
  });

  it("returns null when the server posts nothing", async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: null } as never);

    await expect(postChatSystemEvent({ conversationId: "conv-1", event: "chat_opened" })).resolves.toBeNull();
  });

  it("maps a block to a friendly error", async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: { message: "CHAT_BLOCKED" } } as never);

    await expect(
      postChatSystemEvent({ conversationId: "conv-1", event: "collab_closed" }),
    ).rejects.toThrow("ส่งข้อความหาผู้ใช้นี้ไม่ได้");
  });

  it("rethrows other errors", async () => {
    const err = { message: "EVENT_NOT_FOUND" };
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: err } as never);

    await expect(
      postChatSystemEvent({ conversationId: "conv-1", event: "hire_receipt", refId: "x" }),
    ).rejects.toBe(err);
  });
});
