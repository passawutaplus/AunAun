import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import vm from "node:vm";

/** Runs sw.js in a sandbox with just enough of the worker API to exercise the Web Share Target handler. */
async function loadWorker() {
  const code = await readFile("outputs/a-plus-vault/sw.js", "utf8");
  const listeners = {};
  const stored = [];
  const indexedDB = {
    open() {
      const req = { result: null };
      queueMicrotask(() => {
        const db = {
          createObjectStore() {},
          close() {},
          transaction() {
            const tx = {
              objectStore: () => ({ put: row => { stored.push(row); setTimeout(() => tx.oncomplete && tx.oncomplete(), 0); } }),
            };
            return tx;
          },
        };
        req.result = db;
        if (req.onupgradeneeded) req.onupgradeneeded();
        if (req.onsuccess) req.onsuccess();
      });
      return req;
    },
  };
  class FakeResponse {
    static redirect(url, status) {
      const r = new FakeResponse();
      r.url = url;
      r.status = status;
      return r;
    }
    static error() {
      return new FakeResponse();
    }
  }
  const self = {
    location: { origin: "https://vault.test" },
    addEventListener: (type, fn) => { listeners[type] = fn; },
    crypto: { randomUUID: () => "id-1" },
  };
  vm.runInNewContext(code, { self, indexedDB, Response: FakeResponse, URL, URLSearchParams, caches: {}, fetch: async () => ({}), Promise, setTimeout, queueMicrotask, String, Date, Math, Array });
  const share = async form => {
    let answer = null;
    listeners.fetch({
      request: { method: "POST", url: "https://vault.test/share-target", formData: async () => form, headers: new Headers() },
      respondWith: p => { answer = p; },
    });
    return answer ? await answer : null;
  };
  return { share, stored };
}

const formOf = entries => ({
  get: k => (entries[k] === undefined ? null : entries[k]),
  getAll: k => (Array.isArray(entries[k]) ? entries[k] : entries[k] === undefined ? [] : [entries[k]]),
});
const image = (type = "image/png", size = 10) => ({ type, size });

describe("Web Share Target in sw.js", () => {
  it("stores shared images and sends the person to the Quick Keep sheet", async () => {
    const { share, stored } = await loadWorker();
    const res = await share(formOf({ files: [image(), image("image/webp")], title: "t", url: "https://x.test/post" }));
    assert.equal(res.status, 303);
    assert.equal(res.url, "/vault?share=pending");
    assert.equal(stored.length, 1);
    assert.equal(stored[0].files.length, 2);
    assert.equal(stored[0].url, "https://x.test/post");
  });

  it("finds a link inside the shared text when no url is given", async () => {
    const { share, stored } = await loadWorker();
    await share(formOf({ files: [image()], text: "look https://y.test/p?x=1 nice" }));
    assert.equal(stored[0].url, "https://y.test/p?x=1");
  });

  it("drops non-image and empty files and caps the number of files", async () => {
    const { share, stored } = await loadWorker();
    const many = Array.from({ length: 14 }, () => image());
    await share(formOf({ files: [image("application/pdf"), image("image/png", 0), ...many] }));
    assert.equal(stored[0].files.length, 10);
  });

  it("keeps link-only shares on the existing share_url path and stores nothing", async () => {
    const { share, stored } = await loadWorker();
    const res = await share(formOf({ title: "Post", url: "https://z.test/a b" }));
    assert.equal(stored.length, 0);
    assert.equal(res.status, 303);
    assert.match(res.url, /^\/vault\?share_url=https%3A%2F%2Fz\.test%2Fa\+b&share_title=Post$/);
  });
});
