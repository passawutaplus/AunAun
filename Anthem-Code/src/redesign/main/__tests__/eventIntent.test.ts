import { describe, expect, it } from "vitest";
import { dateRange, hasIntent, intentSummary, parseEventIntent, toggleIntentWord } from "../eventIntent";
import { provincesNear } from "../thaiProvinces";
import { rankLocally, searchArgs } from "../useEventSearch";

const SAT = "2026-11-28"; // a Saturday
const WED = "2026-12-02";
const SUN = "2026-11-29";
const parse = (s: string, today = SAT) => parseEventIntent(s, today);

describe("Event search sentence", () => {
  it("understands the owner's example", () => {
    const i = parse("ฉันอยากไปงานวาดรูปฟรีที่เชียงใหม่เสาร์นี้", WED);
    expect(i.categories).toEqual(["workshop"]);
    expect(i.free).toBe(true);
    expect(i.provinces.map((p) => p.name)).toEqual(["เชียงใหม่"]);
    expect(i.range).toEqual({ from: "2026-12-05", to: "2026-12-05" });
    expect(i.keywords).toEqual([]);
    expect(intentSummary(i)).toBe("งานวาดรูป · ฟรี · เชียงใหม่ · เสาร์นี้");
  });

  it("maps type words to the six event types", () => {
    expect(parse("เวิร์กช็อปเซรามิก").categories).toEqual(["workshop"]);
    expect(parse("ตลาดนัดอาร์ตทอย").categories).toEqual(["art_fair"]);
    expect(parse("มีบูธขายของไหม").categories).toEqual(["art_fair"]);
    expect(parse("ประกวดภาพถ่าย").categories).toEqual(["open_call"]);
    expect(parse("open call for artists").categories).toEqual(["open_call"]);
    expect(parse("รับสมัครศิลปิน").categories).toEqual(["open_call"]);
    expect(parse("ทอล์กดีไซน์").categories).toEqual(["talk_forum"]);
    expect(parse("สัมมนา").categories).toEqual(["talk_forum"]);
    expect(parse("นิทรรศการภาพพิมพ์").categories).toEqual(["exhibition"]);
    expect(parse("อยากไปดูงาน").categories).toEqual(["exhibition"]);
    expect(parse("sketch club bangkok").categories).toEqual(["meetup"]);
    expect(parse("meetup").categories).toEqual(["meetup"]);
  });

  it("drawing words mean a workshop only when no other type is named", () => {
    const i = parse("ประกวดวาดรูป");
    expect(i.categories).toEqual(["open_call"]);
    expect(i.boost).toContain("วาด");
    expect(intentSummary(i)).toBe("งานวาดรูป · Open Call");
  });

  it("turns what is left into keywords with their twins", () => {
    const i = parse("เวิร์กช็อปเซรามิกที่กรุงเทพ");
    expect(i.keywords).toEqual(["เซรามิก|เซรามิค|ceramic|ceramics|pottery|ปั้นดิน|ปั้น"]);
    expect(i.provinces.map((p) => p.label)).toEqual(["กรุงเทพฯ"]);
    expect(intentSummary(i)).toBe("Workshop · กรุงเทพฯ · “เซรามิก”");
    expect(parse("งานคราฟต์แถวเชียงใหม่").keywords[0]).toMatch(/^คราฟต์\|/);
    expect(parse("อยากดูนิทรรศการภาพถ่ายเดือนหน้า").keywords[0]).toMatch(/^ภาพถ่าย\|/);
    expect(parse("งานดีไซน์").keywords[0]).toMatch(/^ดีไซน์\|/);
  });

  it("drops everyday words", () => {
    expect(parse("ฉันอยากไปงาน").empty).toBe(true);
    expect(parse("มีงานอะไรบ้างครับ").empty).toBe(true);
    expect(parse("I want to go to an art event").empty).toBe(true);
    expect(parse("   ").empty).toBe(true);
  });

  it("does not take look-alike words", () => {
    expect(parse("หางานฟรีแลนซ์").free).toBe(false);
    expect(parse("freelance").free).toBe(false);
    expect(parse("การตลาด").categories).toEqual([]);
    expect(parse("ไปเลย").provinces).toEqual([]);
    expect(parse("จังหวัดเลย").provinces.map((p) => p.name)).toEqual(["เลย"]);
    expect(parse("ตลาดน้อย").categories).toEqual([]);
    expect(parse("ตลาดน้อย").keywords).toEqual(["ตลาดน้อย"]);
    expect(parse("อยุธยา").provinces.map((p) => p.name)).toEqual(["พระนครศรีอยุธยา"]);
  });

  it("knows provinces in Thai, English and by town", () => {
    expect(parse("chiang mai").provinces.map((p) => p.name)).toEqual(["เชียงใหม่"]);
    expect(parse("หัวหิน").provinces.map((p) => p.name)).toEqual(["ประจวบคีรีขันธ์"]);
    expect(parse("พัทยา").provinces.map((p) => p.name)).toEqual(["ชลบุรี"]);
    expect(parse("กทม").provinces.map((p) => p.label)).toEqual(["กรุงเทพฯ"]);
    expect(parse("กรุงเทพฯ หรือ นนทบุรี").provinces).toHaveLength(2);
  });

  it("reads free words", () => {
    expect(parse("free").free).toBe(true);
    expect(parse("ไม่เสียค่าใช้จ่าย").free).toBe(true);
    expect(parse("เข้าชมฟรี").free).toBe(true);
  });
});

describe("time words", () => {
  it("today / tomorrow", () => {
    expect(parse("วันนี้").range).toEqual({ from: SAT, to: SAT });
    expect(parse("พรุ่งนี้").range).toEqual({ from: SUN, to: SUN });
  });

  it("this Saturday and the weekend from any day", () => {
    expect(parse("เสาร์นี้").range).toEqual({ from: SAT, to: SAT });
    expect(parse("เสาร์นี้", SUN).range).toEqual({ from: "2026-12-05", to: "2026-12-05" });
    expect(parse("สุดสัปดาห์นี้", WED).range).toEqual({ from: "2026-12-05", to: "2026-12-06" });
    expect(parse("สุดสัปดาห์นี้").range).toEqual({ from: SAT, to: SUN });
    expect(parse("สุดสัปดาห์นี้", SUN).range).toEqual({ from: SUN, to: SUN });
    expect(parse("เสาร์อาทิตย์นี้", WED).range).toEqual({ from: "2026-12-05", to: "2026-12-06" });
    expect(parse("this weekend", WED).range).toEqual({ from: "2026-12-05", to: "2026-12-06" });
    expect(parse("สุดสัปดาห์หน้า", WED).range).toEqual({ from: "2026-12-12", to: "2026-12-13" });
  });

  it("weeks run Monday to Sunday; อาทิตย์นี้ = this week", () => {
    expect(parse("อาทิตย์นี้", WED).range).toEqual({ from: WED, to: "2026-12-06" });
    expect(parse("สัปดาห์หน้า", WED).range).toEqual({ from: "2026-12-07", to: "2026-12-13" });
    expect(parse("วันอาทิตย์", WED).range).toEqual({ from: "2026-12-06", to: "2026-12-06" });
    expect(parse("ศุกร์หน้า", WED).range).toEqual({ from: "2026-12-11", to: "2026-12-11" });
  });

  it("months", () => {
    expect(parse("เดือนนี้").range).toEqual({ from: SAT, to: "2026-11-30" });
    expect(parse("เดือนหน้า").range).toEqual({ from: "2026-12-01", to: "2026-12-31" });
    expect(parse("ธันวาคม").range).toEqual({ from: "2026-12-01", to: "2026-12-31" });
    expect(parse("ม.ค.").range).toEqual({ from: "2027-01-01", to: "2027-01-31" });
    expect(parse("กุมภา").range).toEqual({ from: "2027-02-01", to: "2027-02-28" });
    expect(parse("march").range).toEqual({ from: "2027-03-01", to: "2027-03-31" });
    expect(intentSummary(parse("งานเดือนธันวาคม"))).toBe("ธันวาคม");
  });

  it("several time words cover all of them", () => {
    expect(parse("วันนี้หรือพรุ่งนี้").range).toEqual({ from: SAT, to: SUN });
  });

  it("dateRange is exported for the list", () => {
    expect(dateRange("nextmonth", "2026-12-15")).toEqual({ from: "2027-01-01", to: "2027-01-31" });
  });
});

describe("quick chips", () => {
  it("add and take out their word", () => {
    const text = "วาดรูป เชียงใหม่";
    const on = toggleIntentWord(text, parse(text), "free");
    expect(on).toBe("วาดรูป เชียงใหม่ ฟรี");
    expect(hasIntent(parse(on), "free")).toBe(true);
    expect(toggleIntentWord(on, parse(on), "free")).toBe("วาดรูป เชียงใหม่");
    const glued = "วาดรูปฟรีเชียงใหม่";
    expect(toggleIntentWord(glued, parse(glued), "free")).toBe("วาดรูป เชียงใหม่");
    expect(toggleIntentWord("", parse(""), "weekend")).toBe("สุดสัปดาห์นี้");
    const wk = "ตลาดสุดสัปดาห์นี้";
    expect(hasIntent(parse(wk), "weekend")).toBe(true);
    expect(toggleIntentWord(wk, parse(wk), "weekend")).toBe("ตลาด");
  });

  it("near me", () => {
    const i = parse("เวิร์กช็อปใกล้ฉัน");
    expect(i.nearMe).toBe(true);
    expect(intentSummary(i, "เชียงใหม่")).toBe("Workshop · ใกล้ฉัน (เชียงใหม่)");
    expect(provincesNear(13.74, 100.53).map((p) => p.name)).toEqual(
      expect.arrayContaining(["กรุงเทพมหานคร", "นนทบุรี", "สมุทรปราการ"]),
    );
    expect(provincesNear(13.74, 100.53)[0].name).toBe("กรุงเทพมหานคร");
    expect(provincesNear(18.79, 98.99)[0].name).toBe("เชียงใหม่");
    expect(provincesNear(7.89, 98.4)[0].name).toBe("ภูเก็ต");
  });
});

describe("ranking in the browser (before the server search exists)", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ev = (id: string, o: Record<string, any>) => ({ id, title: id, category: "workshop", starts_on: "2026-12-05", ends_on: null, location_name: "", area: null, fee_type: "unspecified", parent_id: null, ...o }) as never;
  const rows = [
    ev("paint", { title: "Paint Club", location_name: "ถนนราชวงศ์ เชียงใหม่", fee_type: "paid" }),
    ev("sketch", { title: "Sketch Club", category: "meetup", location_name: "ท่าแพ เชียงใหม่", fee_type: "free" }),
    ev("bkk", { title: "Drawing workshop", location_name: "BACC", fee_type: "free" }),
    ev("ended", { starts_on: "2026-11-01", ends_on: "2026-11-20", location_name: "เชียงใหม่", fee_type: "free" }),
    ev("venue", { parent_id: "x", location_name: "เชียงใหม่", fee_type: "free" }),
  ];
  const args = (s: string) => searchArgs(parseEventIntent(s, "2026-12-02"), [], null);

  it("finds exact matches, never ended events or venues", () => {
    const hits = rankLocally(rows, args("วาดรูป กรุงเทพ ฟรี"), "2026-12-02");
    expect(hits.map((h) => h.id)).toEqual(["bkk"]);
    expect(hits[0].exact).toBe(true);
  });

  it("falls back to the nearest events when nothing matches everything", () => {
    const hits = rankLocally(rows, args("ฉันอยากไปงานวาดรูปฟรีที่เชียงใหม่เสาร์นี้"), "2026-12-02");
    expect(hits.every((h) => !h.exact)).toBe(true);
    expect(hits[0].id).toBe("paint");
    expect(hits.map((h) => h.id)).not.toContain("ended");
    expect(hits.map((h) => h.id)).not.toContain("venue");
  });

  it("a chosen type tab counts when the sentence names no type", () => {
    expect(searchArgs(parseEventIntent("เชียงใหม่", SAT), [], "meetup").categories).toEqual(["meetup"]);
    expect(searchArgs(parseEventIntent("ตลาด เชียงใหม่", SAT), [], "meetup").categories).toEqual(["art_fair"]);
  });
});
