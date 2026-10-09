import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type RefObject } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { startMonolithHeroWave } from "@/components/feed/monolithHeroWave";
import FeedModeToggle, { type FeedMode } from "@/components/feed/FeedModeToggle";
import { useTopProjects, type DBProject } from "@/hooks/useProjects";
import { optimizedFeedImageUrl } from "@/lib/feedProjectCover";
import { smoothEase } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  search?: string;
  onSearchChange?: (value: string) => void;
  mode?: FeedMode;
  onModeChange?: (mode: FeedMode, source?: "hero") => void;
};

function projectCover(project: DBProject) {
  return project.cover_url?.trim() || project.gallery_urls?.find((url) => url?.trim()) || "";
}

/** Paper field plus the warm bottom glow, so the Monolith ripple has something to move. */
function paintPaperStill() {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 1600;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = "#f5f5f5";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const glow = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height,
    canvas.width * 0.08,
    canvas.width / 2,
    canvas.height,
    canvas.width * 0.78,
  );
  glow.addColorStop(0, "rgba(255, 88, 46, 0.62)");
  glow.addColorStop(0.34, "rgba(255, 132, 86, 0.28)");
  glow.addColorStop(0.72, "rgba(245, 245, 245, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

function uniqueThumbs(urls: string[], width: number) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of urls) {
    const trimmed = url.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(optimizedFeedImageUrl(trimmed, { width, quality: 68, natural: false }));
    if (out.length >= 16) break;
  }
  return out;
}

/** Same stagger the reference uses so the tiles don't arrive in a row. */
const TILE_DELAYS = [0.3, 0, 0.2, 0.4, 0.1, 0.8, 0.5, 0.3, 0.2, 0.5, 0.7, 0.4, 0.4, 0.2, 0.5, 0.6];

function coverColumns(urls: string[]) {
  return Array.from({ length: 4 }, (_, column) => urls.slice(column * 4, column * 4 + 4));
}

/** Nouns that rise through the second line, starting on Opportunity. */
const HERO_RISING_WORDS = ["Opportunity", "Designer", "Artist", "Project", "Collaboration"] as const;
const HERO_RISE_MS = 2400;
const HERO_RISE_EASE = smoothEase;

/** "100+" stays put. Only the noun beside it rises. */
function HeroRollingLine({ images, interactive }: { images: string[]; interactive: boolean }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduced || HERO_RISING_WORDS.length < 2) return;
    let intervalId = 0;
    const delayId = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        setIndex((i) => (i + 1) % HERO_RISING_WORDS.length);
      }, HERO_RISE_MS);
    }, 2200);
    return () => {
      window.clearTimeout(delayId);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [reduced]);

  const word = HERO_RISING_WORDS[index] ?? HERO_RISING_WORDS[0];
  const widest = HERO_RISING_WORDS.reduce((a, b) => (a.length >= b.length ? a : b));

  return (
    <span className="poster-word hero-roll-line" style={{ "--w": 3 } as CSSProperties} aria-live="polite">
      <HeroWord before="100" after="+" images={images} interactive={interactive} />
      <span className="hero-roll">
        <span className="hero-roll-sizer" aria-hidden>
          {widest}
        </span>
        <AnimatePresence initial={false}>
          <motion.span
            key={word}
            className="hero-roll-row"
            initial={reduced ? false : { y: "100%" }}
            animate={{ y: "0%" }}
            exit={reduced ? undefined : { y: "-100%" }}
            transition={{ duration: 0.55, ease: HERO_RISE_EASE }}
          >
            {word}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
}

const INTRO_ANIMATIONS = new Set(["poster-word-in", "hero-tile-in", "hero-split", "hero-looking-in"]);

/** Running entrance animations only — the word roll and search wiggle keep going. */
function introAnimations(root: HTMLElement) {
  return root.getAnimations({ subtree: true }).filter((anim) => {
    if (!("animationName" in anim)) return false;
    const name = (anim as CSSAnimation).animationName;
    return INTRO_ANIMATIONS.has(name) && anim.playState !== "finished";
  });
}

/**
 * Hover inserts (the photo in 100+ and the mode in Profile) stay off
 * until the cover tiles and poster words have finished arriving.
 */
function useHeroIntroReady(
  rootRef: RefObject<HTMLElement | null>,
  entered: boolean,
  reduced: boolean | null,
  coverCount: number,
) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (reduced) {
      setReady(true);
      return;
    }
    if (!entered) {
      setReady(false);
      return;
    }
    const root = rootRef.current;
    if (!root) return;

    let cancelled = false;
    const finish = () => {
      if (!cancelled) setReady(true);
    };
    const watch = (anims: Animation[]) => {
      if (cancelled) return;
      if (anims.length === 0) {
        finish();
        return;
      }
      void Promise.all(anims.map((anim) => anim.finished.catch(() => undefined))).then(() => {
        if (cancelled) return;
        const more = introAnimations(root);
        if (more.length === 0) finish();
        else watch(more);
      });
    };

    setReady(false);
    let attempts = 0;
    let frame = 0;
    const check = () => {
      if (cancelled) return;
      const anims = introAnimations(root);
      if (anims.length > 0) {
        watch(anims);
        return;
      }
      attempts += 1;
      if (attempts < 8) {
        frame = requestAnimationFrame(check);
        return;
      }
      finish();
    };
    frame = requestAnimationFrame(check);
    const fallback = window.setTimeout(finish, 3200);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(fallback);
    };
  }, [entered, reduced, coverCount, rootRef]);

  return ready;
}

/** Hover opens a photo, then shuffles while the pointer stays. */
function useHeroPhotoSlot(images: string[]) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [src, setSrc] = useState("");
  const indexRef = useRef(0);

  useEffect(() => {
    if (!open || reduced || images.length < 2) return;
    const timer = window.setInterval(() => {
      indexRef.current = (indexRef.current + 1) % images.length;
      setSrc(images[indexRef.current] ?? "");
    }, 1500);
    return () => window.clearInterval(timer);
  }, [open, reduced, images]);

  const show = () => {
    if (!images.length) return;
    indexRef.current = Math.floor(Math.random() * images.length);
    setSrc(images[indexRef.current] ?? "");
    setOpen(true);
  };

  return { open, src, show, close: () => setOpen(false) };
}

function HeroPhotoSlot({ src }: { src: string }) {
  return (
    <span className="monolith-hero-slot" aria-hidden>
      {src ? <img className="monolith-hero-thumb" src={src} alt="" /> : null}
    </span>
  );
}

/** Hover opens a photo in the middle of the word, then shuffles while the pointer stays. */
function HeroWord({
  before,
  after,
  images,
  interactive,
}: {
  before: string;
  after: string;
  images: string[];
  interactive: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const { open, src, show, close } = useHeroPhotoSlot(images);
  const showRef = useRef(show);
  const closeRef = useRef(close);
  showRef.current = show;
  closeRef.current = close;

  useEffect(() => {
    if (!interactive) {
      closeRef.current();
      return;
    }
    if (ref.current?.matches(":hover")) showRef.current();
  }, [interactive]);

  return (
    <span
      ref={ref}
      className={cn("monolith-hero-word", open && "is-open")}
      onPointerEnter={() => {
        if (interactive) show();
      }}
      onPointerLeave={close}
    >
      <span className="sr-only">{`${before}${after}`}</span>
      <span aria-hidden>{before}</span>
      <HeroPhotoSlot src={src} />
      <span aria-hidden>{after}</span>
    </span>
  );
}

/** "1 Profile to" — pointing at the line opens the feed mode toggle between e and t. */
function HeroProfileLine({
  mode,
  onModeChange,
  interactive,
}: {
  mode: FeedMode;
  onModeChange?: (mode: FeedMode, source?: "hero") => void;
  interactive: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const closeTimer = useRef(0);
  const clipRef = useRef<HTMLSpanElement>(null);
  const lineRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const apply = () => setCompact(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => {
      query.removeEventListener("change", apply);
      window.clearTimeout(closeTimer.current);
    };
  }, []);

  useEffect(() => {
    const node = clipRef.current;
    if (!node) return;
    if (open) node.removeAttribute("inert");
    else node.setAttribute("inert", "");
  }, [open]);

  const show = () => {
    if (!interactive) return;
    window.clearTimeout(closeTimer.current);
    setOpen(true);
  };

  useEffect(() => {
    if (!interactive) {
      window.clearTimeout(closeTimer.current);
      setOpen(false);
      return;
    }
    if (lineRef.current?.matches(":hover")) show();
    // Open only when the intro has settled, including a pointer already resting on the line.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive]);

  const hide = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 160);
  };

  return (
    <span ref={lineRef} className="poster-line" onPointerEnter={show} onPointerLeave={hide}>
      <span className="sr-only">1 Profile to</span>
      <span className="poster-word" style={{ "--w": 0 } as CSSProperties} aria-hidden>
        1
      </span>
      <span className={cn("monolith-hero-word monolith-hero-word--split", open && "is-open")}>
        <span className="poster-word" style={{ "--w": 1 } as CSSProperties} aria-hidden>
          Profile
        </span>
        <span className="hero-mode-slot">
          <span ref={clipRef} className="hero-mode-slot-clip" aria-hidden={open ? undefined : true}>
            <FeedModeToggle
              value={mode}
              onChange={(next) => onModeChange?.(next, "hero")}
              compact={compact}
              className="hero-inline-mode"
            />
          </span>
        </span>
        <span className="poster-word monolith-hero-after" style={{ "--w": 2 } as CSSProperties} aria-hidden>
          to
        </span>
      </span>
    </span>
  );
}

/** Same poster as the home hero: words slide in, the noun rises, hover opens the photo and the mode. */
export function HeroPosterTitle({
  images,
  mode = "projects",
  onModeChange,
  active,
  arrive = false,
}: {
  images: string[];
  mode?: FeedMode;
  onModeChange?: (mode: FeedMode, source?: "hero") => void;
  active: boolean;
  /** Shorter entrance, for a poster that arrives on scroll instead of on load. */
  arrive?: boolean;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const reduced = useReducedMotion();
  const interactive = useHeroIntroReady(titleRef, active, reduced, images.length);
  const Tag = arrive ? "h2" : "h1";

  return (
    <Tag
      ref={titleRef}
      className={cn(
        "hero-poster-title",
        arrive && "hero-poster-title--arrive",
        active && "is-in",
        interactive ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
      <HeroProfileLine mode={mode} onModeChange={onModeChange} interactive={interactive} />
      <span className="poster-line max-w-[calc(100vw-3rem)]">
        <HeroRollingLine images={images} interactive={interactive} />
      </span>
    </Tag>
  );
}

/** Paper field. Hovering 100+ opens a project photo between 100 and +. */
const StudioHomeHero = ({
  className,
  search = "",
  onSearchChange,
  mode = "projects",
  onModeChange,
}: Props) => {
  const reduced = useReducedMotion();
  const pinRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paperStill = useMemo(() => (typeof document === "undefined" ? "" : paintPaperStill()), []);
  const { data: projects = [] } = useTopProjects();
  const covers = useMemo(() => projects.map(projectCover), [projects]);
  const projectImages = useMemo(() => uniqueThumbs(covers, 240), [covers]);
  const columns = useMemo(() => coverColumns(uniqueThumbs(covers, 560)), [covers]);
  const [entered, setEntered] = useState(false);
  const coverCount = columns.reduce((count, column) => count + column.length, 0);
  const interactive = useHeroIntroReady(heroRef, entered, reduced, coverCount);
  const { scrollYProgress } = useScroll({
    target: pinRef,
    offset: ["start start", "end start"],
  });
  const drift = reduced ? 0 : 1;
  const yTop = useTransform(scrollYProgress, [0, 1], [0, -220 * drift]);
  const yBottom = useTransform(scrollYProgress, [0, 1], [0, 260 * drift]);
  const x0 = useTransform(scrollYProgress, [0, 1], [0, -96 * drift]);
  const x1 = useTransform(scrollYProgress, [0, 1], [0, -36 * drift]);
  const x2 = useTransform(scrollYProgress, [0, 1], [0, 36 * drift]);
  const x3 = useTransform(scrollYProgress, [0, 1], [0, 96 * drift]);
  const columnX = [x0, x1, x2, x3];

  useEffect(() => {
    if (reduced) {
      setEntered(true);
      return;
    }
    if (columns.some((column) => column.length > 0)) {
      setEntered(true);
      return;
    }
    const timer = window.setTimeout(() => setEntered(true), 900);
    return () => window.clearTimeout(timer);
  }, [reduced, columns]);

  useEffect(() => {
    if (reduced) return;
    const hero = heroRef.current;
    const frame = frameRef.current;
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!hero || !frame || !image || !canvas) return;
    return startMonolithHeroWave(hero, image, canvas, frame);
  }, [reduced, paperStill]);

  return (
    <div
      ref={pinRef}
      className={cn(
        "relative h-[200dvh]",
        "lg:-mt-14",
        "-mx-3 sm:-mx-[calc(1rem+25px)] lg:-mx-[calc(1.5rem+25px)] 2xl:-mx-[calc(2.5rem+25px)]",
        className,
      )}
    >
    <section
      ref={heroRef}
      data-feed-hero
      aria-label="Introduction"
      className="sticky top-0 z-0 h-[100dvh] overflow-hidden bg-[#f5f5f5]"
    >
      <div ref={frameRef} className="monolith-hero-frame pointer-events-none absolute inset-[-4%]">
        <img
          ref={imageRef}
          src={paperStill}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        {reduced ? null : (
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />
        )}
      </div>

      <div className={cn("hero-cover-field", entered && "is-in")} aria-hidden>
        {columns.map((column, columnIndex) => (
          <motion.div key={columnIndex} className="hero-cover-col" style={{ x: columnX[columnIndex] }}>
            <div className="hero-cover-col-shift">
              {[column.slice(0, 2), column.slice(2, 4)].map((half, halfIndex) => (
                <motion.div
                  key={halfIndex}
                  className="hero-cover-half"
                  style={{ y: halfIndex === 0 ? yTop : yBottom }}
                >
                  {half.map((src, row) => (
                    <img
                      key={src}
                      className="hero-cover-tile"
                      src={src}
                      alt=""
                      style={{ "--d": `${TILE_DELAYS[columnIndex * 4 + halfIndex * 2 + row] ?? 0}s` } as CSSProperties}
                    />
                  ))}
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 z-[3] flex items-center justify-center px-6">
        <div className="flex w-full max-w-[40rem] flex-col items-center">
          <h1 className={cn("hero-poster-title", entered && "is-in", interactive ? "pointer-events-auto" : "pointer-events-none")}>
            <HeroProfileLine mode={mode} onModeChange={onModeChange} interactive={interactive} />
            <span className="poster-line max-w-[calc(100vw-3rem)]">
              <HeroRollingLine images={projectImages} interactive={interactive} />
            </span>
          </h1>
          <form
            className={cn("hero-looking pointer-events-auto", entered && "is-in")}
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              document.querySelector("[data-feed-sheet]")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            <label htmlFor="hero-looking" className="hero-looking-label">
              I looking for
            </label>
            <span className="hero-looking-field">
              <input
                id="hero-looking"
                value={search}
                onChange={(event) => onSearchChange?.(event.target.value)}
                className="hero-looking-input"
                autoComplete="off"
                enterKeyHint="search"
              />
              <button type="submit" className="hero-looking-search" aria-label="ค้นหา">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="10.5" cy="10.5" r="6.25" />
                  <path d="M15.2 15.2 L20 20" />
                </svg>
              </button>
            </span>
          </form>
        </div>
      </div>
    </section>
    </div>
  );
};

export default StudioHomeHero;
