import { useEffect, useRef, type DependencyList, type RefObject } from "react";

// Blocks that slide in as one piece and stay still while they are in view.
const SETTLE_BLOCKS = [".stack", ".head", ".g", ".lk > .card", ".pf", ".dash", ".split", ".collab > .card", ".app", ".flip", ".meet"];
const ENTER_LINE = 0.8;
const LEAVE_LINE = 0.1;
const PULL = 0.4;
const EDGE_HOLD_MS = 1000;

type Block = HTMLElement & { spY?: number; spTop?: number; spBottom?: number };

/**
 * Scroll motion for the landing page: section reveal, settle-into-place blocks, progress bar,
 * bottom-edge blur, wordmark shrink, spinning menu asterisk and a ribbon that follows scroll direction.
 * Re-collects its targets whenever `deps` change (language, loaded works, filters).
 */
export function useLandingMotion(rootRef: RefObject<HTMLElement>, deps: DependencyList) {
  const refreshRef = useRef<() => void>(() => {});

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const $ = <T extends Element>(s: string) => root.querySelector<T>(s);
    let blocks: Block[] = [];

    const reveal = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add("in");
          reveal.unobserve(e.target);
        }),
      { threshold: 0.1 },
    );

    const refresh = () => {
      root.querySelectorAll(".reveal:not(.in), .big:not(.in)").forEach((el) => reveal.observe(el));
      if (reduced) return;
      blocks = SETTLE_BLOCKS.flatMap((sel) => [...root.querySelectorAll<Block>(sel)]);
      blocks.forEach((el) => {
        el.dataset.sp = "";
        el.spY = el.spY ?? 0;
        const r = el.getBoundingClientRect();
        const cy = (r.top + r.bottom) / 2 + window.scrollY - el.spY;
        el.spTop = cy - el.offsetHeight / 2;
        el.spBottom = cy + el.offsetHeight / 2;
      });
    };
    refreshRef.current = refresh;
    refresh();

    let raf = 0;
    const resize = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(refresh);
    });
    resize.observe(root);

    const progress = $<HTMLElement>(".progress");
    const edge = $<HTMLElement>(".edge-blur");
    const ribbon = $<HTMLElement>(".marquee .track")?.getAnimations()[0];
    if (ribbon) ribbon.currentTime = 45000 * 200; // room to run backwards
    let lastY = window.scrollY;
    let dir = 1;
    let boost = 1;
    let edgeTimer = 0;

    const onScroll = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (progress) progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
      if (y !== lastY) dir = y > lastY ? 1 : -1;
      if (edge && y > lastY) {
        edge.classList.add("on");
        window.clearTimeout(edgeTimer);
        edgeTimer = window.setTimeout(() => edge.classList.remove("on"), EDGE_HOLD_MS);
      }
      boost = Math.min(5, 1 + Math.abs(y - lastY) / 18);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    let frame = 0;
    const wordmark = $<SVGElement>(".bigmark svg");
    const star = $<HTMLElement>(".star-glyph");
    const tick = () => {
      frame = requestAnimationFrame(tick);
      if (reduced) return;
      if (ribbon) {
        ribbon.playbackRate += (dir * boost - ribbon.playbackRate) * 0.1;
        boost += (1 - boost) * 0.05;
      }
      const y = window.scrollY;
      const vh = window.innerHeight;
      const limit = window.innerWidth < 720 ? 44 : 64;
      for (const el of blocks) {
        if (!el.spBottom) continue;
        const below = (el.spTop ?? 0) - y - vh * ENTER_LINE;
        const above = vh * LEAVE_LINE - (el.spBottom - y);
        const target = below > 0 ? Math.min(limit, below * PULL) : above > 0 ? -Math.min(limit, above * PULL) : 0;
        const current = el.spY ?? 0;
        const step = (target - current) * 0.16;
        if (Math.abs(step) < 0.02 && current === target) continue;
        el.spY = Math.abs(step) < 0.02 ? target : current + step;
        el.style.setProperty("--py", `${el.spY.toFixed(2)}px`);
        el.style.setProperty("--ps", (1 - (Math.abs(el.spY) / limit) * 0.03).toFixed(4));
      }
      const p = Math.min(1, y / (vh * 0.6));
      if (wordmark) {
        wordmark.style.scale = String(1 - p * 0.4);
        wordmark.style.translate = `0 ${p * 70}px`;
        wordmark.style.opacity = String(1 - p);
      }
      if (star) star.style.rotate = `${y * 0.18}deg`;
    };
    tick();

    // The Agrandir asterisk sits high in its line box: measure it so it centres on its own middle.
    let alive = true;
    document.fonts
      .load('300 100px "Agrandir Wide"')
      .then(() => {
        if (!alive) return;
        const c = document.createElement("canvas").getContext("2d");
        if (!c) return;
        c.font = '300 100px "Agrandir Wide"';
        const m = c.measureText("*");
        const base = (100 - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
        const gy = base - (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
        const gx = (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2;
        root.style.setProperty("--sh", ((m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) / 100).toFixed(4));
        root.style.setProperty("--sy", (gy / 100).toFixed(4));
        root.style.setProperty("--sdx", ((m.width / 2 - gx) / 100).toFixed(4));
      })
      .catch(() => {});

    return () => {
      alive = false;
      reveal.disconnect();
      resize.disconnect();
      cancelAnimationFrame(raf);
      cancelAnimationFrame(frame);
      window.clearTimeout(edgeTimer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [rootRef]);

  useEffect(() => {
    refreshRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Random works pop up along the mouse path inside `zoneRef`; a tap shows one on touch screens. */
export function useMouseTrail(zoneRef: RefObject<HTMLElement>, srcs: string[]) {
  useEffect(() => {
    const zone = zoneRef.current;
    if (!zone || srcs.length === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ratios = ["4/5", "1/1", "5/4", "3/4"];
    let lastX = 0;
    let lastY = 0;
    let seeded = false;
    let lastIndex = -1;
    const timers = new Set<number>();
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    };

    const spawn = (x: number, y: number) => {
      let i = Math.floor(Math.random() * srcs.length);
      if (i === lastIndex) i = (i + 1) % srcs.length;
      lastIndex = i;
      const im = new Image();
      im.src = srcs[i];
      im.alt = "";
      im.className = "trail";
      im.setAttribute("aria-hidden", "true");
      im.style.left = `${x}px`;
      im.style.top = `${y}px`;
      const base = Math.max(80, Math.min(130, window.innerWidth * 0.09));
      im.style.setProperty("--w", `${Math.round(base * (0.8 + Math.random() * 0.4))}px`);
      im.style.setProperty("--r", ratios[Math.floor(Math.random() * ratios.length)]);
      im.style.setProperty("--a", `${(Math.random() * 14 - 7).toFixed(1)}deg`);
      zone.append(im);
      [...zone.querySelectorAll(".trail:not(.out)")].slice(0, -7).forEach((old) => old.classList.add("out"));
      later(() => im.classList.add("out"), 320);
      later(() => im.remove(), 620);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = zone.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      if (!seeded) {
        seeded = true;
        lastX = x;
        lastY = y;
      }
      if (Math.hypot(x - lastX, y - lastY) < 90) return;
      lastX = x;
      lastY = y;
      spawn(x, y);
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      const r = zone.getBoundingClientRect();
      spawn(e.clientX - r.left, e.clientY - r.top);
    };
    zone.addEventListener("pointermove", onMove);
    zone.addEventListener("pointerdown", onDown);
    return () => {
      zone.removeEventListener("pointermove", onMove);
      zone.removeEventListener("pointerdown", onDown);
      timers.forEach((id) => window.clearTimeout(id));
      zone.querySelectorAll(".trail").forEach((el) => el.remove());
    };
  }, [zoneRef, srcs]);
}
