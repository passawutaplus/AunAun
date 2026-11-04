import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Info, Lightbulb, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PROJECT_CATEGORIES } from "@/data/projectTypes";
import { useEventInsights, useRelatedWorks, useSetEventInsights } from "@/hooks/useExhibitionEvents";
import type { EventInsights } from "@/lib/exhibitionEvents";
import { cn } from "@/lib/utils";

const COLUMNS: { key: "who_for" | "takeaways" | "know_before"; title: string; icon: LucideIcon }[] = [
  { key: "who_for", title: "เหมาะกับใคร", icon: Users },
  { key: "takeaways", title: "จะได้อะไรกลับไป", icon: Lightbulb },
  { key: "know_before", title: "ก่อนไปควรรู้", icon: Info },
];

/** "สรุปโดย SAMECOR": up to three short lists side by side, a thin rule above, no boxes. */
export function EventInsightsPanel({ insights, className }: { insights: EventInsights; className?: string }) {
  const cols = COLUMNS.filter((c) => insights[c.key].length > 0);
  if (!cols.length) return null;
  return (
    <section aria-labelledby="insights-heading" className={cn("border-t border-border pt-6", className)}>
      <p id="insights-heading" className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        สรุปโดย SAMECOR
      </p>
      <div
        className={cn(
          "mt-5 grid grid-cols-1 gap-x-10 gap-y-8",
          cols.length === 2 && "md:grid-cols-2",
          cols.length >= 3 && "md:grid-cols-3",
        )}
      >
        {cols.map(({ key, title, icon: Icon }) => (
          <div key={key}>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Icon className="h-4 w-4 text-brand" aria-hidden />
              {title}
            </h3>
            <ul className="mt-3 space-y-2.5">
              {insights[key].map((item) => (
                <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-foreground/85">
                  <span className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-foreground/40" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Works by SAMECOR creators in the categories this event speaks to. Hidden when there are none. */
export function EventRelatedWorks({ categories, className }: { categories: string[]; className?: string }) {
  const { data: works = [] } = useRelatedWorks(categories, 6);
  if (!works.length) return null;
  return (
    <section aria-labelledby="related-works-heading" className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="related-works-heading" className="font-display text-2xl font-semibold text-foreground">
          ผลงานแนวนี้บน SAMECOR
        </h2>
        <span className="hidden text-sm text-muted-foreground sm:inline">{categories.join(" · ")}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {works.map((w) => (
          <Link key={w.id} to={`/showcase/${w.id}`} className="group block min-w-0 focus-visible:outline-none">
            <div className="aspect-[4/3] overflow-hidden rounded-md bg-muted group-focus-visible:ring-2 group-focus-visible:ring-foreground">
              {w.cover_url ? (
                <img
                  src={w.cover_url}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  loading="lazy"
                  decoding="async"
                />
              ) : null}
            </div>
            <p className="mt-2 line-clamp-1 text-sm font-medium text-foreground">{w.title}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

const linesOf = (text: string, max: number) =>
  text
    .split("\n")
    .map((l) => l.replace(/^[\s•\-*]+/, "").trim())
    .filter(Boolean)
    .slice(0, max);

/** Admin editor for "สรุปโดย SAMECOR": one item per line; saved on its own, not with the event form. */
export function EventInsightsEditor({ eventId }: { eventId: string }) {
  const { data: saved, isLoading } = useEventInsights(eventId);
  const setInsights = useSetEventInsights();
  const [text, setText] = useState<Record<(typeof COLUMNS)[number]["key"], string> | null>(null);
  const [cats, setCats] = useState<string[]>([]);

  useEffect(() => {
    if (isLoading) return;
    setText({
      who_for: (saved?.who_for ?? []).join("\n"),
      takeaways: (saved?.takeaways ?? []).join("\n"),
      know_before: (saved?.know_before ?? []).join("\n"),
    });
    setCats(saved?.related_categories ?? []);
  }, [saved, isLoading]);

  if (!text) return null;
  const toggleCat = (c: string) =>
    setCats((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : cur.length >= 4 ? cur : [...cur, c]));
  const onSave = () =>
    setInsights.mutate({
      id: eventId,
      insights: {
        who_for: linesOf(text.who_for, 5),
        takeaways: linesOf(text.takeaways, 4),
        know_before: linesOf(text.know_before, 5),
        related_categories: cats,
      },
    });

  return (
    <section className="mt-6 space-y-5 rounded-xl border border-border p-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-foreground">สรุปโดย SAMECOR</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          บรรทัดละ 1 ข้อ เขียนจากข้อมูลของผู้จัดเท่านั้น · ช่องไหนว่าง หน้าเว็บจะไม่แสดงหัวข้อนั้น
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {COLUMNS.map(({ key, title }) => (
          <div key={key}>
            <label htmlFor={`ins-${key}`} className="text-sm font-medium text-foreground">
              {title}
            </label>
            <Textarea
              id={`ins-${key}`}
              rows={6}
              className="mt-1.5"
              value={text[key]}
              onChange={(e) => setText({ ...text, [key]: e.target.value })}
              placeholder={key === "who_for" ? "นักวาดภาพประกอบที่สนใจงานสีน้ำ" : key === "takeaways" ? "เห็นเทคนิคภาพพิมพ์ 5 แบบในที่เดียว" : "ปิดวันจันทร์ · ใกล้ MRT สามยอด"}
            />
          </div>
        ))}
      </div>
      <fieldset>
        <legend className="text-sm font-medium text-foreground">หมวดผลงานที่เกี่ยวข้อง (สูงสุด 4)</legend>
        <p className="text-xs text-muted-foreground">ใช้แสดง “ผลงานแนวนี้บน SAMECOR” ท้ายหน้างาน</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {PROJECT_CATEGORIES.map((c) => {
            const on = cats.includes(c);
            return (
              <button
                key={c}
                type="button"
                aria-pressed={on}
                onClick={() => toggleCat(c)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground",
                  on ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {c}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="flex justify-end">
        <Button type="button" onClick={onSave} disabled={setInsights.isPending} className="rounded-full">
          บันทึกสรุป
        </Button>
      </div>
    </section>
  );
}
