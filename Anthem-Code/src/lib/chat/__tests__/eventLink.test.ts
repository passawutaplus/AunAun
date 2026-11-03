import { describe, expect, it } from "vitest";
import { parseEventLink, stripEventLinkLine } from "@/lib/chat/eventLink";

const ID = "3a08479e-ec0b-40bd-b54c-cb1a2724460a";

describe("event links in chat", () => {
  it("finds the event id in a full or relative link", () => {
    expect(parseEventLink(`hi\n\nhttps://samecor.com/exhibition/${ID}`)).toBe(ID);
    expect(parseEventLink(`see /exhibition/${ID} ok`)).toBe(ID);
    expect(parseEventLink("no link here")).toBeNull();
    expect(parseEventLink("/exhibition/not-an-id")).toBeNull();
  });

  it("drops only the trailing link line", () => {
    expect(stripEventLinkLine(`สวัสดีครับ\nผู้สนับสนุน: A\n\nhttps://samecor.com/exhibition/${ID}`)).toBe(
      "สวัสดีครับ\nผู้สนับสนุน: A",
    );
    expect(stripEventLinkLine(`https://samecor.com/exhibition/${ID}`)).toBe("");
  });
});
