import { Mail, Phone, Globe, MessageSquare, Facebook, Instagram } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { safeHttpUrl } from "@/lib/safeUrl";


type Contact = { icon: LucideIcon; label: string; value: string; href?: string };

interface Props {
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  lineId?: string | null;
  facebook?: string | null;
  instagram?: string | null;
}

const ContactCards = ({ email, phone, website, lineId, facebook, instagram }: Props) => {
  const items: Contact[] = [];
  if (email) items.push({ icon: Mail, label: "อีเมล", value: email, href: `mailto:${email}` });
  if (phone) items.push({ icon: Phone, label: "โทรศัพท์", value: phone, href: `tel:${phone}` });
  const websiteHref = safeHttpUrl(website);
  if (websiteHref) items.push({ icon: Globe, label: "เว็บไซต์", value: websiteHref.replace(/^https?:\/\//, ""), href: websiteHref });
  if (lineId) items.push({ icon: MessageSquare, label: "LINE", value: lineId });
  const facebookHref = facebook
    ? safeHttpUrl(facebook) ?? (/^[a-zA-Z0-9.\-_]+$/.test(facebook) ? `https://facebook.com/${encodeURIComponent(facebook)}` : undefined)
    : undefined;
  if (facebookHref) items.push({ icon: Facebook, label: "Facebook", value: facebookHref.replace(/^https?:\/\/(www\.)?facebook\.com\//, ""), href: facebookHref });
  if (instagram) items.push({ icon: Instagram, label: "Instagram", value: `@${instagram}`, href: `https://instagram.com/${encodeURIComponent(instagram)}` });


  if (!items.length) {
    return <p className="text-sm text-muted-foreground text-center py-6">ยังไม่ระบุช่องทางติดต่อ</p>;
  }

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {items.map(({ icon: Icon, label, value, href }) => {
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
        return href ? (
          <a key={label} href={href} target="_blank" rel="noopener noreferrer">{content}</a>

        ) : (
          <div key={label}>{content}</div>
        );
      })}
    </div>
  );
};

export default ContactCards;
