import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { activeHidden, buildForYouCards, hideUntil, projectGapCard, weeklyPalette } from "../../outputs/a-plus-vault/modules/for-you.js";

const NOW = Date.UTC(2026, 9, 10, 12);
const DAY = 86400000;
const dist = (a, b) => {
  const n = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [n(a), n(b)];
  return Math.sqrt(x.reduce((s, v, i) => s + (v - y[i]) ** 2, 0));
};
const img = (id, extra = {}) => ({ id, type: "image", thumbnailUrl: `https://img.test/${id}.jpg`, createdAt: NOW - DAY, projectIds: [], collectionIds: ["all"], analysis: { colors: ["#ff0000", "#00ff00", "#0000ff"] }, captureContext: {}, ...extra });
const inboxOnly = i => (i.collectionIds || []).every(c => c === "all");

describe("For You cards", () => {
  it("asks for a palette when a project has 5+ images and none saved", () => {
    const project = { id: "p1", name: "Cafe" };
    const items = Array.from({ length: 5 }, (_, i) => img("a" + i, { projectIds: ["p1"] }));
    const card = projectGapCard(project, items, NOW);
    assert.equal(card.action.type, "project-palette");
    assert.equal(projectGapCard({ ...project, palette: ["#112233"] }, items, NOW), null);
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
    const items = [img("a", { projectIds: ["p1"], createdAt: NOW - 45 * DAY })];
    assert.match(projectGapCard(project, items, NOW).id, /^proj-stale:/);
    assert.equal(projectGapCard(project, [img("b", { projectIds: ["p1"], createdAt: NOW - 3 * DAY })], NOW), null);
  });

  it("builds the week's palette from at least three recent images", () => {
    const week = Array.from({ length: 3 }, (_, i) => img("k" + i));
    const pal = weeklyPalette(week, NOW, dist);
    assert.equal(pal.count, 3);
    assert.ok(pal.hexes.includes("#ff0000"));
    assert.equal(weeklyPalette(week.slice(0, 2), NOW, dist), null);
  });

  it("orders Inbox, project and palette cards, caps at five, and honours hidden cards", () => {
    const items = Array.from({ length: 5 }, (_, i) => img("n" + i, { projectIds: ["p1"] }));
    const ctx = { items, projects: [{ id: "p1", name: "Cafe" }], hidden: {}, now: NOW, isInbox: inboxOnly, distance: dist };
    const cards = buildForYouCards(ctx);
    assert.deepEqual(cards.map(c => c.kind), ["inbox", "project", "palette"]);
    const hidden = buildForYouCards({ ...ctx, hidden: { inbox: hideUntil(NOW) } });
    assert.deepEqual(hidden.map(c => c.kind), ["project", "palette"]);
    const manyProjects = Array.from({ length: 9 }, (_, i) => ({ id: "q" + i, name: "P" + i }));
    const lots = manyProjects.flatMap(p => Array.from({ length: 5 }, (_, i) => img(p.id + i, { projectIds: [p.id] })));
    assert.ok(buildForYouCards({ ...ctx, items: lots, projects: manyProjects }).length <= 5);
  });

  it("drops hidden entries that have expired", () => {
    assert.deepEqual(activeHidden({ a: NOW + DAY, b: NOW - 1 }, NOW), { a: NOW + DAY });
    assert.equal(hideUntil(NOW), NOW + 7 * DAY);
  });
});
