import { useRef, useState, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { Check, FileText, Handshake, Paperclip, Send, type LucideIcon } from "lucide-react";
import BriefIcon from "@/components/icons/BriefIcon";
import {
  LEARN_FALLBACK_WORKS,
  LEARN_SERIF,
  LEARN_SOURCE_ART,
  clamp01,
  graphemes,
  typedAt,
  useIsCompact,
  usePinnedProgress,
  useProgressDerived,
} from "@/components/learn/learnPinned";
import { cn } from "@/lib/utils";

/** Light-page tones for the Hire / Collab mock cards (the app's chat tokens are dark-tuned here). */
const CARD_TONE = {
  hire: {
    border: "border-[#c9d8f2]",
    header: "bg-[#eaf1fc] text-[#2d5fae]",
    solid: "bg-[#2d5fae]",
  },
  collab: {
    border: "border-[#f1d0c3]",
    header: "bg-[#fcefe9] text-[#bf4a1f]",
    solid: "bg-[#bf4a1f]",
  },
} as const;

function MockCard({
  tone,
  icon: Icon,
  title,
  accept,
  children,
}: {
  tone: keyof typeof CARD_TONE;
  icon: LucideIcon;
  title: string;
  accept: string;
  children: ReactNode;
}) {
  const t = CARD_TONE[tone];
  return (
    <div className={cn("w-full min-w-[16rem] max-w-[22rem] overflow-hidden rounded-2xl border bg-white text-[#2f2e2c] shadow-sm", t.border)}>
      <div className={cn("flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold", t.header)}>
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {title}
      </div>
      <div className="space-y-2.5 px-3 py-3">{children}</div>
      <div className="flex gap-2 px-3 pb-3">
        <span className="flex h-8 flex-1 items-center justify-center rounded-full border border-[#e4e1db] text-[11px] text-[#6b6862]">
          ไม่สนใจ
        </span>
        <span className={cn("flex h-8 flex-1 items-center justify-center rounded-full text-[11px] font-medium text-white", t.solid)}>
          {accept}
        </span>
      </div>
    </div>
  );
}

const SERIF = LEARN_SERIF;
const FALLBACK_WORKS = LEARN_FALLBACK_WORKS;

/** Maps the original chat beats (0.35 → 1) into the chat window's slice of the longer track. */
const c = (old: number) => 0.5 + (old - 0.35) * 0.523;

/** Scroll timeline (0 → 1 across the pinned track). */
const T = {
  cardsOut: [0.08, 0.29],
  cardsFade: [0.29, 0.33],
  cardsFadeIn: 0.15,
  docsIn: [0.29, 0.33],
  docsBuild: [0.31, 0.46],
  docsOut: [0.46, 0.5],
  /** Mobile shows one document at a time. */
  quoteMob: { show: [0.29, 0.31, 0.38, 0.4], build: [0.31, 0.38] },
  planMob: { show: [0.39, 0.41, 0.47, 0.5], build: [0.41, 0.47] },
  chatIn: [c(0.38), c(0.49)],
  attachFly: [c(0.76), c(0.81)],
  group: 0.84,
  caption: [0.975, 0.995],
} as const;

const { image: ART_IMAGE, title: ART_TITLE, by: ART_BY } = LEARN_SOURCE_ART;

type ThreadItem = {
  id: string;
  chat: "dm" | "group";
  at: number;
  kind: "them" | "me" | "attach" | "hire" | "system" | "project";
  text?: string;
  /** Sender name for group messages. */
  from?: string;
  /** For my messages: when typing starts in the composer. */
  typeFrom?: number;
};

const THREAD: ThreadItem[] = [
  { id: "t1", chat: "dm", at: c(0.53), kind: "them", text: "สวัสดีครับ เห็นงาน Night Market Koi แล้วชอบลายเส้นมาก" },
  { id: "t2", chat: "dm", at: c(0.56), kind: "them", text: "กำลังทำนิทานเด็กเล่มใหม่ อยากได้แนวนี้ทำปกครับ" },
  { id: "m1", chat: "dm", at: c(0.63), typeFrom: c(0.58), kind: "me", text: "ขอบคุณค่ะ นิทานเล่าเรื่องอะไรคะ" },
  { id: "t3", chat: "dm", at: c(0.67), kind: "them", text: "เด็กที่ตามปลาคาร์ปกลับบ้านผ่านตลาดกลางคืน ยาวประมาณ 24 หน้าครับ" },
  { id: "m2", chat: "dm", at: c(0.74), typeFrom: c(0.69), kind: "me", text: "น่ารักมาก ขอส่งงานแนวใกล้กันให้ดูก่อนนะคะ" },
  { id: "a1", chat: "dm", at: c(0.81), kind: "attach" },
  { id: "t4", chat: "dm", at: c(0.85), kind: "them", text: "โทนนี้แหละครับ เดี๋ยวส่งบรีฟเป็นคำขอจ้างเลยนะ" },
  { id: "h1", chat: "dm", at: c(0.88), kind: "hire" },
  { id: "m3", chat: "dm", at: c(0.94), typeFrom: c(0.9), kind: "me", text: "รับเรื่องแล้วค่ะ เดี๋ยวสรุปขอบเขตกลับไปภายในวันนี้" },

  { id: "g0", chat: "group", at: 0.845, kind: "system", text: "Pixel Lab สร้างกลุ่มคอลแลป · ย้ายแผนงานเดิมมาด้วย" },
  { id: "g1", chat: "group", at: 0.865, kind: "them", from: "Pixel Lab", text: "แอนิเมชันเสร็จแล้ว ลองดูเวอร์ชันสุดท้ายนะ" },
  { id: "g2", chat: "group", at: 0.885, kind: "them", from: "Tonkla", text: "ใส่เสียงตลาดกับเสียงน้ำให้แล้วครับ" },
  { id: "g3", chat: "group", at: 0.915, typeFrom: 0.893, kind: "me", text: "สวยมาก ลงเป็นผลงานร่วมกันเลยไหม" },
  { id: "g4", chat: "group", at: 0.935, kind: "project" },
];

/** When the other side shows typing dots. */
const THEIR_TYPING: [number, number][] = [
  [c(0.5), c(0.53)],
  [c(0.64), c(0.67)],
  [c(0.82), c(0.85)],
  [0.85, 0.865],
  [0.87, 0.885],
];

const HIRE_ACCEPTED_AT = c(0.94);
const PROJECT_PUBLISHED_AT = 0.955;

const MY_TYPING = THREAD.filter((item) => item.kind === "me").map((item) => ({
  from: item.typeFrom ?? item.at,
  to: item.at,
  glyphs: graphemes(item.text ?? ""),
}));

const THRESHOLDS = Array.from(
  new Set([...THREAD.map((item) => item.at), ...THEIR_TYPING.flat(), T.group, PROJECT_PUBLISHED_AT]),
).sort((a, b) => a - b);

/** How many thread thresholds have passed — changes only a handful of times. */
function phaseAt(v: number) {
  let n = 0;
  while (n < THRESHOLDS.length && v >= THRESHOLDS[n]) n += 1;
  return n;
}

function composerAt(v: number): string {
  const active = MY_TYPING.find((item) => v >= item.from && v < item.to);
  if (!active) return "";
  return active.glyphs.slice(0, typedAt(v, active.from, active.to, active.glyphs.length)).join("");
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="shrink-0 text-[#8a867f]">{label}</span>
      <span className="text-right font-medium text-[#2f2e2c]">{value}</span>
    </div>
  );
}

function WorkRef() {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-[#f5f5f5] p-1.5 pr-3">
      <img src={ART_IMAGE} alt="" className="h-10 w-12 shrink-0 rounded-lg object-cover" draggable={false} />
      <span className="min-w-0">
        <span className="block text-[10px] text-[#8a867f]">อ้างอิงจากผลงาน</span>
        <span className="block truncate text-[11px] font-medium text-[#2f2e2c]">{ART_TITLE}</span>
      </span>
    </div>
  );
}

function Note({ children }: { children: string }) {
  return <p className="border-l-2 border-[#e4e1db] pl-2.5 text-[11px] leading-relaxed text-[#6b6862]">{children}</p>;
}

function HireCardMock() {
  return (
    <MockCard tone="hire" icon={BriefIcon} title="คำขอจ้างงาน" accept="รับเรื่อง">
      <WorkRef />
      <Row label="ขอบเขตงาน" value="ปกนิทาน + ภาพใน 6 ภาพ" />
      <Row label="สิทธิ์ใช้งาน" value="พิมพ์ + ออนไลน์ 2 ปี" />
      <Row label="ช่วงงบ" value="25,000–40,000 บาท" />
      <Row label="กำหนดส่ง" value="5 สัปดาห์" />
      <Note>“อยากได้ลายเส้นแบบปลาคาร์ปตัวนี้ สำหรับนิทานเด็กเล่มใหม่”</Note>
    </MockCard>
  );
}

function CollabCardMock() {
  return (
    <MockCard tone="collab" icon={Handshake} title="คำขอคอลแลป" accept="สนใจ">
      <WorkRef />
      <Row label="ประเภท" value="Illustration × Motion" />
      <Row label="บทบาท" value="คุณวาด · เราทำ Motion" />
      <Row label="ผลลัพธ์" value="แอนิเมชันสั้น 30 วินาที" />
      <Row label="เครดิต" value="ขึ้นทั้งสองโปรไฟล์" />
      <Note>“อยากให้ปลาตัวนี้ว่ายข้ามตลาดจริงๆ ลองทำด้วยกันไหม”</Note>
    </MockCard>
  );
}

function useCardMotion(p: MotionValue<number>, sign: 1 | -1) {
  const keys = [T.cardsOut[0], T.cardsOut[1], T.cardsFade[0], T.cardsFade[1]];
  return {
    xDesk: useTransform(p, keys, ["0vw", `${sign * 26}vw`, `${sign * 26}vw`, `${sign * 24}vw`]),
    yDesk: useTransform(p, keys, ["0vh", "0vh", "0vh", "2vh"]),
    yMob: useTransform(p, keys, ["0vh", `${sign * 25}vh`, `${sign * 25}vh`, `${sign * 25}vh`]),
    rotate: useTransform(p, keys, [0, sign * 3, sign * 3, 0]),
    scaleDesk: useTransform(p, keys, [0.82, 1, 1, 0.96]),
    scaleMob: useTransform(p, keys, [0.6, 0.8, 0.8, 0.76]),
    opacity: useTransform(p, [T.cardsOut[0], T.cardsFadeIn, T.cardsFade[0], T.cardsFade[1]], [0, 1, 1, 0]),
  };
}

function CardPair({
  p,
  compact,
  sign,
  label,
  line,
  children,
}: {
  p: MotionValue<number>;
  compact: boolean;
  sign: 1 | -1;
  label: string;
  line: string;
  children: ReactNode;
}) {
  const m = useCardMotion(p, sign);
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <motion.div
        className="flex w-[min(21rem,62vw)] flex-col items-center gap-3"
        style={{
          ...(compact ? { y: m.yMob, scale: m.scaleMob } : { x: m.xDesk, y: m.yDesk, scale: m.scaleDesk }),
          rotate: m.rotate,
          opacity: m.opacity,
        }}
      >
        <div className="text-center">
          <p className="text-[clamp(1.7rem,3vw,2.4rem)] leading-none tracking-[-0.03em] text-[#2f2e2c]" style={SERIF}>
            {label}
          </p>
          <p className="mt-1.5 text-[11px] uppercase tracking-[0.16em] text-[#6b6862]">{line}</p>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Documents: the Hire card becomes a quotation, the Collab card a plan */
/* ------------------------------------------------------------------ */

/** Local 0 → 1 progress of a document's build range, quantised so it re-renders ~50 times at most. */
function useLocal(p: MotionValue<number>, range: readonly [number, number]) {
  return useProgressDerived(p, (v) => Math.floor(clamp01((v - range[0]) / (range[1] - range[0])) * 50) / 50);
}

function Reveal({ on, children, className }: { on: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={cn("transition-[opacity,transform] duration-500", on ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0", className)}>
      {children}
    </div>
  );
}

const QUOTE_ITEMS = [
  { at: 0.1, name: "ภาพปกหน้า-หลัง", qty: "1", unit: "12,000", total: "12,000" },
  { at: 0.2, name: "ภาพประกอบด้านใน", qty: "6", unit: "2,500", total: "15,000" },
  { at: 0.3, name: "ไฟล์พร้อมพิมพ์ + ต้นฉบับ", qty: "1", unit: "3,000", total: "3,000" },
] as const;

const QUOTE_TOTALS = [
  { at: 0.42, label: "ยอดรวมรายการ", value: "฿30,000" },
  { at: 0.48, label: "หัก ณ ที่จ่าย 3%", value: "−฿900" },
  { at: 0.54, label: "มัดจำที่ต้องชำระ (50%)", value: "฿15,000" },
] as const;

const QUOTE_MILESTONES = ["มัดจำ / เริ่มงาน", "ส่งร่างเบื้องต้น", "ส่งมอบสุดท้าย"] as const;

function DocShell({
  tone,
  icon: Icon,
  kicker,
  title,
  meta,
  children,
}: {
  tone: keyof typeof CARD_TONE;
  icon: LucideIcon;
  kicker: string;
  title: string;
  meta: string;
  children: ReactNode;
}) {
  const t = CARD_TONE[tone];
  return (
    <div className={cn("w-full overflow-hidden rounded-2xl border bg-white text-[#2f2e2c] shadow-[0_30px_80px_-34px_rgba(47,46,44,0.45)]", t.border)}>
      <div className={cn("flex items-center gap-2 px-4 py-2.5", t.header)}>
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        <span className="text-[11px] font-semibold">{kicker}</span>
        <span className="ml-auto text-[10px] opacity-80">{meta}</span>
      </div>
      <div className="px-4 pb-4 pt-3">
        <p className="text-base font-medium tracking-[-0.01em]">{title}</p>
        {children}
      </div>
    </div>
  );
}

function QuoteDoc({ p, range }: { p: MotionValue<number>; range: readonly [number, number] }) {
  const l = useLocal(p, range);
  const paid = l >= 0.9;
  return (
    <DocShell tone="hire" icon={FileText} kicker="Hire · ใบเสนอราคา" title="ปกนิทาน “ตามปลาคาร์ปกลับบ้าน”" meta="QT-2026-0142">
      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
        <div className="rounded-lg bg-[#f7f6f3] px-2.5 py-1.5">
          <p className="text-[#8a867f]">ผู้เสนอราคา</p>
          <p className="truncate text-[11px] font-medium">Ploy Sirinya</p>
        </div>
        <div className="rounded-lg bg-[#f7f6f3] px-2.5 py-1.5">
          <p className="text-[#8a867f]">ลูกค้า · นิติบุคคล</p>
          <p className="truncate text-[11px] font-medium">Mali Studio</p>
        </div>
      </div>

      <div className="mt-3 text-[11px]">
        <div className="grid grid-cols-[1rem_minmax(0,1fr)_2rem_3.4rem_3.6rem] gap-1.5 border-b border-[#ece9e3] pb-1 text-[10px] text-[#8a867f]">
          <span>#</span>
          <span>รายละเอียด</span>
          <span className="text-right">จำนวน</span>
          <span className="text-right">ราคา/หน่วย</span>
          <span className="text-right">รวม</span>
        </div>
        {QUOTE_ITEMS.map((item, i) => (
          <Reveal key={item.name} on={l >= item.at}>
            <div className="grid grid-cols-[1rem_minmax(0,1fr)_2rem_3.4rem_3.6rem] gap-1.5 border-b border-[#f3f1ec] py-1.5 tabular-nums">
              <span className="text-[#8a867f]">{i + 1}</span>
              <span className="truncate">{item.name}</span>
              <span className="text-right">{item.qty}</span>
              <span className="text-right">{item.unit}</span>
              <span className="text-right font-medium">{item.total}</span>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="mt-2 space-y-1 text-[11px]">
        {QUOTE_TOTALS.map((row) => (
          <Reveal key={row.label} on={l >= row.at}>
            <div className="flex justify-between tabular-nums">
              <span className="text-[#6b6862]">{row.label}</span>
              <span>{row.value}</span>
            </div>
          </Reveal>
        ))}
        <Reveal on={l >= 0.6}>
          <div className="flex items-baseline justify-between border-t border-[#ece9e3] pt-1.5">
            <span className="text-xs font-medium">ยอดรวม</span>
            <span className="text-base font-semibold tabular-nums">฿29,100</span>
          </div>
        </Reveal>
      </div>

      <Reveal on={l >= 0.68} className="mt-2.5">
        <p className="text-[10px] text-[#8a867f]">ไทม์ไลน์และงวดงาน</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {QUOTE_MILESTONES.map((m, i) => (
            <span key={m} className="rounded-full border border-[#e4e1db] px-2 py-0.5 text-[10px]">
              {i + 1}. {m}
            </span>
          ))}
        </div>
      </Reveal>

      <Reveal on={l >= 0.76} className="mt-3">
        {paid ? (
          <p className="flex h-8 items-center justify-center gap-1.5 rounded-full bg-[#eaf6ee] text-[11px] font-medium text-[#23804a]">
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
            ชำระตามใบเสนอราคาแล้ว
          </p>
        ) : (
          <div className="flex gap-2">
            <span className="flex h-8 flex-1 items-center justify-center rounded-full border border-[#e4e1db] text-[11px] text-[#6b6862]">
              ปฏิเสธ
            </span>
            <span className="flex h-8 flex-[1.6] items-center justify-center rounded-full bg-[#2d5fae] text-[11px] font-medium text-white">
              ยืนยันและชำระเงิน
            </span>
          </div>
        )}
      </Reveal>
    </DocShell>
  );
}

const PLAN_STEPS = ["จัดแนวทางร่วมกัน", "สร้างงาน", "ยืนยันสุดท้าย", "ลงผลงานร่วมกัน"] as const;
const PLAN_TASKS = [
  { at: 0.56, label: "สตอรี่บอร์ด" },
  { at: 0.62, label: "ภาพนิ่ง 5 ฉาก" },
  { at: 0.68, label: "แอนิเมชัน 30 วินาที" },
] as const;
const PLAN_RIGHTS = ["เครดิตทั้งคู่", "ใช้ส่วนตัวได้", "ใช้เชิงพาณิชย์ได้", "โชว์พอร์ตร่วม"] as const;

function planStepAt(l: number) {
  return l < 0.5 ? 0 : l < 0.76 ? 1 : l < 0.88 ? 2 : 3;
}

function PlanDoc({ p, range }: { p: MotionValue<number>; range: readonly [number, number] }) {
  const l = useLocal(p, range);
  const step = planStepAt(l);
  const confirmed = [l >= 0.4, l >= 0.45];
  return (
    <DocShell tone="collab" icon={Handshake} kicker="Collab · วางแผนงานร่วมกัน" title="Night Market Koi — Motion" meta="2 คน">
      <ol className="mt-2.5 grid grid-cols-4 gap-1">
        {PLAN_STEPS.map((label, i) => (
          <li key={label} className="min-w-0">
            <span
              className={cn(
                "block h-1 rounded-full transition-colors duration-500",
                i < step ? "bg-[#bf4a1f]" : i === step ? "bg-[#bf4a1f]/50" : "bg-[#ece9e3]",
              )}
            />
            <span className={cn("mt-1 block truncate text-[9.5px]", i === step ? "font-medium text-[#bf4a1f]" : "text-[#8a867f]")}>
              {i + 1} {label}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-3 space-y-2 text-[11px]">
        <Reveal on={l >= 0.06}>
          <p className="text-[10px] text-[#8a867f]">ไอเดีย</p>
          <p>ให้ปลาคาร์ปว่ายข้ามตลาดกลางคืน ยาว 30 วินาที</p>
        </Reveal>
        <Reveal on={l >= 0.14}>
          <p className="text-[10px] text-[#8a867f]">ใครทำอะไร</p>
          <p>Ploy — ภาพนิ่ง 5 ฉาก · Pixel Lab — Motion + เสียง</p>
        </Reveal>
        <Reveal on={l >= 0.22}>
          <p className="text-[10px] text-[#8a867f]">รายละเอียดไทม์ไลน์</p>
          <p>3 สัปดาห์ · ร่างแรกสัปดาห์ที่ 1</p>
        </Reveal>
        <Reveal on={l >= 0.3}>
          <p className="text-[10px] text-[#8a867f]">สิทธิ์ / เครดิต</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {PLAN_RIGHTS.map((r, i) => (
              <span
                key={r}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px]",
                  i === 0 || i === 3 ? "border-[#bf4a1f] bg-[#fcefe9] text-[#bf4a1f]" : "border-[#e4e1db] text-[#8a867f]",
                )}
              >
                {r}
              </span>
            ))}
          </div>
        </Reveal>
        <Reveal on={l >= 0.5}>
          <p className="text-[10px] text-[#8a867f]">ชิ้นงานที่ต้องทำ</p>
          <ul className="mt-1 space-y-1">
            {PLAN_TASKS.map((task) => {
              const done = l >= task.at;
              return (
                <li key={task.label} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-3.5 w-3.5 items-center justify-center rounded border transition-colors duration-300",
                      done ? "border-[#bf4a1f] bg-[#bf4a1f] text-white" : "border-[#d6d2ca] text-transparent",
                    )}
                  >
                    <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
                  </span>
                  <span className={cn(done && "text-[#8a867f] line-through")}>{task.label}</span>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-[#ece9e3] pt-2.5 text-[10px]">
        {[
          { name: "Ploy", tone: "bg-[#2f2e2c]" },
          { name: "Pixel Lab", tone: "bg-[#7a8b99]" },
        ].map((who, i) => (
          <span key={who.name} className="flex items-center gap-1.5">
            <span className={cn("flex h-5 w-5 items-center justify-center rounded-full text-[9px] text-white", who.tone)}>{who.name[0]}</span>
            <span className={cn("transition-colors", confirmed[i] ? "text-[#23804a]" : "text-[#a8a49c]")}>
              {confirmed[i] ? "ยืนยันแล้ว" : "รอยืนยัน"}
            </span>
          </span>
        ))}
        <span
          className={cn(
            "ml-auto rounded-full px-2 py-0.5 transition-colors",
            step === 3 ? "bg-[#bf4a1f] text-white" : "bg-[#f3f1ec] text-[#8a867f]",
          )}
        >
          {step === 3 ? "ครบแล้ว" : `ขั้นที่ ${step + 1}/4`}
        </span>
      </div>
    </DocShell>
  );
}

function DocPair({ p, compact }: { p: MotionValue<number>; compact: boolean }) {
  const keys = [T.docsIn[0], T.docsIn[1], T.docsOut[0], T.docsOut[1]];
  const deskOpacity = useTransform(p, keys, [0, 1, 1, 0]);
  const deskY = useTransform(p, keys, ["4vh", "0vh", "0vh", "-6vh"]);
  const deskScale = useTransform(p, keys, [0.94, 1, 1, 0.97]);
  const quoteMobOpacity = useTransform(p, [...T.quoteMob.show], [0, 1, 1, 0]);
  const planMobOpacity = useTransform(p, [...T.planMob.show], [0, 1, 1, 0]);
  const quoteMobY = useTransform(p, [...T.quoteMob.show], ["5vh", "0vh", "0vh", "-5vh"]);
  const planMobY = useTransform(p, [...T.planMob.show], ["5vh", "0vh", "0vh", "-5vh"]);

  if (compact) {
    return (
      <>
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-3 pt-10">
          <motion.div className="w-[min(24rem,100%)]" style={{ opacity: quoteMobOpacity, y: quoteMobY }}>
            <QuoteDoc p={p} range={T.quoteMob.build} />
          </motion.div>
        </div>
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-3 pt-10">
          <motion.div className="w-[min(24rem,100%)]" style={{ opacity: planMobOpacity, y: planMobY }}>
            <PlanDoc p={p} range={T.planMob.build} />
          </motion.div>
        </div>
      </>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-[3vw] px-6 pt-8">
      <motion.div className="w-[min(25rem,44vw)]" style={{ opacity: deskOpacity, y: deskY, scale: deskScale }}>
        <QuoteDoc p={p} range={T.docsBuild} />
      </motion.div>
      <motion.div className="w-[min(25rem,44vw)]" style={{ opacity: deskOpacity, y: deskY, scale: deskScale }}>
        <PlanDoc p={p} range={T.docsBuild} />
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Chat window                                                         */
/* ------------------------------------------------------------------ */

const AVATAR_TONES = ["bg-[#2f2e2c]", "bg-[#b59a7a]", "bg-[#7a8b99]"];
const MEMBER_TONE: Record<string, string> = {
  "Pixel Lab": "bg-[#7a8b99]",
  Tonkla: "bg-[#b59a7a]",
  Ploy: "bg-[#2f2e2c]",
};
const GROUP_NAME = "ทีม Koi Motion";
const GROUP_MEMBERS = ["Ploy", "Pixel Lab", "Tonkla"] as const;

function GroupAvatars({ size = "h-6 w-6" }: { size?: string }) {
  return (
    <span className="flex -space-x-2">
      {GROUP_MEMBERS.map((name) => (
        <span
          key={name}
          className={cn("flex items-center justify-center rounded-full border-2 border-white text-[9px] font-medium text-white", size, MEMBER_TONE[name])}
        >
          {name[0]}
        </span>
      ))}
    </span>
  );
}

function ThreadBubble({
  item,
  attachImage,
  accepted,
  published,
}: {
  item: ThreadItem;
  attachImage: string;
  accepted: boolean;
  published: boolean;
}) {
  if (item.kind === "system") {
    return <p className="mx-auto rounded-full bg-[#f5f5f5] px-3 py-1 text-[10px] text-[#8a867f]">{item.text}</p>;
  }
  if (item.kind === "them") {
    return (
      <div className="max-w-[85%]">
        {item.from ? <p className="mb-0.5 pl-1 text-[10px] text-[#8a867f]">{item.from}</p> : null}
        <p className="rounded-2xl rounded-tl-md bg-[#f1efea] px-3 py-2 text-xs leading-relaxed text-[#2f2e2c]">{item.text}</p>
      </div>
    );
  }
  if (item.kind === "me") {
    return (
      <p className="ml-auto max-w-[80%] rounded-2xl rounded-tr-md bg-[#2f2e2c] px-3 py-2 text-xs leading-relaxed text-white">
        {item.text}
      </p>
    );
  }
  if (item.kind === "attach") {
    return (
      <div className="ml-auto w-[9.5rem] overflow-hidden rounded-2xl rounded-tr-md border border-[#e4e1db] bg-white">
        <img src={attachImage} alt="" className="aspect-[4/3] w-full object-cover" draggable={false} />
        <p className="truncate px-2.5 py-1.5 text-[11px] text-[#2f2e2c]">งานแนวใกล้กัน</p>
      </div>
    );
  }
  if (item.kind === "project") {
    return (
      <div className="ml-auto w-[16rem] max-w-full overflow-hidden rounded-2xl border border-[#f1d0c3] bg-white">
        <div className="flex items-center gap-1.5 bg-[#fcefe9] px-3 py-1.5 text-[11px] font-semibold text-[#bf4a1f]">
          <Handshake className="h-3.5 w-3.5" />
          ลงผลงานร่วมกัน
        </div>
        <div className="flex gap-2.5 p-2.5">
          <img src={ART_IMAGE} alt="" className="h-14 w-16 shrink-0 rounded-lg object-cover" draggable={false} />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-[#2f2e2c]">Night Market Koi — Motion</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {GROUP_MEMBERS.map((name) => (
                <span key={name} className="inline-flex items-center gap-1 rounded-full bg-[#f5f5f5] py-0.5 pl-0.5 pr-1.5 text-[9.5px] text-[#2f2e2c]">
                  <span className={cn("flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] text-white", MEMBER_TONE[name])}>
                    {name[0]}
                  </span>
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
        <p className={cn("px-3 pb-2 text-[11px]", published ? "font-medium text-[#23804a]" : "text-[#8a867f]")}>
          {published ? "เผยแพร่แล้ว · ขึ้นทั้ง 3 โปรไฟล์" : "รอทุกคนตอบรับ"}
        </p>
      </div>
    );
  }
  return (
    <div className="w-[15rem] max-w-full overflow-hidden rounded-2xl border border-[#c9d8f2] bg-white">
      <div className="flex items-center gap-1.5 bg-[#eaf1fc] px-3 py-1.5 text-[11px] font-semibold text-[#2d5fae]">
        <BriefIcon className="h-3.5 w-3.5" />
        คำขอจ้างงาน
      </div>
      <p className="px-3 pt-2 text-xs text-[#2f2e2c]">ปกนิทาน + ภาพใน 6 ภาพ · 25,000–40,000 บาท · 5 สัปดาห์</p>
      <p className={cn("px-3 pb-2 pt-1 text-[11px]", accepted ? "font-medium text-[#23804a]" : "text-[#8a867f]")}>
        {accepted ? "รับเรื่องแล้ว" : "รอคุณตอบรับ"}
      </p>
    </div>
  );
}

const ATTACH_W = 152;

function ChatWindowContent({
  p,
  works,
  workTitle,
}: {
  p: MotionValue<number>;
  works: string[];
  workTitle: string;
}) {
  const threadRef = useRef<HTMLDivElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState(() => phaseAt(p.get()));
  const [composer, setComposer] = useState(() => composerAt(p.get()));
  const flyDx = useMotionValue(0);
  const flyDy = useMotionValue(0);
  const flyEnd = useMotionValue(1.6);

  const measureFlight = () => {
    const thread = threadRef.current?.getBoundingClientRect();
    const cell = cellRef.current?.getBoundingClientRect();
    if (!thread || !cell || !cell.width) return;
    const imgH = ATTACH_W * 0.75;
    flyDx.set(thread.right - 16 - ATTACH_W / 2 - (cell.left + cell.width / 2));
    flyDy.set(thread.bottom - 16 - 26 - imgH / 2 - (cell.top + cell.height / 2));
    flyEnd.set(ATTACH_W / cell.width);
  };

  useMotionValueEvent(p, "change", (v) => {
    const nextPhase = phaseAt(v);
    setPhase((current) => (current === nextPhase ? current : nextPhase));
    const nextComposer = composerAt(v);
    setComposer((current) => (current === nextComposer ? current : nextComposer));
    if (v >= T.attachFly[0] - 0.02 && v <= T.attachFly[1]) measureFlight();
  });

  const reached = phase > 0 ? THRESHOLDS[phase - 1] : -1;
  const inGroup = reached >= T.group;
  const chat = inGroup ? "group" : "dm";
  const visible = THREAD.filter((item) => item.chat === chat && item.at <= reached);
  const theyType = THEIR_TYPING.some(([from, to]) => reached >= from && reached < to);
  const accepted = reached >= HIRE_ACCEPTED_AT;
  const published = reached >= PROJECT_PUBLISHED_AT;

  const flyT = (v: number) => Math.min(1, Math.max(0, (v - T.attachFly[0]) / (T.attachFly[1] - T.attachFly[0])));
  const flyX = useTransform([p, flyDx], ([v, dx]: number[]) => flyT(v) * dx);
  const flyY = useTransform([p, flyDy], ([v, dy]: number[]) => flyT(v) * dy);
  const flyScale = useTransform([p, flyEnd], ([v, end]: number[]) => {
    const t = flyT(v);
    return t < 0.3 ? 1 + t / 0.3 * 0.1 : 1.1 + ((t - 0.3) / 0.7) * (end - 1.1);
  });
  const flyOpacity = useTransform(p, [T.attachFly[0] - 0.01, T.attachFly[0], T.attachFly[1] - 0.005, T.attachFly[1] + 0.005], [0, 1, 1, 0]);
  const sentDim = useTransform(p, [T.attachFly[0], T.attachFly[0] + 0.02], [1, 0.4]);

  const panelWorks = (works.length >= 4 ? works : [...works, ...FALLBACK_WORKS]).slice(0, 4);
  const attachImage = panelWorks[1];

  const chats = [
    ["Mali Studio", accepted ? "รับเรื่องแล้วค่ะ…" : "ชอบลายเส้นมาก…"],
    ["Nattapong", "ส่งไฟล์ให้แล้วนะ"],
    ["Pixel Lab", "ขอคุยเรื่องคอลแลป"],
  ] as const;

  return (
    <div className="grid h-full grid-cols-1 bg-white md:grid-cols-[12.5rem_minmax(0,1fr)_13rem]">
      {/* Chats */}
      <aside className="hidden flex-col border-r border-[#ece9e3] md:flex">
        <p className="px-4 py-3 text-xs font-medium text-[#2f2e2c]">แชท</p>
        <AnimatePresence initial={false}>
          {inGroup ? (
            <motion.div
              key="group"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2.5 bg-[#f5f5f5] px-4 py-2.5">
                <GroupAvatars size="h-6 w-6" />
                <span className="min-w-0">
                  <span className="flex items-center gap-1 text-xs font-medium text-[#2f2e2c]">
                    <span className="truncate">{GROUP_NAME}</span>
                  </span>
                  <span className="block truncate text-[10px] text-[#bf4a1f]">คอลแลป · 3 คน</span>
                </span>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
        {chats.map(([name, preview], i) => (
          <div key={name} className={cn("flex items-center gap-2.5 px-4 py-2.5", i === 0 && !inGroup && "bg-[#f5f5f5]")}>
            <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-medium text-white", AVATAR_TONES[i])}>
              {name.slice(0, 1)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium text-[#2f2e2c]">{name}</span>
              <span className="block truncate text-[11px] text-[#8a867f]">{preview}</span>
            </span>
          </div>
        ))}
      </aside>

      {/* Thread */}
      <div className="flex min-h-0 min-w-0 flex-col">
        <div className="flex items-center gap-2.5 border-b border-[#ece9e3] px-4 py-3">
          {inGroup ? (
            <>
              <GroupAvatars size="h-7 w-7" />
              <span className="min-w-0">
                <span className="block truncate text-xs font-medium text-[#2f2e2c]">{GROUP_NAME}</span>
                <span className="block text-[10px] text-[#8a867f]">3 สมาชิก</span>
              </span>
              <span className="ml-auto rounded-full bg-[#fcefe9] px-2.5 py-1 text-[10px] font-medium text-[#bf4a1f]">คอลแลป</span>
            </>
          ) : (
            <>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2f2e2c] text-[11px] font-medium text-white">M</span>
              <span className="text-xs font-medium text-[#2f2e2c]">Mali Studio</span>
              <span className="ml-auto max-w-[9rem] truncate rounded-full bg-[#f5f5f5] px-2.5 py-1 text-[10px] text-[#6b6862]">
                จาก {workTitle}
              </span>
            </>
          )}
        </div>

        <div ref={threadRef} className="flex min-h-0 flex-1 flex-col justify-end gap-2.5 overflow-hidden px-4 py-4">
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map((item) => (
              <motion.div
                key={item.id}
                layout="position"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col"
              >
                <ThreadBubble item={item} attachImage={attachImage} accepted={accepted} published={published} />
              </motion.div>
            ))}
            {theyType ? (
              <motion.div
                key="typing"
                layout="position"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                className="flex w-fit gap-1 rounded-2xl rounded-tl-md bg-[#f1efea] px-3 py-3"
              >
                {[0, 1, 2].map((dot) => (
                  <span key={dot} className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#8a867f]" style={{ animationDelay: `${dot * 140}ms` }} />
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2 border-t border-[#ece9e3] px-3 py-3">
          <Paperclip className="h-4 w-4 shrink-0 text-[#8a867f]" aria-hidden />
          <div className="flex h-9 min-w-0 flex-1 items-center rounded-full bg-[#f5f5f5] px-3.5 text-xs">
            {composer ? (
              <span className="truncate text-[#2f2e2c]">
                {composer}
                <span className="ml-px inline-block h-3.5 w-px translate-y-0.5 animate-pulse bg-[#2f2e2c]" />
              </span>
            ) : (
              <span className="text-[#a8a49c]">พิมพ์ข้อความ…</span>
            )}
          </div>
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors",
              composer ? "bg-[#2f2e2c] text-white" : "bg-[#ece9e3] text-[#a8a49c]",
            )}
          >
            <Send className="h-3.5 w-3.5" aria-hidden />
          </span>
        </div>
      </div>

      {/* Your work (sidebar) */}
      <aside className="relative z-20 hidden border-l border-[#ece9e3] md:block">
        <p className="px-4 py-3 text-xs font-medium text-[#2f2e2c]">ผลงานของคุณ</p>
        <div className="grid grid-cols-2 gap-2 px-3">
          {panelWorks.map((src, i) => (
            <div key={src + i} ref={i === 1 ? cellRef : undefined} className="relative aspect-square">
              <motion.img
                src={src}
                alt=""
                draggable={false}
                className="h-full w-full rounded-lg object-cover"
                style={i === 1 ? { opacity: sentDim } : undefined}
              />
              {i === 1 ? (
                <motion.img
                  src={src}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute inset-0 h-full w-full rounded-lg object-cover shadow-xl"
                  style={{ x: flyX, y: flyY, scale: flyScale, opacity: flyOpacity }}
                />
              ) : null}
            </div>
          ))}
        </div>
        <p className="px-4 pt-3 text-[11px] leading-relaxed text-[#8a867f]">
          {inGroup ? "ผลงานร่วมจะขึ้นในโปรไฟล์ของทุกคนในกลุ่ม" : "เลือกชิ้นงานจากแถบนี้ แล้วส่งเข้าแชทได้เลย"}
        </p>
      </aside>
    </div>
  );
}

const WINDOW_CLASS =
  "h-[min(36rem,74dvh)] w-[min(66rem,calc(100vw-2rem))] overflow-hidden rounded-[1.25rem] border border-[#e4e1db] bg-white shadow-[0_30px_80px_-30px_rgba(47,46,44,0.35)]";

/**
 * Pinned scroll story: a project → Hire / Collab cards come out of the middle →
 * they turn into a quotation and a shared plan → a chat window rises, replies
 * get typed, a work is sent → a collab group forms and publishes a joint project.
 */
export function LearnConversationStage({ works }: { works: string[] }) {
  const reduced = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const progress = usePinnedProgress(trackRef, Boolean(reduced));
  const staticProgress = useMotionValue(1);
  const compact = useIsCompact();
  const workTitle = ART_TITLE;

  const p = progress;
  const headOpacity = useTransform(p, compact ? [0.09, 0.17] : [0.21, 0.31], [1, 0]);
  const headY = useTransform(p, compact ? [0.09, 0.17] : [0.21, 0.31], ["0vh", "-4vh"]);
  const projOpacity = useTransform(p, [0, 0.05, 0.27, 0.31], [0, 1, 1, 0]);
  const projScale = useTransform(p, [0, 0.09, 0.27, 0.31], [0.7, 1, 1, 0.92]);
  const winY = useTransform(p, [...T.chatIn], ["105vh", "-2vh"]);
  const winOpacity = useTransform(p, [T.chatIn[0], T.chatIn[0] + 0.02], [0, 1]);
  const captionOpacity = useTransform(p, [...T.caption], [0, 1]);
  const noteOpacity = useTransform(p, [0.15, 0.21, 0.26, 0.29], [0, 1, 1, 0]);
  const docNoteOpacity = useTransform(p, [0.33, 0.36, 0.44, 0.47], [0, 1, 1, 0]);

  const heading = (
    <>
      <p className="text-[clamp(1.7rem,3.2vw,2.6rem)] leading-none tracking-[-0.03em] text-[#2f2e2c]" style={SERIF}>
        Then open a
      </p>
      <h2 className="mt-2 text-[clamp(3rem,9.5vw,7.5rem)] font-medium leading-[0.84] tracking-[-0.06em] text-[#2f2e2c]">
        Conversation
      </h2>
      <p className="mx-auto mt-4 max-w-sm text-[11px] uppercase leading-[1.7] tracking-[0.16em] text-[#6b6862]">
        Hire, collab, or just talk. It starts from the work.
      </p>
    </>
  );

  if (reduced) {
    return (
      <div className="px-4 py-16 text-center sm:px-6 lg:py-24">
        {heading}
        <div className="mx-auto mt-12 flex max-w-[52rem] flex-wrap items-start justify-center gap-8 text-left">
          <div className="flex w-[min(25rem,100%)] flex-col items-center gap-3">
            <p className="text-[2rem] leading-none text-[#2f2e2c]" style={SERIF}>Hire</p>
            <QuoteDoc p={staticProgress} range={[0, 1]} />
          </div>
          <div className="flex w-[min(25rem,100%)] flex-col items-center gap-3">
            <p className="text-[2rem] leading-none text-[#2f2e2c]" style={SERIF}>Collab</p>
            <PlanDoc p={staticProgress} range={[0, 1]} />
          </div>
        </div>
        <div className="mx-auto mt-14 flex justify-center">
          <div className={WINDOW_CLASS}>
            <ChatWindowContent p={staticProgress} works={works} workTitle={workTitle} />
          </div>
        </div>
        <p className="mt-8 text-[clamp(1.5rem,2.6vw,2.2rem)] text-[#2f2e2c]" style={SERIF}>
          From the work, to a conversation, to a team.
        </p>
      </div>
    );
  }

  return (
    <div ref={trackRef} className="relative" style={{ height: "820vh" }}>
      <div className="sticky top-0 h-[100dvh] overflow-hidden">
        <p className="sr-only">
          Hire and collab requests start from a project. A hire becomes a quotation, a collab becomes a shared plan. Chat,
          send work from your profile, then form a collab group and publish a joint project.
        </p>

        <div aria-hidden className="absolute inset-0">
          <motion.div
            className="absolute inset-x-0 top-[7vh] z-30 px-4 text-center"
            style={{ opacity: headOpacity, y: headY }}
          >
            {heading}
          </motion.div>

          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <motion.div className="w-[62vw] md:w-[min(24rem,30vw)]" style={{ opacity: projOpacity, scale: projScale }}>
              <img
                src={ART_IMAGE}
                alt=""
                className="aspect-[4/3] w-full rounded-[1.1rem] bg-[#e4e1db] object-cover shadow-[0_24px_60px_-28px_rgba(47,46,44,0.5)]"
                draggable={false}
              />
              <p className="mt-3 text-center text-sm font-medium tracking-[-0.01em] text-[#2f2e2c]">{ART_TITLE}</p>
              <p className="mt-0.5 text-center text-[11px] uppercase tracking-[0.16em] text-[#8a867f]">{ART_BY}</p>
            </motion.div>
          </div>

          <CardPair p={p} compact={compact} sign={-1} label="Hire" line="A brief, a budget, a deadline">
            <HireCardMock />
          </CardPair>
          <CardPair p={p} compact={compact} sign={1} label="Collab" line="A shared idea, shared credit">
            <CollabCardMock />
          </CardPair>

          <DocPair p={p} compact={compact} />

          <motion.p
            className="absolute inset-x-0 bottom-[6vh] z-30 hidden px-4 text-center text-[11px] uppercase tracking-[0.16em] text-[#6b6862] md:block"
            style={{ opacity: noteOpacity }}
          >
            Every request keeps the work it came from. No cold briefs.
          </motion.p>
          <motion.p
            className="absolute inset-x-0 top-[9vh] z-30 hidden px-4 text-center text-[11px] uppercase tracking-[0.16em] text-[#6b6862] md:block"
            style={{ opacity: docNoteOpacity }}
          >
            A hire gets a real quotation. A collab gets a plan you both sign off.
          </motion.p>

          <div className="absolute inset-0 z-40 flex items-center justify-center">
            <motion.div className={WINDOW_CLASS} style={{ y: winY, opacity: winOpacity }}>
              <ChatWindowContent p={p} works={works} workTitle={workTitle} />
            </motion.div>
          </div>

          <motion.p
            className="absolute inset-x-0 bottom-[11vh] z-30 px-4 text-center text-[clamp(1.4rem,2.6vw,2.2rem)] leading-none tracking-[-0.02em] text-[#2f2e2c]"
            style={{ ...SERIF, opacity: captionOpacity }}
          >
            From the work, to a conversation, to a team.
          </motion.p>
        </div>
      </div>
    </div>
  );
}
