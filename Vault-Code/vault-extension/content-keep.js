/**
 * On-page features for Keep All, credit capture, undo toast and (opt-in) hover buttons. Injected on demand with
 * chrome.scripting (activeTab) or, when the user opts in to "Smart image detection on all sites", on every page.
 * It reads what the page already reports (natural sizes, URLs); it never reads cross-origin pixels and never crawls.
 */
(() => {
  if (window.__aplusVaultKeep) return;
  window.__aplusVaultKeep = true;

  const lib = name => import(chrome.runtime.getURL(`lib/${name}.js`));
  const send = message => new Promise(resolve => {
    try { chrome.runtime.sendMessage(message, response => resolve(chrome.runtime.lastError ? null : response)); } catch { resolve(null); }
  });
  const abs = value => { try { return new URL(value, location.href).href; } catch { return ""; } };

  // ------------------------------------------------------------------ credit (data only)
  function readCreditInputs(imageUrl) {
    const metas = {};
    document.querySelectorAll("meta[name], meta[property]").forEach(m => {
      const key = (m.getAttribute("name") || m.getAttribute("property") || "").toLowerCase();
      if (["author", "article:author", "twitter:creator", "og:site_name"].includes(key) && !metas[key]) metas[key] = m.getAttribute("content") || "";
    });
    return {
      links: [...document.querySelectorAll("link[rel~='license'], a[rel~='license']")].slice(0, 3).map(l => ({ rel: "license", href: abs(l.getAttribute("href")) })),
      metas,
      jsonLd: [...document.querySelectorAll("script[type='application/ld+json']")].slice(0, 6).map(s => (s.textContent || "").slice(0, 150000)),
      pageUrl: location.href,
      imageUrl: imageUrl || "",
    };
  }
  async function computeCredit(imageUrl) {
    try {
      const { extractCredit } = await lib("credit");
      return extractCredit(readCreditInputs(imageUrl));
    } catch { return null; }
  }

  // ------------------------------------------------------------------ candidates for Keep All
  function bestFromSrcset(srcset) {
    let best = "", bestW = -1;
    String(srcset || "").split(",").forEach(part => {
      const [url, size] = part.trim().split(/\s+/);
      const w = parseFloat(size) || 0;
      if (url && w > bestW) { best = url; bestW = w; }
    });
    return best;
  }
  // Respect the site owner's "do not save" signals (Pinterest-style nopin): page meta, or nopin / data-pin-nopin on the image or an ancestor.
  const NOPIN_META = 'meta[name="pinterest" i][content="nopin" i]';
  const noPinPage = () => Boolean(document.querySelector(NOPIN_META));
  const noPinElement = el => Boolean(el && el.closest && el.closest("[data-pin-nopin],[nopin]"));
  let lastContextTarget = null;
  document.addEventListener("contextmenu", e => { lastContextTarget = e.target; }, true);
  function collectRawCandidates() {
    const out = [];
    if (noPinPage()) return out;
    document.querySelectorAll("img").forEach(img => {
      if (noPinElement(img)) return;
      const srcset = img.getAttribute("srcset") || (img.closest("picture") ? [...img.closest("picture").querySelectorAll("source")].map(s => s.getAttribute("srcset")).filter(Boolean).join(",") : "");
      const big = bestFromSrcset(srcset);
      const url = abs(big || img.currentSrc || img.src || img.getAttribute("data-src") || img.getAttribute("data-lazy-src") || "");
      if (!url) return;
      out.push({ url, width: img.naturalWidth || 0, height: img.naturalHeight || 0, alt: (img.alt || "").slice(0, 120), source: img.closest("picture") ? "picture" : "img" });
    });
    document.querySelectorAll("video[poster]").forEach(v => out.push({ url: abs(v.getAttribute("poster")), width: v.videoWidth || 0, height: v.videoHeight || 0, alt: "", source: "poster" }));
    let scanned = 0;
    for (const el of document.querySelectorAll("div, section, a, figure, li, span")) {
      if (++scanned > 600) break;
      const bg = getComputedStyle(el).backgroundImage;
      const m = bg && bg !== "none" && bg.match(/url\(["']?([^"')]+)["']?\)/);
      if (m) {
        const r = el.getBoundingClientRect();
        if (r.width >= 120 && r.height >= 120) out.push({ url: abs(m[1]), width: Math.round(r.width), height: Math.round(r.height), alt: "", source: "bg" });
      }
    }
    return out;
  }
  async function loadCandidates() {
    const { rankCandidates, defaultSelection } = await lib("keep-all");
    const { keptImageKeys = [] } = await chrome.storage.local.get(["keptImageKeys"]);
    const ranked = rankCandidates(collectRawCandidates(), { keptKeys: new Set(keptImageKeys) });
    return { ...ranked, selection: defaultSelection(ranked.items), noPin: noPinPage() };
  }

  // ------------------------------------------------------------------ shadow UI host
  const CSS = `
    :host{all:initial}
    *{box-sizing:border-box}
    .fx{font-family:"IBM Plex Sans Thai","IBM Plex Sans",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:#151719}
    .toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;display:flex;gap:12px;align-items:center;padding:10px 14px;border-radius:999px;background:#151719;color:#fff;font-size:14px;box-shadow:0 10px 30px rgba(0,0,0,.35)}
    .toast button{padding:6px 12px;border:0;border-radius:999px;background:#fff;color:#151719;font:inherit;font-size:13px;font-weight:600;cursor:pointer}
    .toast .bar{position:absolute;left:14px;right:14px;bottom:3px;height:2px;border-radius:2px;background:#ffffff40;overflow:hidden}
    .toast .bar i{display:block;height:100%;background:#fff;animation:bar 6s linear forwards}
    @keyframes bar{from{width:100%}to{width:0}}
    @media (prefers-reduced-motion:reduce){.toast .bar i{animation:none;width:100%}}
    .picker{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:rgba(10,12,14,.5)}
    .panel{width:min(880px,calc(100vw - 32px));max-height:calc(100vh - 48px);display:flex;flex-direction:column;border-radius:16px;background:#fff;box-shadow:0 24px 70px rgba(0,0,0,.4);overflow:hidden}
    .panel header{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:16px 18px;border-bottom:1px solid #e5e8eb}
    .panel h2{margin:0;font-size:17px}
    .sub{margin:2px 0 0;font-size:12.5px;color:#747a80}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:10px;padding:14px 18px;overflow:auto}
    .cell{position:relative;aspect-ratio:1;padding:0;border:2px solid transparent;border-radius:10px;background:#f3f4f6;overflow:hidden;cursor:pointer}
    .cell img{width:100%;height:100%;object-fit:cover;display:block}
    .cell[aria-pressed="true"]{border-color:#2f3133;box-shadow:0 0 0 2px #fff inset}
    .cell[aria-pressed="false"] img{opacity:.45}
    .cell .badge{position:absolute;left:6px;bottom:6px;padding:2px 6px;border-radius:6px;background:#151719c0;color:#fff;font-size:11px}
    .cell .tick{position:absolute;right:6px;top:6px;width:22px;height:22px;border-radius:50%;background:#2f3133;color:#fff;font-size:13px;line-height:22px;text-align:center}
    .cell[aria-pressed="false"] .tick{display:none}
    footer{display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:12px 18px;border-top:1px solid #e5e8eb}
    footer .grow{flex:1 1 220px;min-width:180px}
    input.name{width:100%;padding:9px 12px;border:1px solid #e5e8eb;border-radius:8px;font:inherit;font-size:14px}
    .btn{padding:9px 14px;border:1px solid #e5e8eb;border-radius:8px;background:#fff;color:#151719;font:inherit;font-size:14px;cursor:pointer}
    .btn.primary{border-color:#d9362a;background:#d9362a;color:#fff;font-weight:600}
    .btn:disabled{opacity:.5;cursor:default}
    .note{width:100%;margin:0;font-size:12px;color:#747a80}
    .note a{color:#d9362a}
    .result{padding:24px 18px;text-align:center}
    .hover{position:fixed;z-index:2147483646;display:flex;gap:6px}
    .hover button{padding:6px 10px;border:0;border-radius:999px;background:#151719;color:#fff;font:inherit;font-size:12px;cursor:pointer;opacity:.92}
  `;
  function makeHost() {
    const host = document.createElement("aplus-vault-keep");
    const root = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = CSS;
    root.appendChild(style);
    const wrap = document.createElement("div");
    wrap.className = "fx";
    root.appendChild(wrap);
    document.documentElement.appendChild(host);
    return { host, wrap };
  }

  // ------------------------------------------------------------------ undo toast (compact result card)
  let toast = null;
  function showUndoToast(message, objectId) {
    toast?.host.remove();
    const ui = makeHost();
    toast = ui;
    const el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
    const text = document.createElement("span");
    text.textContent = message;
    el.appendChild(text);
    if (objectId) {
      const undo = document.createElement("button");
      undo.type = "button";
      undo.textContent = "Undo";
      undo.addEventListener("click", async () => {
        undo.disabled = true;
        const r = await send({ type: "VAULT_UNDO", objectId });
        text.textContent = r?.ok ? "Removed from your Vault" : "Could not undo";
        undo.remove();
        setTimeout(() => ui.host.remove(), 1800);
      });
      el.appendChild(undo);
    }
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.innerHTML = "<i></i>";
    el.appendChild(bar);
    ui.wrap.appendChild(el);
    setTimeout(() => { if (toast === ui) { ui.host.remove(); toast = null; } }, 6200);
  }

  // ------------------------------------------------------------------ Keep All picker
  let picker = null;
  function closePicker() { picker?.host.remove(); picker = null; window.removeEventListener("keydown", onKey, true); }
  function onKey(e) { if (e.key === "Escape") { e.stopPropagation(); closePicker(); } }

  async function openPicker() {
    closePicker();
    const { items, hiddenJunk, hiddenDup, capped, selection } = await loadCandidates();
    const { collectionNameFor } = await lib("keep-all");
    const credit = await computeCredit("");
    const ui = makeHost();
    picker = ui;
    window.addEventListener("keydown", onKey, true);
    const selected = new Set(selection);
    const root = document.createElement("div");
    root.className = "picker";
    root.innerHTML = `<section class="panel" role="dialog" aria-modal="true" aria-label="Keep images from this page"><header><div><h2>Keep images from this page</h2><p class="sub"></p></div><button class="btn" type="button" data-close>Close</button></header><div class="grid"></div><footer><button class="btn" type="button" data-all>Select all</button><button class="btn" type="button" data-none>None</button><div class="grow"><input class="name" type="text" aria-label="Collection name" maxlength="60"></div><button class="btn primary" type="button" data-keep></button><p class="note">Images stay private to you. They belong to their owners. <a href="https://aplus-vault.vercel.app/legal.html#terms" target="_blank" rel="noopener noreferrer">Terms</a></p></footer></section>`;
    ui.wrap.appendChild(root);
    const grid = root.querySelector(".grid");
    const sub = root.querySelector(".sub");
    const keepBtn = root.querySelector("[data-keep]");
    const nameInput = root.querySelector(".name");
    nameInput.value = collectionNameFor(document.title, location.hostname);
    sub.textContent = noPinPage() ? "This site asks not to save its images, so none are listed." : `${items.length} found${hiddenJunk + hiddenDup ? ` · ${hiddenJunk + hiddenDup} icons/duplicates hidden` : ""}${capped ? ` · ${capped} more not shown` : ""}`;
    const refresh = () => {
      keepBtn.textContent = selected.size ? `Keep ${selected.size} image${selected.size === 1 ? "" : "s"}` : "Choose images";
      keepBtn.disabled = !selected.size;
      grid.querySelectorAll(".cell").forEach(c => c.setAttribute("aria-pressed", selected.has(c.dataset.key) ? "true" : "false"));
    };
    items.forEach(it => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "cell";
      b.dataset.key = it.key;
      b.setAttribute("aria-label", `${it.alt || "Image"}${it.width ? ` ${it.width} by ${it.height}` : ""}${it.kept ? ", already kept" : ""}${it.small ? ", small, off" : ""}`);
      const img = document.createElement("img");
      img.src = it.url;
      img.alt = "";
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      b.appendChild(img);
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = it.kept ? "already kept" : it.small ? "small — off" : it.width ? `${it.width}×${it.height}` : "";
      if (badge.textContent) b.appendChild(badge);
      b.insertAdjacentHTML("beforeend", '<span class="tick" aria-hidden="true">✓</span>');
      b.addEventListener("click", () => { selected.has(it.key) ? selected.delete(it.key) : selected.add(it.key); refresh(); });
      grid.appendChild(b);
    });
    root.querySelector("[data-close]").addEventListener("click", closePicker);
    root.addEventListener("click", e => { if (e.target === root) closePicker(); });
    root.querySelector("[data-all]").addEventListener("click", () => { items.forEach(i => selected.add(i.key)); refresh(); });
    root.querySelector("[data-none]").addEventListener("click", () => { selected.clear(); refresh(); });
    keepBtn.addEventListener("click", async () => {
      const chosen = items.filter(i => selected.has(i.key));
      const panel = root.querySelector(".panel");
      panel.innerHTML = `<div class="result"><h2>Saving ${chosen.length} images…</h2><p class="sub">You can leave this page; it keeps going.</p></div>`;
      const res = await send({ type: "VAULT_KEEP_ALL_SAVE", items: chosen.map(c => ({ url: c.url, width: c.width, height: c.height, alt: c.alt, key: c.key })), collectionName: nameInput.value.trim() || document.title, pageUrl: location.href, title: document.title, credit });
      panel.innerHTML = "";
      const out = document.createElement("div");
      out.className = "result";
      const h = document.createElement("h2");
      h.textContent = res?.ok ? res.summary.text : "Could not save these images";
      out.appendChild(h);
      if (!res?.ok) { const p = document.createElement("p"); p.className = "sub"; p.textContent = res?.error || "Try again in a moment."; out.appendChild(p); }
      const row = document.createElement("div");
      row.style.cssText = "display:flex;gap:10px;justify-content:center;margin-top:14px";
      if (res?.ok && res.summary.ids.length) {
        const undo = document.createElement("button");
        undo.className = "btn";
        undo.type = "button";
        undo.textContent = "Undo all";
        undo.addEventListener("click", async () => { undo.disabled = true; const r = await send({ type: "VAULT_UNDO_MANY", ids: res.summary.ids }); h.textContent = r?.ok ? "Removed" : "Could not undo"; undo.remove(); });
        row.appendChild(undo);
        const open = document.createElement("a");
        open.className = "btn";
        open.href = res.openUrl || "#";
        open.target = "_blank";
        open.rel = "noopener noreferrer";
        open.textContent = "Open collection";
        row.appendChild(open);
      }
      const done = document.createElement("button");
      done.className = "btn primary";
      done.type = "button";
      done.textContent = "Done";
      done.addEventListener("click", closePicker);
      row.appendChild(done);
      out.appendChild(row);
      panel.appendChild(out);
    });
    refresh();
    keepBtn.focus();
  }

  // ------------------------------------------------------------------ hover buttons (opt-in only)
  let hover = null, hoverImg = null, hoverTimer = 0;
  async function initHover() {
    const { hoverKeep } = await chrome.storage.local.get(["hoverKeep"]);
    if (hoverKeep !== true) return;
    document.addEventListener("mouseover", e => {
      const img = e.target instanceof HTMLImageElement ? e.target : null;
      if (!img || img.naturalWidth < 300 || img.naturalHeight < 200 || noPinPage() || noPinElement(img)) return;
      hoverImg = img;
      clearTimeout(hoverTimer);
      showHover(img);
    }, true);
    document.addEventListener("mouseout", () => { hoverTimer = setTimeout(() => { hover?.host.remove(); hover = null; }, 350); }, true);
  }
  async function showHover(img) {
    hover?.host.remove();
    const r = img.getBoundingClientRect();
    const ui = makeHost();
    hover = ui;
    const box = document.createElement("div");
    box.className = "hover";
    box.style.left = `${Math.max(4, r.right - 150)}px`;
    box.style.top = `${Math.max(4, r.top + 8)}px`;
    const keep = document.createElement("button");
    keep.type = "button";
    keep.textContent = "Keep";
    keep.addEventListener("click", async e => { e.stopPropagation(); const res = await send({ type: "VAULT_KEEP_IMAGE", url: img.currentSrc || img.src, pageUrl: location.href }); showUndoToast(res?.ok ? "Kept in your Vault" : "Could not keep this image", res?.objectId); });
    box.appendChild(keep);
    const { items } = await loadCandidates();
    if (items.length >= 3) {
      const all = document.createElement("button");
      all.type = "button";
      all.textContent = `Keep all ${items.length}`;
      all.addEventListener("click", e => { e.stopPropagation(); openPicker(); });
      box.appendChild(all);
    }
    box.addEventListener("mouseenter", () => clearTimeout(hoverTimer));
    ui.wrap.appendChild(box);
  }

  // ------------------------------------------------------------------ messages from the background / popup
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "VAULT_KEEP_PING") { sendResponse({ ok: true }); return true; }
    if (message?.type === "VAULT_NOPIN_CHECK") { sendResponse({ ok: true, blocked: noPinPage() || noPinElement(lastContextTarget) }); return true; }
    if (message?.type === "VAULT_GET_CREDIT") { computeCredit(message.imageUrl).then(credit => sendResponse({ ok: true, credit })); return true; }
    if (message?.type === "VAULT_KEEP_ALL_COUNT") { loadCandidates().then(r => sendResponse({ ok: true, count: r.selection.length, total: r.items.length })).catch(() => sendResponse({ ok: false })); return true; }
    if (message?.type === "VAULT_KEEP_ALL_OPEN") { openPicker().then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false })); return true; }
    if (message?.type === "VAULT_TOAST_UNDO") { showUndoToast(String(message.message || "Kept in your Vault").slice(0, 160), message.objectId); sendResponse({ ok: true }); return true; }
    return false;
  });
  initHover();
})();
