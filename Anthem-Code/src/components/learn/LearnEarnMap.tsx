import { motion, useReducedMotion } from "framer-motion";
import { Box, Handshake, MessageCircle, UserRound, type LucideIcon } from "lucide-react";
import BriefIcon from "@/components/icons/BriefIcon";
import PackagesIcon from "@/components/icons/PackagesIcon";
import { LearnAuthLink } from "@/components/learn/LearnCtas";
import { LEARN_SERIF, LEARN_SOURCE_ART } from "@/components/learn/learnPinned";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

const NODES: { label: string; body: string; icon: LucideIcon; earns: boolean }[] = [
  { label: "Profile", body: "คนเจอคุณจากผลงาน", icon: UserRound, earns: false },
  { label: "Conversation", body: "คุยต่อจากชิ้นที่ชอบ", icon: MessageCircle, earns: false },
  { label: "Hire", body: "รับงานจ้างพร้อมบรีฟ", icon: BriefIcon, earns: true },
  { label: "Objects", body: "ขายเป็นชิ้นงานจริง", icon: Box, earns: true },
  { label: "Package", body: "ขายสไตล์เป็นข้อเสนอ", icon: PackagesIcon, earns: true },
  { label: "Collab", body: "ทำงานร่วม แชร์เครดิต", icon: Handshake, earns: false },
];

/** Node centre on an ellipse, in % of the diagram box. */
function nodeAt(index: number) {
  const angle = (-90 + index * 60) * (Math.PI / 180);
  return { x: 50 + Math.cos(angle) * 38, y: 50 + Math.sin(angle) * 40 };
}

function NodeCard({ node, compact = false }: { node: (typeof NODES)[number]; compact?: boolean }) {
  const Icon = node.icon;
  return (
    <span
      className={cn(
        "flex items-center gap-2.5 rounded-2xl border border-[#e4e1db] bg-white text-left text-[#2f2e2c] shadow-[0_18px_40px_-28px_rgba(47,46,44,0.45)]",
        compact ? "w-full px-3 py-2.5" : "w-[12.5rem] px-3 py-2.5",
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f3f1ec]">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          {node.label}
          {node.earns ? (
            <span className="rounded-full bg-[#eaf6ee] px-1.5 py-px text-[10px] font-medium text-[#23804a]">รายได้</span>
          ) : null}
        </span>
        <span className="block truncate text-xs text-[#6b6862]">{node.body}</span>
      </span>
    </span>
  );
}

const CTA_PRIMARY =
  "inline-flex min-h-11 items-center gap-2 rounded-full bg-[#2f2e2c] px-6 text-sm font-medium text-[#f5f5f5] outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#2f2e2c] focus-visible:ring-offset-2";
const CTA_LINK =
  "inline-flex min-h-11 items-center gap-2 border-0 bg-transparent p-0 font-inherit text-sm text-[#2f2e2c] underline decoration-[#2f2e2c]/25 underline-offset-4 hover:decoration-[#2f2e2c]";

/** Every way to show and earn hangs off the one piece of work in the middle. */
export function LearnEarnMap() {
  const reduced = useReducedMotion();
  const appear = (delay: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, scale: 0.9 },
          whileInView: { opacity: 1, scale: 1 },
          viewport: { once: true, amount: 0.4 },
          transition: { duration: 0.7, ease: EASE, delay },
        };

  return (
    <div className="mx-auto max-w-[80rem] px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
      <div className="text-center">
        <p className="text-[clamp(1.5rem,3vw,2.4rem)] leading-none tracking-[-0.03em] text-[#2f2e2c]" style={LEARN_SERIF}>
          One piece of work.
        </p>
        <h2 className="mt-2 text-[clamp(2.6rem,7vw,5.5rem)] font-medium leading-[0.88] tracking-[-0.06em] text-[#2f2e2c]">
          Many ways to earn
        </h2>
        <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-[#6b6862]">
          ทุกอย่างเชื่อมกลับไปที่ผลงานที่คุณลงไว้ คนเจอจากงาน คุยจากงาน จ้างจากงาน และซื้อสิ่งที่ทำจากงานชิ้นเดียวกัน
        </p>
      </div>

      <div className="relative mx-auto mt-12 hidden h-[34rem] max-w-[60rem] md:block">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          {NODES.map((node, index) => {
            const at = nodeAt(index);
            return (
              <motion.line
                key={node.label}
                x1={50}
                y1={50}
                x2={at.x}
                y2={at.y}
                stroke={node.earns ? "#9cc9ab" : "#d6d2ca"}
                strokeWidth={node.earns ? 1.5 : 1}
                vectorEffect="non-scaling-stroke"
                initial={reduced ? false : { pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.9, ease: EASE, delay: 0.15 + index * 0.08 }}
              />
            );
          })}
        </svg>

        <div className="absolute inset-0 flex items-center justify-center">
          <motion.figure className="flex flex-col items-center" {...appear(0)}>
            <img
              src={LEARN_SOURCE_ART.image}
              alt={`${LEARN_SOURCE_ART.title} illustration`}
              className="h-40 w-40 rounded-full border-[6px] border-white bg-[#e4e1db] object-cover shadow-[0_30px_70px_-30px_rgba(47,46,44,0.55)]"
            />
            <figcaption className="mt-3 rounded-full bg-[#2f2e2c] px-3 py-1 text-xs text-white">ผลงานของคุณ</figcaption>
          </motion.figure>
        </div>

        {NODES.map((node, index) => {
          const at = nodeAt(index);
          return (
            <div key={node.label} className="absolute" style={{ left: `${at.x}%`, top: `${at.y}%` }}>
              <div className="-translate-x-1/2 -translate-y-1/2">
                <motion.div {...appear(0.35 + index * 0.08)}>
                  <NodeCard node={node} />
                </motion.div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mx-auto mt-10 max-w-sm md:hidden">
        <div className="flex flex-col items-center">
          <img
            src={LEARN_SOURCE_ART.image}
            alt={`${LEARN_SOURCE_ART.title} illustration`}
            className="h-28 w-28 rounded-full border-[5px] border-white bg-[#e4e1db] object-cover shadow-[0_24px_50px_-24px_rgba(47,46,44,0.55)]"
          />
          <span className="mt-3 rounded-full bg-[#2f2e2c] px-3 py-1 text-xs text-white">ผลงานของคุณ</span>
        </div>
        <ul className="relative mt-6 space-y-2 border-l border-[#d6d2ca] pl-4">
          {NODES.map((node, index) => (
            <motion.li key={node.label} {...appear(index * 0.05)}>
              <NodeCard node={node} compact />
            </motion.li>
          ))}
        </ul>
      </div>

      <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
        <LearnAuthLink to="/portfolio/new" className={CTA_PRIMARY}>
          ลงผลงานชิ้นแรก
          <span aria-hidden>+</span>
        </LearnAuthLink>
        <LearnAuthLink to="/dashboard/packages" className={CTA_LINK}>
          สร้างแพ็กเกจ
          <span aria-hidden>+</span>
        </LearnAuthLink>
        <LearnAuthLink to="/dashboard/objects" className={CTA_LINK}>
          เปิดขาย Objects
          <span aria-hidden>+</span>
        </LearnAuthLink>
      </div>
    </div>
  );
}
