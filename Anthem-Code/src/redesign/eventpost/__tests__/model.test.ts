import { describe, expect, it } from "vitest";
import type { MyEventRow } from "@/server/queries/eventPost";
import type { Media } from "../../upload/model";
import { checksOf, emptyForm, fromRow, normalizeLink, placeText, shortDay, toSaveData, type EpForm } from "../model";

const UID = "82039b6d-cdf4-4c46-958a-d770d849382c";
const base = `https://x.supabase.co/storage/v1/object/public/project-media/anthem/${UID}/events/`;
const pic = (url: string, size: [number, number] | null = [1200, 800]): Media => ({ kind: "image", url, size, progress: null, name: "" });

const row = (over: Partial<MyEventRow> = {}): MyEventRow =>
  ({
    id: "e1",
    owner_id: UID,
    title: "Open call 2027",
    category: "open_call",
    starts_on: "2026-12-10",
    ends_on: "2026-12-20",
    time_note: "10:00–19:00",
    location_name: "BACC · Jim Thompson",
    location_note: "ชั้น 7",
    description: "about",
    organizer_name: "Org",
    cover_url: `${base}c.webp`,
    gallery_urls: [`${base}g1.webp`, `${base}g2.gif`],
    website_url: null,
    registration_url: "https://example.org/apply",
    ticket_url: "https://tix.example.org",
    registration_open: true,
    fee_type: "paid",
    fee_note: "200 บาท",
    sponsors: [{ name: "S" }],
    open_for_sponsors: true,
    project_ids: ["p1"],
    origin: "community",
    source_name: null,
    source_url: null,
    source_checked_at: null,
    status: "draft",
    review_note: null,
    submitted_at: null,
    published_at: null,
    is_pick: false,
    updated_at: "",
    slug: null,
    parent_id: null,
    insights: {
      deadline: "2026-12-05",
      eligibility: ["ทุกคน"],
      steps: ["ส่งพอร์ต", "รอผล"],
      benefits: ["รางวัล 10,000 บาท"],
      who_for: ["team line"],
      links: [{ label: "call.pdf", url: `${base}call.pdf`, kind: "download" }],
    },
    cover_width: 1600,
    cover_height: 900,
    media_sizes: { [`${base}g1.webp`]: [800, 1000] },
    ...over,
  }) as MyEventRow;

const filled = (over: Partial<EpForm> = {}): EpForm => ({ ...emptyForm(), type: "Exhibition", title: "T", start: "2026-12-10", venues: [{ id: "v1", val: "A" }], ...over });

describe("EventPost model", () => {
  it("opens an event into the form", () => {
    const { form, media, moreOpen } = fromRow(row());
    expect(form.type).toBe("Open Call");
    expect(form.venues.map((v) => v.val)).toEqual(["BACC", "Jim Thompson"]);
    expect(form.deadline).toBe("2026-12-05");
    expect(form.how).toBe("ส่งพอร์ต\nรอผล");
    expect(form.price).toBe("200");
    expect(form.link).toBe("https://example.org/apply");
    expect(form.pdf).toEqual({ name: "call.pdf", url: `${base}call.pdf` });
    expect(media[form.coverId!].size).toEqual([1600, 900]);
    expect(form.details.map((id) => media[id].size)).toEqual([[800, 1000], null]);
    expect(moreOpen).toBe(true);
  });

  it("reads online places, Talk and one-day events", () => {
    const { form } = fromRow(row({ location_name: "ออนไลน์", category: "talk_forum", ends_on: "2026-12-10" }));
    expect(form.place).toBe("Online");
    expect(form.type).toBe("Talk");
    expect(form.end).toBe("");
    expect(form.deadline).toBe("");
  });

  it("saves back what the form shows and keeps the rest", () => {
    const r = row();
    const { form, media } = fromRow(r);
    const d = toSaveData(form, media, r);
    expect(d.location_name).toBe("BACC · Jim Thompson");
    expect(d.location_note).toBe("ชั้น 7");
    expect(d.registration_url).toBe("https://example.org/apply");
    expect(d.website_url).toBeNull();
    expect(d.registration_open).toBe(true);
    expect(d.ticket_url).toBe("https://tix.example.org");
    expect(d.fee_note).toBe("200 บาท");
    expect(d.sponsors).toEqual([{ name: "S" }]);
    expect(d.project_ids).toEqual(["p1"]);
    expect(d.cover_size).toEqual([1600, 900]);
    expect(d.gallery_urls).toEqual([`${base}g1.webp`, `${base}g2.gif`]);
    expect(d.media_sizes).toEqual({ [`${base}c.webp`]: [1600, 900], [`${base}g1.webp`]: [800, 1000] });
    expect(d.insights).toEqual({
      deadline: "2026-12-05",
      eligibility: ["ทุกคน"],
      steps: ["ส่งพอร์ต", "รอผล"],
      benefits: ["รางวัล 10,000 บาท"],
      pdf: { label: "call.pdf", url: `${base}call.pdf` },
    });
  });

  it("leaves out pictures still uploading or failed, and clears open-call lines for other types", () => {
    const media = { c: pic(`${base}c.webp`), a: { ...pic(""), progress: 40 }, b: { ...pic(`${base}b.webp`), error: "x" }, d: pic(`${base}d.webp`, null) };
    const d = toSaveData(filled({ coverId: "c", details: ["a", "b", "d"], deadline: "2026-12-01", who: "x" }), media, null);
    expect(d.gallery_urls).toEqual([`${base}d.webp`]);
    expect(d.media_sizes).toEqual({ [`${base}c.webp`]: [1200, 800] });
    expect(d.ends_on).toBe("2026-12-10");
    expect(d.website_url).toBeNull();
    expect(d.insights).toEqual({ deadline: null, eligibility: [], steps: [], benefits: [], pdf: null });
    expect(d.sponsors).toEqual([]);
  });

  it("checks what the mock asks", () => {
    expect(checksOf(emptyForm()).ready).toBe(false);
    expect(checksOf(filled()).ready).toBe(true);
    expect(checksOf(filled()).list.map((c) => c.label)).toEqual(["Type", "Title", "Dates", "Place"]);
    const oc = checksOf(filled({ type: "Open Call" }));
    expect(oc.ok.link).toBe(false);
    expect(oc.ok.dl).toBe(false);
    expect(oc.list.map((c) => c.label)).toEqual(["Type", "Title", "Dates", "Place", "Link", "Deadline"]);
    expect(checksOf(filled({ type: "Open Call", link: "example.org/a", deadline: "2026-12-01" })).ready).toBe(true);
    expect(checksOf(filled({ fee: "Paid" })).ok.price).toBe(false);
    expect(checksOf(filled({ end: "2026-12-01" })).ok.dates).toBe(false);
    expect(checksOf(filled({ link: "https://bit.ly/x" })).ok.link).toBe(false);
    expect(checksOf(filled({ place: "Online", venues: [{ id: "v1", val: "" }] })).ok.place).toBe(true);
  });

  it("formats links, places and days", () => {
    expect(normalizeLink(" example.org ")).toBe("https://example.org");
    expect(normalizeLink("http://a.org")).toBe("https://a.org");
    expect(normalizeLink("https://a.org")).toBe("https://a.org");
    expect(placeText(filled({ venues: [{ id: "a", val: " A " }, { id: "b", val: "" }, { id: "c", val: "C" }] }))).toBe("A · C");
    expect(shortDay("2026-12-05")).toBe("5 Dec");
  });
});
