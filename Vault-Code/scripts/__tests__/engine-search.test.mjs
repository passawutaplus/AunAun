import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { defaultTaxonomy } from "../../lib/engine/enrich.mjs";
import { engineConfig as cfg } from "../../lib/engine/config.mjs";
import { evalQueries } from "../../lib/engine/eval.mjs";
import { matchForm, normalizeLatin, parseQuery, tokenize } from "../../lib/engine/parser.mjs";
import { colorCloseness, findSimilar, interleaveByCoverage, mmr, rankItems, scoreItem } from "../../lib/engine/ranking.mjs";

const tax = defaultTaxonomy();
const ids = q => parseQuery(q, tax, cfg).include.map(t => t.id);
const w = (q, id) => parseQuery(q, tax, cfg).include.find(t => t.id === id)?.weight;

describe("parser: normalisation and mixed scripts", () => {
  it("lowercases, strips Latin diacritics, joins hyphens, expands abbreviations", () => {
    assert.equal(normalizeLatin("Café", tax.languageRules), "cafe");
    assert.equal(normalizeLatin("walk-in", tax.languageRules), "walk in");
    assert.equal(normalizeLatin("b&w poster", tax.languageRules), "black and white poster");
  });
  it("ignores Thai tone marks and unifies loanword spellings when matching", () => {
    assert.equal(matchForm("เซรามิค", tax.languageRules), matchForm("เซรามิก", tax.languageRules));
  });
  it("splits words glued across scripts", () => {
    assert.ok(ids("ห้องbedroom").includes("int.bedroom"));
    assert.ok(tokenize("ห้องbedroom").length >= 2);
  });
});

describe("parser: understanding", () => {
  it("the example brief gives bedroom, minimal, neutral_with_accent; price is only a soft hint", () => {
    const r = parseQuery("ห้องนอน ราคา 30 ล้าน มินิมอลแต่มีสีสันหน่อย", tax, cfg);
    const got = r.include.map(t => t.id);
    for (const id of ["int.bedroom", "sty.minimal", "mood.neutral_with_accent"]) assert.ok(got.includes(id), id);
    assert.equal(r.context.domain, "int");
    assert.ok(r.price && r.price.soft <= cfg.PRICE_SOFT_MAX);
    const lux = r.include.find(t => t.id === "sty.quiet_luxury");
    assert.ok(!lux || lux.weight <= cfg.PRICE_SOFT_MAX);
  });
  it("แต่ halves the weight of what follows; หน่อย halves; very raises", () => {
    assert.equal(w("minimal แต่ pastel", "mood.pastel_palette"), 0.5);
    assert.equal(w("minimal แต่ pastel", "sty.minimal"), 1);
    assert.ok(w("poster very bold", "mood.bold") > 1);
  });
  it("negation excludes and never includes; prohibit words behave like negation", () => {
    const r = parseQuery("poster ไม่เอา neon", tax, cfg);
    assert.deepEqual(r.exclude, ["mood.neon_palette"]);
    assert.ok(!r.include.some(t => t.id === "mood.neon_palette"));
    assert.ok(parseQuery("poster no neon", tax, cfg).exclude.includes("mood.neon_palette"));
    assert.ok(parseQuery("poster ห้ามมี gradient", tax, cfg).exclude.includes("mood.gradient"));
  });
  it("must words make a term required", () => {
    assert.ok(parseQuery("poster must bold", tax, cfg).include.find(t => t.id === "mood.bold")?.required);
  });
  it("multi-word units and idioms match as one", () => {
    assert.ok(ids("mid century modern chair").includes("sty.mid_century"));
    assert.ok(ids("looks expensive").includes("sty.quiet_luxury"));
    assert.ok(ids("ดูแพงๆ").includes("sty.quiet_luxury"));
  });
  it("short Thai words do not collide across tone marks (ไม่ is not ไม้)", () => {
    assert.ok(!ids("ไม่เอา neon").includes("mat.wood"));
  });
  it("fuzzy Latin: one edit, long words only, exactly one candidate; never Thai", () => {
    assert.ok(ids("brutalst poster").includes("sty.brutalist"));
    assert.ok(!ids("zzzzzzzz poster").some(id => id.startsWith("sty.")));
    assert.ok(parseQuery("brutalst", tax, cfg).include.every(t => t.weight < 1), "fuzzy weight is reduced");
  });
  it("#tag pins, #hex is a colour query unless a tag has that name", () => {
    const hex = parseQuery("#ff8b8b poster", tax, cfg);
    assert.deepEqual(hex.colorIntent.hex, ["#ff8b8b"]);
    assert.equal(hex.context.intent, "color_reference");
    assert.deepEqual(parseQuery("#f8b", tax, cfg).colorIntent.hex, ["#ff88bb"]);
    const tag = parseQuery("#minimal", tax, cfg);
    assert.ok(tag.include.find(t => t.id === "sty.minimal")?.required);
    assert.deepEqual(parseQuery("#myownword", tax, cfg).pinnedKeywords, ["myownword"]);
  });
  it("the bare word colors/palette lists saved palettes", () => {
    assert.equal(parseQuery("palette", tax, cfg).listPalettes, true);
    assert.equal(parseQuery("สี", tax, cfg).listPalettes, true);
  });
  it("unknown words are logged with a language, never dropped silently; fillers are not unknown", () => {
    const r = parseQuery("poster qwertyuiop ครับ please", tax, cfg);
    assert.ok(r.unknown.some(u => u.term === "qwertyuiop" && u.lang === "en"));
    assert.ok(!r.unknown.some(u => u.term === "please"));
    assert.ok(parseQuery("ฟรีแลนซ์โนว์ว์ poster", tax, cfg).unknown.some(u => u.lang === "th"));
  });
  it("another discipline is down-weighted when the context clearly points at one", () => {
    const r = parseQuery("ห้องนอน sofa bedroom living room font", tax, cfg);
    assert.equal(r.context.domain, "int");
    assert.ok(w("ห้องนอน sofa bedroom living room font", "typ.font") === undefined || w("ห้องนอน sofa bedroom living room font", "typ.font") <= 0.3);
  });
  it("empty and symbol-only input give an empty query without throwing", () => {
    assert.equal(parseQuery("", tax, cfg).include.length, 0);
    assert.doesNotThrow(() => parseQuery("!!! ???", tax, cfg));
  });
  it("is fast enough to run on every keystroke (< 15 ms median)", () => {
    const t0 = performance.now();
    for (let i = 0; i < 50; i++) parseQuery("ห้องนอน minimal แต่ใส่ pop of color, font sans bold, vibe Japandi", tax, cfg);
    assert.ok((performance.now() - t0) / 50 < 15);
  });
});

describe("eval set", () => {
  it("every sample sentence parses to its expected ids", () => {
    const queries = JSON.parse(readFileSync(new URL("../../docs/eval/queries.json", import.meta.url), "utf8"));
    const res = evalQueries(queries, tax, cfg);
    const failed = res.rows.filter(r => !r.ok).map(r => r.q);
    assert.deepEqual(failed, []);
    assert.ok(queries.filter(q => /[฀-๿]/.test(q.q) && /[a-z]{3}/i.test(q.q)).length >= queries.length / 2 - 1, "at least about half are mixed Thai/English");
  });
});

// ---------------------------------------------------------------- ranking
const mk = (id, tags, extra = {}) => ({ id, tags_ids: tags, ...extra });
const Q = text => parseQuery(text, tax, cfg);

describe("ranking", () => {
  const items = [
    mk("full", ["int.bedroom", "sty.minimal", "mood.neutral_with_accent"]),
    mk("two", ["int.bedroom", "sty.minimal"]),
    mk("one", ["int.bedroom"]),
    mk("none", ["gfx.poster"]),
    mk("neon", ["int.bedroom", "sty.minimal", "mood.neon_palette"]),
  ];
  const q = Q("ห้องนอน minimal pop of color ไม่เอา neon");

  it("excludes and thresholds: nothing below MIN_SCORE, excluded tags never appear", () => {
    const r = rankItems(q, items, tax, cfg, { limit: 10 });
    const got = r.items.map(i => i.id);
    assert.ok(!got.includes("neon") && !got.includes("none"));
    assert.ok(r.items.every(i => i.score >= cfg.MIN_SCORE));
    assert.equal(got[0], "full");
  });

  it("matchedTags and missingTags are reported for the viewer", () => {
    const r = rankItems(q, items, tax, { ...cfg, MIN_RESULTS: 0 }, { limit: 10 });
    const two = r.items.find(i => i.id === "two");
    assert.deepEqual(two.missingTags, ["mood.neutral_with_accent"]);
    assert.ok(two.matchedTags.includes("int.bedroom"));
  });

  it("required terms are never relaxed away", () => {
    const strict = Q("#minimal bedroom");
    const r = rankItems(strict, items, tax, { ...cfg, MIN_RESULTS: 0 }, { limit: 10 });
    assert.ok(r.items.every(i => i.item.tags_ids.includes("sty.minimal")));
  });

  it("silent relaxation: with too few results the lowest-weight constraint is dropped", () => {
    const few = [mk("a", ["int.bedroom", "sty.minimal"]), mk("b", ["int.bedroom"])];
    const r = rankItems(Q("ห้องนอน minimal แต่ pastel"), few, tax, { ...cfg, MIN_RESULTS: 2 }, { limit: 10 });
    assert.ok(r.relaxed >= 1);
    assert.ok(r.items.length >= 1);
  });

  it("interleaves coverage buckets instead of listing all full matches first", () => {
    const scored = [
      { matched: 3, score: 0.95, item: { id: "f1" } }, { matched: 3, score: 0.94, item: { id: "f2" } },
      { matched: 2, score: 0.7, item: { id: "p1" } }, { matched: 2, score: 0.69, item: { id: "p2" } },
    ];
    assert.deepEqual(interleaveByCoverage(scored).map(s => s.item.id), ["f1", "p1", "f2", "p2"]);
  });

  it("MMR avoids near-duplicates when relevance is close", () => {
    const a = { item: mk("a", ["x1", "x2", "x3"]), rel: 0.9 };
    const b = { item: mk("b", ["x1", "x2", "x3"]), rel: 0.89 };
    const c = { item: mk("c", ["y1", "y2"]), rel: 0.8 };
    assert.deepEqual(mmr([a, b, c], 0.5).map(e => e.item.id), ["a", "c", "b"]);
  });

  it("colour queries use stored palettes (CIELAB), nearer colours score higher", () => {
    const red = mk("red", [], { palette: [{ hex: "#ff3b30", pct: 0.6 }] });
    const blue = mk("blue", [], { palette: [{ hex: "#0a3cff", pct: 0.6 }] });
    assert.ok(colorCloseness("#ff4040", red.palette, cfg) > colorCloseness("#ff4040", blue.palette, cfg));
    const r = rankItems(Q("#ff4040"), [red, blue], tax, { ...cfg, MIN_RESULTS: 0 }, { limit: 5 });
    assert.equal(r.items[0].id, "red");
  });

  it("scoreItem returns null for excluded or missing-required items", () => {
    const query = Q("#minimal poster");
    assert.equal(scoreItem(query, mk("x", ["gfx.poster"]), tax, cfg), null);
  });

  it("pagination via offsets and p95 under 500 ms on 3000 items", () => {
    const all = Array.from({ length: 3000 }, (_, i) => mk("i" + i, ["int.bedroom", i % 2 ? "sty.minimal" : "sty.retro", "mood.calm", "t" + (i % 50)], { quality_score: 60 + (i % 40) }));
    const t0 = performance.now();
    const p1 = rankItems(Q("ห้องนอน minimal calm"), all, tax, cfg, { limit: 24, offset: 0 });
    const ms = performance.now() - t0;
    assert.ok(ms < 500, `took ${ms}ms`);
    assert.equal(p1.items.length, 24);
    assert.equal(p1.nextOffset, 24);
    const p2 = rankItems(Q("ห้องนอน minimal calm"), all, tax, cfg, { limit: 24, offset: 24 });
    assert.ok(!p2.items.some(i => p1.items.some(j => j.id === i.id)));
  });
});

describe("find similar", () => {
  const target = mk("t", ["int.bedroom", "sty.minimal", "mood.calm", "mood.white"], { palette: [{ hex: "#f2efe9", pct: 0.7 }] });
  const pool = [
    mk("same", ["int.bedroom", "sty.minimal", "mood.calm", "mood.white"], { palette: [{ hex: "#f1eee8", pct: 0.7 }] }),
    mk("room", ["int.bedroom", "sty.japandi"], { palette: [{ hex: "#d8cbb8", pct: 0.5 }] }),
    mk("moody", ["int.bedroom", "sty.minimal", "mood.moody", "mood.black"], { palette: [{ hex: "#101010", pct: 0.8 }] }),
    mk("other", ["gfx.poster", "mood.bold"], { palette: [{ hex: "#ff0000", pct: 0.8 }] }),
  ];
  it("ranks the closest first, excludes itself and seen items, never includes unrelated disciplines", () => {
    const r = findSimilar(target, [target, ...pool], tax, cfg, { seen: ["room"] });
    const got = r.items.map(i => i.id);
    assert.equal(got[0], "same");
    assert.ok(!got.includes("t") && !got.includes("room") && !got.includes("other"));
  });
  it("opposite keeps the discipline but flips mood/colour", () => {
    const r = findSimilar(target, pool, tax, cfg, { opposite: true });
    assert.equal(r.items[0].id, "moody");
  });
});
