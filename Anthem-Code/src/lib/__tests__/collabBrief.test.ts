import { describe, expect, it } from "vitest";
import { formatCollabBriefChatText, isCollabBriefChatMessage } from "@/lib/collabBrief";

describe("collabBrief", () => {
  it("formats invite brief like hire (structured fields + contact)", () => {
    const text = formatCollabBriefChatText({
      project_title: "Journey Unknown",
      collab_types: ["joint-project"],
      timeline: "2026-07-23",
      message: "อยากร่วมทำซีรีส์สั้น",
      sender_username: "artist_a",
      sender_email: "artist@example.com",
    });
    expect(text).toContain("🤝 คำชวนคอลแลป");
    expect(text).toContain("อ้างอิง: Journey Unknown");
    expect(text).toContain("ประเภท: ร่วมโปรเจกต์");
    expect(text).toContain("ช่วงเวลา:");
    expect(text).toContain("อยากร่วมทำซีรีส์สั้น");
    expect(text).toContain("ติดต่อ: @artist_a · artist@example.com");
  });

  it("detects collab brief chat messages", () => {
    expect(isCollabBriefChatMessage("🤝 คำชวนคอลแลป\nอ้างอิง: Demo")).toBe(true);
  });
});
