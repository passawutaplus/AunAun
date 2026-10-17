import { ArrowUpRight, Mail, MapPin, MessageSquareHeart, Users } from "lucide-react";
import type { ReactNode } from "react";
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

function ChannelRow({
  icon,
  title,
  detail,
  href,
  onClick,
  cta,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  href?: string;
  onClick?: () => void;
  cta: string;
}) {
  const action = "inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-medium text-foreground underline decoration-brand decoration-2 underline-offset-4 hover:decoration-foreground";
  return (
    <li className="flex items-center gap-4 border-t border-border py-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-base font-medium text-foreground">{title}</p>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">{detail}</p>
      </div>
      {href ? (
        <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className={action}>
          {cta}
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </a>
      ) : (
        <button type="button" onClick={onClick} className={action}>
          {cta}
        </button>
      )}
    </li>
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

/** "Get in Touch" — every channel the team answers, plus the in-app feedback button. */
export function LearnContactStage() {
  const openFeedback = useOpenFeedbackTicket();

  return (
    <div className="mx-auto grid max-w-[80rem] grid-cols-[minmax(0,1fr)] gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:gap-16 lg:px-10 lg:py-20">
      <div>
        <h2 className="font-display text-[clamp(2.4rem,5.5vw,4.5rem)] font-light leading-[1.05] tracking-[-0.02em] text-foreground">
          Get in Touch
        </h2>
        <p className="mt-4 text-lg font-medium text-foreground">คุยกับทีม SAMECOR</p>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          มีคำถาม อยากเสนอไอเดีย หรือเจอปัญหาระหว่างใช้งาน ทักมาได้ทุกช่องทาง ทีมตอบใน LINE เร็วที่สุด
        </p>

        <div className="mt-8 flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
          <img
            src={BRAND_LINE_QR_URL}
            alt={`QR code LINE ${BRAND_LINE_ID}`}
            width={96}
            height={96}
            loading="lazy"
            className="h-24 w-24 shrink-0 rounded-lg"
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">สแกนเพื่อเพิ่มเพื่อน</p>
            <p className="mt-0.5 text-sm text-muted-foreground">LINE Official {BRAND_LINE_ID}</p>
          </div>
        </div>
      </div>

      <div>
        <ul className="border-b border-border">
          <ChannelRow
            icon={<LineIcon />}
            title="LINE Official Account"
            detail={`${BRAND_LINE_ID} · ถามได้ทุกเรื่อง ตอบเร็วที่สุด`}
            href={BRAND_LINE_CONTACT_URL}
            cta="เพิ่มเพื่อน"
          />
          <ChannelRow
            icon={<FacebookIcon />}
            title="Facebook Page"
            detail="ข่าวสาร อัปเดตฟีเจอร์ และผลงานคัดสรร"
            href={BRAND_FACEBOOK_URL}
            cta="ติดตาม"
          />
          <ChannelRow
            icon={<Users className="h-5 w-5" />}
            title="SAMECOR Community"
            detail="กลุ่ม Facebook สำหรับครีเอเตอร์ แลกเปลี่ยนและหาเพื่อนร่วมงาน"
            href={BRAND_FACEBOOK_GROUP_URL}
            cta="เข้ากลุ่ม"
          />
          <ChannelRow
            icon={<Mail className="h-5 w-5" />}
            title="อีเมล"
            detail={BRAND_SUPPORT_EMAIL}
            href={`mailto:${BRAND_SUPPORT_EMAIL}`}
            cta="ส่งอีเมล"
          />
          <ChannelRow
            icon={<MessageSquareHeart className="h-5 w-5" />}
            title="ฟีดแบ็กในแอป"
            detail="แนบภาพหน้าจอ บอกบั๊กหรือไอเดีย ทีมเห็นทันที"
            onClick={() => openFeedback()}
            cta="ส่งฟีดแบ็ก"
          />
        </ul>
        <p className="mt-6 flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            {LEGAL_COMPANY_NAME} · {LEGAL_COMPANY_ADDRESS}
          </span>
        </p>
      </div>
    </div>
  );
}
