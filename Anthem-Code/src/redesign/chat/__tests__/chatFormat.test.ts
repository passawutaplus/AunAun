import { describe, expect, it } from "vitest";
import { dayWord, docOf, eventOf, listTime, msgKind, msgLabel, newDay, objectOf, quoteText, textOf } from "../chatFormat";

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

  it("leaves out system lines, hiring blobs and empty messages", () => {
    expect(msgKind(msg({ message_type: "system" }), now)).toBeNull();
    expect(msgKind(msg({ content: '__APLUS1_OFFER__:{"v":4}' }), now)).toBeNull();
    expect(msgKind(msg({ content: "  " }), now)).toBeNull();
    expect(msgLabel(msg({ message_type: "system" }), now)).toBe("");
  });

  it("an unsent message keeps its place (old chat), a hidden one stays hidden", () => {
    expect(msgKind(msg({ deleted_at: at(29) }), now)).toBe("gone");
    expect(msgLabel(msg({ deleted_at: at(29) }), now)).toBe("ข้อความถูกยกเลิก");
    expect(msgKind(msg({ content: '__APLUS1_OFFER__:{"v":4}', deleted_at: at(29) }), now)).toBeNull();
  });

  it("quotes of replies are short words", () => {
    expect(quoteText(msg({ content: "สวัสดี" }), now)).toBe("สวัสดี");
    expect(quoteText(msg({ message_type: "image" }), now)).toBe("รูป");
    expect(quoteText(msg({ deleted_at: at(29) }), now)).toBe("ข้อความถูกยกเลิก");
    expect(quoteText(msg({ message_type: "system" }), now)).toBe("ข้อความ");
  });

  it("labels like the mock", () => {
    expect(msgLabel(msg({ message_type: "image" }), now)).toBe("ส่งรูป");
    expect(msgLabel(msg({ message_type: "project", project_id: "p", content: "Soft Machine" }), now)).toBe("แชร์ผลงาน Soft Machine");
  });

  it("old system lines written as text are left out", () => {
    expect(msgKind(msg({ content: "[context] คุยโอกาสจากผลงาน" }), now)).toBeNull();
  });

  it("document cards never show their JSON", () => {
    const doc = `__SAMECOR_DOC__:${JSON.stringify({ id: "d1", kind: "invoice", number: "INV-0001", title: "Poster", net: 1500 })}\nส่งใบแจ้งหนี้ INV-0001`;
    expect(msgKind(msg({ content: doc }), now)).toBe("doc");
    expect(msgLabel(msg({ content: doc }), now)).toBe("ใบแจ้งหนี้ INV-0001");
    const d = docOf(doc);
    expect([d.kind, d.number, d.title, d.net, d.card?.id]).toEqual(["ใบแจ้งหนี้", "INV-0001", "Poster", 1500, "d1"]);
    const part = `__SAMECOR_DOC__:${JSON.stringify({ id: "d2", kind: "invoice", number: "INV-0002", title: "", net: 750, installmentNo: 1, installmentTotal: 2 })}`;
    expect(docOf(part).kind).toBe("ใบแจ้งหนี้ · งวด 1/2");
    const broken = "__SAMECOR_DOC__:{not json";
    expect(msgKind(msg({ content: broken }), now)).toBe("doc");
    expect(msgLabel(msg({ content: broken }), now)).toBe("เอกสาร");
    expect(docOf(broken).card).toBeNull();
  });

  it("product cards never show their JSON", () => {
    const obj = `[[object]]${JSON.stringify({ id: "o1", title: "Mug", price_thb: 350, cover_url: null, qty: 2 })}`;
    expect(msgKind(msg({ content: obj }), now)).toBe("object");
    expect(msgLabel(msg({ content: obj }), now)).toBe("สินค้า Mug");
    expect(objectOf(obj)).toEqual({ id: "o1", title: "Mug", price: 350, cover: null, note: "2 ชิ้น" });
    expect(msgLabel(msg({ content: "[[object]]{oops" }), now)).toBe("สินค้า");
  });

  it("shared profiles and event links get cards", () => {
    expect(msgKind(msg({ message_type: "profile", content: "โปรไฟล์" }), now)).toBe("profile");
    expect(msgLabel(msg({ message_type: "profile", content: "โปรไฟล์" }), now)).toBe("แชร์โปรไฟล์");
    const id = "0a1b2c3d-0000-4000-8000-00000000abcd";
    const linked = msg({ content: `ไปงานนี้กัน\nhttps://samecor.com/exhibition/${id}` });
    expect(eventOf(linked)).toBe(id);
    expect(textOf(linked)).toBe("ไปงานนี้กัน");
    expect(msgLabel(linked, now)).toBe("ไปงานนี้กัน");
    expect(msgLabel(msg({ content: `/exhibition/${id}` }), now)).toBe("แชร์อีเวนต์");
    expect(eventOf(msg({ message_type: "project", project_id: "p", content: `/exhibition/${id}` }))).toBeNull();
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
