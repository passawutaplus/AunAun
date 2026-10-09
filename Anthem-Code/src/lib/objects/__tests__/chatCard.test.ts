import { describe, expect, it } from "vitest";
import { formatObjectChatCard, parseObjectChatCard } from "@/lib/objects/chatCard";

describe("object chat card", () => {
  it("round-trips a product card", () => {
    const raw = formatObjectChatCard({
      id: "abc",
      title: "โคม",
      price_thb: 890,
      cover_url: "/objects/lamp.jpg",
    });
    expect(parseObjectChatCard(raw)).toEqual({
      id: "abc",
      title: "โคม",
      price_thb: 890,
      cover_url: "/objects/lamp.jpg",
    });
  });

  it("ignores normal chat text", () => {
    expect(parseObjectChatCard("สวัสดี")).toBeNull();
  });
});
