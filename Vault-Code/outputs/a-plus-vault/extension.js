(() => {
    const { reduce, $, $$, clamp, pool, imgEl, loadPool, chromeFrame, revealOnce } = VaultMarketing;
    const img = imgEl;

    const SOURCES = ["Pinterest", "Behance", "Instagram", "Dribbble", "Are.na", "Awwwards", "Google Images", "Any website"];
    function build() {
      $$("[data-img]").forEach(el => { el.innerHTML = img(Number(el.dataset.img)); });
      $("[data-snap]").innerHTML = Array.from({ length: 6 }, (_, i) => `<span class="t">${img(i + 6)}</span>`).join("");
      $("[data-rec]").innerHTML = Array.from({ length: 5 }, (_, i) => `<span>${img(i + 12)}</span>`).join("");
      $("[data-panel-rec]").innerHTML = Array.from({ length: 5 }, (_, i) => `<span>${img(i + 18)}</span>`).join("");
      const row = SOURCES.map(s => `<span>${s}</span>`).join("");
      $("[data-ticker]").innerHTML = row + row + row + row;
    }

    /* sticky "ways" story */
    const ways = $("[data-ways]"), items = $$("[data-ways-list] li");
    function waysFrame() {
      const r = ways.getBoundingClientRect(), total = ways.offsetHeight - innerHeight;
      const p = total > 0 ? clamp(-r.top / total) : 0, step = p < .34 ? 0 : p < .67 ? 1 : 2;
      if (ways.dataset.active !== String(step)) ways.dataset.active = String(step);
      items.forEach((li, i) => li.classList.toggle("on", i === step));
    }

    /* annotated panel: hover/focus a legend row to light its marker; auto-cycle until touched */
    const legend = $$("[data-legend] li"), marks = $$("[data-mk]");
    function hot(k) { legend.forEach(li => li.classList.toggle("hot", li.dataset.k === String(k))); marks.forEach(m => m.classList.toggle("hot", m.dataset.mk === String(k))); }
    let cycle = 0, auto = true, timer;
    legend.forEach(li => { li.addEventListener("mouseenter", () => { auto = false; hot(li.dataset.k); }); li.addEventListener("mouseleave", () => { hot(0); }); });
    function tickLegend() { if (auto && !reduce) { cycle = (cycle % 6) + 1; hot(cycle); } }
    new IntersectionObserver(es => es.forEach(e => { clearInterval(timer); if (e.isIntersecting) { tickLegend(); timer = setInterval(tickLegend, 1800); } }), { threshold: .35 }).observe($("#anatomy"));

    const stepIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); stepIO.unobserve(e.target); } }), { threshold: .35, rootMargin: "0px 0px -10% 0px" });
    $$(".step").forEach(el => stepIO.observe(el));
    revealOnce(".reveal", { threshold: .15, rootMargin: "0px 0px -6% 0px" });

    let ticking = false;
    function onScroll() {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const y = scrollY;
        chromeFrame(y);
        if (!reduce && y < innerHeight * 1.2) { const k = $("[data-kept]"); if (k) k.style.marginBottom = `${y * .06}px`; const c = $("[data-comp]"); if (c) c.style.translate = `0 ${-y * .04}px`; }
        waysFrame();
      });
    }

    /* copy */
    const toast = $("[data-toast]"); let t;
    $$("[data-copy]").forEach(b => b.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(b.dataset.copy); toast.textContent = "Copied — paste it into a new tab"; }
      catch (e) { toast.textContent = "Select and copy: " + b.dataset.copy; }
      toast.classList.add("show"); clearTimeout(t); t = setTimeout(() => toast.classList.remove("show"), 2600);
    }));

    setTimeout(() => { if (document.documentElement.dataset.vaultExtension === "1") { const d = $("[data-detected]"); if (d) d.hidden = false; } }, 700);
    build(); onScroll();
    loadPool().then(() => { if (pool.length) build(); });
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
})();
