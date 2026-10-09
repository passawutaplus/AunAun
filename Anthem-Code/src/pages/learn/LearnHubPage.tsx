import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform } from "framer-motion";
import { Box, LayoutGrid, Users, type LucideIcon } from "lucide-react";
import PackagesIcon from "@/components/icons/PackagesIcon";
import Footer from "@/components/Footer";
import SeoHead from "@/components/SeoHead";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { LearnConversationStage } from "@/components/learn/LearnConversationStage";
import { LearnDesignersStage, type LearnDesigner } from "@/components/learn/LearnDesignersStage";
import { LearnEarnMap } from "@/components/learn/LearnEarnMap";
import { LearnObjectsStage } from "@/components/learn/LearnObjectsStage";
import { LearnPackagesStage } from "@/components/learn/LearnPackagesStage";
import { LearnProfileStage } from "@/components/learn/LearnProfileStage";
import { useDesigners } from "@/hooks/useDesigners";
import { LearnPlatformReveal } from "@/components/learn/LearnPlatformReveal";
import { useTopProjects, type DBProject } from "@/hooks/useProjects";
import {
  LEARN_FAQ,
  LEARN_GLOSSARY,
  LEARN_HERO_LOCKUP,
  LEARN_MODES,
  type LearnHeroFace,
  type LearnHeroWord,
} from "@/data/learnContent";
import { BRAND_NAME } from "@/lib/brandConfig";
import { optimizedFeedImageUrl } from "@/lib/feedProjectCover";
import { isAplus1PxEnabled } from "@/lib/aplus1Launch";
import { cn } from "@/lib/utils";

const HERO_FACE: Record<LearnHeroFace, string> = {
  serif: '"Newsreader", "Iowan Old Style", Palatino, Georgia, serif',
  sans: '"IBM Plex Sans Thai", ui-sans-serif, system-ui, sans-serif',
  soft: '"Sarabun", "IBM Plex Sans Thai Looped", sans-serif',
};

function heroWordStyle(word: LearnHeroWord): CSSProperties {
  const min = Math.max(0.75, Math.round(word.rem * 0.62 * 100) / 100);
  const vw = Math.round(word.rem * 1.35 * 100) / 100;
  return {
    fontFamily: HERO_FACE[word.face],
    fontWeight: word.weight,
    fontStyle: word.italic ? "italic" : "normal",
    fontSize: `clamp(${min}rem, ${vw}vw, ${word.rem}rem)`,
    letterSpacing: word.rem >= 1.6 ? "-0.045em" : word.rem <= 0.9 ? "0.06em" : "-0.02em",
    fontSynthesis: "none",
    fontOpticalSizing: "auto",
  };
}

function HeroBlurb() {
  return (
    <p className="relative z-30 mx-auto mt-8 flex max-w-[20rem] flex-col items-center gap-y-1 text-center text-[#2f2e2c] sm:mt-10 sm:max-w-2xl sm:gap-y-1.5">
      {LEARN_HERO_LOCKUP.map((line) => (
        <span
          key={line.map((word) => word.text).join(" ")}
          className="flex flex-wrap items-baseline justify-center gap-x-[0.32em] leading-[1.05]"
        >
          {line.map((word) => (
            <span key={word.text} style={heroWordStyle(word)}>
              {word.text}
            </span>
          ))}
        </span>
      ))}
    </p>
  );
}

function scrollToHash(hash: string) {
  const id = hash.replace(/^#/, "");
  if (!id) return;
  requestAnimationFrame(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function coverOf(project: DBProject) {
  return project.cover_url?.trim() || project.gallery_urls?.find((url) => url?.trim()) || "";
}

function PlusLink({
  to,
  children,
  className,
}: {
  to: string;
  children: string;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 text-sm text-[#2f2e2c] underline decoration-[#2f2e2c]/25 underline-offset-4 hover:decoration-[#2f2e2c]",
        className,
      )}
    >
      {children}
      <span aria-hidden>+</span>
    </Link>
  );
}

const MODE_ICONS: Record<(typeof LEARN_MODES)[number]["id"], LucideIcon> = {
  "mode-projects": LayoutGrid,
  "mode-designers": Users,
  "mode-packages": PackagesIcon,
  "mode-objects": Box,
};

function LearnModePill({
  active,
  onSelect,
}: {
  active: (typeof LEARN_MODES)[number]["id"];
  onSelect: (id: (typeof LEARN_MODES)[number]["id"]) => void;
}) {
  const reduced = useReducedMotion();
  return (
    <div
      role="tablist"
      aria-label="Site modes"
      className="flex max-w-full min-w-0 items-center overflow-x-auto rounded-full border border-[#e4e1db] bg-white p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {LEARN_MODES.map((mode) => {
        const selected = mode.id === active;
        const Icon = MODE_ICONS[mode.id];
        return (
          <button
            key={mode.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(mode.id)}
            className={cn(
              "relative flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#2f2e2c] sm:px-3",
              selected ? "text-white" : "text-[#2f2e2c]/70 hover:text-[#2f2e2c]",
            )}
          >
            {selected ? (
              reduced ? (
                <span className="absolute inset-0 rounded-full bg-[#2f2e2c]" aria-hidden />
              ) : (
                <motion.span
                  layoutId="learn-mode-pill"
                  className="absolute inset-0 rounded-full bg-[#2f2e2c]"
                  transition={{ type: "spring", stiffness: 380, damping: 34, mass: 0.7 }}
                  aria-hidden
                />
              )
            ) : null}
            <Icon className="relative z-10 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="relative z-10 whitespace-nowrap">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}



function yearOf(iso?: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return String(date.getFullYear());
}

const TRAIL_SLOTS = 8;
const TRAIL_GAP = 68;
const FLOAT_FALLBACKS = [
  "/learn/learn-way-show.jpg",
  "/learn/learn-way-discover.jpg",
  "/learn/learn-way-talk.jpg",
  "/learn/learn-way-opportunity.jpg",
  "/learn/learn-about-portrait.jpg",
];
const FLOAT_REST = [
  { x: -18, y: -16 },
  { x: 16, y: -14 },
  { x: -28, y: 4 },
  { x: 26, y: 6 },
  { x: 2, y: -24 },
];
const FLOAT_SIZES = [104, 132, 84, 118, 92, 140, 76, 108];

function HeroFloaters({
  images,
  hostRef,
}: {
  images: string[];
  hostRef: RefObject<HTMLElement | null>;
}) {
  const nodes = useRef<(HTMLDivElement | null)[]>([]);
  const imagesRef = useRef(images);
  imagesRef.current = images;
  const reduced = useReducedMotion();
  const sources = images.join("|");

  useEffect(() => {
    const el = hostRef.current;
    if (!el || reduced || imagesRef.current.length === 0) return;

    const slots = nodes.current.map((node) => ({
      node,
      img: node?.querySelector("img") ?? null,
    }));
    let slotCursor = 0;
    let imageCursor = 0;
    let z = 1;
    let lastX = Number.NaN;
    let lastY = Number.NaN;

    const spawn = (x: number, y: number) => {
      const slot = slots[slotCursor % slots.length];
      slotCursor += 1;
      if (!slot?.node || !slot.img) return;
      const angle = Math.random() * Math.PI * 2;
      const radius = 8 + Math.random() * 46;
      const list = imagesRef.current;
      if (!list.length) return;
      slot.img.src = list[imageCursor % list.length];
      imageCursor += 1;
      z += 1;
      slot.node.style.zIndex = String(z);
      slot.node.style.left = `${x + Math.cos(angle) * radius}px`;
      slot.node.style.top = `${y + Math.sin(angle) * radius}px`;
      slot.node.style.animation = "none";
      void slot.node.offsetWidth;
      slot.node.style.animation = "learn-trail-pop 1.05s linear forwards";
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const rect = el.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (Number.isFinite(lastX) && Math.hypot(x - lastX, y - lastY) < TRAIL_GAP) return;
      lastX = x;
      lastY = y;
      spawn(x, y);
    };

    const seedTimers: number[] = [];
    seedTimers.push(
      window.setTimeout(() => {
        const rect = el.getBoundingClientRect();
        FLOAT_REST.forEach((rest, index) => {
          seedTimers.push(
            window.setTimeout(() => {
              spawn(rect.width * 0.5 + rest.x * 8, rect.height * 0.46 + rest.y * 8);
            }, index * 90),
          );
        });
      }, 180),
    );

    el.addEventListener("pointermove", onMove);
    return () => {
      seedTimers.forEach((id) => window.clearTimeout(id));
      el.removeEventListener("pointermove", onMove);
    };
  }, [reduced, hostRef, sources]);

  if (reduced) {
    return (
      <div className="pointer-events-none absolute inset-0 z-[15]" aria-hidden>
        {images.slice(0, FLOAT_REST.length).map((src, index) => (
          <div
            key={`${src}-${index}`}
            className="absolute overflow-hidden rounded-md bg-[#e4e1db]"
            style={{
              width: FLOAT_SIZES[index],
              height: FLOAT_SIZES[index] * 1.12,
              left: `${50 + FLOAT_REST[index].x}%`,
              top: `${46 + FLOAT_REST[index].y}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-[15]" aria-hidden>
      {Array.from({ length: TRAIL_SLOTS }, (_, index) => (
        <div
          key={index}
          ref={(node) => {
            nodes.current[index] = node;
          }}
          className="absolute left-0 top-0 overflow-hidden rounded-md bg-[#e4e1db] opacity-0 shadow-[0_10px_30px_rgba(47,46,44,0.08)] [transform:translate(-50%,-50%)]"
          style={{ width: FLOAT_SIZES[index], height: FLOAT_SIZES[index] * 1.12 }}
        >
          <img alt="" className="h-full w-full object-cover" draggable={false} />
        </div>
      ))}
    </div>
  );
}

const PROJECT_WORD =
  "pointer-events-none block whitespace-nowrap bg-[#f5f5f5] text-center text-[clamp(3.4rem,11vw,8.5rem)] font-medium leading-[0.82] tracking-[-0.06em] text-[#2f2e2c]";

const OLD_ITALIC: CSSProperties = {
  fontFamily: '"Newsreader", "Iowan Old Style", Palatino, Georgia, serif',
  fontStyle: "italic",
  fontWeight: 400,
  fontSynthesis: "none",
  fontOpticalSizing: "auto",
};

function ProjectMeta({ project }: { project: DBProject }) {
  const meta = [yearOf(project.created_at), project.category].filter(Boolean).join(" \\ ");
  return (
    <span className="mt-4 flex items-baseline justify-between gap-6 text-sm">
      <span className="text-[#6b6862]">{meta}</span>
      <span className="min-w-0 truncate text-right text-base text-[#2f2e2c]">{project.title}</span>
    </span>
  );
}

function ProjectSplitStage({ projects, loading }: { projects: DBProject[]; loading: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const slides = projects.slice(0, 3);
  const scrollYProgress = useMotionValue(0);
  useEffect(() => {
    const el = trackRef.current;
    if (!el || reduced) return;
    const update = () => {
      const scrollable = el.offsetHeight - window.innerHeight;
      const passed = -el.getBoundingClientRect().top;
      const next = scrollable <= 0 ? 0 : Math.min(1, Math.max(0, passed / scrollable));
      scrollYProgress.set(next);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [reduced, scrollYProgress, slides.length]);
  const topY = useTransform(scrollYProgress, [0, 0.26, 0.44], ["0vh", "-16vh", "-50vh"]);
  const botY = useTransform(scrollYProgress, [0, 0.26, 0.44], ["0vh", "16vh", "50vh"]);
  const frameH = useTransform(scrollYProgress, [0.04, 0.3, 0.44], ["0vh", "28vh", "54vh"]);
  const capOpacity = useTransform(scrollYProgress, [0.4, 0.5], [0, 1]);
  const frameScale = useTransform(scrollYProgress, [0.04, 0.32], [0.42, 1]);
  const wordOpacity = useTransform(scrollYProgress, [0.3, 0.46], [1, 0]);
  const startOpacity = useTransform(scrollYProgress, [0.05, 0.2], [1, 0]);
  const subOpacity = useTransform(scrollYProgress, [0.02, 0.14], [1, 0]);
  const subPointer = useTransform(subOpacity, (value) => (value < 0.25 ? "none" : "auto"));
  const y1 = useTransform(scrollYProgress, [0.48, 0.7], ["104%", "0%"]);
  const y2 = useTransform(scrollYProgress, [0.74, 0.96], ["104%", "0%"]);
  const [active, setActive] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    const next = value < 0.59 ? 0 : value < 0.85 ? 1 : 2;
    const clamped = Math.min(next, Math.max(slides.length - 1, 0));
    setActive((current) => (current === clamped ? current : clamped));
  });

  if (loading) {
    return (
      <div className="px-4 py-16 text-center lg:py-24">
        <p className="text-[clamp(1.7rem,3.2vw,2.5rem)] text-[#2f2e2c]" style={OLD_ITALIC}>
          Start from
        </p>
        <h2 className="mt-2 text-[clamp(3.4rem,11vw,8.5rem)] font-medium leading-[0.82] tracking-[-0.06em]">Projects</h2>
        <div className="mx-auto mt-10 aspect-[16/10] max-w-5xl animate-pulse rounded-[1.25rem] bg-[#e4e1db]" />
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="px-4 py-16 text-center lg:py-24">
        <p className="text-[clamp(1.7rem,3.2vw,2.5rem)] text-[#2f2e2c]" style={OLD_ITALIC}>
          Start from
        </p>
        <h2 className="mt-2 text-[clamp(3.4rem,11vw,8.5rem)] font-medium leading-[0.82] tracking-[-0.06em]">Projects</h2>
        <p className="mx-auto mt-8 max-w-md text-[#6b6862]">
          No public work to show here yet —{" "}
          <Link to="/" className="text-[#2f2e2c] underline underline-offset-4">
            open Explore
          </Link>
        </p>
      </div>
    );
  }

  if (reduced) {
    return (
      <div className="px-4 py-16 text-center sm:px-6 lg:py-24">
        <p className="text-[clamp(1.7rem,3.2vw,2.5rem)] text-[#2f2e2c]" style={OLD_ITALIC}>
          Start from
        </p>
        <h2 className="mt-2 text-[clamp(3.4rem,11vw,8.5rem)] font-medium leading-[0.82] tracking-[-0.06em]">Projects</h2>
        <p className="mx-auto mt-5 max-w-sm text-[11px] uppercase leading-[1.7] tracking-[0.16em] text-[#6b6862]">
          A curated set of projects. Real style, real context, ready to start from.
        </p>
        <PlusLink to="/" className="mt-4">
          View all
        </PlusLink>
        <ul className="mx-auto mt-14 flex max-w-[80rem] flex-col gap-16 text-left">
          {slides.map((project) => (
            <li key={project.id}>
              <Link to={`/project/${project.id}`} className="group block">
                <span className="block overflow-hidden rounded-[1.25rem] bg-[#e4e1db]">
                  <img
                    src={optimizedFeedImageUrl(coverOf(project), { width: 1600, quality: 74, natural: false })}
                    alt={project.title || "Project"}
                    className="aspect-[16/10] w-full object-cover"
                  />
                </span>
                <ProjectMeta project={project} />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const slideY = [undefined, y1, y2] as const;
  const trackVh = 180 + Math.max(0, slides.length - 1) * 85;

  return (
    <div ref={trackRef} className="relative" style={{ height: `${trackVh}vh` }}>
      <div className="sticky top-0 flex h-[100dvh] items-center justify-center overflow-hidden">
        <div className="relative flex w-full flex-col items-center px-4">
          <motion.p
            className="mb-2 text-[clamp(1.7rem,3.2vw,2.6rem)] leading-none tracking-[-0.03em] text-[#2f2e2c]"
            style={{ ...OLD_ITALIC, opacity: startOpacity }}
          >
            Start from
          </motion.p>
          <div className="relative flex items-center justify-center">
            <motion.div
              className="absolute left-1/2 top-1/2 z-0 w-[min(76rem,calc(100vw-2rem))] overflow-hidden"
              style={{ x: "-50%", y: "-50%", height: frameH, scale: frameScale }}
            >
              {slides.map((project, index) => (
                <motion.div
                  key={project.id}
                  className="absolute inset-0"
                  style={{ y: slideY[index] ?? 0, zIndex: index + 1 }}
                >
                  <Link to={`/project/${project.id}`} className="block h-full">
                    <img
                      src={optimizedFeedImageUrl(coverOf(project), { width: 1600, quality: 74, natural: false })}
                      alt={project.title || "Project"}
                      className="h-full w-full rounded-[1.25rem] bg-[#e4e1db] object-cover"
                      draggable={false}
                    />
                  </Link>
                </motion.div>
              ))}
            </motion.div>
            <h2 className="sr-only">Projects</h2>
            <motion.div
              aria-hidden
              className="pointer-events-none relative z-10 grid justify-items-center"
              style={{ opacity: wordOpacity }}
            >
              <motion.span
                className={`${PROJECT_WORD} col-start-1 row-start-1`}
                style={{ y: topY, clipPath: "inset(0 0 calc(50% - 1px) 0)" }}
              >
                Projects
              </motion.span>
              <motion.span
                className={`${PROJECT_WORD} col-start-1 row-start-1`}
                style={{ y: botY, clipPath: "inset(calc(50% - 1px) 0 0 0)" }}
              >
                Projects
              </motion.span>
            </motion.div>
          </div>
          <motion.div className="mt-5 text-center" style={{ opacity: subOpacity, pointerEvents: subPointer }}>
            <p className="mx-auto max-w-sm text-[11px] uppercase leading-[1.7] tracking-[0.16em] text-[#6b6862]">
              A curated set of projects. Real style, real context, ready to start from.
            </p>
            <PlusLink to="/" className="mt-4">
              View all
            </PlusLink>
          </motion.div>
        </div>
        <motion.div
          className="pointer-events-none absolute inset-x-0 top-[calc(50%+27vh-1rem)] z-20 px-4"
          style={{ opacity: capOpacity }}
        >
          <div className="mx-auto w-[min(76rem,calc(100vw-2rem))]">
            <ProjectMeta project={slides[active] ?? slides[0]} />
          </div>
        </motion.div>
        <span className="sr-only">Project {active + 1} of {slides.length}</span>
      </div>
    </div>
  );
}



export default function LearnHubPage() {
  const heroRef = useRef<HTMLElement>(null);
  const modeLock = useRef(0);
  const [mode, setMode] = useState<(typeof LEARN_MODES)[number]["id"]>("mode-projects");
  const { hash } = useLocation();
  const pxOn = isAplus1PxEnabled();
  const glossary = pxOn ? LEARN_GLOSSARY : LEARN_GLOSSARY.filter((item) => item.term !== "Support");
  const faq = pxOn ? LEARN_FAQ : LEARN_FAQ.filter((item) => item.id !== "px-money");
  const { data: projects = [], isLoading } = useTopProjects();
  const shown = projects.filter((project) => coverOf(project)).slice(0, 5);
  const { data: designerRows = [] } = useDesigners();
  const directory: LearnDesigner[] = designerRows
    .map((row) => {
      const cover = row.projects.map(coverOf).find(Boolean);
      if (!cover) return null;
      const userId = (row.profile as { user_id?: string }).user_id ?? row.profile.id;
      return {
        id: userId,
        name: row.profile.display_name || row.profile.username || "Designer",
        role: (row.profile.role || "Designer").trim(),
        avatar: row.profile.avatar_url,
        cover: optimizedFeedImageUrl(cover, { width: 640, quality: 72, natural: false }),
        projectCount: row.projectCount,
        href: `/u/${userId}`,
      };
    })
    .filter((item): item is LearnDesigner => item !== null)
    .slice(0, 10);
  const trailSources = projects
    .filter((project) => coverOf(project))
    .slice(0, 12)
    .map((project) => optimizedFeedImageUrl(coverOf(project), { width: 360, quality: 70, natural: false }));
  const floatImages = trailSources.length >= 4 ? trailSources : [...trailSources, ...FLOAT_FALLBACKS];

  useEffect(() => {
    if (hash) scrollToHash(hash);
  }, [hash]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      if (performance.now() < modeLock.current) return;
      const line = window.innerHeight * 0.4;
      const hit =
        [...LEARN_MODES].reverse().find((item) => {
          const rect = document.getElementById(item.id)?.getBoundingClientRect();
          return rect ? rect.top <= line : false;
        }) ?? LEARN_MODES[0];
      setMode((current) => (current === hit.id ? current : hit.id));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const selectMode = (id: (typeof LEARN_MODES)[number]["id"]) => {
    setMode(id);
    modeLock.current = performance.now() + 1000;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  return (
    <>
      <SeoHead
        path="/learn"
        title={`${BRAND_NAME} — About`}
        description="You Create. We Connect. SAMECOR starts from the work, then opens a conversation, a hire, or a collab."
      />

      <header className="fixed inset-x-0 top-0 z-40 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-4 py-4 sm:px-8">
        <Link to="/" className="relative z-10 shrink-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#2f2e2c]" aria-label={`${BRAND_NAME} home`}>
          <BrandLogo size="sm" tone="ink" />
        </Link>
        <div className="flex min-w-0 items-center justify-end gap-2">
          <Link
            to="/"
            className="shrink-0 px-1 text-sm text-[#2f2e2c] outline-none transition-opacity hover:opacity-60 focus-visible:ring-2 focus-visible:ring-[#2f2e2c]"
          >
            Home
          </Link>
          <LearnModePill active={mode} onSelect={selectMode} />
        </div>
      </header>

      <section ref={heroRef} className="relative z-10 flex min-h-[100dvh] flex-col overflow-hidden bg-[#f5f5f5]">
        <HeroFloaters images={floatImages} hostRef={heroRef} />
        <div className="pointer-events-none flex flex-1 flex-col items-center justify-center px-4 pb-16 pt-24 text-center">
          <h1 className="relative z-10 text-[clamp(4.6rem,16vw,12.5rem)] font-medium leading-[0.82] tracking-[-0.07em] text-[#2f2e2c]">
            {BRAND_NAME}
          </h1>
          <HeroBlurb />
        </div>
      </section>

      <LearnPlatformReveal images={trailSources} />

      <div id="mode-projects">
        <section id="works" className="scroll-mt-24">
          <ProjectSplitStage projects={shown} loading={isLoading} />
        </section>
      </div>

      <div id="mode-designers">
        <section id="profile" className="scroll-mt-0">
          <LearnProfileStage works={trailSources.slice(4, 10)} />
        </section>

        <section id="designers" className="scroll-mt-0">
          <LearnDesignersStage designers={directory} />
        </section>

        <section id="conversation" className="scroll-mt-0">
          <LearnConversationStage works={trailSources.slice(0, 4)} />
        </section>
      </div>

      <section id="mode-packages" className="scroll-mt-0">
        <LearnPackagesStage works={trailSources} />
      </section>

      <div id="mode-objects">
        <section id="objects" className="scroll-mt-0">
          <LearnObjectsStage />
        </section>

        <section id="earn" className="scroll-mt-24">
          <LearnEarnMap />
        </section>
      </div>

      <section id="trust" className="scroll-mt-32 px-4 py-14 sm:px-6 lg:px-10 lg:py-20">
        <div className="mx-auto grid max-w-[80rem] gap-10 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-16">
          <div>
            <h2 className="text-[clamp(2.4rem,5.5vw,4.5rem)] font-normal leading-[0.9] tracking-[-0.04em]">
              FAQ
            </h2>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#6b6862]">
              If the answer is not here, the Help Center has the steps, or write to the team.
            </p>
            <PlusLink to="/help" className="mt-2">
              Help Center
            </PlusLink>
          </div>
          <div>
            <div className="border-b border-[#e4e1db]">
              {faq.map((item) => (
                <details key={item.id} className="group border-t border-[#e4e1db]">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-4 text-left text-base text-[#2f2e2c] sm:text-lg [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <span className="text-2xl leading-none group-open:hidden" aria-hidden>
                      +
                    </span>
                    <span className="hidden text-2xl leading-none group-open:inline" aria-hidden>
                      –
                    </span>
                  </summary>
                  <p className="max-w-2xl pb-5 text-sm leading-relaxed text-[#6b6862]">{item.a}</p>
                </details>
              ))}
            </div>
            <dl className="mt-10 grid gap-x-8 sm:grid-cols-2">
              {glossary.map((item) => (
                <div key={item.term} className="border-t border-[#e4e1db] py-4">
                  <dt className="text-sm text-[#2f2e2c]">{item.term}</dt>
                  <dd className="mt-1 text-sm text-[#6b6862]">{item.meaning}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <Footer className="mt-0" />
    </>
  );
}
