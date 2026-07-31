import { Briefcase, Building2, Link2, Mail, MapPin, Monitor, Pencil, TextQuote } from "lucide-react";
import { toast } from "sonner";
import ProfileSkillChips from "@/components/profile/ProfileSkillChips";
import { ContactSocialIcon, resolveContactSocialPlatform } from "@/lib/contactSocialPlatforms";
import { formatExperiencePeriod, type ExperienceItem } from "@/lib/validators";
import { safeHttpUrl } from "@/lib/safeUrl";
import type { SocialLinkItem } from "@/lib/validators";
import { cn } from "@/lib/utils";

type Props = {
  bio?: string | null;
  role?: string | null;
  location?: string | null;
  email?: string | null;
  skills?: string[];
  experience?: ExperienceItem[];
  socialLinks?: SocialLinkItem[];
  onEdit?: () => void;
  className?: string;
};

function Row({
  icon: Icon,
  children,
  empty,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="text-sm text-foreground inline-flex items-start gap-2.5 leading-snug w-full min-w-0">
      <Icon className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" aria-hidden />
      <div
        className={cn(
          "min-w-0 flex-1",
          empty && "text-xs font-light text-muted-foreground/70",
        )}
      >
        {children}
      </div>
    </div>
  );
}

async function copyEmail(email: string) {
  try {
    await navigator.clipboard.writeText(email);
    toast.success("คัดลอกอีเมลแล้ว");
  } catch {
    toast.error("คัดลอกไม่สำเร็จ");
  }
}

function ContactIcons({
  email,
  links,
}: {
  email?: string | null;
  links: SocialLinkItem[];
}) {
  const trimmedEmail = email?.trim() || "";
  const items = links
    .map((l) => {
      const href = safeHttpUrl(l.url);
      if (!href || !l.title.trim()) return null;
      return { id: l.id, title: l.title.trim(), href };
    })
    .filter((x): x is { id: string; title: string; href: string } => !!x);

  if (!trimmedEmail && !items.length) return null;

  return (
    <div className="flex flex-col items-start gap-2">
      {trimmedEmail ? (
        <button
          type="button"
          title={`คัดลอก ${trimmedEmail}`}
          aria-label={`คัดลอกอีเมล ${trimmedEmail}`}
          onClick={() => void copyEmail(trimmedEmail)}
          className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-secondary/80 px-2 py-1 ring-1 ring-border/50 text-foreground hover:ring-primary/40 hover:bg-primary/5 transition-colors"
        >
          <Mail className="w-3.5 h-3.5 shrink-0" />
          <span className="min-w-0 truncate text-xs font-medium">{trimmedEmail}</span>
        </button>
      ) : null}
      {items.length ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {items.map(({ id, title, href }) => {
            const platform = resolveContactSocialPlatform(title);
            return (
              <a
                key={id}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                title={title}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-secondary/80 ring-1 ring-border/50 text-foreground hover:ring-primary/40 hover:bg-primary/5 transition-colors"
              >
                <ContactSocialIcon
                  title={title}
                  className={platform?.id === "lemon8" ? "w-5 h-5" : "w-3.5 h-3.5"}
                />
              </a>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function ExperienceCompact({ items }: { items: ExperienceItem[] }) {
  return (
    <ul className="space-y-3">
      {items.slice(0, 3).map((it, i) => {
        const period = formatExperiencePeriod(it) || it.period?.trim() || "";
        const company = it.company?.trim() || "";
        const meta = [company, period].filter(Boolean).join(" · ");
        return (
          <li key={`${it.title}-${i}`} className="leading-snug">
            <p className="font-medium text-foreground">{it.title}</p>
            {meta ? <p className="text-xs text-muted-foreground mt-0.5">{meta}</p> : null}
          </li>
        );
      })}
      {items.length > 3 ? (
        <li className="text-xs text-muted-foreground">+{items.length - 3} อื่นๆ</li>
      ) : null}
    </ul>
  );
}

/** Compact About me — order: bio → role → skills → experience → address → contact. */
export default function ProfileAboutMeCard({
  bio,
  role,
  location,
  email,
  skills = [],
  experience = [],
  socialLinks = [],
  onEdit,
  className,
}: Props) {
  const trimmedBio = bio?.trim() || "";
  const trimmedRole = role?.trim() || "";
  const trimmedLocation = location?.trim() || "";
  const trimmedEmail = email?.trim() || "";
  const skillItems = skills.map((s) => s.trim()).filter(Boolean);
  const hasSocial = socialLinks.some((l) => !!safeHttpUrl(l.url) && !!l.title.trim());
  const hasContact = !!trimmedEmail || hasSocial;

  return (
    <div
      className={cn(
        "py-5 space-y-5 border-b border-border/70 dark:border-border/50",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <h2 className="text-sm font-semibold text-foreground">About me</h2>
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-primary hover:bg-primary/10 dark:hover:bg-primary/15 transition-colors"
            title="แก้ไข About me"
            aria-label="แก้ไข About me"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      <Row icon={TextQuote} empty={!trimmedBio}>
        {trimmedBio ? (
          <span className="leading-relaxed line-clamp-4 whitespace-pre-wrap">{trimmedBio}</span>
        ) : (
          "ยังไม่ได้แนะนำตัว"
        )}
      </Row>

      <Row icon={Briefcase} empty={!trimmedRole}>
        {trimmedRole || "ยังไม่ได้ระบุตำแหน่งงาน"}
      </Row>

      <Row icon={Monitor} empty={!skillItems.length}>
        {skillItems.length ? (
          <ProfileSkillChips skills={skillItems} />
        ) : (
          "ยังไม่ได้เพิ่มความชำนาญ"
        )}
      </Row>

      <Row icon={Building2} empty={!experience.length}>
        {experience.length ? (
          <ExperienceCompact items={experience} />
        ) : (
          "ยังไม่ได้เพิ่มประสบการณ์ทำงาน"
        )}
      </Row>

      <Row icon={MapPin} empty={!trimmedLocation}>
        {trimmedLocation ? (
          <span className="leading-relaxed line-clamp-4 whitespace-pre-wrap">{trimmedLocation}</span>
        ) : (
          "ยังไม่ได้ระบุที่อยู่"
        )}
      </Row>

      <Row icon={Link2} empty={!hasContact}>
        {hasContact ? (
          <ContactIcons email={trimmedEmail} links={socialLinks} />
        ) : (
          "ยังไม่ได้เพิ่มลิงก์โซเชียล"
        )}
      </Row>
    </div>
  );
}
