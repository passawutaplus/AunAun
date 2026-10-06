(() => {
    const { reduce, $, $$, clamp, lerp, ease, pool, imgEl, loadPool, chromeFrame, revealOnce } = VaultMarketing;

    /* ---------- hero floats ---------- */
    const FLOATS = [
      { x: 4, y: 16, w: 170, h: 220, s: .35, r: -6 }, { x: 16, y: 62, w: 150, h: 190, s: .6, r: 4 },
      { x: 78, y: 12, w: 190, h: 150, s: .45, r: 5 }, { x: 84, y: 56, w: 160, h: 210, s: .7, r: -4 },
      { x: 28, y: 6, w: 120, h: 150, s: .25, r: 3 }, { x: 64, y: 74, w: 140, h: 120, s: .5, r: -3 },
      { x: -2, y: 44, w: 110, h: 140, s: .8, r: 2 }, { x: 92, y: 32, w: 100, h: 130, s: .3, r: -2 },
    ];
    function buildHero() {
      const host = $("[data-floats]");
      host.innerHTML = FLOATS.map((f, i) => `<div class="float" data-speed="${f.s}" style="left:${f.x}%;top:${f.y}%;width:${f.w}px;height:${f.h}px;rotate:${f.r}deg;animation-delay:${.4 + i * .08}s">${imgEl(i)}</div>`).join("");
      if (innerWidth < 700) $$(".float", host).forEach((el, i) => { if (i > 3) el.remove(); else { el.style.width = "96px"; el.style.height = "120px"; } });
    }

    /* ---------- scatter ---------- */
    const SOURCES = [["Pinterest", "#e60023"], ["Behance", "#1769ff"], ["Screenshots", "#7a7d80"], ["LINE chat", "#06c755"], ["Downloads", "#ff9f1c"], ["Bookmarks", "#8e5cf7"], ["Instagram", "#d62976"], ["Camera roll", "#2f3133"]];
    const SHARD_POS = [[-38, -30, -9], [30, -34, 7], [-44, 18, 6], [40, 22, -8], [-14, -40, 4], [14, 36, -5], [-26, 38, -3], [44, -6, 9]];
    function buildScatter() {
      $("[data-shards]").innerHTML = SOURCES.map(([name, c], i) => `<div class="shard" data-i="${i}"><div class="ph">${imgEl(i + 8)}</div><b><i style="--c:${c}"></i>${name}</b></div>`).join("");
    }
    function scatterFrame(p) {
      const t = ease(clamp((p - .3) / .45));
      const vw = innerWidth / 100, vh = innerHeight / 100;
      $$("[data-shards] .shard").forEach((el, i) => {
        const [x, y, r] = SHARD_POS[i];
        const drift = Math.sin((p * 4) + i) * 6;
        el.style.transform = `translate(-50%,-50%) translate(${lerp(x * vw, 0, t)}px,${lerp(y * vh + drift, 0, t)}px) rotate(${lerp(r, 0, t)}deg) scale(${lerp(1, .35, t)})`;
        el.style.opacity = String(1 - clamp((t - .75) / .25));
      });
      const box = $("[data-vault-box]");
      const b = clamp((p - .62) / .2);
      box.style.opacity = String(b);
      box.style.scale = String(lerp(.8, 1, ease(b)));
      const before = $(".scatter-copy .before"), after = $(".scatter-copy .after");
      before.style.opacity = String(1 - clamp((p - .2) / .2));
      before.style.transform = `translateY(${-clamp((p - .2) / .2) * 40}px)`;
      after.style.opacity = String(clamp((p - .78) / .15));
      after.style.transform = `translateY(${(1 - clamp((p - .78) / .15)) * 30}px)`;
    }

    /* ---------- capture ---------- */
    function captureFrame(p) {
      const step = p < .18 ? 0 : p < .38 ? 1 : p < .56 ? 2 : p < .74 ? 3 : 4;
      const br = $("[data-browser]");
      br.className = "browser" + (step ? ` s${Math.min(step, 4)}` : "");
      if (step >= 3) br.classList.add("s2");
      $$("[data-steps] li").forEach((li, i) => li.classList.toggle("on", step > i));
    }

    /* ---------- find: typing demo ---------- */
    const QUERIES = ["เก้าอี้วินเทจ", "#f05040", "warm minimal packaging", "ลายดอกไม้สีแดง", "poster type:image"];
    function buildResults() {
      $("[data-results]").innerHTML = Array.from({ length: 8 }, (_, i) => `<figure>${imgEl(i + 16)}</figure>`).join("");
    }
    function startTyping() {
      const out = $("[data-typed]"), figs = () => $$("[data-results] figure");
      let qi = 0;
      const run = async () => {
        const q = QUERIES[qi % QUERIES.length];
        for (let i = 0; i <= q.length; i++) { out.textContent = q.slice(0, i); await new Promise(r => setTimeout(r, reduce ? 0 : 70)); }
        const keep = new Set(Array.from({ length: 3 }, () => Math.floor(Math.random() * 8)));
        figs().forEach((f, i) => f.classList.toggle("dim", !keep.has(i)));
        await new Promise(r => setTimeout(r, 2000));
        figs().forEach(f => f.classList.remove("dim"));
        for (let i = q.length; i >= 0; i--) { out.textContent = q.slice(0, i); await new Promise(r => setTimeout(r, reduce ? 0 : 30)); }
        qi++;
        setTimeout(run, 400);
      };
      run();
    }

    /* ---------- marquee ---------- */
    function buildMarquee() {
      $$("[data-marquee]").forEach(row => {
        const off = Number(row.dataset.marquee) * 12;
        const figs = Array.from({ length: 12 }, (_, i) => {
          const it = pool[(i + off) % Math.max(1, pool.length)];
          return `<figure>${imgEl(i + off, true)}${it ? `<figcaption>${it.title.replace(/</g, "&lt;")}${it.credit ? " · " + it.credit.replace(/</g, "&lt;") : ""}</figcaption>` : ""}</figure>`;
        }).join("");
        row.innerHTML = figs + figs;
      });
    }

    /* ---------- board assemble ---------- */
    const TILES = [
      { k: "img", f: [6, 8, 30, 52], s: [-30, -40, -14] }, { k: "img", f: [38, 8, 22, 38], s: [60, -50, 12] },
      { k: "img", f: [62, 8, 32, 30], s: [110, -20, -8] }, { k: "palette", f: [62, 42, 32, 12], s: [120, 60, 10] },
      { k: "img", f: [38, 50, 22, 42], s: [20, 110, -10] }, { k: "note", f: [62, 58, 32, 34], s: [90, 120, 6] },
      { k: "title", f: [6, 64, 30, 28], s: [-60, 90, -4] },
    ];
    function buildBoard() {
      const c = $("[data-canvas]");
      c.innerHTML = TILES.map((t, i) => {
        const [x, y, w, h] = t.f;
        const inner = t.k === "img" ? imgEl(i + 30) : t.k === "palette" ? ["#d9c7a7", "#b9774f", "#3e5c76", "#2f3133", "#f05040"].map(c => `<span style="background:${c}"></span>`).join("") : t.k === "note" ? "Client wants warm, honest, a little vintage. Avoid glossy. Keep type quiet." : "Warm heritage";
        return `<div class="tile ${t.k === "img" ? "" : t.k}" data-t="${i}" style="left:${x}%;top:${y}%;width:${w}%;height:${h}%">${inner}</div>`;
      }).join("");
    }
    function boardFrame(p) {
      const t = ease(clamp((p - .1) / .55));
      $$("[data-canvas] .tile").forEach((el, i) => {
        const [sx, sy, sr] = TILES[i].s;
        const k = clamp(t * 1.15 - i * .02);
        el.style.transform = `translate(${lerp(sx, 0, k)}%,${lerp(sy, 0, k)}%) rotate(${lerp(sr, 0, k)}deg)`;
        el.style.opacity = String(clamp(.25 + k));
      });
    }

    /* ---------- scroll engine ---------- */
    const stories = $$("[data-story]");
    const frames = { scatter: scatterFrame, capture: captureFrame, board: boardFrame };
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const y = scrollY;
        chromeFrame(y);
        if (!reduce) $$(".float").forEach(el => { el.style.transform = `translateY(${-y * Number(el.dataset.speed)}px)`; });
        stories.forEach(sec => {
          const r = sec.getBoundingClientRect();
          const total = sec.offsetHeight - innerHeight;
          const p = total > 0 ? clamp(-r.top / total) : 0;
          if (r.bottom > -innerHeight && r.top < innerHeight * 2) frames[sec.dataset.story](reduce ? 1 : p);
        });
      });
    }

    /* ---------- reveals ---------- */
    revealOnce(".reveal", { threshold: .2, rootMargin: "0px 0px -8% 0px" });
    const pio = new IntersectionObserver(entries => entries.forEach(e => e.target.classList.toggle("in", e.isIntersecting)), { rootMargin: "-38% 0px -38% 0px" });
    $$("[data-promise] p").forEach(el => pio.observe(el));
    let typingStarted = false;
    new IntersectionObserver((entries, obs) => entries.forEach(e => { if (e.isIntersecting && !typingStarted) { typingStarted = true; startTyping(); obs.disconnect(); } }), { threshold: .3 }).observe($("#find"));

    /* ---------- boot ---------- */
    function buildAll() {
      buildHero(); buildScatter(); buildResults(); buildMarquee(); buildBoard();
      $("[data-capture-img]").innerHTML = imgEl(40);
      $("[data-toast-thumb]").innerHTML = imgEl(40);
      $$("[data-rights] .ph").forEach((el, i) => { el.innerHTML = imgEl(i + 44); });
      onScroll();
    }
    buildAll();
    loadPool().then(() => { if (pool.length) buildAll(); });
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
})();


/* waitlist form + app install (kept separate from the scroll scenes above) */
(() => {
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  $$("[data-waitlist]").forEach(form => {
    const msg = form.querySelector(".wl-msg");
    const say = (text, kind) => { msg.textContent = text; msg.className = "wl-msg" + (kind ? " is-" + kind : ""); };
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const email = form.elements.email.value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) return say("Enter a valid email address.", "error");
      if (!form.elements.consent.checked) return say("Please tick the box so we may email you about the launch.", "error");
      const btn = form.querySelector("button[type=submit]");
      btn.disabled = true;
      say("Joining…");
      try {
        const res = await fetch("/api/waitlist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, consent: true, source: form.dataset.source }) });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || body.success === false) throw new Error(body.message || "Something went wrong. Please try again.");
        form.classList.add("is-done");
        document.dispatchEvent(new CustomEvent("waitlist:joined"));
        say(body.message || "You're on the list.", "ok");
      } catch (err) {
        say(err.message || "Something went wrong. Please try again.", "error");
        btn.disabled = false;
      }
    });
  });
})();


/* story chapters: fill placeholder tiles from the live catalog, play each stage once when it scrolls in */
(() => {
  const { pool, imgEl, loadPool, reduce } = VaultMarketing;
  const stages = [...document.querySelectorAll("[data-stage]")];
  const fill = () => document.querySelectorAll("[data-img]").forEach((el, i) => {
    el.style.setProperty("--i", String(i % 6));
    el.innerHTML = imgEl(Number(el.dataset.img) + 3);
  });
  fill();
  loadPool().then(() => { if (pool.length) fill(); });
  if (reduce || !("IntersectionObserver" in window)) { stages.forEach(el => el.classList.add("in")); return; }
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .35 });
  stages.forEach(el => io.observe(el));
})();

/* waitlist headcount */
(() => {
  const box = document.querySelector("[data-wl-counter]");
  if (!box) return;
  const num = box.querySelector("[data-wl-count]"), label = box.querySelector("[data-wl-count-label]");
  const show = n => {
    box.hidden = false;
    if (n < 1) { num.textContent = ""; label.textContent = "Be the first on the list"; return; }
    label.textContent = n === 1 ? "person is on the list" : "people are already on the list";
    const start = performance.now(), dur = 900;
    const tick = now => { const t = Math.min(1, (now - start) / dur); num.textContent = String(Math.round(n * (1 - Math.pow(1 - t, 3)))); if (t < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  };
  const load = async () => {
    try { const r = await fetch("/api/waitlist"); const b = await r.json(); if (b && b.success) show(Number(b.count) || 0); } catch (e) { /* counter is optional */ }
  };
  load();
  document.addEventListener("waitlist:joined", () => setTimeout(load, 600));
})();
