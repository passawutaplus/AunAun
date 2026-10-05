/* A+ Vault marketing helpers shared by /welcome and /extension.
   Classic script (no modules, no inline code) so the CSP can stay script-src 'self'. */
window.VaultMarketing = (() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => 1 - Math.pow(1 - t, 3);

  const yearEl = $("[data-year]");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* images: live Discover catalog, palette tiles as fallback. `pool` is mutated in place so callers can destructure it. */
  const FALLBACK = ["#d9c7a7", "#b9774f", "#3e5c76", "#c9b38f", "#7a8b6f", "#e3d5c3", "#a44a3f", "#2f3133", "#d8a48f", "#8fa3b8", "#efe3c8", "#5c4b3b"];
  const pool = [];
  function imgEl(i, alt) {
    const it = pool.length ? pool[i % pool.length] : null;
    if (!it) return `<div style="width:100%;height:100%;background:linear-gradient(135deg,${FALLBACK[i % 12]},${FALLBACK[(i + 5) % 12]})"></div>`;
    return `<img src="${it.src}" alt="${alt ? it.title.replace(/"/g, "&quot;") : ""}" loading="lazy" decoding="async">`;
  }
  async function loadPool() {
    const cfg = window.APLUS_VAULT_CONFIG || {};
    const base = String(cfg.supabaseUrl || "").replace(/\/$/, "");
    const key = String(cfg.supabasePublishableKey || "");
    if (!base || !key) return;
    try {
      const q = "select=title,image_md_path,attribution_json&status=eq.published&order=published_at.desc&limit=48";
      const res = await fetch(`${base}/rest/v1/discover_items?${q}`, { headers: { apikey: key, authorization: `Bearer ${key}` } });
      if (!res.ok) return;
      const rows = await res.json();
      pool.length = 0;
      rows.filter(r => r.image_md_path).forEach(r => pool.push({
        src: `${base}/storage/v1/object/public/discover-media/${r.image_md_path.split("/").map(encodeURIComponent).join("/")}`,
        title: String(r.title || "Untitled"),
        credit: String((r.attribution_json && (r.attribution_json.institution || r.attribution_json.artist)) || ""),
      }));
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    } catch (e) {}
  }

  /* fixed nav background + top progress bar */
  function chromeFrame(y) {
    $("[data-nav]").classList.toggle("scrolled", y > 20);
    const max = document.documentElement.scrollHeight - innerHeight;
    $(".progress").style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  }

  /* adds .in once an element enters the viewport */
  function revealOnce(selector, options) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), options);
    $$(selector).forEach(el => io.observe(el));
  }

  return { reduce, $, $$, clamp, lerp, ease, pool, imgEl, loadPool, chromeFrame, revealOnce };
})();
