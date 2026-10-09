import { useCallback, useEffect, useRef, type RefObject } from "react";
import { motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform, type MotionValue } from "framer-motion";
import { Check, Link2 } from "lucide-react";
import PackagesIcon from "@/components/icons/PackagesIcon";
import { LearnAuthLink } from "@/components/learn/LearnCtas";
import {
  LEARN_FALLBACK_WORKS,
  LEARN_SERIF,
  LEARN_SOURCE_ART,
  clamp01,
  usePinnedProgress,
  useProgressDerived,
  useProgressReached,
} from "@/components/learn/learnPinned";
import { cn } from "@/lib/utils";

/** Scroll timeline (0 → 1 across the pinned track). */
const T = {
  gridIn: [0, 0.08],
  drift: [0, 0.26],
  measureAt: 0.27,
  head: [0.26, 0.34],
  others: [0.3, 0.42],
  expand: [0.3, 0.46],
  cardText: [0.3, 0.34],
  detail: [0.45, 0.5],
  includes: [0.5, 0.54, 0.58],
  price: [0.6, 0.66],
  refs: [0.62, 0.65, 0.68],
  requests: [0.74, 0.8, 0.86],
} as const;

type Pkg = { title: string; by: string; price: string };

const PACKAGES: Pkg[] = [
  { title: "โลโก้ + CI เริ่มต้น", by: "Nattapong", price: "฿18,000" },
  { title: "ถ่ายภาพสินค้า 20 ภาพ", by: "Pixel Lab", price: "฿9,500" },
  { title: "แพ็กเกจจิ้งขนม 1 SKU", by: "Mint Kanya", price: "฿22,000" },
  { title: "โมชันกราฟิก 30 วินาที", by: "Tonkla", price: "฿15,000" },
  { title: "ภาพประกอบบทความ 5 ภาพ", by: "June W.", price: "฿7,500" },
  { title: "โปสเตอร์อีเวนต์", by: "Bam Studio", price: "฿4,500" },
  { title: "ถ่ายภาพพรีเวดดิ้ง", by: "Golf Frames", price: "฿28,000" },
  { title: "UI แอป 10 หน้าจอ", by: "Fern UX", price: "฿35,000" },
  { title: "ฟอนต์ไทย-อังกฤษ", by: "Type Kit TH", price: "฿40,000" },
  { title: "สติกเกอร์ไลน์ 16 ตัว", by: "Moji Moji", price: "฿6,000" },
  { title: "เมนูร้านอาหาร", by: "Ice Design", price: "฿5,500" },
];

const SELECTED: Pkg = { title: "ภาพประกอบปกหนังสือนิทาน", by: "Ploy Sirinya", price: "฿25,000" };

const ROWS = 3;
const COLS = 7;
const SELECTED_ROW = 1;
const SELECTED_COL = 3;

const INCLUDES = ["ปก 1 ภาพ + ภาพใน 6 ภาพ", "ไฟล์พร้อมพิมพ์ + ไฟล์ต้นฉบับ", "แก้ไขได้ 2 รอบ"] as const;

const REQUESTS = [
  { name: "Mali Studio", tone: "#2f2e2c", text: "ขอจ้างจากแพ็กเกจนี้", amount: "฿32,000" },
  { name: "Bloom Books", tone: "#b08d6a", text: "ขอใบเสนอราคา · ปก + ภาพใน 10 ภาพ", amount: "" },
  { name: "Kiddo Press", tone: "#6c7f99", text: "ขอจ้างจากแพ็กเกจนี้", amount: "฿25,000" },
] as const;

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

const CARD_PAD = 6;

type Rect = { x: number; y: number; w: number; h: number };
type Geometry = { from: Rect; to: Rect; img: Rect; compact: boolean };

function GridCard({
  pkg,
  cover,
  dim,
  cardRef,
}: {
  pkg: Pkg;
  cover: string;
  dim?: MotionValue<number>;
  cardRef?: RefObject<HTMLDivElement>;
}) {
  return (
    <motion.div
      ref={cardRef}
      className="w-[min(8.5rem,30vw)] shrink-0 rounded-xl border border-[#e4e1db] bg-white p-1.5 text-[#2f2e2c] md:w-[min(12rem,22dvh)]"
      style={dim ? { opacity: dim } : undefined}
    >
      <img src={cover} alt="" draggable={false} className="aspect-[4/3] w-full rounded-lg bg-[#e4e1db] object-cover" />
      <CardText pkg={pkg} />
    </motion.div>
  );
}

function CardText({ pkg }: { pkg: Pkg }) {
  return (
    <>
      <p className="mt-1.5 truncate px-0.5 text-[11px] font-medium md:text-xs">{pkg.title}</p>
      <p className="flex items-center justify-between gap-2 px-0.5 pb-0.5 text-[10px] text-[#8a867f] md:text-[11px]">
        <span className="truncate">{pkg.by}</span>
        <span className="shrink-0 tabular-nums text-[#2f2e2c]">{pkg.price}</span>
      </p>
    </>
  );
}

function Row({
  p,
  index,
  covers,
  dim,
  selectedRef,
  selectedDim,
}: {
  p: MotionValue<number>;
  index: number;
  covers: string[];
  dim: MotionValue<number>;
  selectedRef: RefObject<HTMLDivElement>;
  selectedDim: MotionValue<number>;
}) {
  const dir = index % 2 === 0 ? 1 : -1;
  const x = useTransform(p, [...T.drift], [`${dir * 7}vw`, "0vw"]);
  const opacity = useTransform(p, [T.gridIn[0] + index * 0.02, T.gridIn[1] + index * 0.02], [0, 1]);
  return (
    <motion.div className="flex justify-center gap-2.5 md:gap-3" style={{ x, opacity }}>
      {Array.from({ length: COLS }, (_, col) => {
        if (index === SELECTED_ROW && col === SELECTED_COL) {
          return <GridCard key={col} pkg={SELECTED} cover={LEARN_SOURCE_ART.image} cardRef={selectedRef} dim={selectedDim} />;
        }
        const n = index * COLS + col;
        return <GridCard key={col} pkg={PACKAGES[n % PACKAGES.length]} cover={covers[n % covers.length]} dim={dim} />;
      })}
    </motion.div>
  );
}

function IncludeRow({ p, label, at }: { p: MotionValue<number>; label: string; at: number }) {
  const opacity = useTransform(p, [at, at + 0.03], [0, 1]);
  const x = useTransform(p, [at, at + 0.03], [-8, 0]);
  const on = useProgressReached(p, at + 0.015);
  return (
    <motion.li className="flex items-center gap-2 text-[13px]" style={{ opacity, x }}>
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-300",
          on ? "border-[#2f2e2c] bg-[#2f2e2c] text-white" : "border-[#d6d2ca] text-transparent",
        )}
      >
        <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
      </span>
      {label}
    </motion.li>
  );
}

function RequestToast({ p, item, at }: { p: MotionValue<number>; item: (typeof REQUESTS)[number]; at: number }) {
  const opacity = useTransform(p, [at, at + 0.035], [0, 1]);
  const y = useTransform(p, [at, at + 0.035], [16, 0]);
  return (
    <motion.div
      className="flex items-center gap-2.5 rounded-2xl border border-[#e4e1db] bg-white/95 px-3 py-2.5 max-md:absolute max-md:inset-x-0 max-md:top-0 text-[#2f2e2c] shadow-[0_18px_40px_-20px_rgba(47,46,44,0.45)] backdrop-blur"
      style={{ opacity, y }}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white"
        style={{ backgroundColor: item.tone }}
      >
        {item.name[0]}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium">{item.name}</span>
        <span className="block truncate text-[11px] text-[#6b6862]">{item.text}</span>
      </span>
      {item.amount ? <span className="shrink-0 text-xs font-medium tabular-nums text-[#23804a]">{item.amount}</span> : null}
    </motion.div>
  );
}

function RefThumbs({ p, works }: { p: MotionValue<number>; works: string[] }) {
  const thumbs = [LEARN_SOURCE_ART.image, ...(works.length >= 2 ? works : [...works, ...LEARN_FALLBACK_WORKS]).slice(0, 2)];
  return (
    <div className="flex gap-1.5">
      {thumbs.map((src, i) => (
        <RefThumb key={src + i} p={p} src={src} at={T.refs[i]} />
      ))}
    </div>
  );
}

function RefThumb({ p, src, at }: { p: MotionValue<number>; src: string; at: number }) {
  const opacity = useTransform(p, [at, at + 0.03], [0, 1]);
  const scale = useTransform(p, [at, at + 0.03], [0.7, 1]);
  return (
    <motion.img
      src={src}
      alt=""
      draggable={false}
      className="h-12 w-12 rounded-lg border-2 border-white bg-[#e4e1db] object-cover shadow-md md:h-14 md:w-14"
      style={{ opacity, scale }}
    />
  );
}

/** Right-hand (desktop) / lower (mobile) half of the expanded package page. */
function DetailInfo({ p }: { p: MotionValue<number> }) {
  const priceOpacity = useTransform(p, [T.price[0], T.price[0] + 0.03], [0, 1]);
  const timeOpacity = useTransform(p, [T.price[0] + 0.03, T.price[1]], [0, 1]);
  const requestCount = useProgressDerived(p, (v) => T.requests.filter((at) => v >= at).length);
  return (
    <div className="flex h-full flex-col text-[#2f2e2c]">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf1fc] px-2.5 py-1 text-[11px] font-medium text-[#2d5fae]">
          <PackagesIcon className="h-3.5 w-3.5" aria-hidden />
          แพ็กเกจ
        </span>
        <span className="text-[11px] text-[#8a867f]">Illustration</span>
      </div>
      <p className="mt-3 text-xl font-medium leading-snug tracking-[-0.02em] md:text-2xl">{SELECTED.title}</p>
      <p className="mt-1 flex items-center gap-2 text-xs text-[#6b6862]">
        <img src="/learn/learn-about-portrait.jpg" alt="" className="h-5 w-5 rounded-full object-cover" />
        โดย {SELECTED.by}
      </p>
      <p className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-[#f1d0c3] bg-[#fcefe9] px-2.5 py-1 text-[11px] text-[#bf4a1f]">
        <Link2 className="h-3 w-3" aria-hidden />
        สร้างจากผลงาน {LEARN_SOURCE_ART.title}
      </p>

      <p className="mt-4 text-[11px] text-[#8a867f]">สิ่งที่ได้รับ</p>
      <ul className="mt-1.5 space-y-1.5">
        {INCLUDES.map((label, i) => (
          <IncludeRow key={label} p={p} label={label} at={T.includes[i]} />
        ))}
      </ul>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <motion.div className="rounded-xl bg-[#f7f6f3] px-3 py-2" style={{ opacity: priceOpacity }}>
          <p className="text-[10px] text-[#8a867f]">เริ่มต้น</p>
          <p className="text-base font-medium tabular-nums">{SELECTED.price}</p>
        </motion.div>
        <motion.div className="rounded-xl bg-[#f7f6f3] px-3 py-2" style={{ opacity: timeOpacity }}>
          <p className="text-[10px] text-[#8a867f]">ระยะเวลา</p>
          <p className="text-base font-medium">4–5 สัปดาห์</p>
        </motion.div>
      </div>

      <div className="mt-auto flex items-center gap-2 pt-4">
        <span className="flex h-10 flex-1 items-center justify-center rounded-full bg-[#2f2e2c] text-xs font-medium text-white">
          ขอจ้างจากแพ็กเกจนี้
        </span>
        <span
          className={cn(
            "flex h-10 items-center gap-1.5 rounded-full px-3 text-xs transition-colors duration-300",
            requestCount > 0 ? "bg-[#fcefe9] text-[#bf4a1f]" : "bg-[#f3f1ec] text-[#a8a49c]",
          )}
        >
          คำขอ
          <span className="font-medium tabular-nums">{requestCount}</span>
        </span>
      </div>
    </div>
  );
}

function Heading() {
  return (
    <div className="text-center">
      <p className="text-[clamp(1.3rem,2.6vw,2.1rem)] leading-none tracking-[-0.03em] text-[#2f2e2c]" style={LEARN_SERIF}>
        Offer your style as a
      </p>
      <h2 className="mt-1 text-[clamp(2.6rem,6.5vw,5.2rem)] font-medium leading-[0.88] tracking-[-0.06em] text-[#2f2e2c]">
        Package
      </h2>
    </div>
  );
}

const CTA_CLASS =
  "inline-flex min-h-11 items-center gap-2 rounded-full bg-[#2f2e2c] px-6 text-sm font-medium text-[#f5f5f5] outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#2f2e2c] focus-visible:ring-offset-2";

function Cta() {
  return (
    <LearnAuthLink to="/dashboard/packages" className={CTA_CLASS}>
      สร้างแพ็กเกจ
      <span aria-hidden>+</span>
    </LearnAuthLink>
  );
}

function StaticDetail({ works }: { works: string[] }) {
  const done = useMotionValue(1);
  return (
    <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[1.25rem] border border-[#e4e1db] bg-white md:grid-cols-[54%_1fr]">
      <div className="relative">
        <img src={LEARN_SOURCE_ART.image} alt="" className="aspect-[4/3] h-full w-full object-cover" />
        <div className="absolute bottom-3 left-3">
          <RefThumbs p={done} works={works} />
        </div>
      </div>
      <div className="p-5 md:p-6">
        <DetailInfo p={done} />
      </div>
    </div>
  );
}

/**
 * Pinned scroll story: a wall of packages, then one card — built from a
 * posted piece — grows into its full page and hire requests start arriving.
 */
export function LearnPackagesStage({ works }: { works: string[] }) {
  const reduced = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const cardTextRef = useRef<HTMLDivElement>(null);
  const geo = useRef<Geometry | null>(null);
  const p = usePinnedProgress(trackRef, Boolean(reduced));

  const covers = (works.length >= 6 ? works : [...works, ...LEARN_FALLBACK_WORKS]).filter(Boolean);
  const others = useTransform(p, [...T.others], [1, 0]);
  const selectedDim = useMotionValue(1);
  const headOpacity = useTransform(p, [...T.head], [1, 0]);
  const headY = useTransform(p, [...T.head], ["0vh", "-6vh"]);
  const detailOpacity = useTransform(p, [...T.detail], [0, 1]);

  const measure = useCallback(() => {
    const stage = stageRef.current?.getBoundingClientRect();
    const card = selectedRef.current?.getBoundingClientRect();
    if (!stage || !card || card.width === 0) return;
    const W = stage.width;
    const H = stage.height;
    const compact = W < 768;
    const tw = compact ? W - 24 : Math.min(960, W * 0.9);
    const top = compact ? 72 : 0;
    const th = compact ? H - top - 104 : Math.min(560, H - 150);
    const to = { x: (W - tw) / 2, y: compact ? top : (H - th) / 2 + 20, w: tw, h: th };
    const img = compact
      ? { x: 10, y: 10, w: tw - 20, h: th * 0.36 - 10 }
      : { x: 12, y: 12, w: tw * 0.54 - 12, h: th - 24 };
    geo.current = { from: { x: card.left - stage.left, y: card.top - stage.top, w: card.width, h: card.height }, to, img, compact };
  }, []);

  const apply = useCallback(
    (v: number) => {
      const overlay = overlayRef.current;
      const image = imageRef.current;
      const text = cardTextRef.current;
      if (!overlay || !image || !text) return;
      if (!geo.current && v >= T.measureAt) measure();
      const g = geo.current;
      const show = Boolean(g) && v >= T.expand[0];
      overlay.style.visibility = show ? "visible" : "hidden";
      selectedDim.set(show ? 0 : 1);
      if (!g || !show) return;
      const t = easeInOut(clamp01((v - T.expand[0]) / (T.expand[1] - T.expand[0])));
      overlay.style.left = `${lerp(g.from.x, g.to.x, t)}px`;
      overlay.style.top = `${lerp(g.from.y, g.to.y, t)}px`;
      overlay.style.width = `${lerp(g.from.w, g.to.w, t)}px`;
      overlay.style.height = `${lerp(g.from.h, g.to.h, t)}px`;
      overlay.style.borderRadius = `${lerp(12, 20, t)}px`;
      const startW = g.from.w - CARD_PAD * 2;
      image.style.left = `${lerp(CARD_PAD, g.img.x, t)}px`;
      image.style.top = `${lerp(CARD_PAD, g.img.y, t)}px`;
      image.style.width = `${lerp(startW, g.img.w, t)}px`;
      image.style.height = `${lerp(startW * 0.75, g.img.h, t)}px`;
      image.style.borderRadius = `${lerp(8, 14, t)}px`;
      text.style.opacity = String(1 - clamp01((v - T.cardText[0]) / (T.cardText[1] - T.cardText[0])));
    },
    [measure, selectedDim],
  );

  useMotionValueEvent(p, "change", apply);

  useEffect(() => {
    if (reduced) return;
    const onResize = () => {
      geo.current = null;
      if (p.get() >= T.measureAt) measure();
      apply(p.get());
    };
    apply(p.get());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [apply, measure, p, reduced]);

  if (reduced) {
    return (
      <div className="mx-auto max-w-[80rem] px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
        <Heading />
        <div className="mt-10">
          <StaticDetail works={works} />
        </div>
        <div className="mt-10 flex justify-center">
          <Cta />
        </div>
      </div>
    );
  }

  return (
    <>
      <div ref={trackRef} className="relative" style={{ height: "500vh" }}>
        <div ref={stageRef} className="sticky top-0 h-[100dvh] overflow-hidden">
          <div className="flex h-full flex-col items-center justify-center gap-4 pt-12 md:gap-6 md:pt-10">
            <motion.div className="px-4" style={{ opacity: headOpacity, y: headY }}>
              <Heading />
            </motion.div>
            <div className="flex w-full flex-col gap-2.5 md:gap-3">
              {Array.from({ length: ROWS }, (_, row) => (
                <Row
                  key={row}
                  p={p}
                  index={row}
                  covers={covers}
                  dim={others}
                  selectedRef={selectedRef}
                  selectedDim={selectedDim}
                />
              ))}
            </div>
          </div>

          <div
            ref={overlayRef}
            className="invisible absolute z-20 overflow-hidden border border-[#e4e1db] bg-white shadow-[0_40px_100px_-40px_rgba(47,46,44,0.45)]"
          >
            <div ref={imageRef} className="absolute overflow-hidden bg-[#e4e1db]">
              <img src={LEARN_SOURCE_ART.image} alt="" draggable={false} className="h-full w-full object-cover" />
              <motion.div className="absolute bottom-3 left-3" style={{ opacity: detailOpacity }}>
                <RefThumbs p={p} works={works} />
              </motion.div>
              <div className="absolute inset-x-3 top-3 flex flex-col gap-2 md:inset-x-auto md:bottom-4 md:right-4 md:top-auto md:w-[17rem]">
                {REQUESTS.map((item, i) => (
                  <RequestToast key={item.name} p={p} item={item} at={T.requests[i]} />
                ))}
              </div>
            </div>
            <div ref={cardTextRef} className="absolute inset-x-1.5 bottom-1">
              <CardText pkg={SELECTED} />
            </div>
            <motion.div
              className="absolute inset-x-0 bottom-0 top-[36%] px-4 pb-4 pt-3 md:inset-y-0 md:left-[54%] md:right-0 md:p-6"
              style={{ opacity: detailOpacity }}
            >
              <DetailInfo p={p} />
            </motion.div>
          </div>
        </div>
      </div>
      <div className="flex justify-center px-4 pb-14">
        <Cta />
      </div>
    </>
  );
}
