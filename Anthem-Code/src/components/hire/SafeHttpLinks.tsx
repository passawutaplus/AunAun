import { ExternalLink } from "lucide-react";
import { safeHttpUrl } from "@/lib/safeUrl";
import { cn } from "@/lib/utils";

type Props = {
  links: string[];
  className?: string;
  itemClassName?: string;
  mutedClassName?: string;
};

/** Renders http(s) links; non-http values stay plain text (no javascript: href). */
export function SafeHttpLinks({
  links,
  className,
  itemClassName = "text-sm text-primary hover:underline inline-flex items-center gap-1 break-all",
  mutedClassName = "text-sm text-muted-foreground break-all",
}: Props) {
  if (!links.length) return null;
  return (
    <ul className={cn("space-y-1", className)}>
      {links.map((link, i) => {
        const href = safeHttpUrl(link);
        if (!href) {
          return (
            <li key={`${link}-${i}`} className={mutedClassName}>
              {link}
            </li>
          );
        }
        return (
          <li key={`${link}-${i}`}>
            <a href={href} target="_blank" rel="noopener noreferrer" className={itemClassName}>
              {link}
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
