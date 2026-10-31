import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import SeoHead from "@/components/SeoHead";
import { CollabBoard } from "@/components/landing/CollabBoard";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LookCloser } from "@/components/landing/LookCloser";
import { QuoteChat } from "@/components/landing/QuoteChat";
import { SHOWCASE, SHOWCASE_WIDE, type LandingWork } from "@/components/landing/showcase";
import { TrendCard } from "@/components/landing/TrendCard";
import { useLandingCopy } from "@/components/landing/useLandingCopy";
import { useLandingMotion, useMouseTrail } from "@/components/landing/useLandingMotion";
import { Wordmark } from "@/components/landing/Wordmark";
import "@/components/landing/landing.css";
import { useAuth } from "@/hooks/useAuth";
import { usePublishedProjects, type DBProject } from "@/hooks/useProjects";
import {
  BRAND_FACEBOOK_GROUP_URL,
  BRAND_FACEBOOK_URL,
  BRAND_LINE_CONTACT_URL,
  BRAND_LINE_ID,
  BRAND_NAME,
  BRAND_SUPPORT_EMAIL,
} from "@/lib/brandConfig";
import { optimizedFeedImageUrl } from "@/lib/feedProjectCover";

const MARQUEE = ["Graphic", "Illustration", "UX/UI", "Motion", "Photo", "3D", "Branding", "Typography"];
// Member works woven into the examples, one after every second example.
const MAX_MEMBER_WORKS = 6;

const ICONS = [
  <>
    <rect x="6" y="14" width="36" height="26" rx="5" />
    <path d="M17 14v-3a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3M6 25h36M22 25v4h4v-4" />
  </>,
  <>
    <path d="M9 16h30l-2.5 22a3 3 0 0 1-3 2.7h-19a3 3 0 0 1-3-2.7Z" />
    <path d="M17 20v-6a7 7 0 0 1 14 0v6" />
  </>,
  <>
    <rect x="7" y="9" width="34" height="24" rx="3" />
    <path d="M13 27l7-8 6 6 4-4 5 6M15 41l9-8 9 8" />
    <circle cx="31" cy="16" r="2.5" />
  </>,
  <>
    <path d="M8 40V20l16-11 16 11v20" />
    <path d="M8 40h32M19 40V29h10v11" />
    <circle cx="17" cy="21" r="2.5" />
    <circle cx="31" cy="21" r="2.5" />
  </>,
];

const toWork = (p: DBProject): LandingWork | null => {
  const cover = p.cover_url?.trim() || p.gallery_urls?.find((url) => url?.trim());
  if (!cover) return null;
  return {
    id: p.id,
    title: p.title,
    category: p.category ?? "",
    src: optimizedFeedImageUrl(cover, { width: 640, quality: 75, natural: false }),
    href: `/project/${p.id}`,
  };
};

function Stack() {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"intro" | "open" | "drawn">("intro");

  useEffect(() => {
    const timers: number[] = [];
    const once = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        once.disconnect();
        timers.push(window.setTimeout(() => setPhase("open"), 200), window.setTimeout(() => setPhase("drawn"), 1200));
      },
      { threshold: 0.3 },
    );
    if (ref.current) once.observe(ref.current);
    return () => {
      once.disconnect();
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  return (
    <div ref={ref} className={`stack reveal ${phase === "intro" ? "intro" : ""} ${phase === "drawn" ? "drawn" : ""}`}>
      {SHOWCASE.slice(0, 5).map((w, i) => (
        <div
          key={w.id}
          className="c"
          style={{ "--dx": `${(2 - i) * 14}%`, "--dy": `${20 - i * 6}%`, "--dly": phase === "drawn" ? "0ms" : `${150 + i * 110}ms` } as React.CSSProperties}
        >
          <img src={w.src} alt="" />
          <span className="tag">{w.category}</span>
        </div>
      ))}
      <svg className="frame" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 14V0h14" />
        <path d="M86 0h14v14" />
        <path d="M100 86v14H86" />
        <path d="M14 100H0V86" />
      </svg>
    </div>
  );
}

function Flip({ title, sub, lead, icon }: { title: string; sub: string; lead: string; icon: JSX.Element }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button type="button" className="flip" aria-pressed={flipped} onClick={() => setFlipped((v) => !v)}>
      <span className="fi">
        <span className="ff front">
          <svg viewBox="0 0 48 48" className="ficon" aria-hidden="true">
            {icon}
          </svg>
          <span className="ft">
            <b>{title}</b>
            <small>{sub}</small>
          </span>
          <span className="soon">Soon</span>
          <span className="flip-hint" aria-hidden="true">
            ↻
          </span>
        </span>
        <span className="ff back">
          <span className="k" style={{ color: "inherit", opacity: 0.6 }}>
            {title}
          </span>
          <b className="fb">{lead}</b>
        </span>
      </span>
    </button>
  );
}

export default function PlatformLandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const { hash } = useLocation();
  const { user } = useAuth();
  const { data } = usePublishedProjects();
  const { lang, setLang, t, list } = useLandingCopy();
  const [category, setCategory] = useState("");
  const [word, setWord] = useState(0);
  const [wordOut, setWordOut] = useState(false);
  const [slide, setSlide] = useState(0);

  const works = useMemo(() => {
    const members = (data ?? []).map(toWork).filter((w): w is LandingWork => !!w).slice(0, MAX_MEMBER_WORKS);
    return SHOWCASE.flatMap((w, i) => (i % 2 === 1 && members[(i - 1) / 2] ? [w, members[(i - 1) / 2]] : [w]));
  }, [data]);
  const categories = useMemo(() => [...new Set(works.map((w) => w.category).filter(Boolean))].slice(0, 6), [works]);
  const shown = category ? works.filter((w) => w.category === category) : works;
  const trailSrcs = useMemo(() => works.map((w) => w.src), [works]);
  const postHref = user ? "/portfolio/new" : "/auth";
  const rollWords = ["Opportunities", "Designers", "Artists", "Projects", "Collaborations"];

  useLandingMotion(rootRef, [lang, works.length, category]);
  useMouseTrail(zoneRef, trailSrcs);

  const jump = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 72, behavior: reduced ? "auto" : "smooth" });
  }, []);

  // Links like /learn#contact: wait for the route's scroll reset and for the works to set the page height.
  useEffect(() => {
    const el = hash ? document.getElementById(hash.slice(1)) : null;
    if (!el) return;
    const id = window.setTimeout(() => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 72 }), 120);
    return () => window.clearTimeout(id);
  }, [hash, works.length]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let swap = 0;
    const roll = window.setInterval(() => {
      setWordOut(true);
      swap = window.setTimeout(() => {
        setWord((i) => (i + 1) % rollWords.length);
        setWordOut(false);
      }, 300);
    }, 2400);
    return () => {
      window.clearInterval(roll);
      window.clearTimeout(swap);
    };
  }, [rollWords.length]);

  useEffect(() => {
    const id = window.setInterval(() => setSlide((i) => (i + 1) % SHOWCASE_WIDE.length), 5000);
    return () => window.clearInterval(id);
  }, []);

  const copyEmail = () => {
    void navigator.clipboard?.writeText(BRAND_SUPPORT_EMAIL).catch(() => {});
    toast(t("mail"));
  };

  return (
    <div className="sl" data-lang={lang} lang={lang} ref={rootRef}>
      <SeoHead
        path="/learn"
        title={`${BRAND_NAME} — About`}
        description="You Create. We Connect. Show your work, get discovered, and connect with new opportunities on SAMECOR."
      />
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <filter id="deutan">
          <feColorMatrix type="matrix" values="0.367 0.861 -0.228 0 0  0.280 0.673 0.047 0 0  -0.012 0.043 0.969 0 0  0 0 0 1 0" />
        </filter>
      </svg>

      <div className="progress" aria-hidden="true" />
      <div className="edge-blur" aria-hidden="true" />
      <LandingHeader lang={lang} setLang={setLang} t={t} onJump={jump} />

      <div className="sl-main" id="top">
        <div className="bigmark" ref={zoneRef}>
          <Wordmark />
        </div>

        <div className="wrap hero">
          <div className="reveal">
            <p className="eyebrow star">You Create. We Connect.</p>
            <h1 className="en">
              <span>1 Profile to</span>
              <span>
                100+ <span className={wordOut ? "roll out" : "roll"}>{rollWords[word]}</span>
              </span>
            </h1>
            <div className="ctas">
              <Link className="btn primary" to={postHref}>
                {t("cta.post")} <ArrowUpRight className="arrow" aria-hidden="true" />
              </Link>
            </div>
          </div>
          <Stack />
        </div>

        <div className="marquee" aria-hidden="true">
          <div className="track">
            {[...MARQUEE, ...MARQUEE].map((w, i) => (
              <span key={`${w}-${i}`}>
                {w} <b>*</b>
              </span>
            ))}
          </div>
        </div>

        <section className="block" id="works">
          <div className="wrap">
            <div className="head reveal">
              <p className="eyebrow star" />
              <h2 className="en">
                Show Your Work.
                <br />
                Discover Opportunities.
              </h2>
              <p className="sub">{t("works.sub")}</p>
            </div>
            {categories.length > 1 ? (
              <div className="filters">
                {["", ...categories].map((c) => (
                  <button key={c || "all"} type="button" className="chip" aria-pressed={c === category} onClick={() => setCategory(c)}>
                    {c || t("all")}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="gallery">
              {shown.map((w) =>
                w.href ? (
                  <Link key={w.id} className="g reveal" to={w.href} aria-label={w.title}>
                    <img src={w.src} alt="" loading="lazy" />
                    <div className="ov">{w.title}</div>
                  </Link>
                ) : (
                  <div key={w.id} className="g reveal">
                    <img src={w.src} alt={w.title} loading="lazy" />
                    <div className="ov">{t("sample")}</div>
                  </div>
                ),
              )}
            </div>
          </div>
        </section>

        <section className="block" id="look">
          <div className="wrap">
            <div className="head reveal">
              <p className="eyebrow star" />
              <h2 className="en">More than a picture.</h2>
              <p className="sub">{t("look.sub")}</p>
            </div>
            <LookCloser src="/landing/works/market.jpg" t={t} behind={list<[string, string][]>("bts")} />
          </div>
        </section>

        <section className="block" id="profile">
          <div className="wrap">
            <div className="head reveal">
              <p className="eyebrow star" />
              <h2 className="en">One profile, everywhere.</h2>
              <p className="sub">{t("pf.sub")}</p>
            </div>
            <div className="pf">
              <div className="reveal">
                <p className="k">{t("pf.in")}</p>
                <ul className="pf-list">
                  {list<string[]>("pf.inList").map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
              <div className="pf-card reveal">
                <div className="pf-cover">
                  <img src="/landing/works/painting.jpg" alt="" />
                </div>
                <div className="pf-body">
                  <span className="pf-av" />
                  <b>{t("pf.name")}</b>
                  <small className="muted">Illustrator · Branding</small>
                  <div className="pf-link">samecor.com/@yourname</div>
                  <div className="pf-works">
                    {["market", "silk", "toy"].map((id) => `/landing/works/${id}.jpg`).map((src) => (
                      <img key={src} src={src} alt="" />
                    ))}
                  </div>
                  <div className="pf-act">
                    <Link className="btn ink sm" to={user ? "/portfolio" : "/auth"}>
                      {t("pf.cta")}
                    </Link>
                  </div>
                </div>
              </div>
              <div className="reveal">
                <p className="k">{t("pf.out")}</p>
                <ul className="pf-list">
                  {list<string[]>("pf.outList").map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="block" id="studio">
          <div className="wrap">
            <div className="head reveal">
              <p className="eyebrow star">My Studio</p>
              <h2 className="en">Your studio at a glance.</h2>
              <p className="sub">{t("da.sub")}</p>
            </div>
            <div className="dash reveal">
              <TrendCard t={t} image="/landing/works/poster.jpg" />
              <ul className="do-list">
                {list<string[]>("da.list").map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="wrap split quote-row">
            <div className="reveal">
              <h2 className="en" style={{ fontSize: "clamp(2.1rem,5.4vw,3.8rem)" }}>
                Quote right where you talk.
              </h2>
              <p className="sub" style={{ fontSize: "clamp(1.05rem,2vw,1.35rem)" }}>
                {t("st.sub")}
              </p>
            </div>
            <QuoteChat t={t} />
          </div>
        </section>

        <section className="block" id="collab">
          <div className="wrap">
            <div className="head reveal">
              <p className="eyebrow star" />
              <h2 className="en">Make it together.</h2>
              <p className="sub">{t("co.sub")}</p>
            </div>
            <div className="collab">
              <CollabBoard t={t} stages={list<string[]>("stages")} tasks={list<string[]>("tasks")} />
              <div className="card credit reveal">
                <p className="k">{t("cr.k")}</p>
                <div className="cr">
                  <img src="/landing/works/chrome.jpg" alt="" />
                  <div className="cr-by">
                    <span className="av" />
                    <span className="av" />
                    <small>{t("cr.n")}</small>
                  </div>
                </div>
                <p style={{ margin: 0 }}>{t("cr.t")}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="block" id="app">
          <div className="wrap">
            <div className="app reveal">
              <div className="app-txt">
                <p className="eyebrow star" />
                <h2 className="en" style={{ fontSize: "clamp(2.1rem,5.4vw,3.8rem)", marginTop: 12 }}>
                  Your work, in your pocket.
                </h2>
                <p className="sub">{t("app.sub")}</p>
                <div className="stores">
                  <div className="store">
                    <img src="/go/badges/google-play.png" alt="Google Play" />
                    <span>Coming soon</span>
                  </div>
                  <div className="store">
                    <img src="/go/badges/app-store.png" alt="App Store" />
                    <span>Coming soon</span>
                  </div>
                </div>
              </div>
              <div className="phones" aria-hidden="true">
                {[
                  ["p1", "app-project"],
                  ["p2", "app-feed"],
                  ["p3", "app-profile"],
                ].map(([pos, file]) => (
                  <div key={pos} className={`phone ${pos}`}>
                    <div className="screen">
                      <img src={`/landing/${file}.jpg`} alt="" loading="lazy" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="block" id="soon">
          <div className="wrap">
            <div className="head reveal">
              <p className="eyebrow star" />
              <h2 className="en">What's next.</h2>
              <p className="sub">{t("soon.sub")}</p>
            </div>
            <div className="flips">
              {list<[string, string, string][]>("cards").map(([title, sub, lead], i) => (
                <Flip key={title} title={title} sub={sub} lead={lead} icon={ICONS[i]} />
              ))}
            </div>
          </div>
        </section>

        <section className="block">
          <div className="wrap">
            <div className="meet reveal">
              {SHOWCASE_WIDE.map((src, i) => (
                <img key={src} src={src} alt="" loading="lazy" className={i === slide ? "on" : undefined} />
              ))}
              <div className="in">
                <p className="eyebrow star" />
                <h2 className="en">Your Work Deserves to Be Seen.</h2>
                <p className="sub">{t("end.sub")}</p>
                <div className="ctas">
                  <Link className="btn primary" to={postHref}>
                    {t("cta.post")} <ArrowUpRight className="arrow" aria-hidden="true" />
                  </Link>
                  <Link className="btn line" style={{ borderColor: "rgba(255,255,255,.35)", color: "#fff" }} to="/">
                    Explore Work
                  </Link>
                </div>
                <div className="dots">
                  {SHOWCASE_WIDE.map((src, i) => (
                    <button key={src} type="button" aria-label={String(i + 1)} className={i === slide ? "on" : undefined} onClick={() => setSlide(i)} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer id="contact">
        <div className="wrap">
          <div className="foot">
            <div>
              <img src="/brand/logo-horizontal.svg" alt="SAMECOR" style={{ height: 26 }} />
              <p className="muted">You Create. We Connect.</p>
            </div>
            <div>
              <h4>{t("ft.platform")}</h4>
              <Link to="/">{t("nav.works")}</Link>
              <a href="#profile" onClick={(e) => (e.preventDefault(), jump("profile"))}>
                {t("nav.profile")}
              </a>
              <a href="#studio" onClick={(e) => (e.preventDefault(), jump("studio"))}>
                My Studio
              </a>
            </div>
            <div>
              <h4>{t("ft.contact")}</h4>
              <a href={BRAND_LINE_CONTACT_URL} target="_blank" rel="noopener noreferrer">
                LINE {BRAND_LINE_ID}
              </a>
              <a href={BRAND_FACEBOOK_URL} target="_blank" rel="noopener noreferrer">
                Facebook
              </a>
              <a href={BRAND_FACEBOOK_GROUP_URL} target="_blank" rel="noopener noreferrer">
                {t("ft.group")}
              </a>
            </div>
            <div>
              <h4>{t("ft.help")}</h4>
              <Link to="/help">{t("ft.helpc")}</Link>
              <Link to="/legal/privacy">{t("ft.privacy")}</Link>
              <Link to="/legal/terms">{t("ft.terms")}</Link>
            </div>
          </div>
          <div className="big">
            {[..."samecor"].map((ch, i) => (
              <span key={i} className="l" style={{ "--i": i } as React.CSSProperties}>
                {ch}
              </span>
            ))}
            <span className="l" style={{ "--i": 7, color: "var(--red)" } as React.CSSProperties}>
              .
            </span>
          </div>
          <div className="contact-strip">
            <p>{t("ft.sponsor")}</p>
            <div>
              <a href={BRAND_LINE_CONTACT_URL} target="_blank" rel="noopener noreferrer">
                LINE {BRAND_LINE_ID}
              </a>
              <a href={`mailto:${BRAND_SUPPORT_EMAIL}`} onClick={copyEmail}>
                {BRAND_SUPPORT_EMAIL}
              </a>
            </div>
          </div>
          <div className="copy">
            <span>© 2026 SAMECOR. All rights reserved.</span>
            <span>{t("ft.note")}</span>
            <span>Made in Thailand</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
