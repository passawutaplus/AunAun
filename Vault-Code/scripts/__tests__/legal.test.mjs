import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { CONSENT_REQUIRING_STORAGE, PURPOSES, isGranted, needsBanner, privacySignalOn } from "../../outputs/a-plus-vault/modules/consent.js";

const APP = "outputs/a-plus-vault";
const read = p => readFileSync(p, "utf8");

function sourceFiles() {
  const out = [];
  const walk = dir => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (name === "downloads" || name === "assets") continue;
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(js|html)$/.test(name) && !/engine-data/.test(name)) out.push(full);
    }
  };
  walk(APP);
  out.push("vault-extension/background.js", "vault-extension/popup.js", "vault-extension/content.js", "vault-extension/content-keep.js");
  return out;
}

describe("legal consistency", () => {
  it("every aplus-vault-* / aplus_ storage key used in the code is in the cookie inventory", () => {
    const inventory = read("docs/legal/COOKIE_INVENTORY.md");
    const keys = new Set();
    for (const file of sourceFiles()) {
      for (const m of read(file).matchAll(/["'](aplus[-_][a-z0-9_-]+)["']/g)) keys.add(m[1]);
    }
    // not browser storage: file names, ids, css classes
    const ignore = new Set(["aplus-vault-ui", "aplus-vault-keep", "aplus-vault-font", "aplus-vault-extension"]);
    const missing = [...keys].filter(k => /^aplus-vault-|^aplus_/.test(k) && !ignore.has(k) && !inventory.includes(k.replace(/^aplus-vault/, "aplus-vault")) && !inventory.includes("`" + k.replace(/^aplus-vault/, "") ));
    // keys with a shared prefix are listed together as "-collections" etc.
    const reallyMissing = missing.filter(k => !inventory.includes(k.replace("aplus-vault", "")));
    assert.deepEqual(reallyMissing, [], "add these keys to docs/legal/COOKIE_INVENTORY.md");
  });

  it("the app sets no cookies", () => {
    for (const file of sourceFiles().filter(f => !f.includes("vault-extension"))) assert.ok(!/document\.cookie\s*=/.test(read(file)), file);
  });

  it("one contact domain and the anchors the app links to exist in legal.html", () => {
    const legal = read(`${APP}/legal.html`);
    assert.ok(!/aplusvault\.app/.test(legal + read("vault-extension/PRIVACY.md")));
    for (const id of ["privacy", "cookies", "terms", "copyright", "acceptable-use", "ai", "security", "data-rights", "extension-privacy", "subprocessors"]) assert.ok(legal.includes(`id="${id}"`), id);
    const app = read(`${APP}/app.js`);
    for (const m of app.matchAll(/legal\.html#([a-z-]+)/g)) assert.ok(legal.includes(`id="${m[1]}"`), m[1]);
  });

  it("legal.html has Thai first and English second in each bilingual block, and placeholders for the owner", () => {
    const legal = read(`${APP}/legal.html`).split("<body>")[1];
    assert.ok(legal.indexOf('lang="th"') < legal.indexOf('lang="en"'));
    assert.match(legal, /\[LEGAL NAME\]/);
    assert.match(legal, /\[CONFIRM\]/);
  });

  it("no inline script and a request form handled by an external file", () => {
    const legal = read(`${APP}/legal.html`);
    assert.ok(!/<script(?![^>]*\bsrc=)/.test(legal));
    assert.match(legal, /<script src="\.\/legal\.js">/);
  });
});

describe("consent module", () => {
  it("shows no banner while nothing consent-requiring is stored, and would if something were", () => {
    assert.deepEqual(CONSENT_REQUIRING_STORAGE, []);
    assert.equal(needsBanner(), false);
    assert.equal(needsBanner(["analytics-id"]), true);
  });
  it("optional purposes default to off and Global Privacy Control counts as reject for analytics", () => {
    assert.ok(Object.keys(PURPOSES).includes("ai_private_tagging") && Object.keys(PURPOSES).includes("marketing_email"));
    assert.equal(privacySignalOn({ globalPrivacyControl: true }), true);
    assert.equal(privacySignalOn({ doNotTrack: "1" }), true);
    assert.equal(privacySignalOn({}), false);
    globalThis.localStorage = { getItem: () => null, setItem() {} };
    assert.equal(isGranted("ai_private_tagging"), false);
    assert.equal(isGranted("marketing_email"), false);
  });
});
