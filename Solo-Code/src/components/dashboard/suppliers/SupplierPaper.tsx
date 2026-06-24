import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { safeHref } from "@/lib/security";
import {
  Phone,
  Mail,
  Globe,
  MapPin,
  MessageSquare,
  ExternalLink,
  Star,
  ShieldCheck,
  Building2,
  Sparkles,
  Copy,
  Check,
} from "lucide-react";
import { categoryIcon } from "./categories";
import { toast } from "sonner";

export const SHAREABLE_FIELDS = [
  { key: "cover_image", label: "ภาพปก" },
  { key: "category", label: "หมวดหมู่" },
  { key: "rating", label: "เรตติ้ง (ดาว)" },
  { key: "contact_name", label: "ผู้ติดต่อ" },
  { key: "contact_position", label: "ตำแหน่งผู้ติดต่อ" },
  { key: "phone", label: "เบอร์โทร" },
  { key: "line_id", label: "LINE ID" },
  { key: "email", label: "อีเมล" },
  { key: "website", label: "เว็บไซต์" },
  { key: "map_url", label: "Google Maps" },
  { key: "address", label: "ที่อยู่" },
  { key: "rate_note", label: "เรท / บริการหลัก" },
  { key: "tags", label: "แท็ก" },
  { key: "links", label: "ลิงก์ / Catalog" },
] as const;

export type ShareableField = (typeof SHAREABLE_FIELDS)[number]["key"];

export interface PaperData {
  name: string;
  category?: string | null;
  contact_name?: string | null;
  contact_position?: string | null;
  phone?: string | null;
  email?: string | null;
  line_id?: string | null;
  website?: string | null;
  address?: string | null;
  rate_note?: string | null;
  rating: number;
  tags: string[];
  cover_image_url?: string | null;
  map_url?: string | null;
}

export interface PaperLink {
  id: string;
  label: string;
  url: string;
}

export function SupplierPaper({
  data,
  links,
  hidden = [],
  showFooter = true,
}: {
  data: PaperData;
  links: PaperLink[];
  hidden?: string[];
  showFooter?: boolean;
}) {
  const hide = React.useCallback((k: ShareableField) => hidden.includes(k), [hidden]);
  const CatIcon = categoryIcon(data.category ?? undefined);

  return (
    <article className="bg-card rounded-3xl shadow-elevated border border-border/60 overflow-hidden">
      {!hide("cover_image") && data.cover_image_url && (
        <div className="aspect-[16/8] bg-muted overflow-hidden">
          <img src={data.cover_image_url} alt={data.name} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="px-6 sm:px-10 py-8 sm:py-10 space-y-6">
        <header className="space-y-3">
          {!hide("category") && data.category && (
            <Badge variant="outline" className="text-[11px] rounded-full gap-1">
              <CatIcon className="h-3 w-3" /> {data.category}
            </Badge>
          )}
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{data.name}</h1>
          {!hide("rating") && data.rating > 0 && (
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={`h-4 w-4 ${n <= data.rating ? "fill-amber-400 stroke-amber-500" : "fill-transparent stroke-muted-foreground/30"}`}
                />
              ))}
              <span className="text-xs text-muted-foreground ml-1">{data.rating}.0</span>
            </div>
          )}
          {!hide("contact_name") && data.contact_name && (
            <p className="text-sm text-muted-foreground">
              ผู้ติดต่อ: <span className="text-foreground font-medium">{data.contact_name}</span>
              {!hide("contact_position") && data.contact_position && (
                <span className="text-muted-foreground"> · {data.contact_position}</span>
              )}
            </p>
          )}
        </header>

        {!hide("rate_note") && data.rate_note && (
          <div className="rounded-2xl bg-primary-soft/50 border border-primary/20 p-4">
            <p className="text-[11px] uppercase tracking-wider text-primary font-semibold mb-1 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> เรท / บริการหลัก
            </p>
            <p className="text-sm whitespace-pre-wrap">{data.rate_note}</p>
          </div>
        )}

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {!hide("phone") && data.phone && (
            <ContactRow
              icon={<Phone className="h-4 w-4" />}
              label="โทรศัพท์"
              value={data.phone}
              href={`tel:${data.phone}`}
              copyText={data.phone}
            />
          )}
          {!hide("line_id") && data.line_id && (
            <ContactRow
              icon={<MessageSquare className="h-4 w-4" />}
              label="LINE"
              value={data.line_id}
              copyText={data.line_id}
            />
          )}
          {!hide("email") && data.email && (
            <ContactRow
              icon={<Mail className="h-4 w-4" />}
              label="อีเมล"
              value={data.email}
              href={`mailto:${data.email}`}
              copyText={data.email}
            />
          )}
          {!hide("website") && data.website && safeHref(data.website) && (
            <ContactRow
              icon={<Globe className="h-4 w-4" />}
              label="เว็บไซต์"
              value={data.website.replace(/^https?:\/\//, "")}
              href={safeHref(data.website)!}
              external
              copyText={data.website}
            />
          )}
          {!hide("map_url") && data.map_url && safeHref(data.map_url) && (
            <ContactRow
              icon={<MapPin className="h-4 w-4" />}
              label="Google Maps"
              value="เปิดดูเส้นทาง"
              href={safeHref(data.map_url)!}
              external
              copyText={data.map_url}
            />
          )}
        </section>

        {!hide("address") && data.address && (
          <section className="rounded-2xl border border-border/60 p-4 group relative">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 flex items-center gap-1.5">
              <MapPin className="h-3 w-3" /> ที่อยู่
            </p>
            <p className="text-sm whitespace-pre-wrap leading-relaxed pr-10">{data.address}</p>
            <CopyButton text={data.address} className="absolute top-3 right-3" />
          </section>
        )}

        {!hide("tags") && data.tags.length > 0 && (
          <section className="flex flex-wrap gap-1.5">
            {data.tags.map((t) => (
              <span
                key={t}
                className="text-[11px] rounded-full bg-muted px-2.5 py-1 text-foreground/70"
              >
                #{t}
              </span>
            ))}
          </section>
        )}

        {!hide("links") && links.length > 0 && (
          <section className="space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              ลิงก์ / Catalog
            </p>
            <div className="grid gap-2">
              {links.map((l) => {
                const safe = safeHref(l.url);
                if (!safe) return null;
                return (
                  <div
                    key={l.id}
                    className="flex items-center gap-2 rounded-xl border border-border/60 px-4 py-3 hover:border-primary/40 hover:bg-primary-soft/20 transition-all"
                  >
                    <a
                      href={safe}
                      target="_blank"
                      rel="noopener"
                      className="flex-1 flex items-center gap-2 min-w-0 group"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-sm font-medium truncate group-hover:text-primary">
                        {l.label || l.url}
                      </span>
                    </a>
                    <CopyButton text={l.url} />
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {showFooter && (
        <footer className="border-t border-border/60 px-6 sm:px-10 py-4 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> Shared via So1o
          </span>
          <a
            href="https://solofreelancer.com"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1 hover:text-primary"
          >
            <Building2 className="h-3 w-3" /> solofreelancer.com
          </a>
        </footer>
      )}
    </article>
  );
}

function CopyButton({ text, className = "" }: { text: string; className?: string }) {
  const [copied, setCopied] = React.useState(false);
  const copy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("คัดลอกแล้ว");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("คัดลอกไม่สำเร็จ");
    }
  };
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      onClick={copy}
      className={`h-7 w-7 shrink-0 text-muted-foreground hover:text-primary ${className}`}
      title="คัดลอก"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}

function ContactRow({
  icon,
  label,
  value,
  href,
  external,
  copyText,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
  external?: boolean;
  copyText?: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-border/60 px-3 py-3 hover:border-primary/40 hover:bg-muted/30 transition-all">
      {href ? (
        <a
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener" : undefined}
          className="flex items-center gap-3 flex-1 min-w-0"
        >
          <span className="text-primary shrink-0">{icon}</span>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="text-sm font-medium truncate">{value}</p>
          </div>
        </a>
      ) : (
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-primary shrink-0">{icon}</span>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="text-sm font-medium truncate">{value}</p>
          </div>
        </div>
      )}
      {copyText && <CopyButton text={copyText} />}
    </div>
  );
}
