import { ArrowUpRight, Mail, MapPin, MessageSquareHeart, Users } from "lucide-react";
import { type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  BRAND_FACEBOOK_GROUP_URL,
  BRAND_FACEBOOK_URL,
  BRAND_LINE_CONTACT_URL,
  BRAND_LINE_ID,
  BRAND_LINE_QR_URL,
  BRAND_SUPPORT_EMAIL,
} from "@/lib/brandConfig";
import { LEGAL_COMPANY_ADDRESS, LEGAL_COMPANY_NAME } from "@/lib/legalConfig";
import { useOpenFeedbackTicket } from "@/hooks/useOpenFeedbackTicket";
import { smoothEase } from "@/lib/motion";

const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(LEGAL_COMPANY_ADDRESS)}`;

/** Rise-in for each part of the section, staggered by `order`; content stays visible without script. */
function useRise(order: number) {
  const reduced = useReducedMotion();
  if (reduced) return {};
  return {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.4 },
    transition: { duration: 0.6, delay: order * 0.08, ease: smoothEase },
  };
}

function ChannelRow({
  icon,
  title,
  detail,
  href,
  onClick,
  cta,
  order,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  href?: string;
  onClick?: () => void;
  cta: string;
  order: number;
}) {
  const rise = useRise(order);
  const body = (
    <>
      <span className="mt-1 shrink-0" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-medium leading-snug">{title}</span>
        <span className="mt-1 block text-base leading-relaxed">{detail}</span>
      </span>
      <span className="inline-flex min-h-11 basis-full items-center gap-1.5 pl-9 text-base font-medium sm:basis-auto sm:self-center sm:pl-0">
        <span className="underline decoration-2 underline-offset-4">{cta}</span>
        <ArrowUpRight
          className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          aria-hidden
        />
      </span>
    </>
  );
  const rowClass =
    "group flex w-full flex-wrap items-start gap-x-4 gap-y-1 rounded-2xl sm:flex-nowrap px-4 py-4 text-left transition-colors duration-300 hover:bg-brand-foreground/[0.07] active:bg-brand-foreground/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-foreground sm:px-5 sm:py-5";

  return (
    <motion.li {...rise}>
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

function LineIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
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

/**
 * "Get in Touch" — one red field. LINE is the front door (the team answers there first), so it gets the
 * QR on desktop and a full-width button on phones, where scanning your own screen is impossible. The
 * other channels follow as a plain list.
 */
export function LearnContactStage() {
  const openFeedback = useOpenFeedbackTicket();
  const riseHead = useRise(0);
  const riseLede = useRise(1);
  const riseLine = useRise(2);

  return (
    <div className="bg-brand text-brand-foreground">
      <div className="mx-auto max-w-[80rem] px-4 py-20 sm:px-6 lg:px-10 lg:py-32">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-12 lg:items-end lg:gap-10">
          <motion.h2
            {...riseHead}
            className="font-display text-[clamp(3.5rem,13vw,12.5rem)] font-light leading-[0.9] tracking-[-0.04em] lg:col-span-8"
          >
            Let’s talk.
          </motion.h2>
          <motion.div {...riseLede} className="lg:col-span-4 lg:pb-3">
            <p className="text-2xl font-medium leading-snug sm:text-[1.75rem]">คุยกับทีม SAMECOR ได้ทุกเรื่อง</p>
            <p className="mt-3 max-w-md text-lg leading-relaxed">
              มีคำถาม อยากเสนอไอเดีย หรือเจอปัญหาระหว่างใช้งาน ทักมาได้เลย ทีมตอบใน LINE เร็วที่สุด
            </p>
          </motion.div>
        </div>

        <div className="mt-14 grid grid-cols-[minmax(0,1fr)] gap-14 lg:mt-24 lg:grid-cols-12 lg:gap-10">
          <motion.div {...riseLine} className="lg:col-span-5">
            <a
              href={BRAND_LINE_CONTACT_URL}
              target="_blank"
              rel="noreferrer"
              className="hidden w-fit rounded-3xl bg-white p-3 transition-transform duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-foreground lg:block"
              aria-label={`เปิด LINE Official ${BRAND_LINE_ID}`}
            >
              <img
                src={BRAND_LINE_QR_URL}
                alt={`QR code LINE ${BRAND_LINE_ID}`}
                width={208}
                height={208}
                loading="lazy"
                className="h-52 w-52"
              />
            </a>
            <p className="mt-6 hidden text-lg font-medium lg:block">สแกนเพื่อเพิ่มเพื่อน LINE Official</p>
            <a
              href={BRAND_LINE_CONTACT_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-foreground px-6 text-base font-medium text-white transition-transform duration-300 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-foreground sm:w-auto lg:mt-4"
            >
              <LineIcon />
              เพิ่มเพื่อน LINE {BRAND_LINE_ID}
            </a>
          </motion.div>

          <div className="lg:col-span-7">
            <h3 className="px-4 text-lg font-medium sm:px-5">ช่องทางอื่น</h3>
            <ul className="mt-3">
              <ChannelRow
                order={3}
                icon={<FacebookIcon />}
                title="Facebook Page"
                detail="ข่าวสาร อัปเดตฟีเจอร์ และผลงานคัดสรร"
                href={BRAND_FACEBOOK_URL}
                cta="ติดตาม"
              />
              <ChannelRow
                order={4}
                icon={<Users className="h-5 w-5" />}
                title="SAMECOR Community"
                detail="กลุ่ม Facebook สำหรับครีเอเตอร์ แลกเปลี่ยนและหาเพื่อนร่วมงาน"
                href={BRAND_FACEBOOK_GROUP_URL}
                cta="เข้ากลุ่ม"
              />
              <ChannelRow
                order={5}
                icon={<Mail className="h-5 w-5" />}
                title="อีเมล"
                detail={BRAND_SUPPORT_EMAIL}
                href={`mailto:${BRAND_SUPPORT_EMAIL}`}
                cta="ส่งอีเมล"
              />
              <ChannelRow
                order={6}
                icon={<MessageSquareHeart className="h-5 w-5" />}
                title="ฟีดแบ็กในแอป"
                detail="แนบภาพหน้าจอ บอกบั๊กหรือไอเดีย ทีมเห็นทันที"
                onClick={() => openFeedback()}
                cta="ส่งฟีดแบ็ก"
              />
            </ul>
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noreferrer"
              className="group mt-8 flex items-start gap-3 rounded-2xl px-4 py-3 text-base transition-colors hover:bg-brand-foreground/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-foreground sm:px-5"
            >
              <MapPin className="mt-1 h-5 w-5 shrink-0" aria-hidden />
              <span>
                {LEGAL_COMPANY_NAME} · {LEGAL_COMPANY_ADDRESS}
                <span className="ml-2 whitespace-nowrap underline decoration-2 underline-offset-4">เปิดแผนที่</span>
              </span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
