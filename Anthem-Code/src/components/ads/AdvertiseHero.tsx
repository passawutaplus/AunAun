import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { CheckCircle2, Megaphone, MessageSquare, Zap } from "lucide-react";
import AdvertiseLogoMarquee from "@/components/ads/AdvertiseLogoMarquee";
import { BackButton } from "@/components/ui/BackButton";
import { useFeedStats } from "@/hooks/useFeedStats";
import { BRAND_NAME } from "@/lib/brandConfig";
import { fadeUpTransition, fadeUpVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";

const PERKS = [
  "เข้าถึงกลุ่มครีเอทีฟโดยตรง ผ่านฟีดผลงาน",
  `ครีเอทีฟผ่านการตรวจโดยทีม ${BRAND_NAME}`,
  "เลือกรูปแบบโฆษณาได้ตามเป้าหมายแคมเปญ",
  "ดูยอดแสดงและคลิกได้หลังเผยแพร่",
] as const;

function formatStat(n: number): string {
  return n.toLocaleString("th-TH");
}

type Props = {
  formMode: "inquiry" | "creative";
  onSelectMode: (mode: "inquiry" | "creative") => void;
};

const AdvertiseHero = ({ formMode, onSelectMode }: Props) => {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { data: stats, isLoading } = useFeedStats();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const bgY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 90]);
  const titleY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -40]);
  const titleOp = useTransform(scrollYProgress, [0, 0.8], [1, reduced ? 1 : 0.35]);
  const statsY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : -18]);

  const users = stats?.designers ?? 0;
  const projects = stats?.projects ?? 0;
  const hires = stats?.hires ?? 0;
  const collabs = stats?.successfulCollabs ?? 0;
  const showNumbers = !isLoading;

  const goMode = (mode: "inquiry" | "creative") => {
    onSelectMode(mode);
    document.getElementById("advertise-form")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <section ref={ref} className="relative isolate flex h-dvh flex-col overflow-hidden">
      <motion.div className="absolute inset-0" style={{ y: bgY }}>
        <img loading="lazy" decoding="async"
          src="/ads/advertise-hero.png"
          alt=""
          className="h-[120%] w-full object-cover object-[center_30%]"
        />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/75" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/20" />

      <div className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] z-20 sm:left-6">
        <BackButton
          className="border-white/35 bg-white/10 text-white hover:bg-white/20 hover:text-white focus-visible:ring-white/70"
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col justify-center px-4 pt-16 sm:px-8">
        <motion.div className="mx-auto max-w-3xl text-center text-white" style={{ y: titleY, opacity: titleOp }}>
          <motion.div
            className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm"
            initial={reduced ? false : "hidden"}
            animate="show"
            variants={fadeUpVariants}
            transition={fadeUpTransition(0)}
          >
            <Megaphone className="h-3.5 w-3.5" /> โฆษณาในที่ที่คนกำลังมองหาแรงบันดาลใจ
          </motion.div>
          <motion.h1
            className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl"
            initial={reduced ? false : "hidden"}
            animate="show"
            variants={fadeUpVariants}
            transition={fadeUpTransition(0.06)}
          >
            ให้แบรนด์ของคุณถูกค้นพบผ่านผลงาน
          </motion.h1>
          <motion.p
            className="mx-auto mt-2 max-w-xl text-sm text-white/80 thai-leading-relaxed sm:text-base"
            initial={reduced ? false : "hidden"}
            animate="show"
            variants={fadeUpVariants}
            transition={fadeUpTransition(0.12)}
          >
            เข้าถึงครีเอเตอร์ไทยตอนที่กำลังค้นหาไอเดีย และเปิดทางให้แบรนด์อยู่ในบทสนทนาที่เกี่ยวข้อง
          </motion.p>
          <motion.ul
            className="mx-auto mt-4 hidden max-w-lg gap-1.5 text-left text-xs sm:grid sm:grid-cols-2 sm:text-sm"
            initial={reduced ? false : "hidden"}
            animate="show"
            variants={fadeUpVariants}
            transition={fadeUpTransition(0.18)}
          >
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-start gap-2 text-white/90">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(14_100%_62%)]" />
                <span>{perk}</span>
              </li>
            ))}
          </motion.ul>
        </motion.div>

        <motion.div
          className="mx-auto mt-5 w-full max-w-3xl"
          style={{ y: statsY }}
          initial={reduced ? false : "hidden"}
          animate="show"
          variants={fadeUpVariants}
          transition={fadeUpTransition(0.24)}
        >
          <div className="text-center text-white">
            <p className="text-xs font-medium tracking-[0.12em] text-white/60">Designer & Artist ทั้งหมด</p>
            {showNumbers ? (
              <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight md:text-5xl">
                {formatStat(users)}
              </p>
            ) : (
              <div className="mx-auto mt-3 h-12 w-36 animate-pulse rounded-lg bg-white/15" />
            )}
            <p className="mx-auto mt-2 max-w-sm text-sm text-white/75">
              ถูกเห็นโดยคนที่กำลังดูงาน ไม่ใช่แค่คนที่เลื่อนผ่าน
            </p>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center sm:gap-3">
            {[
              { label: "ผลงานเผยแพร่", value: projects },
              { label: "คำขอโอกาส", value: hires },
              { label: "คอลแลปที่เกิดจริง", value: collabs },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/15 bg-white/10 px-2 py-2 backdrop-blur-md sm:py-3"
              >
                {showNumbers ? (
                  <p className="text-lg font-semibold tabular-nums text-white md:text-2xl">
                    {formatStat(item.value)}
                  </p>
                ) : (
                  <div className={cn("mx-auto h-7 w-16 animate-pulse rounded bg-white/15")} />
                )}
                <p className="mt-1 text-[11px] text-white/65 sm:text-xs">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => goMode("inquiry")}
              className={cn(
                "inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm font-medium transition-colors",
                formMode === "inquiry"
                  ? "bg-primary text-primary-foreground"
                  : "bg-white text-neutral-900 hover:bg-white/90",
              )}
            >
              <MessageSquare className="h-4 w-4" aria-hidden />
              ติดต่อลงโฆษณา
            </button>
            <button
              type="button"
              onClick={() => goMode("creative")}
              className={cn(
                "inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm font-medium transition-colors",
                formMode === "creative"
                  ? "bg-primary text-primary-foreground"
                  : "bg-white text-neutral-900 hover:bg-white/90",
              )}
            >
              <Zap className="h-4 w-4" aria-hidden />
              ส่งคำขอด่วน
            </button>
          </div>
        </motion.div>
      </div>

      <div className="relative z-10 w-full shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
        <AdvertiseLogoMarquee />
      </div>
    </section>
  );
};

export default AdvertiseHero;
