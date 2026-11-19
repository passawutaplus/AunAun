import type { JournalSource } from "@/data/journal/articles";

/** How many sources stay visible; the rest fold under a "more sources" toggle. */
const VISIBLE = 2;

function SourceItem({ source }: { source: JournalSource }) {
  return (
    <li className="text-sm leading-relaxed">
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
      >
        {source.title}
      </a>
      <span className="text-muted-foreground"> — {source.publisher}</span>
    </li>
  );
}

/**
 * Sources block at the end of every SAMECOR article.
 * Uses native <details> so every link stays in the HTML (crawlable) and works without JS.
 */
export default function JournalSources({ sources }: { sources: JournalSource[] }) {
  if (!sources?.length) return null;
  const shown = sources.slice(0, VISIBLE);
  const folded = sources.slice(VISIBLE);

  return (
    <section aria-labelledby="journal-sources" className="mt-12 border-t border-border pt-6">
      <h2 id="journal-sources" className="text-base tracking-tight">
        Sources
      </h2>
      <p className="thai-body text-xs text-muted-foreground">แหล่งอ้างอิง</p>
      <ol className="mt-3 list-decimal space-y-2 pl-5 marker:text-muted-foreground">
        {shown.map((s) => (
          <SourceItem key={s.url} source={s} />
        ))}
      </ol>
      {folded.length > 0 ? (
        <details className="group mt-2">
          <summary className="thai-body inline-flex cursor-pointer list-none items-center gap-1 rounded-sm py-1 text-sm text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">ดูแหล่งอ้างอิงเพิ่มเติม ({folded.length})</span>
            <span className="hidden group-open:inline">ซ่อนแหล่งอ้างอิง</span>
            <span aria-hidden className="transition-transform group-open:rotate-180">
              ↓
            </span>
          </summary>
          <ol start={VISIBLE + 1} className="mt-2 list-decimal space-y-2 pl-5 marker:text-muted-foreground">
            {folded.map((s) => (
              <SourceItem key={s.url} source={s} />
            ))}
          </ol>
        </details>
      ) : null}
    </section>
  );
}
