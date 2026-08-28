import { describe, expect, it } from "vitest";
import {
  collabInviteDisplay,
  formatCollabBriefChatText,
  isCollabBriefChatMessage,
  parseCollabChatEnvelope,
} from "@/lib/collabBrief";

describe("collabBrief", () => {
  it("formats invite brief with popup fields + contact", () => {
    const text = formatCollabBriefChatText({
      project_title: "Journey Unknown",
      project_cover_url: "https://cdn.example.com/cover.jpg",
      project_id: "11111111-1111-4111-8111-111111111111",
      collab_types: ["joint-project"],
      timeline: "2026-07-23",
      message: "อยากร่วมทำซีรีส์สั้น",
      reference_links: ["https://drive.google.com/file/demo"],
      sender_username: "artist_a",
      sender_email: "artist@example.com",
    });
    expect(text).toContain("🤝 คำชวนคอลแลป");
    expect(text).toContain("อ้างอิง: Journey Unknown");
    expect(text).toContain("ปกอ้างอิง: https://cdn.example.com/cover.jpg");
    expect(text).toContain("ผลงานอ้างอิง: 11111111-1111-4111-8111-111111111111");
    expect(text).toContain("อยากร่วมงานแบบไหน: ร่วมโปรเจกต์");
    expect(text).toContain("ลิงก์อ้างอิง:");
    expect(text).toContain("https://drive.google.com/file/demo");
    expect(text).toContain("ข้อความถึง:");
    expect(text).toContain("อยากร่วมทำซีรีส์สั้น");
    expect(text).toContain("ติดต่อ: @artist_a · artist@example.com");
  });

  it("parses seeded chat envelope into popup fields", () => {
    const text = formatCollabBriefChatText({
      project_title: "Journey Unknown",
      project_id: "11111111-1111-4111-8111-111111111111",
      collab_types: ["chat", "other"],
      other_type_note: "เวิร์กชอป",
      message: "อยากคุยไอเดีย\n\n---\nแนบภาพ:\nhttps://cdn.example.com/mood.jpg",
      reference_links: ["https://example.com/port"],
    });
    const parsed = parseCollabChatEnvelope(text);
    expect(parsed.projectTitle).toBe("Journey Unknown");
    expect(parsed.projectId).toBe("11111111-1111-4111-8111-111111111111");
    expect(parsed.collabTypesLabel).toBe("พูดคุย · อื่นๆ: เวิร์กชอป");
    expect(parsed.links).toEqual(["https://example.com/port"]);
    expect(parsed.attachments).toEqual(["https://cdn.example.com/mood.jpg"]);
    expect(parsed.personalMessage).toBe("อยากคุยไอเดีย");
  });

  it("prefers collab_requests columns over chat text", () => {
    const display = collabInviteDisplay({
      message: "🤝 คำชวนคอลแลป\nประเภท: พูดคุย\n\nข้อความเก่า",
      collab_types: ["joint-project"],
      external_drive_url: "https://drive.google.com/a",
      project_title: "From row",
      project_id: "22222222-2222-4222-8222-222222222222",
    });
    expect(display.collabTypesLabel).toBe("ร่วมโปรเจกต์");
    expect(display.links).toEqual(["https://drive.google.com/a"]);
    expect(display.projectTitle).toBe("From row");
    expect(display.projectId).toBe("22222222-2222-4222-8222-222222222222");
  });

  it("detects collab brief chat messages", () => {
    expect(isCollabBriefChatMessage("🤝 คำชวนคอลแลป\nอ้างอิง: Demo")).toBe(true);
  });
});
