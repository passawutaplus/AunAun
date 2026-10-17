import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useTransform, type MotionValue } from "framer-motion";
import { LearnAuthLink } from "@/components/learn/LearnCtas";
import {
  LEARN_SERIF,
  LEARN_SOURCE_ART,
  clamp01,
  useIsCompact,
  usePinnedProgress,
  useProgressDerived,
} from "@/components/learn/learnPinned";
import { cn } from "@/lib/utils";

const ART = LEARN_SOURCE_ART.image;

/** Scroll timeline (0 → 1 across the pinned track). */
const T = {
  cardsFrom: 0.14,
  cardStep: 0.045,
  cardLen: 0.18,
  linesFrom: 0.3,
  lineStep: 0.03,
  lineLen: 0.12,
  sold: [0.52, 0.92],
} as const;

type Product = {
  id: string;
  kind: string;
  axis: string;
  title: string;
  chip: string;
  price: string;
  sold: number;
  of?: number;
  mock: ReactNode;
  /** Quadrant: -1 / 1 on each axis. */
  qx: -1 | 1;
  qy: -1 | 1;
};

function PrintMock() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#ebe7df]">
      <div className="h-[82%] bg-white p-[5%] shadow-[0_10px_24px_-10px_rgba(47,46,44,0.45)]" style={{ aspectRatio: "3 / 4" }}>
        <img src={ART} alt="" draggable={false} className="h-full w-full object-cover" />
      </div>
    </div>
  );
}

function ToyMock() {
  return <img src="/learn/learn-object-arttoy.jpg" alt="" draggable={false} className="h-full w-full object-cover" />;
}

function ZineMock() {
  return (
    <div className="relative flex h-full w-full items-center justify-center bg-[#e9e4da]">
      <div className="absolute h-[70%] translate-x-[14%] rotate-[8deg] rounded-sm bg-[#f7f3ea] shadow-md" style={{ aspectRatio: "3 / 4" }} />
      <div
        className="relative h-[74%] -rotate-[5deg] overflow-hidden rounded-sm shadow-[0_12px_24px_-10px_rgba(47,46,44,0.55)]"
        style={{ aspectRatio: "3 / 4" }}
      >
        <img src={ART} alt="" draggable={false} className="h-full w-full object-cover object-[30%_50%]" />
        <span className="absolute inset-x-0 top-[8%] text-center text-[clamp(0.55rem,1vw,0.8rem)] font-semibold uppercase tracking-[0.2em] text-white drop-shadow">
          Koi
        </span>
      </div>
    </div>
  );
}

const STICKER_CROPS = ["20% 30%", "70% 25%", "45% 60%", "85% 70%", "15% 80%", "55% 40%"];

function StickerMock() {
  return (
    <div className="relative grid h-full w-full grid-cols-3 content-center gap-[6%] bg-[#e5eee4] p-[9%]">
      {STICKER_CROPS.map((pos) => (
        <span key={pos} className="aspect-square overflow-hidden rounded-full border-[3px] border-white shadow-sm">
          <img src={ART} alt="" draggable={false} className="h-full w-full scale-[2.2] object-cover" style={{ objectPosition: pos }} />
        </span>
      ))}
      <span className="absolute bottom-[6%] right-[6%] rounded bg-white/90 px-1.5 py-0.5 text-[9px] font-medium text-[#2f2e2c]">
        PNG · print-ready
      </span>
    </div>
  );
}

const PRODUCTS: Product[] = [
  {
    id: "print",
    kind: "ภาพพิมพ์อาร์ต",
    axis: "Prints",
    title: "Night Market Koi · Riso A3",
    chip: "จำกัด 30 ชิ้น",
    price: "฿1,200",
    sold: 24,
    of: 30,
    mock: <PrintMock />,
    qx: -1,
    qy: -1,
  },
  {
    id: "toy",
    kind: "อาร์ตทอย",
    axis: "Art Toy",
    title: "Koi Rider · ซอฟุบิ",
    chip: "พรีออเดอร์",
    price: "฿2,900",
    sold: 46,
    mock: <ToyMock />,
    qx: 1,
    qy: -1,
  },
  {
    id: "zine",
    kind: "ซีน",
    axis: "Texts",
    title: "ตามปลาคาร์ปกลับบ้าน · 24 หน้า",
    chip: "พร้อมส่ง",
    price: "฿350",
    sold: 118,
    mock: <ZineMock />,
    qx: -1,
    qy: 1,
  },
  {
    id: "file",
    kind: "ไฟล์พร้อมพิมพ์",
    axis: "Files",
    title: "Koi Sticker Sheet",
    chip: "ดาวน์โหลด",
    price: "฿190",
    sold: 362,
    mock: <StickerMock />,
    qx: 1,
    qy: 1,
  },
];

const SPREAD = {
  desk: { x: 25, y: 19 },
  mob: { x: 24, y: 19 },
};

function soldAt(v: number, total: number) {
  const t = clamp01((v - T.sold[0]) / (T.sold[1] - T.sold[0]));
  return Math.round(total * (1 - (1 - t) ** 2));
}

function ProductCard({ p, item, index, compact }: { p: MotionValue<number>; item: Product; index: number; compact: boolean }) {
  const start = T.cardsFrom + index * T.cardStep;
  const range = [start, start + T.cardLen];
  const spread = compact ? SPREAD.mob : SPREAD.desk;
  const x = useTransform(p, range, ["0vw", `${item.qx * spread.x}vw`]);
  const y = useTransform(p, range, ["0vh", `${item.qy * spread.y}vh`]);
  const rotate = useTransform(p, range, [item.qx * -8, item.qx * item.qy * 1.5]);
  const scale = useTransform(p, range, [0.6, 1]);
  const opacity = useTransform(p, [start, start + 0.04], [0, 1]);
  const sold = useProgressDerived(p, (v) => soldAt(v, item.sold));
  const soldOpacity = useTransform(p, [T.sold[0], T.sold[0] + 0.03], [0, 1]);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <motion.article
        className="w-[44vw] overflow-hidden rounded-2xl border border-[#e4e1db] bg-white text-[#2f2e2c] shadow-[0_24px_60px_-30px_rgba(47,46,44,0.45)] md:w-[min(14rem,18vw,34dvh)]"
        style={{ x, y, rotate, scale, opacity }}
      >
        <div className="aspect-square overflow-hidden bg-[#f3f1ec] md:aspect-[5/4]">{item.mock}</div>
        <div className="px-2.5 pb-2.5 pt-2 md:px-3 md:pb-3">
          <p className="flex items-center justify-between gap-2 text-[10px] text-[#8a867f]">
            <span className="truncate">
              {item.kind} <span className="hidden md:inline">· {item.axis}</span>
            </span>
            <span className="shrink-0 rounded-full border border-[#e4e1db] px-1.5 py-px">{item.chip}</span>
          </p>
          <p className="mt-1 truncate text-xs font-medium md:text-[13px]">{item.title}</p>
          <p className="mt-1 flex items-baseline justify-between text-xs">
            <span className="font-medium tabular-nums">{item.price}</span>
            <motion.span className="tabular-nums text-[#23804a]" style={{ opacity: soldOpacity }}>
              ขายแล้ว {sold}
              {item.of ? `/${item.of}` : ""}
            </motion.span>
          </p>
        </div>
      </motion.article>
    </div>
  );
}

function Line({ p, item, index }: { p: MotionValue<number>; item: Product; index: number }) {
  const start = T.linesFrom + index * T.lineStep;
  const pathLength = useTransform(p, [start, start + T.lineLen], [0, 1]);
  return (
    <motion.line
      x1={50}
      y1={50}
      x2={50 + item.qx * SPREAD.desk.x}
      y2={50 + item.qy * SPREAD.desk.y}
      stroke="#cfcac1"
      strokeWidth={1}
      vectorEffect="non-scaling-stroke"
      style={{ pathLength }}
    />
  );
}

function Heading({ className }: { className?: string }) {
  return (
    <div className={cn("text-center", className)}>
      <p className="text-[clamp(1.5rem,3vw,2.4rem)] leading-none tracking-[-0.03em] text-[#2f2e2c]" style={LEARN_SERIF}>
        Or make it into
      </p>
      <h2 className="mt-2 text-[clamp(3rem,8.5vw,7rem)] font-medium leading-[0.84] tracking-[-0.06em] text-[#2f2e2c]">
        Objects
      </h2>
    </div>
  );
}

const CTA_CLASS =
  "inline-flex min-h-11 items-center gap-2 rounded-full bg-[#2f2e2c] px-6 text-sm font-medium text-[#f5f5f5] outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#2f2e2c] focus-visible:ring-offset-2";

function Cta() {
  return (
    <LearnAuthLink to="/dashboard/objects" className={CTA_CLASS}>
      เปิดขาย Objects
      <span aria-hidden>+</span>
    </LearnAuthLink>
  );
}

function StaticCard({ item }: { item: Product }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[#e4e1db] bg-white text-[#2f2e2c]">
      <div className="aspect-[5/4] overflow-hidden bg-[#f3f1ec]">{item.mock}</div>
      <div className="p-3">
        <p className="text-[11px] text-[#8a867f]">
          {item.kind} · {item.chip}
        </p>
        <p className="mt-1 truncate text-sm font-medium">{item.title}</p>
        <p className="mt-1 text-sm tabular-nums">{item.price}</p>
      </div>
    </article>
  );
}

/**
 * Pinned scroll story: the same piece splits into things people can buy —
 * a print, an art toy, a zine and a file — each still tied back to the work.
 */
export function LearnObjectsStage() {
  const reduced = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const progress = usePinnedProgress(trackRef, Boolean(reduced));
  const compact = useIsCompact();
  const p = progress;

  const headOpacity = useTransform(p, compact ? [0.1, 0.18] : [0.24, 0.34], [1, 0]);
  const headY = useTransform(p, compact ? [0.1, 0.18] : [0.24, 0.34], ["0vh", "-4vh"]);
  const artScale = useTransform(p, [0.08, 0.3], [1, compact ? 0.3 : 0.62]);
  const artOpacity = useTransform(p, [0, 0.04], [0, 1]);
  const labelOpacity = useTransform(p, [0.3, 0.36], [0, 1]);
  if (reduced) {
    return (
      <div className="mx-auto max-w-[80rem] px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
        <Heading />
        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-4 md:grid-cols-4">
          {PRODUCTS.map((item) => (
            <StaticCard key={item.id} item={item} />
          ))}
        </div>
        <div className="mt-10 flex justify-center">
          <Cta />
        </div>
      </div>
    );
  }

  return (
    <>
      <div ref={trackRef} className="relative" style={{ height: "460vh" }}>
        <div className="sticky top-0 h-[100dvh] overflow-hidden">
          <motion.div
            className="pointer-events-none absolute inset-x-0 top-[13vh] z-30 px-4"
            style={{ opacity: headOpacity, y: headY }}
          >
            <Heading />
          </motion.div>

          <svg className="absolute inset-0 hidden h-full w-full md:block" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            {PRODUCTS.map((item, index) => (
              <Line key={item.id} p={p} item={item} index={index} />
            ))}
          </svg>

          {PRODUCTS.map((item, index) => (
            <ProductCard key={item.id} p={p} item={item} index={index} compact={compact} />
          ))}

          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <motion.figure className="w-[62vw] md:w-[min(22rem,28vw,44dvh)]" style={{ scale: artScale, opacity: artOpacity }}>
              <img
                src={ART}
                alt={`${LEARN_SOURCE_ART.title} illustration`}
                draggable={false}
                className="aspect-[4/3] w-full rounded-2xl bg-[#e4e1db] object-cover shadow-[0_30px_80px_-30px_rgba(47,46,44,0.45)]"
              />
              <motion.figcaption className="mt-3 hidden text-center md:block" style={{ opacity: labelOpacity }}>
                <span className="block text-[11px] uppercase tracking-[0.16em] text-[#8a867f]">ผลงานต้นทาง</span>
                <span className="block text-sm font-medium text-[#2f2e2c]">{LEARN_SOURCE_ART.title}</span>
              </motion.figcaption>
            </motion.figure>
          </div>

        </div>
      </div>
      <div className="flex flex-col items-center gap-3 px-4 pb-14">
        <Cta />
        <p className="text-center text-[11px] text-[#8a867f]">ตัวเลขยอดขายเป็นตัวอย่าง</p>
      </div>
    </>
  );
}
