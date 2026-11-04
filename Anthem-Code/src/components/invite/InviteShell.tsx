import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import type { InviteLang } from "@/lib/creatorInvite";
import type { InviteCopy } from "@/lib/creatorInviteCopy";

export function LangToggle({ lang, onChange }: { lang: InviteLang; onChange: (l: InviteLang) => void }) {
  return (
    <div className="inline-flex rounded-full border border-border p-0.5 text-xs" role="group" aria-label="Language / ภาษา">
      {(["th", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={lang === l}
          onClick={() => onChange(l)}
          className={
            lang === l
              ? "rounded-full bg-foreground px-3 py-1 font-semibold text-background"
              : "rounded-full px-3 py-1 font-medium text-muted-foreground hover:text-foreground"
          }
        >
          {l === "th" ? "ไทย" : "EN"}
        </button>
      ))}
    </div>
  );
}

/** Page frame for the private invitation pages (no index, no app chrome beyond the global nav). */
export function InviteShell({ langToggle, children }: { langToggle: ReactNode; children: ReactNode }) {
  return (
    <main id="main-content" className="min-h-[calc(100vh-4rem)] bg-background pb-28">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 pt-4">
        <span className="font-display text-sm font-semibold tracking-tight text-foreground">
          SAMECOR<span className="text-brand">.</span>
        </span>
        {langToggle}
      </div>
      {children}
    </main>
  );
}

export function InviteStateCard({
  title,
  body,
  explore,
  children,
}: {
  title: string;
  body: string;
  /** Pass the copy to show the Explore links under the message. */
  explore?: InviteCopy;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center sm:py-24">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
      {body ? <p className="mt-3 text-sm text-muted-foreground">{body}</p> : null}
      {children ? <div className="mt-6 flex justify-center gap-3">{children}</div> : null}
      {explore ? (
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {explore.exploreCards.map(([label, , href]) => (
            <a key={href} href={href} className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-sm hover:border-foreground/40">
              {label} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
