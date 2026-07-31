import { Mail, Globe, MessageSquare, Facebook, Instagram } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { safeHttpUrl } from "@/lib/safeUrl";

type Contact = {
  icon: LucideIcon;
  label: string;
  value: string;
  href?: string;
  /** When set, click copies this text instead of navigating. */
  copyText?: string;
};

interface Props {
  email?: string | null;
  website?: string | null;
  lineId?: string | null;
  facebook?: string | null;
  instagram?: string | null;
}

async function copyText(label: string, value: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`คัดลอก${label}แล้ว`);
  } catch {
    toast.error("คัดลอกไม่สำเร็จ");
  }
}

const ContactCards = ({ email, website, lineId, facebook, instagram }: Props) => {
  const items: Contact[] = [];
  if (email?.trim()) {
    items.push({
      icon: Mail,
      label: "อีเมล",
      value: email.trim(),
      copyText: email.trim(),
    });
  }
  const websiteHref = safeHttpUrl(website);
  if (websiteHref) {
    items.push({
      icon: Globe,
      label: "เว็บไซต์",
      value: websiteHref.replace(/^https?:\/\//, ""),
      href: websiteHref,
    });
  }
  if (lineId) items.push({ icon: MessageSquare, label: "LINE", value: lineId, copyText: lineId });
  const facebookHref = facebook
    ? safeHttpUrl(facebook) ??
      (/^[a-zA-Z0-9.\-_]+$/.test(facebook)
        ? `https://facebook.com/${encodeURIComponent(facebook)}`
        : undefined)
    : undefined;
  if (facebookHref) {
    items.push({
      icon: Facebook,
      label: "Facebook",
      value: facebookHref.replace(/^https?:\/\/(www\.)?facebook\.com\//, ""),
      href: facebookHref,
    });
  }
  if (instagram) {
    items.push({
      icon: Instagram,
      label: "Instagram",
      value: `@${instagram}`,
      href: `https://instagram.com/${encodeURIComponent(instagram)}`,
    });
  }

  if (!items.length) {
    return null;
  }

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {items.map(({ icon: Icon, label, value, href, copyText: copyValue }) => {
        const content = (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-background/60 hover:border-primary/40 hover:bg-primary/5 transition-colors px-4 py-3">
            <div className="text-primary flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5" strokeWidth={2.25} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
              <p className="text-sm font-medium text-foreground truncate">{value}</p>
            </div>
          </div>
        );
        if (copyValue) {
          return (
            <button
              key={label}
              type="button"
              onClick={() => void copyText(label, copyValue)}
              className="w-full text-left"
              title={`คัดลอก${label}`}
            >
              {content}
            </button>
          );
        }
        return href ? (
          <a key={label} href={href} target="_blank" rel="noopener noreferrer">
            {content}
          </a>
        ) : (
          <div key={label}>{content}</div>
        );
      })}
    </div>
  );
};

export default ContactCards;
