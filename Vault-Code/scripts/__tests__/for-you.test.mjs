import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  activeHidden, hideUntil, needsYouMarkup, needsYouRows, projectGapCard, recentMarkup, recentStrip, relativeDay,
  spaceLists, spacesMarkup, summaryParts, topOfMindMarkup, UNSORTED_DAYS, weekInColor, weekMarkup, weeklyPalette,
} from "../../outputs/a-plus-vault/modules/for-you.js";
import { isUnsorted } from "../../outputs/a-plus-vault/modules/origin.js";

// Tuesday 6 Oct 2026, local time, so the Monday-to-Sunday week does not depend on the machine's zone.
const NOW = new Date(2026, 9, 6, 12).getTime();
const DAY = 86400000;
const dist = (a, b) => {
  const n = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [n(a), n(b)];
  return Math.sqrt(x.reduce((s, v, i) => s + (v - y[i]) ** 2, 0));
};
const img = (id, extra = {}) => ({ id, type: "image", title: id, thumbnailUrl: `https://img.test/${id}.jpg`, createdAt: NOW - DAY, projectIds: [], collectionIds: ["all"], analysis: { colors: ["#ff0000", "#00ff00", "#0000ff"] }, captureContext: {}, ...extra });
const fiveFor = (pid, prefix = "p") => Array.from({ length: 5 }, (_, i) => img(prefix + i, { projectIds: [pid], collectionIds: ["c1"] }));

describe("project gaps", () => {
  it("asks for a palette when a project has 5+ images and none saved", () => {
    const project = { id: "p1", name: "Cafe" };
    const card = projectGapCard(project, fiveFor("p1"), NOW);
    assert.equal(card.action.type, "project-palette");
    assert.equal(projectGapCard({ ...project, palette: ["#112233"] }, fiveFor("p1"), NOW), null);
  });
  it("finds things kept for a project that are not in it yet", () => {
    const project = { id: "p1", name: "Cafe" };
    const items = [img("a", { captureContext: { keptFor: { reasons: ["color"], text: "", projectId: "p1" } } }), img("b")];
    const card = projectGapCard(project, items, NOW);
    assert.equal(card.action.type, "project-add");
    assert.deepEqual(card.itemIds, ["a"]);
  });
  it("warns about items without a named creator once there are three", () => {
    const project = { id: "p1", name: "Cafe", palette: ["#000000"] };
    const items = Array.from({ length: 3 }, (_, i) => img("w" + i, { projectIds: ["p1"], sourceUrl: "https://x.test/" + i, captureContext: { origin: "web" } }));
    assert.match(projectGapCard(project, items, NOW).id, /^proj-credit:/);
    items[0].captureContext.credit = { creators: ["Ana"] };
    assert.equal(projectGapCard(project, items, NOW), null);
  });
  it("notes a project that has been quiet for 30 days", () => {
    const project = { id: "p1", name: "Cafe", palette: ["#000000"] };
    assert.match(projectGapCard(project, [img("a", { projectIds: ["p1"], createdAt: NOW - 45 * DAY })], NOW).id, /^proj-stale:/);
    assert.equal(projectGapCard(project, [img("b", { projectIds: ["p1"], createdAt: NOW - 3 * DAY })], NOW), null);
  });
});

describe("Needs you rows", () => {
  const base = { hidden: {}, now: NOW, isUnsorted };

  it("puts unsorted first, then project gaps with the most recently updated project first", () => {
    const projects = [{ id: "old", name: "Old", createdAt: NOW - 90 * DAY }, { id: "new", name: "New", createdAt: NOW - 90 * DAY }];
    const items = [img("u1"), ...fiveFor("old", "o").map(i => ({ ...i, createdAt: NOW - 20 * DAY })), ...fiveFor("new", "n").map(i => ({ ...i, createdAt: NOW - 2 * DAY }))];
    const rows = needsYouRows({ ...base, items, projects });
    assert.deepEqual(rows.map(r => r.kind), ["unsorted", "project", "project"]);
    assert.deepEqual(rows.slice(1).map(r => r.projectId), ["new", "old"]);
    assert.equal(rows[0].title, "1 thing still unsorted");
    assert.equal(rows[0].action.type, "unsorted");
  });

  it("shows at most 3 rows and 3 thumbnails per row", () => {
    const projects = Array.from({ length: 6 }, (_, i) => ({ id: "q" + i, name: "P" + i }));
    const items = [img("u1"), img("u2"), img("u3"), img("u4"), ...projects.flatMap(p => fiveFor(p.id, p.id))];
    const rows = needsYouRows({ ...base, items, projects });
    assert.equal(rows.length, 3);
    assert.ok(rows.every(r => r.previews.length <= 3));
  });

  it("counts only unsorted things kept in the last 14 days", () => {
    assert.equal(UNSORTED_DAYS, 14);
    const items = [img("fresh", { createdAt: NOW - 3 * DAY }), img("edge", { createdAt: NOW - 14 * DAY }), img("old", { createdAt: NOW - 15 * DAY }), img("sorted", { createdAt: NOW - DAY, collectionIds: ["c1"] })];
    assert.equal(needsYouRows({ ...base, items, projects: [] })[0].title, "2 things still unsorted");
    assert.deepEqual(needsYouRows({ ...base, items: [img("old", { createdAt: NOW - 30 * DAY })], projects: [] }), []);
  });

  it("skip for now hides that row for 7 days, brings the next one up, and never touches items", () => {
    const projects = [{ id: "p1", name: "Cafe" }];
    const items = [img("u1"), ...fiveFor("p1")];
    const skipped = needsYouRows({ ...base, items, projects, hidden: { unsorted: hideUntil(NOW) } });
    assert.deepEqual(skipped.map(r => r.kind), ["project"]);
    const later = needsYouRows({ ...base, items: [img("u1", { createdAt: NOW + 7 * DAY }), ...fiveFor("p1")], projects, hidden: { unsorted: hideUntil(NOW) }, now: NOW + 8 * DAY });
    assert.equal(later[0].kind, "unsorted");
    assert.deepEqual(items[0].collectionIds, ["all"]);
    assert.deepEqual(activeHidden({ a: NOW + DAY, b: NOW - 1 }, NOW), { a: NOW + DAY });
    assert.equal(hideUntil(NOW), NOW + 7 * DAY);
  });

  it("hides the whole section when there are no rows", () => {
    assert.equal(needsYouMarkup([]), "");
    assert.match(needsYouMarkup(needsYouRows({ ...base, items: [img("u1")], projects: [] })), /Needs you/);
  });
});

describe("Your week in color", () => {
  it("counts keeps per day, Monday to Sunday, and marks today", () => {
    const items = [
      img("mon", { createdAt: new Date(2026, 9, 5, 9).getTime() }),
      img("tue1", { createdAt: new Date(2026, 9, 6, 8).getTime() }),
      img("tue2", { createdAt: new Date(2026, 9, 6, 11).getTime() }),
      img("tue3", { createdAt: new Date(2026, 9, 6, 11, 30).getTime() }),
    ];
    const week = weekInColor(items, NOW, dist);
    assert.deepEqual(week.bars.map(b => b.count), [1, 3, 0, 0, 0, 0, 0]);
    assert.deepEqual(week.bars.map(b => b.label), ["M", "T", "W", "T", "F", "S", "S"]);
    assert.equal(week.bars.findIndex(b => b.today), 1);
    assert.equal(week.max, 3);
    assert.equal(week.total, 4);
    assert.ok(week.palette.includes("#ff0000"));
  });

  it("falls back to bars only when there are too few images for a palette", () => {
    const week = weekInColor([img("a", { createdAt: NOW - 1000 }), { id: "n", type: "note", title: "n", createdAt: NOW - 2000, analysis: {} }], NOW, dist);
    assert.equal(week.palette, null);
    assert.equal(week.total, 2);
    assert.doesNotMatch(weekMarkup(week), /fy-palette-bar/);
    assert.match(weekMarkup(week), /fy-bars/);
  });

  it("hides the section when nothing was kept in the last 7 days", () => {
    assert.equal(weekInColor([img("old", { createdAt: NOW - 10 * DAY })], NOW, dist), null);
    assert.equal(weekMarkup(null), "");
  });

  it("builds the palette from at least three recent images", () => {
    const week = Array.from({ length: 3 }, (_, i) => img("k" + i));
    assert.equal(weeklyPalette(week, NOW, dist).count, 3);
    assert.equal(weeklyPalette(week.slice(0, 2), NOW, dist), null);
  });
});

describe("Recently kept", () => {
  it("is the last 6 items that have a picture, newest first", () => {
    const items = Array.from({ length: 9 }, (_, i) => img("r" + i, { createdAt: NOW - i * 1000 }));
    items.push({ id: "note", type: "note", title: "text only", createdAt: NOW + 5000, analysis: {} });
    assert.deepEqual(recentStrip(items, 6).map(i => i.id), ["r0", "r1", "r2", "r3", "r4", "r5"]);
  });
  it("hides when empty and shows an origin chip per tile", () => {
    assert.equal(recentMarkup([]), "");
    assert.match(recentMarkup([{ ...img("a"), _origin: "museum" }]), /Museum/);
  });
});

describe("Your spaces", () => {
  const cols = Array.from({ length: 5 }, (_, i) => ({ id: "c" + i, name: "Col " + i }));
  it("lists at most 3 collections and 3 projects, most recent first, with totals", () => {
    const itemsIn = id => [img(id + "-a", { createdAt: NOW - Number(id.slice(1)) * DAY })];
    const projects = Array.from({ length: 4 }, (_, i) => ({ id: "p" + i, name: "Proj " + i, createdAt: NOW - (i + 1) * 10 * DAY }));
    const spaces = spaceLists({ collections: cols, projects, items: [], itemsIn, now: NOW });
    assert.equal(spaces.collections.total, 5);
    assert.deepEqual(spaces.collections.rows.map(r => r.id), ["c0", "c1", "c2"]);
    assert.equal(spaces.collections.rows[0].meta, "1 item · updated today");
    assert.equal(spaces.projects.total, 4);
    assert.equal(spaces.projects.rows.length, 3);
  });
  it("says 'Needs a palette' for a project with a gap", () => {
    const spaces = spaceLists({ collections: [], projects: [{ id: "p1", name: "Cafe" }], items: fiveFor("p1"), now: NOW });
    assert.equal(spaces.projects.rows[0].meta, "Needs a palette");
    assert.equal(spaces.projects.needPalette, 1);
  });
  it("hides when there is nothing to list", () => {
    assert.equal(spacesMarkup(spaceLists({}), 0), "");
    assert.match(spacesMarkup(spaceLists({ collections: cols.slice(0, 1), itemsIn: () => [] }), 2), /Collections/);
  });
  it("relative days and the summary line numbers", () => {
    assert.equal(relativeDay(NOW - 1000, NOW), "today");
    assert.equal(relativeDay(NOW - DAY, NOW), "yesterday");
    assert.equal(relativeDay(NOW - 3 * DAY, NOW), "3 days ago");
    assert.equal(relativeDay(NOW - 21 * DAY, NOW), "3 weeks ago");
    assert.deepEqual(summaryParts({ items: [1, 2, 3], collections: [1], projects: [1, 2] }), { kept: 3, collections: 1, projects: 2 });
  });
});

describe("Top of Mind", () => {
  it("shows five dashed slots and one line when nothing is pinned", () => {
    const html = topOfMindMarkup([]);
    assert.equal((html.match(/class='fy-slot'/g) || []).length, 5);
    assert.match(html, /Pin up to five things/);
  });
  it("fills slots with pins", () => {
    const html = topOfMindMarkup([img("a"), img("b")]);
    assert.equal((html.match(/class='fy-slot'/g) || []).length, 3);
    assert.equal((html.match(/class='fy-tom-item'/g) || []).length, 2);
  });
});
