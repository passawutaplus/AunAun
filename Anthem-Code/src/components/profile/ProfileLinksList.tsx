import { ExternalLink } from "lucide-react";
import { safeHttpUrl } from "@/lib/safeUrl";
import { ContactSocialIcon, resolveContactSocialPlatform } from "@/lib/contactSocialPlatforms";
import type { SocialLinkItem } from "@/lib/validators";

type Props = {
  links: SocialLinkItem[];
};

export default function ProfileLinksList({ links }: Props) {
  const items = links
    .map((l) => {
      const href = safeHttpUrl(l.url);
      if (!href || !l.title.trim()) return null;
      return { id: l.id, title: l.title.trim(), href };
    })
    .filter((x): x is { id: string; title: string; href: string } => !!x);

  if (!items.length) {
    return null;
  }

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {items.map(({ id, title, href }) => {
        const platform = resolveContactSocialPlatform(title);
        return (
          <a
            key={id}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border border-border bg-background/60 hover:border-primary/40 hover:bg-primary/5 transition-colors px-4 py-3"
          >
            <div className="text-foreground flex h-9 w-9 items-center justify-center rounded-lg bg-secondary shrink-0">
              <ContactSocialIcon
                title={title}
                className={platform?.id === "lemon8" ? "w-6 h-6" : "w-4 h-4"}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{title}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {href.replace(/^https?:\/\//, "")}
              </p>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          </a>
        );
      })}
    </div>
  );
}
