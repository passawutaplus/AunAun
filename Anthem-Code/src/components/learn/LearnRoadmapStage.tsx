import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Box,
  Briefcase,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Gift,
  MessagesSquare,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import PackagesIcon from "@/components/icons/PackagesIcon";
import { EnterView } from "@/components/learn/LearnMotion";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useOpenFeedbackTicket } from "@/hooks/useOpenFeedbackTicket";
import { smoothEase } from "@/lib/motion";
import { cn } from "@/lib/utils";

type RoadmapItem = {
  en: string;
  th: string;
  body: string;
  long: string;
  details: string[];
  img: string;
  icon: LucideIcon | typeof PackagesIcon;
  /** Bento: wide card on large screens. */
  wide?: boolean;
};

/** Features built but switched off for the free Beta. No dates on purpose — order follows feedback. */
const ROADMAP: RoadmapItem[] = [
  {
    en: "Job Board",
    th: "บอร์ดงาน",
    body: "แบรนด์และทีมประกาศหาครีเอเตอร์ แล้วเลือกคนจากผลงานจริง ไม่ใช่จากเรซูเม่",
    long: "ประกาศงานพร้อมงบและกำหนดส่ง ครีเอเตอร์ที่สนใจยื่นข้อเสนอพร้อมผลงานที่ใกล้เคียง คุณเลือกจากพอร์ตจริง แล้วคุยต่อในแชทได้ทันที",
    details: [
      "ประกาศงานพร้อมงบ ขอบเขต และกำหนดส่ง",
      "ครีเอเตอร์ยื่นข้อเสนอพร้อมผลงานที่เกี่ยวข้อง",
      "เทียบข้อเสนอ แล้วเปิดแชทคุยต่อในคลิกเดียว",
      "ครีเอเตอร์ตั้งแจ้งเตือนงานตามสาขาที่ถนัด",
    ],
    img: "/learn/roadmap/job-board.webp",
    icon: Briefcase,
    wide: true,
  },
  {
    en: "Packages",
    th: "แพ็กเกจบริการ",
    body: "ตั้งขอบเขตงาน ระยะเวลา และราคาไว้ล่วงหน้า ให้คนที่สนใจเริ่มคุยได้ทันที",
    long: "เปลี่ยนบริการของคุณเป็นแพ็กเกจที่พร้อมเริ่ม ลูกค้าเห็นราคา ระยะเวลา และสิ่งที่จะได้รับก่อนทัก ไม่ต้องคุยวนเรื่องราคาทุกครั้ง",
    details: [
      "ตั้งแพ็กเกจหลายระดับ เช่น เริ่มต้น มาตรฐาน พรีเมียม",
      "กำหนดจำนวนครั้งที่แก้งาน ระยะเวลา และไฟล์ที่ส่งมอบ",
      "เพิ่มบริการเสริมให้ลูกค้าเลือกเอง",
      "ลูกค้าเริ่มงานจากแพ็กเกจ แล้วคุยรายละเอียดต่อในแชท",
    ],
    img: "/learn/roadmap/packages.webp",
    icon: PackagesIcon,
  },
  {
    en: "Objects",
    th: "ร้านของครีเอเตอร์",
    body: "ขายงานพิมพ์ สินค้า และงานทำมือ ต่อจากผลงานบนโปรไฟล์ของคุณ",
    long: "เปิดร้านเล็ก ๆ บนโปรไฟล์ ขายของจริงที่ต่อยอดจากผลงาน คนที่ชอบงานคุณซื้อกลับบ้านได้จากหน้าเดียวกัน",
    details: [
      "ลงสินค้าพร้อมรูป ราคา และจำนวนที่มี",
      "ผูกสินค้ากับผลงานที่เป็นต้นแบบ",
      "ดูออเดอร์และสถานะจัดส่งในที่เดียว",
      "ขายได้ทั้งงานทำมือ งานพิมพ์ และไฟล์ดิจิทัล",
    ],
    img: "/learn/roadmap/objects.webp",
    icon: Box,
  },
  {
    en: "Wallet & Payouts",
    th: "การเงิน",
    body: "รับค่าจ้างผ่านระบบ ถอนเข้าบัญชี และดูธุรกรรมทั้งหมดในที่เดียว",
    long: "รับค่าจ้างผ่าน SAMECOR เงินถูกพักไว้จนส่งมอบงาน ทั้งสองฝ่ายมั่นใจขึ้น แล้วถอนเข้าบัญชีของคุณได้",
    details: [
      "ลูกค้าจ่ายมัดจำหรือเต็มจำนวนผ่านระบบ",
      "เงินพักไว้จนส่งมอบงาน ลดความเสี่ยงทั้งสองฝ่าย",
      "ถอนเงินเข้าบัญชีธนาคารในไทย",
      "ดูรายรับและธุรกรรมย้อนหลังทั้งหมด",
    ],
    img: "/learn/roadmap/wallet.webp",
    icon: Wallet,
  },
  {
    en: "Contracts & Tax",
    th: "สัญญาและเอกสารภาษี",
    body: "สร้างสัญญาจ้างและหนังสือรับรองหัก ณ ที่จ่าย (50 ทวิ) จากงานจ้างได้เลย",
    long: "ใบเสนอราคา ใบแจ้งหนี้ และใบเสร็จเปิดใช้แล้วใน My Studio ขั้นต่อไปคือสัญญาจ้างที่เซ็นออนไลน์ และเอกสารภาษีที่ออกจากงานจ้างได้เอง",
    details: [
      "สัญญาจ้างจากเทมเพลตที่เขียนมาสำหรับงานสร้างสรรค์",
      "เซ็นออนไลน์ทั้งสองฝ่าย เก็บไว้กับงานนั้น",
      "ออกหนังสือรับรองหัก ณ ที่จ่าย (50 ทวิ)",
      "ส่งออกเอกสารทั้งปีไว้ยื่นภาษี",
    ],
    img: "/learn/roadmap/contracts.webp",
    icon: FileText,
  },
  {
    en: "Support",
    th: "ส่งกำลังใจ",
    body: "ส่งของขวัญให้ครีเอเตอร์ที่ชอบ เพื่อบอกว่างานของเขามีคนเห็น",
    long: "บางครั้งคำชมก็ไม่พอ ส่งของขวัญเล็ก ๆ ให้ครีเอเตอร์ที่ชอบ เพื่อบอกว่างานของเขามีคนเห็นและอยากให้ทำต่อ",
    details: [
      "ส่งกำลังใจจากหน้าผลงานหรือโปรไฟล์",
      "แนบข้อความถึงครีเอเตอร์ได้",
      "ครีเอเตอร์เห็นว่าใครสนับสนุนงานของเขา",
    ],
    img: "/learn/roadmap/support.webp",
    icon: Gift,
  },
  {
    en: "Community",
    th: "ชุมชน",
    body: "พื้นที่พูดคุย แลกความรู้ และหาเพื่อนร่วมงานในวงการสร้างสรรค์",
    long: "พื้นที่ของคนทำงานสร้างสรรค์ ถามตอบเรื่องงานและเครื่องมือ แชร์งานระหว่างทำ และหาคนร่วมโปรเจกต์ถัดไป",
    details: [
      "ตั้งกระทู้ถามตอบเรื่องงานและเครื่องมือ",
      "แชร์งานระหว่างทำเพื่อขอความเห็น",
      "หาเพื่อนร่วมโปรเจกต์จากคนในวงการ",
      "กิจกรรมและชาเลนจ์ประจำเดือน",
    ],
    img: "/learn/roadmap/community.webp",
    icon: MessagesSquare,
    wide: true,
  },
];

function StatusChip({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-medium text-foreground backdrop-blur",
        className,
      )}
    >
      <span className="relative flex h-1.5 w-1.5" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60 motion-reduce:hidden" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
      </span>
      กำลังพัฒนา
    </span>
  );
}

function RoadmapCard({ item, index, onOpen }: { item: RoadmapItem; index: number; onOpen: () => void }) {
  const reduced = useReducedMotion();
  const Icon = item.icon;
  return (
    <motion.li
      className={cn("min-w-0", item.wide && "lg:col-span-2")}
      initial={reduced ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, delay: (index % 3) * 0.08, ease: smoothEase }}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
        className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:translate-y-0"
      >
        <div className={cn("relative overflow-hidden bg-muted", item.wide ? "aspect-[4/3] lg:aspect-[16/7]" : "aspect-[4/3]")}>
          <img
            src={item.img}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05] motion-reduce:group-hover:scale-100"
          />
          <StatusChip className="absolute left-3 top-3" />
        </div>
        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand" aria-hidden>
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-xl font-light leading-tight tracking-[-0.01em] text-foreground">{item.en}</p>
              <p className="text-sm font-medium text-foreground">{item.th}</p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
          <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-medium text-foreground">
            ดูรายละเอียด
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
          </span>
        </div>
      </button>
    </motion.li>
  );
}

function RoadmapDialog({
  index,
  onIndexChange,
  onClose,
}: {
  index: number | null;
  onIndexChange: (next: number) => void;
  onClose: () => void;
}) {
  const reduced = useReducedMotion();
  const openFeedback = useOpenFeedbackTicket();
  const open = index != null;
  const item = index != null ? ROADMAP[index] : null;
  const step = useCallback(
    (delta: number) => {
      if (index == null) return;
      onIndexChange((index + delta + ROADMAP.length) % ROADMAP.length);
    },
    [index, onIndexChange],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step]);

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent className="max-h-[92dvh] gap-0 overflow-y-auto overflow-x-hidden rounded-2xl p-0 sm:max-w-2xl">
        {item ? (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={item.en}
              initial={reduced ? false : { opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduced ? undefined : { opacity: 0, x: -24 }}
              transition={{ duration: 0.32, ease: smoothEase }}
            >
              <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                <motion.img
                  src={item.img}
                  alt=""
                  className="h-full w-full object-cover"
                  initial={reduced ? false : { scale: 1.08 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.9, ease: smoothEase }}
                />
                <StatusChip className="absolute left-4 top-4" />
              </div>
              <div className="space-y-5 p-5 sm:p-7">
                <div>
                  <DialogTitle className="font-display text-3xl font-light tracking-[-0.02em] text-foreground">
                    {item.en}
                  </DialogTitle>
                  <p className="mt-1 text-base font-medium text-foreground">{item.th}</p>
                  <DialogDescription className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {item.long}
                  </DialogDescription>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">สิ่งที่คุณจะทำได้</p>
                  <ul className="mt-3 space-y-2.5">
                    {item.details.map((d, i) => (
                      <motion.li
                        key={d}
                        className="flex items-start gap-2.5 text-sm text-foreground"
                        initial={reduced ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.12 + i * 0.06, ease: smoothEase }}
                      >
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand" aria-hidden>
                          <Check className="h-3 w-3" />
                        </span>
                        {d}
                      </motion.li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      openFeedback({ kind: "idea", message: `ไอเดียสำหรับ ${item.en} (${item.th}): ` });
                    }}
                    className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    เสนอไอเดียเรื่องนี้
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {(index ?? 0) + 1} / {ROADMAP.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => step(-1)}
                      aria-label="ฟีเจอร์ก่อนหน้า"
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-border transition-colors hover:bg-muted"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => step(1)}
                      aria-label="ฟีเจอร์ถัดไป"
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-border transition-colors hover:bg-muted"
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/** Bottom of Get in Touch — what is coming after the Beta, as cards that open a detail view. */
export function LearnRoadmapStage() {
  const openFeedback = useOpenFeedbackTicket();
  const [active, setActive] = useState<number | null>(null);

  return (
    <div className="border-t border-border bg-card">
      <div className="mx-auto max-w-[80rem] px-4 py-14 sm:px-6 lg:px-10 lg:py-20">
        <EnterView className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand">✱ Coming Next</p>
            <h2 className="mt-3 font-display text-[clamp(2.2rem,5vw,4rem)] font-light leading-[1.05] tracking-[-0.02em] text-foreground">
              What we are building
            </h2>
            <p className="mt-3 text-lg font-medium text-foreground">ฟีเจอร์ที่กำลังจะเปิด</p>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              ช่วง Beta เราเปิดเฉพาะการลงผลงาน การค้นพบ และการเชื่อมต่อ ฟีเจอร์ด้านล่างสร้างไว้แล้ว และจะทยอยเปิดหลังทดสอบกับผู้ใช้
              ลำดับอาจเปลี่ยนตามฟีดแบ็กของคุณ กดการ์ดเพื่อดูรายละเอียด
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-5">
            <button
              type="button"
              onClick={() => openFeedback({ kind: "idea" })}
              className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              เสนอไอเดีย
            </button>
            <Link
              to="/changelog"
              className="inline-flex min-h-11 items-center text-sm font-medium text-foreground underline decoration-brand decoration-2 underline-offset-4 hover:decoration-foreground"
            >
              ดูอัปเดตล่าสุด
            </Link>
          </div>
        </EnterView>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {ROADMAP.map((item, i) => (
            <RoadmapCard key={item.en} item={item} index={i} onOpen={() => setActive(i)} />
          ))}
        </ul>
      </div>
      <RoadmapDialog index={active} onIndexChange={setActive} onClose={() => setActive(null)} />
    </div>
  );
}
