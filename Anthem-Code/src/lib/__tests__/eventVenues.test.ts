import { describe, expect, it } from "vitest";
import {
  emptyVenueDraft,
  featureActive,
  featuredCountdown,
  formatOpeningHours,
  googleMapsRouteUrl,
  groupVenuesByArea,
  parseOpeningHours,
  routeSummary,
  venueCounts,
  venueMapsUrl,
  venueOpenState,
  type EventVenue,
} from "../eventVenues";

/** Bangkok wall-clock time → Date (Bangkok = UTC+7). */
const bkk = (iso: string) => new Date(`${iso}+07:00`);

const museum = {
  opening_hours: [{ d: [0, 3, 4, 5, 6], o: "09:00", c: "16:00" }],
  starts_on: "2026-10-29",
  ends_on: "2027-02-28",
  date_note: null,
};

describe("venueOpenState", () => {
  it("is open inside the hours (Bangkok time)", () => {
    // 2026-11-04 is a Wednesday.
    expect(venueOpenState(museum, bkk("2026-11-04T10:30:00"))).toEqual({ kind: "open", label: "เปิดอยู่ · ถึง 16.00" });
  });
  it("uses Bangkok time, not UTC", () => {
    // 02:30 UTC Wednesday = 09:30 Bangkok.
    expect(venueOpenState(museum, new Date("2026-11-04T02:30:00Z")).kind).toBe("open");
  });
  it("says closed today on a closed weekday", () => {
    expect(venueOpenState(museum, bkk("2026-11-03T12:00:00")).label).toBe("ปิดวันนี้"); // Tuesday
  });
  it("before and after hours", () => {
    expect(venueOpenState(museum, bkk("2026-11-04T08:00:00")).label).toBe("เปิด 09.00");
    expect(venueOpenState(museum, bkk("2026-11-04T16:00:00")).kind).toBe("closed_now");
  });
  it("handles run dates and a date to be announced", () => {
    expect(venueOpenState(museum, bkk("2027-03-01T10:00:00")).kind).toBe("ended");
    expect(venueOpenState({ ...museum, starts_on: null, date_note: "รอประกาศ" }, bkk("2026-11-04T10:00:00")).kind).toBe(
      "not_started",
    );
  });
  it("unknown without hours", () => {
    expect(venueOpenState({ ...museum, opening_hours: [] }, bkk("2026-11-04T10:00:00")).kind).toBe("unknown");
  });
});

describe("groupVenuesByArea", () => {
  const v = (id: string, sort_order: number, area: string | null, is_special = false) =>
    ({ ...emptyVenueDraft(), id, parent_id: "p", sort_order, title: id, area, is_special, interest_count: 0 }) as EventVenue;
  it("numbers pins in list order and keeps area order of first appearance", () => {
    const groups = groupVenuesByArea([v("c", 3, "B"), v("a", 1, "A"), v("b", 2, "A"), v("d", 4, null)]);
    expect(groups.map((g) => g.area)).toEqual(["A", "B", null]);
    expect(groups[0].venues.map((x) => x.pin)).toEqual([1, 2]);
    expect(groups[1].venues[0].pin).toBe(3);
  });
  it("counts specials apart", () => {
    expect(venueCounts([v("a", 1, null), v("b", 2, null, true)])).toEqual({ main: 1, special: 1 });
  });
});

describe("venueMapsUrl", () => {
  it("searches by name when coordinates are approximate", () => {
    expect(venueMapsUrl({ title: "วัดโพธิ์", name_en: "Wat Pho", address: null, lat: 13.7, lng: 100.4, coords_approx: true })).toContain(
      "query=Wat%20Pho",
    );
  });
  it("uses lat,lng when exact", () => {
    expect(venueMapsUrl({ title: "x", name_en: null, address: null, lat: 13.7, lng: 100.4, coords_approx: false })).toContain(
      "query=13.7%2C100.4",
    );
  });
});

describe("featured", () => {
  it("counts down", () => {
    expect(featuredCountdown("2026-10-29", "2027-02-28", bkk("2026-11-04T23:30:00"))).toBe("กำลังจัด · เหลือ 116 วัน");
    expect(featuredCountdown("2026-11-07", "2026-11-10", bkk("2026-11-04T10:00:00"))).toBe("เริ่มใน 3 วัน");
    expect(featuredCountdown("2026-11-05", null, bkk("2026-11-04T10:00:00"))).toBe("เริ่มพรุ่งนี้");
    expect(featuredCountdown("2026-11-01", "2026-11-04", bkk("2026-11-04T10:00:00"))).toBe("กำลังจัด · วันสุดท้าย");
    expect(featuredCountdown("2026-11-01", "2026-11-03", bkk("2026-11-04T10:00:00"))).toBeNull();
  });
  it("respects the pin end date", () => {
    const now = bkk("2026-11-04T10:00:00");
    expect(featureActive({ is_featured: true, featured_until: null }, now)).toBe(true);
    expect(featureActive({ is_featured: true, featured_until: "2026-11-04" }, now)).toBe(true);
    expect(featureActive({ is_featured: true, featured_until: "2026-11-03" }, now)).toBe(false);
    expect(featureActive({ is_featured: false }, now)).toBe(false);
  });
});

describe("opening hours text", () => {
  it("parses English, Thai and daily lines", () => {
    expect(parseOpeningHours("mon-sat 09:00-18:00\nsun 08.00-17.00")).toEqual([
      { d: [1, 2, 3, 4, 5, 6], o: "09:00", c: "18:00" },
      { d: [0], o: "08:00", c: "17:00" },
    ]);
    expect(parseOpeningHours("ทุกวัน 8:00-19:30")).toEqual([{ d: [0, 1, 2, 3, 4, 5, 6], o: "08:00", c: "19:30" }]);
    expect(parseOpeningHours("wed-sun 09:00-16:00")?.[0].d).toEqual([0, 3, 4, 5, 6]);
    expect(parseOpeningHours("อ-อา 10:00-20:00")?.[0].d).toEqual([0, 2, 3, 4, 5, 6]);
  });
  it("rejects unreadable lines", () => {
    expect(parseOpeningHours("sometimes 9-5")).toBeNull();
    expect(parseOpeningHours("mon 18:00-09:00")).toBeNull();
  });
  it("round-trips", () => {
    const rules = [{ d: [1, 2, 3, 4, 5, 6], o: "08:00", c: "19:00" }, { d: [0], o: "08:00", c: "17:00" }];
    expect(parseOpeningHours(formatOpeningHours(rules))).toEqual(rules);
    expect(parseOpeningHours("")).toEqual([]);
  });
});

describe("my route", () => {
  const stop = (name: string, lat: number) => ({ id: name, title: name, name_en: name, address: null, lat, lng: 100.5, coords_approx: true });
  it("builds a walking Google Maps route through the stops", () => {
    expect(googleMapsRouteUrl([stop("A", 13.7)])).toBeNull();
    const url = googleMapsRouteUrl([stop("A", 13.7), stop("B", 13.71), stop("C", 13.72)])!;
    expect(url).toContain("travelmode=walking");
    expect(url).toContain("origin=A%2C+Bangkok");
    expect(url).toContain("waypoints=B%2C+Bangkok");
    expect(url).toContain("destination=C%2C+Bangkok");
  });
  it("summarises distance and walking time", () => {
    expect(routeSummary(6462, 5172)).toBe("6.5 กม. · เดิน ~1 ชม. 26 นาที");
    expect(routeSummary(800, 600)).toBe("800 ม. · เดิน ~10 นาที");
  });
});
