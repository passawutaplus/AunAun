import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { proxiedImageUrl } from "@/lib/imageProxy";
import { SC_LINKS } from "../routes";
import SamecorMark from "../text/SamecorMark";
import { useTouchWorks, type TouchWork } from "../text/useTouchWorks";
import p1 from "../assets/people/p1.jpg";
import p2 from "../assets/people/p2.jpg";
import p3 from "../assets/people/p3.jpg";
import p4 from "../assets/people/p4.jpg";
import p5 from "../assets/people/p5.jpg";
import p6 from "../assets/people/p6.jpg";
import p7 from "../assets/people/p7.jpg";
import "../styles/get-in-touch.css";

/**
 * Get in Touch / about (mock: pages/GetInTouch.dc.html), on the old /learn URL.
 *
 * Scrolling moves a camera into the page: every chapter sits at its own depth (data-z) inside a white
 * room that stays on screen, and real works float past at the edges. Without motion (reduced motion,
 * or a window taller than 2400px) the same chapters are one plain column. Text, positions and timing
 * follow the mock; motion uses the separate translate / scale properties (design rules A6).
 */

/** Depth of each chapter; the camera rests at each one. */
const STOPS = [0, 1400, 2800, 4200, 5500, 6800, 8100, 9400, 10700, 12000, 13400];

/** Floating works: fixed places from a seeded random, as in the mock (corners only, never over the text). */
const DECO = (() => {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const out: Array<{ z: number; x: number; y: number; w: number }> = [];
  for (let i = 0; i < STOPS.length - 1; i++) {
    const n = i < 3 ? 4 : 2;
    for (let k = 0; k < n; k++) {
      const z = STOPS[i] + (STOPS[i + 1] - STOPS[i]) * (0.3 + 0.45 * rnd());
      const q = (i * 3 + k) % 4;
      const x = (q % 2 ? 86 : -2) + rnd() * 14;
      const y = (q < 2 ? 0 : 82) + rnd() * 16;
      const w = 120 + Math.round(rnd() * 140);
      out.push({ z: Math.round(z), x, y, w });
    }
  }
  return out;
})();

/**
 * People in the illustrations: the mock's portraits (img/people p1–p7, made in Magnific), used for now on the
 * owner's word (2026-11-28, Beam 21) until real photos come.
 */
const PEOPLE = [p1, p2, p3, p4, p5, p6, p7];
const person = (n: number, extra?: CSSProperties): CSSProperties => ({
  background: `#D9D9D6 url("${PEOPLE[n - 1]}") center / cover no-repeat`,
  ...extra,
});

function Work({ work, width, className, style, step, fx }: { work?: TouchWork; width: number; className?: string; style?: CSSProperties; step?: number; fx?: string }) {
  return (
    <span className={className} style={style} data-step={step} data-fx={fx}>
      {work ? <img data-sc-work="" src={proxiedImageUrl(work.src, width)} alt="" loading="lazy" decoding="async" /> : null}
    </span>
  );
}

export default function GetInTouch() {
  const { user } = useAuth();
  const works = useTouchWorks();
  const [anim, setAnim] = useState(false);
  const diveRef = useRef<HTMLElement>(null);

  const n = works.length;
  const pick = (i: number): TouchWork | undefined => (n ? works[((i % n) + n) % n] : undefined);
  // Same split as the mock: floating works from the start of the list, the chapters from its end.
  const space = [0, 1, 2].map((c) => [pick(-6 + c), pick(-3 + c)]);
  const inv = space.map(([a, b]) => (a && b ? 1 / (1 / a.ratio + 1 / b.ratio) : 1));
  const invSum = inv.reduce((s, v) => s + v, 0);
  const prof = [0, 1, 2].map((k) => pick(-9 + k));
  const opp = [0, 1, 2].map((k) => pick(-12 + k));

  // Camera: follows the scroll with easing and rests at each chapter (mock componentDidMount).
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
    let raf = 0;
    let on = false;
    let started = false;
    let cam = 0;
    let lastCam = NaN;
    let lastP = NaN;
    let lastCount = -1;

    const clear = () => {
      const root = diveRef.current;
      if (!root) return;
      root.querySelectorAll<HTMLElement>("[data-z],[data-hud],[data-step]").forEach((el) => {
        const s = el.style;
        s.translate = "";
        s.scale = "";
        s.opacity = "";
        s.visibility = "";
        s.filter = "";
        s.zIndex = "";
        s.pointerEvents = "";
      });
      root.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
        el.textContent = Number(el.dataset.count).toLocaleString("en-US");
      });
      root.querySelectorAll<SVGElement>("[data-draw]").forEach((el) => {
        el.style.strokeDashoffset = "";
      });
      lastCam = NaN;
    };

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const can = !reduce.matches && window.innerHeight < 2400;
      if (!can) {
        if (on) {
          on = false;
          started = false;
          setAnim(false);
          clear();
        }
        return;
      }
      if (!on) {
        on = true;
        setAnim(true);
        return;
      }
      const dv = diveRef.current;
      if (!dv) return;
      const r = dv.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      const p = span > 0 ? clamp(-r.top / span) : 0;
      const seg = p * (STOPS.length - 1);
      const i = Math.min(STOPS.length - 2, Math.floor(seg));
      const f = seg - i;
      const c3 = f < 0.5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2;
      const e = 0.4 * f + 0.6 * c3; // rests at each chapter but still follows the finger
      const target = STOPS[i] + (STOPS[i + 1] - STOPS[i]) * e;
      if (!started) {
        cam = target;
        started = true;
      } else cam += (target - cam) * 0.14;

      const els = dv.querySelectorAll<HTMLElement>("[data-z]");
      // Nothing moved since the last frame: leave the page alone.
      if (Math.abs(cam - lastCam) < 0.01 && p === lastP && els.length === lastCount) return;
      lastCam = cam;
      lastP = p;
      lastCount = els.length;

      els.forEach((el) => {
        const st = el.style;
        const ez = cam - Number(el.dataset.z);
        const deco = el.hasAttribute("data-deco");
        const far = el.hasAttribute("data-far");
        // floating works fade sooner so they never cover a heading as they pass the camera
        const o =
          (deco ? clamp((ez + 2400) / 1400) * 0.92 : far ? clamp((ez + 1100) / 700) : clamp((ez + 1150) / 650)) *
          (1 - (deco ? clamp((ez - 60) / 380) : clamp((ez - 180) / 560)));
        if (o <= 0.01) {
          if (st.visibility !== "hidden") st.visibility = "hidden";
          return;
        }
        st.visibility = "visible";
        st.translate = `-50% -50% ${ez.toFixed(1)}px`;
        st.opacity = o.toFixed(3);
        st.filter = ez < -350 ? `blur(${Math.min(7, (-ez - 350) / 260).toFixed(1)}px)` : "none";
        st.zIndex = String(40000 + Math.round(ez));
        st.pointerEvents = Math.abs(ez) < 140 ? "auto" : "none";

        // Each chapter's picture has its own beat, tied to the scroll (Beam 18 Nov):
        // data-step = order · data-fx = slide | pop | rise · data-count = count up · data-draw = draw the line
        const steps = el.querySelectorAll<HTMLElement>("[data-step]");
        if (!steps.length) return;
        const arr = clamp((ez + 700) / 620);
        let N = 0;
        steps.forEach((s) => (N = Math.max(N, Number(s.dataset.step) + 1)));
        const g = N > 4 ? 0.3 : 0.45;
        steps.forEach((s) => {
          const si = Number(s.dataset.step);
          const fx = s.dataset.fx || "slide";
          let t = clamp(arr * (1 + g * (N - 1)) - g * si);
          const ss = s.style;
          if (fx === "pop") {
            const c1 = 1.70158;
            const k3 = c1 + 1;
            const u = t - 1;
            const b = 1 + k3 * u * u * u + c1 * u * u;
            ss.opacity = clamp(t * 3).toFixed(3);
            ss.scale = (0.4 + 0.6 * b).toFixed(3);
          } else {
            t = 1 - Math.pow(1 - t, 3);
            ss.opacity = t.toFixed(3);
            ss.translate =
              fx === "rise" ? `0 ${((1 - t) * 56).toFixed(1)}px` : `${((1 - t) * -(40 * si + 30)).toFixed(1)}px ${((1 - t) * 46).toFixed(1)}px`;
          }
        });
        el.querySelectorAll<HTMLElement>("[data-count]").forEach((c) => {
          let tc = clamp(arr * 1.5 - 0.35);
          tc = 1 - Math.pow(1 - tc, 3);
          const txt = Math.round(Number(c.dataset.count) * tc).toLocaleString("en-US");
          if (c.textContent !== txt) c.textContent = txt;
        });
        const dr = el.querySelector<SVGElement>("[data-draw]");
        if (dr) dr.style.strokeDashoffset = (1 - clamp(arr * 1.6 - 0.5)).toFixed(3);
      });

      const hs = dv.querySelector<HTMLElement>('[data-hud="start"]');
      if (hs) hs.style.opacity = (1 - clamp(cam / 400)).toFixed(2);
      const hb = dv.querySelector<HTMLElement>('[data-hud="bar"]');
      if (hb) hb.style.scale = `${p.toFixed(4)} 1`;
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={anim ? "gt-page gt-anim" : "gt-page"}>
      <section ref={diveRef} className="gt-dive" aria-label="เกี่ยวกับ Samecor">
        <div className="gt-stage">
          <div className="gt-room">
            {/* works floating at their depth (only while the camera moves) */}
            {DECO.map((d, i) => {
              const w = pick(i);
              return w ? (
                <span
                  key={i}
                  className="gt-item gt-deco"
                  aria-hidden="true"
                  data-z={d.z}
                  data-deco=""
                  style={{ left: `${d.x.toFixed(1)}%`, top: `${d.y.toFixed(1)}%`, width: d.w, height: Math.round(d.w / w.ratio) }}
                >
                  <img data-sc-work="" src={proxiedImageUrl(w.src, 640)} alt="" loading="lazy" decoding="async" />
                </span>
              ) : null;
            })}

            {/* 0 · the mark = the door */}
            <h1 className="gt-item gt-logo" data-z="0">
              <SamecorMark />
            </h1>

            <div className="gt-item" data-z="1400" data-far="">
              <p className="gt-word" lang="en">You create.</p>
              <p className="gt-sub">
                <span className="gt-nw">พื้นที่ให้ครีเอเตอร์ไทยแสดงผลงาน</span> <span className="gt-nw">ค้นพบโอกาส และรู้จักกัน</span>
              </p>
            </div>

            <div className="gt-item" data-z="2800">
              <p className="gt-word gt-bold" lang="en">We connect.</p>
              <p className="gt-sub">
                <span className="gt-nw">เชื่อมผลงาน ผู้คน และโอกาส</span> <span className="gt-nw">จากทุกหมวดงาน</span>
              </p>
            </div>

            <div className="gt-item" data-z="4200">
              <h2 className="gt-word gt-w2">
                สิ่งที่ Samecor
                <br />
                สร้างให้คุณ
              </h2>
            </div>

            <div className="gt-item gt-offer" data-z="5500">
              <div>
                <h3>โอกาส</h3>
                <p className="gt-en" lang="en">Opportunities</p>
                <p className="gt-tx">
                  <span className="gt-nw">Open call และงานแสดงทั่วไทย</span> <span className="gt-nw">รวมไว้ที่เดียว</span>
                </p>
              </div>
              <div className="gt-vis gt-opp" aria-hidden="true">
                {[
                  { d: "30", m: "Nov", label: "Open call · ปิดรับใน 12 วัน", red: true, title: "Riso Poster Open Call" },
                  { d: "06", m: "Dec", label: "Workshop", red: false, title: "Zine Making Workshop" },
                  { d: "29", m: "Oct", label: "Exhibition", red: false, title: "Bangkok Art Biennale 2026" },
                ].map((row, k) => (
                  <div key={row.title} data-step={k} className="gt-opp-row">
                    <span className="gt-opp-date">
                      {row.d}
                      <span>{row.m}</span>
                    </span>
                    {/* 72px tall like the mock; a wide work keeps its proportions inside the 88px column */}
                    <Work
                      work={opp[k]}
                      width={256}
                      className="gt-opp-pic"
                      style={{ width: Math.min(88, 72 * (opp[k]?.ratio ?? 1)), aspectRatio: String(opp[k]?.ratio ?? 1) }}
                    />
                    <span className="gt-opp-tx">
                      <span className={row.red ? "gt-opp-label gt-red" : "gt-opp-label"}>{row.label}</span>
                      <span className="gt-opp-title">{row.title}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="gt-item gt-offer" data-z="6800">
              <div>
                <h3>พื้นที่</h3>
                <p className="gt-en" lang="en">A space for your work</p>
                <p className="gt-tx">
                  <span className="gt-nw">สร้างพื้นที่ลงผลงาน</span> <span className="gt-nw">สร้างตัวตน</span> <span className="gt-nw">ให้ผู้คนรู้จักตัวตนของคุณ</span>
                </p>
              </div>
              {/* six real works, three columns of two, bento by the real proportions: every column ends level */}
              <div className="gt-vis gt-space" aria-hidden="true">
                {space.map((col, ci) => (
                  <div key={ci} className="gt-space-col" style={{ width: `calc((100% - 20px) * ${(inv[ci] / invSum).toFixed(5)})` }}>
                    {col.map((w, ri) => (
                      <Work key={ri} work={w} width={640} step={ci + ri * 3} fx="pop" className="gt-tile" style={{ aspectRatio: String(w?.ratio ?? 1) }} />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="gt-item gt-offer" data-z="8100">
              <div>
                <h3>มิตรภาพ</h3>
                <p className="gt-en" lang="en">People who make things</p>
                <p className="gt-tx">
                  <span className="gt-nw">ติดตาม ทักทาย</span> <span className="gt-nw">และสร้างเครือข่ายกับครีเอเตอร์</span>
                </p>
              </div>
              <div className="gt-vis gt-fr" aria-hidden="true">
                <div className="gt-fr-people">
                  <span data-step={0} data-fx="pop" style={person(1)} />
                  <span data-step={1} data-fx="pop" style={person(2)} />
                  <span data-step={2} data-fx="pop" style={person(3)} />
                  <span data-step={3} data-fx="pop" className="gt-fr-more">+4</span>
                </div>
                <span className="gt-bob gt-chip gt-c1" data-step={4} data-fx="pop">
                  <span className="gt-chip-av" style={person(5)} />
                  <b>nok.studio</b> เริ่มติดตามคุณ
                  <span className="gt-dot" />
                </span>
                <span className="gt-bob gt-bubble gt-c2" data-step={5} data-fx="pop">ชอบสีน้ำเงินตรงกระจกรถมาก</span>
                <span className="gt-bob gt-bubble gt-me gt-c3" data-step={6} data-fx="pop">ขอบคุณครับ พิมพ์ริโซ 3 สี</span>
                <span className="gt-bob gt-bubble gt-c4" data-step={7} data-fx="pop">ไว้ไปดูงานจริงที่ BACC นะ</span>
                <span className="gt-bob gt-chip gt-c5" data-step={8} data-fx="pop">
                  <span className="gt-chip-av" style={person(6)} />
                  <b>mintra.k</b> ทักทายคุณ
                  <span className="gt-dot" />
                </span>
                <span className="gt-bob gt-chip gt-c6" data-step={9} data-fx="pop">
                  <span className="gt-chip-av" style={person(7)} />
                  <b>ploy.draws</b> ถูกใจ Night Bus
                </span>
                <span className="gt-bob gt-hi gt-c7" data-step={10} data-fx="pop">ทักทาย</span>
              </div>
            </div>

            <div className="gt-item gt-offer" data-z="9400">
              <div>
                <h3>โปรไฟล์</h3>
                <p className="gt-en" lang="en">One profile, everywhere</p>
                <p className="gt-tx">
                  <span className="gt-nw">ลิงก์เดียว</span> <span className="gt-nw">ใช้แทนพอร์ตได้ทุกที่</span>
                </p>
              </div>
              <div className="gt-vis gt-prof" aria-hidden="true">
                <div data-step={0} data-fx="rise" className="gt-prof-card">
                  <span className="gt-prof-av" style={person(4)} />
                  <span className="gt-prof-name">Beam</span>
                  <span className="gt-prof-handle">@beam.riso</span>
                  <span className="gt-prof-works">
                    {prof.map((w, k) => (
                      <Work key={k} work={w} width={256} step={k + 1} fx="pop" className="gt-prof-w" style={{ flex: `${w?.ratio ?? 1} 1 0`, aspectRatio: String(w?.ratio ?? 1) }} />
                    ))}
                  </span>
                </div>
                <span data-step={4} data-fx="slide" className="gt-prof-url">
                  samecor.com/<span>@beam.riso</span>
                </span>
              </div>
            </div>

            <div className="gt-item gt-offer" data-z="10700">
              <div>
                <h3>สตูดิโอ</h3>
                <p className="gt-en" lang="en">Your studio at a glance</p>
                <p className="gt-tx">
                  <span className="gt-nw">ยอดเข้าชม ถูกใจ และผู้ติดตาม</span> <span className="gt-nw">ของทุกผลงาน</span> <span className="gt-nw">ใน My Studio</span>
                </p>
              </div>
              <div className="gt-vis gt-studio" aria-hidden="true">
                <span data-step={0} data-fx="rise" className="gt-stat">
                  <span data-count="1287">1,287</span>
                  <span>ยอดเข้าชม 7 วัน</span>
                </span>
                <span data-step={1} data-fx="rise" className="gt-stat">
                  <span data-count="214">214</span>
                  <span>ถูกใจ</span>
                </span>
                <span data-step={2} data-fx="rise" className="gt-stat">
                  <span data-count="12">12</span>
                  <span>ผู้ติดตาม</span>
                </span>
                <svg viewBox="0 0 600 96" preserveAspectRatio="none" fill="none">
                  <path d="M0 96 L0 78 L100 70 L200 74 L300 52 L400 58 L500 28 L600 14 L600 96Z" fill="#F5F5F3" />
                  <path d="M0 78 L100 70 L200 74 L300 52 L400 58 L500 28 L600 14" data-draw="" pathLength={1} strokeDasharray="1" stroke="#282929" strokeWidth="1.5" />
                </svg>
              </div>
            </div>

            <div className="gt-item" data-z="12000">
              <p className="gt-word gt-w3" lang="en">
                Show your work.
                <br />
                Discover opportunities.
              </p>
              <p className="gt-sub">
                {/* Owner 2026-11-28 (Beam 22): the English line instead of the mock's Thai one. */}
                <span lang="en" className="gt-nw">1 Profile to 100+ Opportunities</span>
                <br />
                <span lang="en" className="gt-nw">Work from every creative field.</span>
              </p>
            </div>

            <div className="gt-item" data-z="13400">
              <h2 className="gt-word gt-w4" lang="en">
                Your work deserves
                <br />
                to be seen.
              </h2>
              <div className="gt-cta">
                <Link to={user ? SC_LINKS.upload : SC_LINKS.login} className="gt-cta-main">ลงผลงาน</Link>
                <Link to={SC_LINKS.home} className="gt-cta-alt">ดูผลงานในหน้าแรก</Link>
              </div>
            </div>

            {/* marks on the room's edge (only while the camera moves) */}
            <p className="gt-hud gt-hud-start" data-hud="start" aria-hidden="true">เลื่อนลง</p>
            <span className="gt-hud gt-hud-bar" data-hud="bar" aria-hidden="true" />
          </div>
        </div>
      </section>

      <main className="gt-main">
        <section className="gt-card gt-contact" aria-labelledby="gt-ct">
          <h2 id="gt-ct">Get in Touch</h2>
          <div className="gt-contact gt-links">
            <a href="mailto:info@samecor.com" className="gt-link">
              <b>Email</b>
              <span>info@samecor.com</span>
            </a>
            <a href="https://line.me/R/ti/p/@samecor" target="_blank" rel="noopener noreferrer" className="gt-link">
              <b>LINE</b>
              <span>@samecor</span>
            </a>
            <a href="https://www.facebook.com/samecor2026" target="_blank" rel="noopener noreferrer" className="gt-link">
              <b>Facebook</b>
              <span>samecor2026</span>
            </a>
            <a href="https://www.facebook.com/groups/1554275318664897" target="_blank" rel="noopener noreferrer" className="gt-link">
              <b>Facebook group</b>
              <span className="gt-nw">กลุ่มครีเอเตอร์ Samecor</span>
            </a>
            <Link to={SC_LINKS.feedback} className="gt-link">
              <b>Feedback</b>
              <span className="gt-nw">ข้อเสนอแนะและแจ้งปัญหา</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
