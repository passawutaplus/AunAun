import { describe, expect, it } from "vitest";
import { dayWord, listTime, msgKind, msgLabel, newDay } from "../chatFormat";

const now = new Date(2026, 10, 29, 10, 0);
const at = (d: number, h = 9, mo = 10, y = 2026) => new Date(y, mo, d, h, 5).toISOString();
const msg = (over: Partial<Parameters<typeof msgKind>[0]>) => ({ sender_id: "a", content: "hi", message_type: "text", created_at: at(29), ...over });

describe("chat message kinds", () => {
  it("shows text, pictures, work cards and files", () => {
    expect(msgKind(msg({}), now)).toBe("text");
    expect(msgKind(msg({ message_type: "image", content: "", created_at: at(20) }), now)).toBe("img");
    expect(msgKind(msg({ message_type: "project", project_id: "p1" }), now)).toBe("work");
    expect(msgKind(msg({ message_type: "file" }), now)).toBe("file");
  });

  it("pictures older than 30 days are gone", () => {
    expect(msgKind(msg({ message_type: "image", created_at: at(20, 9, 9) }), now)).toBe("exp");
    expect(msgLabel(msg({ message_type: "image", created_at: at(20, 9, 9) }), now)).toBe("รูปหมดอายุแล้ว");
  });

  it("leaves out system lines, hiring blobs, unsent and empty messages", () => {
    expect(msgKind(msg({ message_type: "system" }), now)).toBeNull();
    expect(msgKind(msg({ content: '__APLUS1_OFFER__:{"v":4}' }), now)).toBeNull();
    expect(msgKind(msg({ deleted_at: at(29) }), now)).toBeNull();
    expect(msgKind(msg({ content: "  " }), now)).toBeNull();
    expect(msgLabel(msg({ message_type: "system" }), now)).toBe("");
  });

  it("labels like the mock", () => {
    expect(msgLabel(msg({ message_type: "image" }), now)).toBe("ส่งรูป");
    expect(msgLabel(msg({ message_type: "project", project_id: "p", content: "Soft Machine" }), now)).toBe("แชร์ผลงาน Soft Machine");
  });
});

describe("chat time words", () => {
  it("day line words", () => {
    expect(dayWord(at(29, 8), now)).toBe("Today");
    expect(dayWord(at(28, 23), now)).toBe("Yesterday");
    expect(dayWord(at(24), now)).toBe("Tue");
    expect(dayWord(at(2), now)).toBe("2 Nov");
    expect(dayWord(at(12, 9, 9, 2025), now)).toBe("12 Oct 2025");
  });

  it("room list shows the clock today, the day word before", () => {
    expect(listTime(at(29, 8), now)).toBe("08:05");
    expect(listTime(at(28), now)).toBe("Yesterday");
    expect(listTime(null, now)).toBe("");
  });

  it("a new day starts a day line", () => {
    expect(newDay(null, at(29))).toBe(true);
    expect(newDay(at(29, 8), at(29, 9))).toBe(false);
    expect(newDay(at(28, 23), at(29, 1))).toBe(true);
  });
});
