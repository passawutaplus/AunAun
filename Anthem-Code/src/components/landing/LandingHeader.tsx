import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { LANDING_LANGS, type LandingLang } from "./copy";
import type { LandingText } from "./useLandingCopy";

/** Two capsules joined by a liquid neck; same neck geometry as joinedPillPath() in src/go/shape.ts. */
function joinedPath(leftW: number, rightW: number, h: number, gap: number) {
  const r = h / 2;
  const c1 = leftW - r;
  const c2 = leftW + gap + r;
  const end = leftW + gap + rightW;
  const t = (50 * Math.PI) / 180;
  const sin = Math.sin(t);
  const cos = Math.cos(t);
  const px = c1 + r * cos;
  const qx = c2 - r * cos;
  const top = r - r * sin;
  const bot = r + r * sin;
  const k = (qx - px) / 2;
  const n = (v: number) => v.toFixed(2);
  return [
    `M ${n(r)} 0 L ${n(c1)} 0`,
    `A ${r} ${r} 0 0 1 ${n(px)} ${n(top)}`,
    `C ${n(px + k * sin)} ${n(top + k * cos)} ${n(qx - k * sin)} ${n(top + k * cos)} ${n(qx)} ${n(top)}`,
    `A ${r} ${r} 0 0 1 ${n(c2)} 0 L ${n(end - r)} 0`,
    `A ${r} ${r} 0 0 1 ${n(end - r)} ${h} L ${n(c2)} ${h}`,
    `A ${r} ${r} 0 0 1 ${n(qx)} ${n(bot)}`,
    `C ${n(qx - k * sin)} ${n(bot - k * cos)} ${n(px + k * sin)} ${n(bot - k * cos)} ${n(px)} ${n(bot)}`,
    `A ${r} ${r} 0 0 1 ${n(c1)} ${h} L ${n(r)} ${h}`,
    `A ${r} ${r} 0 0 1 ${n(r)} 0 Z`,
  ].join(" ");
}

const SECTIONS = [
  { id: "works", key: "nav.works" },
  { id: "look", key: "nav.look" },
  { id: "profile", key: "nav.profile" },
  { id: "studio", label: "My Studio" },
  { id: "collab", key: "nav.collab" },
  { id: "app", key: "nav.app" },
  { id: "soon", key: "nav.soon" },
];

type Props = {
  lang: LandingLang;
  setLang: (lang: LandingLang) => void;
  t: LandingText;
  onJump: (id: string) => void;
};

export function LandingHeader({ lang, setLang, t, onJump }: Props) {
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [active, setActive] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const joinedRef = useRef<HTMLDivElement>(null);
  const langBtnRef = useRef<HTMLButtonElement>(null);
  const exploreRef = useRef<HTMLAnchorElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const current = LANDING_LANGS.find((l) => l.id === lang) ?? LANDING_LANGS[0];

  const close = () => {
    setOpen(false);
    setLangOpen(false);
  };

  useLayoutEffect(() => {
    if (!open) return;
    const box = joinedRef.current;
    const left = langBtnRef.current?.offsetWidth ?? 0;
    const right = exploreRef.current?.offsetWidth ?? 0;
    if (!box || !left || !right) return;
    svgRef.current?.setAttribute("viewBox", `0 0 ${box.offsetWidth} ${box.offsetHeight}`);
    pathRef.current?.setAttribute("d", joinedPath(left, right, box.offsetHeight, 12));
  }, [open, lang]);

  useEffect(() => {
    if (open) langBtnRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Mark the section on screen in the menu.
  useEffect(() => {
    const seen = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-45% 0px -50% 0px" },
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) seen.observe(el);
    });
    return () => seen.disconnect();
  }, []);

  return (
    <>
      <Link className="logo" to="/" aria-label="SAMECOR">
        <img src="/brand/symbol-white.svg" alt="" />
      </Link>
      <header>
        <div className="nav">
          <div className="nav-right">
            <div className="menu" ref={menuRef}>
              <button
                type="button"
                className="star-btn"
                aria-label="Menu"
                aria-haspopup="true"
                aria-expanded={open}
                onClick={() => (open ? close() : setOpen(true))}
              >
                <span className="star-glyph" aria-hidden="true">
                  *
                </span>
              </button>
              {open ? (
                <nav className="menu-pop">
                  <div className="menu-tools">
                    <div className="joined" ref={joinedRef}>
                      <svg className="joined-bg" ref={svgRef} aria-hidden="true">
                        <path ref={pathRef} />
                      </svg>
                      <button
                        type="button"
                        className="lang-btn"
                        ref={langBtnRef}
                        aria-label="Language"
                        aria-haspopup="listbox"
                        aria-expanded={langOpen}
                        onClick={() => setLangOpen((v) => !v)}
                      >
                        <span>{current.short}</span>
                        <ChevronDown aria-hidden="true" />
                      </button>
                      <Link className="btn sm" to="/" ref={exploreRef}>
                        Explore Work <ArrowUpRight className="arrow" aria-hidden="true" />
                      </Link>
                    </div>
                    {langOpen ? (
                      <div className="lang-menu" role="listbox" aria-label="Language">
                        {LANDING_LANGS.map((l) => (
                          <button
                            key={l.id}
                            type="button"
                            role="option"
                            aria-selected={l.id === lang}
                            onClick={() => {
                              setLang(l.id);
                              setLangOpen(false);
                            }}
                          >
                            {l.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {SECTIONS.map((s) => (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      className={active === s.id ? "on" : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        close();
                        onJump(s.id);
                      }}
                    >
                      {s.key ? t(s.key) : s.label}
                    </a>
                  ))}
                </nav>
              ) : null}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
