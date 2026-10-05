/** Scroll blur, ported from SAMECOR LearnScrollBlur / ScrollBlur: six progressive layers at the bottom or top edge. */
const BLUR = 12;
const LAYERS = 6;
const HOLD_MS = 200;
const BAND_PX = 80;
const TOP_EXTRA_PX = 36;
const TOP_FULL_AT_PX = 48;
const IN_MS = 280;
const OUT_MS = 1000;

function layerMarkup(edge) {
  const step = 100 / LAYERS;
  const direction = edge === "top" ? "to bottom" : "to top";
  let html = "";
  for (let index = 0; index < LAYERS; index++) {
    const radius = (BLUR * (index + 1)) / LAYERS;
    const cover = 100 - index * step;
    const fadeStart = Math.max(0, cover - step);
    const mask = `linear-gradient(${direction}, #fff 0%, #fff ${fadeStart}%, transparent ${cover}%)`;
    const filter = `blur(calc(var(--sb, 0) * ${radius}px))`;
    html += `<div class="scroll-blur-layer" style="backdrop-filter:${filter};-webkit-backdrop-filter:${filter};mask-image:${mask};-webkit-mask-image:${mask}"></div>`;
  }
  return html;
}

function createBand(edge) {
  const band = document.createElement("div");
  band.className = `scroll-blur scroll-blur--${edge}`;
  band.setAttribute("aria-hidden", "true");
  band.style.visibility = "hidden";
  band.innerHTML = (edge === "top" ? '<div class="scroll-blur-tint"></div>' : "") + layerMarkup(edge);
  document.body.appendChild(band);
  return band;
}

function initTopBlur(enabled) {
  const band = createBand("top");
  let frame = 0;

  const fit = () => {
    const bar = document.querySelector(".app-shell .topbar");
    band.style.height = `${(bar?.offsetHeight || 72) + TOP_EXTRA_PX}px`;
  };

  const update = () => {
    frame = 0;
    const value = enabled() ? Math.min(1, window.scrollY / TOP_FULL_AT_PX) : 0;
    if (value > 0) fit();
    band.style.setProperty("--sb", value.toFixed(3));
    band.style.visibility = value > 0 ? "visible" : "hidden";
  };

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  update();
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  return schedule;
}

export function initScrollBlur({ enabled = () => true, topEnabled = enabled } = {}) {
  if (typeof window === "undefined") return () => {};
  const refreshTop = initTopBlur(topEnabled);
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return refreshTop;

  const band = createBand("bottom");
  band.style.height = `${BAND_PX}px`;

  let value = 0;
  let frame = 0;
  let idle = 0;
  let active = false;
  let lastY = window.scrollY;

  const write = (v) => {
    value = Math.max(0, Math.min(1, v));
    band.style.setProperty("--sb", value.toFixed(3));
  };

  const tween = (to, ms, ease, done) => {
    cancelAnimationFrame(frame);
    const from = value;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / ms);
      write(from + (to - from) * ease(t));
      if (t < 1) frame = requestAnimationFrame(tick);
      else if (done) done();
    };
    frame = requestAnimationFrame(tick);
  };

  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const linear = (t) => t;

  const hide = () => {
    active = false;
    tween(0, OUT_MS, linear, () => {
      if (!active) band.style.visibility = "hidden";
    });
  };

  window.addEventListener(
    "scroll",
    () => {
      const y = window.scrollY;
      const delta = y - lastY;
      lastY = y;
      if (Math.abs(delta) < 1 || !enabled()) return;
      band.style.visibility = "visible";
      if (!active) {
        active = true;
        tween(1, IN_MS, easeOut);
      }
      clearTimeout(idle);
      idle = setTimeout(hide, HOLD_MS);
    },
    { passive: true },
  );
  return refreshTop;
}
