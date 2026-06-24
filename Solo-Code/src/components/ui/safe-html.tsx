import * as React from "react";
import DOMPurify from "isomorphic-dompurify";
import { cn } from "@/lib/utils";

type Props = {
  html: string;
  className?: string;
  /** "rich" allows common formatting tags (default for blog/AI markdown). "minimal" strips to plain inline only. */
  profile?: "rich" | "minimal";
  as?: "div" | "span" | "article" | "section";
};

const RICH_CONFIG = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: ["style", "script", "iframe", "object", "embed", "form", "input"],
  FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "style"],
} as const;

const MINIMAL_CONFIG = {
  ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "br", "p", "ul", "ol", "li", "code"],
  ALLOWED_ATTR: ["href", "target", "rel"],
} as const;

/**
 * Render user/AI-generated HTML safely (XSS-hardened).
 * - Strips <script>, inline event handlers, javascript: URLs, etc.
 * - Use everywhere instead of raw `dangerouslySetInnerHTML`.
 */
export function SafeHtml({ html, className, profile = "rich", as: Tag = "div" }: Props) {
  const clean = React.useMemo(() => {
    const cfg = profile === "rich" ? RICH_CONFIG : MINIMAL_CONFIG;
    // isomorphic-dompurify returns TrustedHTML in some envs; coerce safely.
    return String(DOMPurify.sanitize(html ?? "", cfg as never));
  }, [html, profile]);
  return <Tag className={cn(className)} dangerouslySetInnerHTML={{ __html: clean }} />;
}
