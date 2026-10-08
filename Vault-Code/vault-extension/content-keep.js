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
    .kc{position:fixed;top:16px;right:16px;z-index:2147483647;width:340px;max-width:calc(100vw - 24px);overflow:hidden;border-radius:16px;background:#fff;color:#151719;box-shadow:0 18px 50px rgba(0,0,0,.28),0 0 0 1px rgba(0,0,0,.06);animation:kcIn .22s ease-out}
    @media (prefers-color-scheme:dark){.kc{background:#1c1f23;color:#f4f5f6;box-shadow:0 18px 50px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.08)}}
    @keyframes kcIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
    .kc .bar{position:absolute;left:0;right:0;top:0;height:2px;background:transparent}
    .kc .bar i{display:block;height:100%;background:#f05040;animation:bar 6s linear forwards}
    .kc.paused .bar i,.kc.open .bar i{animation-play-state:paused}
    .kc.open .bar{display:none}
    @keyframes bar{from{width:100%}to{width:0}}
    .kc-row{display:flex;align-items:center;gap:12px;padding:12px 14px}
    .kc-thumb{flex:0 0 46px;width:46px;height:46px;border-radius:10px;background:#e9ecef center/cover no-repeat;position:relative}
    @media (prefers-color-scheme:dark){.kc-thumb{background-color:#2a2e33}}
    .kc-state{position:absolute;right:-4px;bottom:-4px;width:20px;height:20px;border-radius:50%;background:#fff;display:grid;place-items:center}
    @media (prefers-color-scheme:dark){.kc-state{background:#1c1f23}}
    .kc-spin{width:12px;height:12px;border-radius:50%;border:2px solid #c9ced3;border-top-color:#f05040;animation:spin .8s linear infinite}
    .kc-tick{width:14px;height:14px;border-radius:50%;background:#2c8f68;color:#fff;font-style:normal;font-size:10px;line-height:14px;text-align:center}
    @keyframes spin{to{transform:rotate(360deg)}}
    .kc-main{flex:1;min-width:0}
    .kc-title{font-size:14px;font-weight:600;line-height:1.3}
    .kc-sub{margin-top:2px;font-size:12px;color:#747a80;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .kc-link{padding:4px 8px;border:0;border-radius:8px;background:transparent;color:#747a80;font:inherit;font-size:12.5px;cursor:pointer}
    .kc-link:hover{color:#f05040}
    .kc-more{display:flex;align-items:center;justify-content:space-between;width:100%;padding:10px 14px;border:0;border-top:1px solid rgba(127,127,127,.18);background:transparent;color:inherit;font:inherit;font-size:13px;cursor:pointer}
    .kc-more:hover{background:rgba(127,127,127,.08)}
    .kc-more b{font-weight:600}
    .kc-chev{transition:transform .2s}
    .kc.open .kc-chev{transform:rotate(180deg)}
    .kc-form{display:grid;grid-template-rows:0fr;transition:grid-template-rows .26s ease}
    .kc.open .kc-form{grid-template-rows:1fr}
    .kc-form>div{overflow:hidden;min-height:0}
    .kc-form-in{display:flex;flex-direction:column;gap:8px;padding:4px 14px 14px}
    .kc-form label{font-size:11.5px;color:#747a80}
    .kc-form input,.kc-form select,.kc-form textarea{width:100%;padding:8px 10px;border:1px solid rgba(127,127,127,.3);border-radius:8px;background:transparent;color:inherit;font:inherit;font-size:13.5px}
    .kc-form textarea{min-height:64px;resize:vertical}
    .kc-save{display:flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:0 14px;border:0;border-radius:14px;background:#f05040;color:#fff;font:inherit;font-size:15px;font-weight:600;cursor:pointer;box-shadow:0 10px 22px rgba(240,80,64,.28)}
    .kc-prev{width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:12px;background:#e9ecef;display:block}
    .kc-meta{display:flex;justify-content:space-between;gap:8px;font-size:11.5px;margin-top:-2px}
    .kc-type{color:#f05040}
    .kc-host{color:#747a80;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .kc-save:disabled{opacity:.6;cursor:default}
    .kc-msg{font-size:12px;color:#cc3931}
    @media (prefers-reduced-motion:reduce){.kc,.kc-form,.kc-chev{animation:none;transition:none}.kc .bar i{animation:none;width:100%}.kc-spin{animation-duration:2s}}
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

  // ------------------------------------------------------------------ result card (top right): Saving... -> Kept -> optional details
  let toast = null;
  const safeImg = u => (/^https?:\/\//i.test(String(u || "")) ? String(u) : "");
  function closeToast() { if (toast) { clearTimeout(toast.timer); toast.host.remove(); toast = null; } }
  function armClose(ui, ms) { clearTimeout(ui.timer); ui.timer = setTimeout(() => { if (toast === ui) closeToast(); }, ms); }

  /** One card for every phase, so the thumbnail and position stay put while the text changes. */
  function ensureCard(previewUrl) {
    if (!toast) {
      const ui = makeHost();
      const el = document.createElement("div");
      el.className = "kc";
      el.setAttribute("role", "status");
      el.innerHTML = "<div class='bar'><i></i></div><div class='kc-row'><div class='kc-thumb'><span class='kc-state'></span></div><div class='kc-main'><div class='kc-title'></div><div class='kc-sub'></div></div><span class='kc-actions'></span></div><div class='kc-extra'></div>";
      ui.wrap.appendChild(el);
      toast = Object.assign(ui, { el, thumbSet: false, timer: 0 });
      el.addEventListener("mouseenter", () => { el.classList.add("paused"); clearTimeout(toast?.timer); });
      el.addEventListener("mouseleave", () => { el.classList.remove("paused"); if (toast && !el.classList.contains("open")) armClose(toast, 2500); });
    }
    const u = safeImg(previewUrl);
    if (u && !toast.thumbSet) {
      toast.el.querySelector(".kc-thumb").style.backgroundImage = 'url("' + u.replace(/"/g, "%22") + '")';
      toast.thumbSet = true;
    }
    return toast;
  }

  function showSavingCard(previewUrl) {
    closeToast();
    const ui = ensureCard(previewUrl);
    ui.el.querySelector(".kc-title").textContent = "Saving\u2026";
    ui.el.querySelector(".kc-state").innerHTML = "<i class='kc-spin'></i>";
    ui.el.querySelector(".bar").style.visibility = "hidden";
  }

  function showUndoToast(message, objectId, opts = {}) {
    const ui = ensureCard(opts.previewUrl);
    const el = ui.el;
    clearTimeout(ui.timer);
    el.classList.remove("open");
    el.querySelector(".kc-title").textContent = message;
    el.querySelector(".kc-sub").textContent = opts.title ? String(opts.title).slice(0, 80) : "";
    el.querySelector(".kc-state").innerHTML = opts.ok === false ? "" : "<i class='kc-tick'>\u2713</i>";
    const bar = el.querySelector(".bar");
    bar.style.visibility = "visible";
    bar.innerHTML = "<i></i>";
    const actions = el.querySelector(".kc-actions");
    const extra = el.querySelector(".kc-extra");
    actions.textContent = "";
    extra.textContent = "";
    if (objectId) {
      const undo = document.createElement("button");
      undo.type = "button";
      undo.className = "kc-link";
      undo.textContent = "Undo";
      undo.addEventListener("click", async () => {
        undo.disabled = true;
        const r = await send({ type: "VAULT_UNDO", objectId });
        el.querySelector(".kc-title").textContent = r?.ok ? "Removed from your Vault" : "Could not undo";
        el.querySelector(".kc-sub").textContent = "";
        actions.textContent = "";
        extra.textContent = "";
        el.classList.remove("open");
        armClose(ui, 1800);
      });
      actions.appendChild(undo);
      extra.appendChild(detailsForm(ui, objectId, opts));
    }
    armClose(ui, 6200);
  }

  function detailsForm(ui, objectId, opts) {
    const wrap = document.createElement("div");
    const more = document.createElement("button");
    more.type = "button";
    more.className = "kc-more";
    more.innerHTML = "<span><b>Add more details?</b></span><svg class='kc-chev' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>";
    more.setAttribute("aria-expanded", "false");
    const form = document.createElement("div");
    form.className = "kc-form";
    const cols = Array.isArray(opts.collections) ? opts.collections.filter(x => x && x.id && x.name).slice(0, 60) : [];
    const prev = safeImg(opts.previewUrl);
    form.innerHTML = "<div><div class='kc-form-in'>" + (prev ? "<img class='kc-prev' alt='' referrerpolicy='no-referrer'>" : "") + "<input class='f-title' maxlength='160' placeholder='Title' aria-label='Title'><div class='kc-meta'><span class='kc-type'></span><span class='kc-host'></span></div><button type='button' class='kc-save'><svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path d='M20 6 9 17l-5-5'/></svg><span>Save</span></button><div class='kc-msg'></div><label>Collection</label><select class='f-col'><option value='all'>My Vault</option></select><label>Tags (comma separated)</label><input class='f-tags' placeholder='poster, warm, retro'><label>Note</label><textarea class='f-note' placeholder='Add context...'></textarea></div></div>";
    const q = s => form.querySelector(s);
    q(".f-title").value = opts.title || "";
    if (prev) q(".kc-prev").src = prev;
    q(".kc-type").textContent = opts.typeLabel || "Image object";
    q(".kc-host").textContent = opts.sourceHost || "";
    for (const col of cols) { const o = document.createElement("option"); o.value = col.id; o.textContent = col.name; q(".f-col").appendChild(o); }
    more.addEventListener("click", () => {
      const open = !ui.el.classList.contains("open");
      ui.el.classList.toggle("open", open);
      more.setAttribute("aria-expanded", open ? "true" : "false");
      clearTimeout(ui.timer);
      if (open) setTimeout(() => q(".f-title").focus({ preventScroll: true }), 280);
      else armClose(ui, 3000);
    });
    q(".kc-save").addEventListener("click", async () => {
      const btn = q(".kc-save");
      btn.disabled = true;
      btn.querySelector("span").textContent = "Saving\u2026";
      q(".kc-msg").textContent = "";
      const colSel = q(".f-col");
      const tags = q(".f-tags").value.split(/[,\n]/).map(t => t.trim()).filter(Boolean).slice(0, 6);
      const r = await send({ type: "VAULT_UPDATE_DETAILS", objectId, title: q(".f-title").value.trim(), note: q(".f-note").value.trim(), collectionId: colSel.value, collectionName: colSel.value === "all" ? "" : colSel.options[colSel.selectedIndex].textContent, tags });
      if (r?.ok) {
        ui.el.classList.remove("open");
        ui.el.querySelector(".kc-title").textContent = "Details saved";
        ui.el.querySelector(".kc-extra").textContent = "";
        ui.el.querySelector(".kc-actions").textContent = "";
        armClose(ui, 1800);
      } else {
        btn.disabled = false;
        btn.querySelector("span").textContent = "Save";
        q(".kc-msg").textContent = r?.error || "Couldn't save the details.";
      }
    });
    wrap.appendChild(more);
    wrap.appendChild(form);
    return wrap;
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
    if (message?.type === "VAULT_TOAST_SAVING") { showSavingCard(message.previewUrl); sendResponse({ ok: true }); return true; }
    if (message?.type === "VAULT_TOAST_UNDO") { showUndoToast(String(message.message || "Kept in your Vault").slice(0, 160), message.objectId, { previewUrl: message.previewUrl, title: message.title, collections: message.collections, ok: message.ok, typeLabel: message.typeLabel, sourceHost: message.sourceHost }); sendResponse({ ok: true }); return true; }
    return false;
  });
  initHover();
})();
