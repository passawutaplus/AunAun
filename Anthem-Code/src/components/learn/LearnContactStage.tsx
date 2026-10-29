import { ArrowUpRight, Mail, MapPin, MessageSquareHeart, Users } from "lucide-react";
import { Fragment, useRef, type ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import {
  BRAND_FACEBOOK_GROUP_URL,
  BRAND_FACEBOOK_URL,
  BRAND_LINE_CONTACT_URL,
  BRAND_LINE_ID,
  BRAND_SUPPORT_EMAIL,
} from "@/lib/brandConfig";
import { LEGAL_COMPANY_ADDRESS, LEGAL_COMPANY_NAME } from "@/lib/legalConfig";
import { useOpenFeedbackTicket } from "@/hooks/useOpenFeedbackTicket";
import { smoothEase } from "@/lib/motion";

const HEADLINE = ["Let’s", "make", "something", "together."];
const MARQUEE = ["LINE", "Facebook", "Community", "Email", "Feedback", "Ideas", "Collabs"];

function ChannelRow({
  icon,
  title,
  detail,
  href,
  onClick,
  cta,
  index,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  href?: string;
  onClick?: () => void;
  cta: string;
  index: number;
}) {
  const reduced = useReducedMotion();
  const body = (
    <>
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand transition-colors duration-300 group-hover:bg-brand group-hover:text-white"
        aria-hidden
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-medium text-foreground">{title}</span>
        <span className="mt-0.5 block truncate text-sm text-muted-foreground">{detail}</span>
      </span>
      <span className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-medium text-foreground">
        <span className="hidden underline decoration-brand decoration-2 underline-offset-4 sm:inline">{cta}</span>
        <ArrowUpRight
          className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          aria-hidden
        />
      </span>
    </>
  );
  const rowClass =
    "group flex w-full items-center gap-4 rounded-2xl px-3 py-4 text-left transition-colors duration-300 hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-4";

  return (
    <motion.li
      className="border-t border-border first:border-t-0"
      initial={reduced ? false : { opacity: 0, x: 24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.55, delay: index * 0.07, ease: smoothEase }}
    >
      {href ? (
        <a
          href={href}
          target={href.startsWith("http") ? "_blank" : undefined}
          rel="noreferrer"
          aria-label={`${cta} — ${title}`}
          className={rowClass}
        >
          {body}
        </a>
      ) : (
        <button type="button" onClick={onClick} aria-label={`${cta} — ${title}`} className={rowClass}>
          {body}
        </button>
      )}
    </motion.li>
  );
}

function LineIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M12 4C6.9 4 3 7.2 3 11.1c0 3.5 3.1 6.4 7.3 7l-.4 2.4 3.3-2.3C17.4 17.4 21 14.6 21 11.1 21 7.2 17.1 4 12 4Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M13.5 21v-7.5H16l.4-3h-2.9V8.7c0-.9.3-1.5 1.5-1.5h1.5V4.5c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.3H8v3h2.6V21h2.9Z" />
    </svg>
  );
}

/** Slow outline-type strip of every channel (pauses for reduced motion). */
function ChannelMarquee() {
  const words = [...MARQUEE, ...MARQUEE];
  return (
    <div className="relative overflow-hidden border-b border-border py-5" aria-hidden>
      <div
        className="flex w-max animate-[work-wall-left_48s_linear_infinite] gap-10 whitespace-nowrap pr-10 motion-reduce:animate-none"
      >
        {words.map((w, i) => (
          <span
            key={`${w}-${i}`}
            className="flex items-center gap-10 font-display text-[clamp(2rem,6vw,4.5rem)] font-light leading-none tracking-[-0.03em] text-transparent [-webkit-text-stroke:1px_hsl(var(--foreground)/0.35)]"
          >
            {w}
            <span className="text-brand [-webkit-text-stroke:0]">✱</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** "Get in Touch" — every channel the team answers, plus the in-app feedback button. */
export function LearnContactStage() {
  const openFeedback = useOpenFeedbackTicket();
  const reduced = useReducedMotion();
  const headRef = useRef<HTMLHeadingElement>(null);
  const headIn = useInView(headRef, { once: true, amount: 0.4 });

  return (
    <div>
      <ChannelMarquee />
      <div className="mx-auto grid max-w-[80rem] grid-cols-[minmax(0,1fr)] gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] lg:gap-16 lg:px-10 lg:py-20">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand">✱ Get in Touch</p>
          <h2
            ref={headRef}
            className="mt-3 font-display text-[clamp(2.4rem,5.5vw,4.5rem)] font-light leading-[1.02] tracking-[-0.03em] text-foreground"
          >
            {HEADLINE.map((word, i) => (
              <Fragment key={word}>
                {i > 0 ? " " : null}
                <span className="inline-block overflow-hidden pb-[0.08em] align-bottom">
                  <motion.span
                    className="inline-block"
                    initial={reduced ? false : { y: "105%" }}
                    animate={headIn || reduced ? { y: "0%" } : { y: "105%" }}
                    transition={{ duration: 0.8, delay: i * 0.09, ease: smoothEase }}
                  >
                    {word}
                  </motion.span>
                </span>
              </Fragment>
            ))}
          </h2>
          <p className="mt-5 text-lg font-medium text-foreground">คุยกับทีม SAMECOR</p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            มีคำถาม อยากเสนอไอเดีย หรือเจอปัญหาระหว่างใช้งาน ทักมาได้ทุกช่องทาง
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            ทีมตอบใน LINE เร็วที่สุด
          </p>

          <motion.a
            href={BRAND_LINE_CONTACT_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-8 flex max-w-sm items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
            initial={reduced ? false : { opacity: 0, y: 24, rotate: -2 }}
            whileInView={{ opacity: 1, y: 0, rotate: 0 }}
            whileHover={reduced ? undefined : { rotate: -1.5, y: -4 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.6, ease: smoothEase }}
          >
            <QRCodeSVG
              value={BRAND_LINE_CONTACT_URL}
              size={96}
              level="M"
              marginSize={1}
              title={`QR code LINE ${BRAND_LINE_ID}`}
              className="h-24 w-24 shrink-0 rounded-lg bg-white p-1"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">สแกนเพื่อเพิ่มเพื่อน</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">LINE Official {BRAND_LINE_ID}</span>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand">
                หรือกดเพื่อเปิด LINE <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </span>
            </span>
          </motion.a>
        </div>

        <div>
          <ul className="rounded-3xl border border-border bg-card p-2 sm:p-3">
            <ChannelRow
              index={0}
              icon={<LineIcon />}
              title="LINE Official Account"
              detail={`${BRAND_LINE_ID} · ถามได้ทุกเรื่อง ตอบเร็วที่สุด`}
              href={BRAND_LINE_CONTACT_URL}
              cta="เพิ่มเพื่อน"
            />
            <ChannelRow
              index={1}
              icon={<FacebookIcon />}
              title="Facebook Page"
              detail="ข่าวสาร อัปเดตฟีเจอร์ และผลงานคัดสรร"
              href={BRAND_FACEBOOK_URL}
              cta="ติดตาม"
            />
            <ChannelRow
              index={2}
              icon={<Users className="h-5 w-5" />}
              title="SAMECOR Community"
              detail="กลุ่ม Facebook สำหรับครีเอเตอร์ แลกเปลี่ยนและหาเพื่อนร่วมงาน"
              href={BRAND_FACEBOOK_GROUP_URL}
              cta="เข้ากลุ่ม"
            />
            <ChannelRow
              index={3}
              icon={<Mail className="h-5 w-5" />}
              title="อีเมล"
              detail={BRAND_SUPPORT_EMAIL}
              href={`mailto:${BRAND_SUPPORT_EMAIL}`}
              cta="ส่งอีเมล"
            />
            <ChannelRow
              index={4}
              icon={<MessageSquareHeart className="h-5 w-5" />}
              title="ฟีดแบ็กในแอป"
              detail="แนบภาพหน้าจอ บอกบั๊กหรือไอเดีย ทีมเห็นทันที"
              onClick={() => openFeedback()}
              cta="ส่งฟีดแบ็ก"
            />
          </ul>
          <p className="mt-6 flex items-start gap-2 px-1 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              {LEGAL_COMPANY_NAME} · {LEGAL_COMPANY_ADDRESS}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
