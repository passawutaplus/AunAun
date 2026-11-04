import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarClock,
  Download,
  ExternalLink,
  FileText,
  Gift,
  Info,
  Lightbulb,
  ListOrdered,
  Mic,
  Plus,
  ScrollText,
  Sparkles,
  Ticket,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PROJECT_CATEGORIES } from "@/data/projectTypes";
import { useEventInsights, useRelatedWorks, useSetEventInsights } from "@/hooks/useExhibitionEvents";
import {
  EVENT_INSIGHT_LISTS,
  EVENT_LINK_KINDS,
  deadlineLabel,
  eventLinkText,
  formatEventDates,
  isSafeEventLink,
  type EventInsightLink,
  type EventInsightListKey,
  type EventInsights,
  type EventLinkKind,
  type ExhibitionEvent,
} from "@/lib/exhibitionEvents";
import { cn } from "@/lib/utils";
import { tr, useLang, useT, type Entry } from "@/lib/i18n";
import { DETAIL } from "@/lib/i18n/exhibition/detail";

type ListKey = Exclude<EventInsightListKey, "related_categories">;
type Block = { key: ListKey; title: Entry; icon: LucideIcon };

const DEFAULT_BLOCKS: Record<ListKey, Block> = {
  steps: { key: "steps", title: DETAIL.blockSteps, icon: ListOrdered },
  eligibility: { key: "eligibility", title: DETAIL.blockEligibility, icon: UserCheck },
  benefits: { key: "benefits", title: DETAIL.blockBenefits, icon: Gift },
  bring: { key: "bring", title: DETAIL.blockBring, icon: Wrench },
  speakers: { key: "speakers", title: DETAIL.blockSpeakers, icon: Mic },
  schedule: { key: "schedule", title: DETAIL.blockSchedule, icon: CalendarClock },
  highlights: { key: "highlights", title: DETAIL.blockHighlights, icon: Sparkles },
  who_for: { key: "who_for", title: DETAIL.blockWhoFor, icon: Users },
  takeaways: { key: "takeaways", title: DETAIL.blockTakeaways, icon: Lightbulb },
  know_before: { key: "know_before", title: DETAIL.blockKnowBefore, icon: Info },
};

/** Category first: what matters most for that kind of event, with category-specific headings. */
const CATEGORY_BLOCKS: Partial<Record<ExhibitionEvent["category"], Array<Partial<Block> & { key: ListKey }>>> = {
  open_call: [
    { key: "steps", title: DETAIL.stepsApply },
    { key: "eligibility" },
    { key: "benefits" },
  ],
  workshop: [{ key: "steps", title: DETAIL.stepsBook }, { key: "bring" }, { key: "schedule" }],
  talk_forum: [{ key: "speakers" }, { key: "schedule" }, { key: "steps", title: DETAIL.stepsRegister }],
  art_fair: [{ key: "highlights" }, { key: "schedule", title: DETAIL.scheduleTickets }, { key: "steps", title: DETAIL.stepsTickets }],
  exhibition: [{ key: "who_for" }, { key: "takeaways" }, { key: "know_before" }],
  other: [{ key: "who_for" }, { key: "takeaways" }, { key: "know_before" }],
};

const GENERIC_ORDER: ListKey[] = [
  "steps",
  "eligibility",
  "benefits",
  "bring",
  "speakers",
  "schedule",
  "highlights",
  "who_for",
  "takeaways",
  "know_before",
];

const LINK_ICON: Record<EventLinkKind, LucideIcon> = {
  download: Download,
  form: FileText,
  rules: ScrollText,
  register: UserPlus,
  tickets: Ticket,
  info: ExternalLink,
};

/** Blocks to show, in order: the category's own blocks, then any other non-empty list. Empty lists are hidden. */
function insightBlocks(insights: EventInsights, category: string): Block[] {
  const first = (CATEGORY_BLOCKS[category as ExhibitionEvent["category"]] ?? []).map((b) => ({ ...DEFAULT_BLOCKS[b.key], ...b }));
  const seen = new Set(first.map((b) => b.key));
  const rest = GENERIC_ORDER.filter((k) => !seen.has(k)).map((k) => DEFAULT_BLOCKS[k]);
  return [...first, ...rest].filter((b) => insights[b.key].length > 0);
}

/** On the page each block shows at most this many short items (write them merged, one line each). */
const SHOWN_ITEMS = 3;

function BlockList({ block, items: all }: { block: Block; items: string[] }) {
  const lang = useLang();
  const Icon = block.icon;
  const items = all.slice(0, SHOWN_ITEMS);
  return (
    <div>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4 text-brand" aria-hidden />
        {tr(block.title, undefined, lang)}
      </h3>
      {block.key === "steps" ? (
        <ol className="mt-2.5 space-y-1.5">
          {items.map((item, i) => (
            <li key={item} className="flex gap-3 text-sm leading-relaxed text-foreground/85">
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-foreground/25 text-[11px] font-semibold tabular-nums text-foreground"
                aria-hidden
              >
                {i + 1}
              </span>
              <span className="line-clamp-2">{item}</span>
            </li>
          ))}
        </ol>
      ) : (
        <ul className="mt-2.5 space-y-1.5">
          {items.map((item) => (
            <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-foreground/85">
              <span className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-foreground/40" aria-hidden />
              <span className="line-clamp-2">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Short buttons (icon + what it is, e.g. "ใบสมัคร (.docx)"); the full meaning is in the tooltip / label. */
export function EventLinkButtons({ links, className }: { links: EventInsightLink[]; className?: string }) {
  if (!links.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {links.map((l, i) => {
        const Icon = LINK_ICON[l.kind];
        return (
          <Button
            key={`${l.url}-${i}`}
            asChild
            size="sm"
            variant="outline"
            className="h-auto min-h-9 max-w-full whitespace-normal rounded-full py-1.5 text-left"
          >
            <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" title={eventLinkText(l)} aria-label={eventLinkText(l)}>
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span>{l.label}</span>
            </a>
          </Button>
        );
      })}
    </div>
  );
}

type PanelEvent = Pick<ExhibitionEvent, "category" | "ends_on" | "source_url" | "website_url">;

/** "สรุปโดย SAMECOR": one layout for every category; the blocks and headings follow the category. No boxes. */
export function EventInsightsPanel({
  insights,
  event,
  className,
}: {
  insights: EventInsights;
  event: PanelEvent;
  className?: string;
}) {
  const t = useT(DETAIL);
  const blocks = insightBlocks(insights, event.category);
  const isOpenCall = event.category === "open_call";
  const deadline = isOpenCall ? (insights.deadline ?? event.ends_on) : insights.deadline;
  const countdown = deadlineLabel(deadline);
  const organiserPage = [event.source_url, event.website_url].find((u): u is string => !!u && isSafeEventLink(u));
  if (!blocks.length && !insights.capacity && !countdown) return null;

  // One row: the category's three most useful blocks; overlapping generic lists are left out.
  const lead = blocks.slice(0, 3);
  const grid = (n: number) => cn("grid grid-cols-1 gap-x-10 gap-y-6", n === 2 && "md:grid-cols-2", n >= 3 && "md:grid-cols-3");

  return (
    <section aria-labelledby="insights-heading" className={className}>
      <h2 id="insights-heading" className="font-display text-2xl font-semibold text-foreground">
        {t("summaryBy")}
      </h2>

      {countdown || insights.capacity ? (
        <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
          {countdown ? (
            <p className="font-display text-2xl font-semibold text-foreground">
              {countdown}
              {deadline ? (
                <span className="ml-2 text-sm font-normal text-muted-foreground">{formatEventDates(deadline)}</span>
              ) : null}
            </p>
          ) : null}
          {insights.capacity ? (
            <p className="flex items-center gap-1.5 text-sm text-foreground/85">
              <Users className="h-4 w-4 text-brand" aria-hidden />
              {insights.capacity}
            </p>
          ) : null}
        </div>
      ) : null}

      {lead.length ? (
        <div className={cn("mt-4", grid(lead.length))}>
          {lead.map((b) => (
            <BlockList key={b.key} block={b} items={insights[b.key]} />
          ))}
        </div>
      ) : null}

      {isOpenCall && organiserPage ? (
        <a
          href={organiserPage}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground underline decoration-foreground/30 underline-offset-4 hover:text-foreground hover:decoration-foreground"
        >
          {t("readFullDetails")} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </a>
      ) : null}
    </section>
  );
}

/** Works by SAMECOR creators in the categories this event speaks to. Hidden when there are none. */
export function EventRelatedWorks({ categories, className }: { categories: string[]; className?: string }) {
  const { data: works = [] } = useRelatedWorks(categories, 6);
  if (!works.length) return null;
  return (
    <section aria-labelledby="related-works-heading" className={className}>
      <h2 id="related-works-heading" className="font-display text-2xl font-semibold text-foreground">
        Works Like This on SAMECOR
      </h2>
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
    .map((l) => l.replace(/^[\s•\-*]+/, "").replace(/^\d+[.)]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, max);

const EDITOR_FIELDS: Array<{ key: ListKey; title: string; hint: string; placeholder: string }> = [
  { key: "who_for", title: "เหมาะกับใคร", hint: "ทุกหมวด", placeholder: "นักวาดภาพประกอบที่สนใจงานสีน้ำ" },
  { key: "takeaways", title: "จะได้อะไรกลับไป", hint: "ทุกหมวด", placeholder: "เห็นเทคนิคภาพพิมพ์ 5 แบบในที่เดียว" },
  { key: "know_before", title: "ก่อนไปควรรู้", hint: "ทุกหมวด", placeholder: "ปิดวันจันทร์ · ใกล้ MRT สามยอด" },
  { key: "steps", title: "ขั้นตอน (เรียงลำดับ)", hint: "สมัคร / จอง / ลงทะเบียน / ซื้อบัตร", placeholder: "กรอกใบสมัคร\nรวมเอกสารเป็น PDF ไฟล์เดียว" },
  { key: "eligibility", title: "ใครสมัครได้", hint: "Open call", placeholder: "ทำงานมาแล้วอย่างน้อย 4 ปี" },
  { key: "benefits", title: "รางวัล / สิ่งที่ได้", hint: "Open call", placeholder: "ทุนผลิตงาน 70,000 บาท" },
  { key: "bring", title: "สิ่งที่ต้องเตรียม", hint: "Workshop", placeholder: "ผ้ากันเปื้อน" },
  { key: "speakers", title: "วิทยากร", hint: "Talk & Forum", placeholder: "ชื่อ — ตำแหน่ง / สังกัด" },
  { key: "schedule", title: "กำหนดการ / รอบ", hint: "Talk · Workshop · Art fair", placeholder: "16:00–18:00 เวิร์กช็อป" },
  { key: "highlights", title: "ไฮไลต์", hint: "Art fair", placeholder: "บูธจากแกลเลอรี 40 แห่ง" },
];

type LinkRow = { label: string; url: string; kind: EventLinkKind };

/** Admin editor for "สรุปโดย SAMECOR": one item per line; saved on its own, not with the event form. */
export function EventInsightsEditor({ eventId }: { eventId: string }) {
  const { data: saved, isLoading } = useEventInsights(eventId);
  const setInsights = useSetEventInsights();
  const [text, setText] = useState<Record<ListKey, string> | null>(null);
  const [cats, setCats] = useState<string[]>([]);
  const [capacity, setCapacity] = useState("");
  const [deadline, setDeadline] = useState("");
  const [links, setLinks] = useState<LinkRow[]>([]);

  useEffect(() => {
    if (isLoading) return;
    setText(
      Object.fromEntries(EDITOR_FIELDS.map((f) => [f.key, (saved?.[f.key] ?? []).join("\n")])) as Record<ListKey, string>,
    );
    setCats(saved?.related_categories ?? []);
    setCapacity(saved?.capacity ?? "");
    setDeadline(saved?.deadline ?? "");
    setLinks(saved?.links ?? []);
  }, [saved, isLoading]);

  if (!text) return null;
  const toggleCat = (c: string) =>
    setCats((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : cur.length >= 4 ? cur : [...cur, c]));
  const badLinks = links.filter((l) => (l.url.trim() || l.label.trim()) && (!l.label.trim() || !isSafeEventLink(l.url.trim())));
  const setLink = (i: number, patch: Partial<LinkRow>) => setLinks((cur) => cur.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const onSave = () =>
    setInsights.mutate({
      id: eventId,
      insights: {
        ...(Object.fromEntries(
          EDITOR_FIELDS.map((f) => [f.key, linesOf(text[f.key], EVENT_INSIGHT_LISTS[f.key])]),
        ) as Record<ListKey, string[]>),
        related_categories: cats,
        capacity: capacity.trim() || null,
        deadline: deadline || null,
        links: links
          .map((l) => ({ ...l, label: l.label.trim(), url: l.url.trim() }))
          .filter((l) => l.label && isSafeEventLink(l.url))
          .slice(0, 6),
      },
    });

  return (
    <section className="mt-6 space-y-5 rounded-xl border border-border p-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-foreground">สรุปโดย SAMECOR</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          บรรทัดละ 1 ข้อ สั้น ๆ รวบให้เหลือไม่เกิน 3 ข้อ (หน้าเว็บแสดง 3 ข้อแรก) · เขียนจากข้อมูลของผู้จัดเท่านั้น · หน้างานแสดง 3 หัวข้อที่เหมาะกับหมวดของงาน ช่องว่างจะไม่แสดง
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {EDITOR_FIELDS.map(({ key, title, hint, placeholder }) => (
          <div key={key}>
            <label htmlFor={`ins-${key}`} className="text-sm font-medium text-foreground">
              {title} <span className="text-xs font-normal text-muted-foreground">· {hint}</span>
            </label>
            <Textarea
              id={`ins-${key}`}
              rows={key === "steps" ? 7 : 5}
              className="mt-1.5"
              value={text[key]}
              onChange={(e) => setText({ ...text, [key]: e.target.value })}
              placeholder={placeholder}
            />
          </div>
        ))}
        <div className="space-y-3">
          <div>
            <label htmlFor="ins-capacity" className="text-sm font-medium text-foreground">
              จำนวนที่รับ <span className="text-xs font-normal text-muted-foreground">· Workshop</span>
            </label>
            <Input id="ins-capacity" className="mt-1.5" maxLength={80} value={capacity} placeholder="รับ 12 คน" onChange={(e) => setCapacity(e.target.value)} />
          </div>
          <div>
            <label htmlFor="ins-deadline" className="text-sm font-medium text-foreground">
              วันปิดรับ <span className="text-xs font-normal text-muted-foreground">· ถ้าไม่ตรงกับวันจบ</span>
            </label>
            <Input id="ins-deadline" type="date" className="mt-1.5" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">ปุ่มเอกสาร / ลิงก์ (สูงสุด 6)</legend>
        <p className="text-xs text-muted-foreground">
          ใช้เฉพาะลิงก์จากหน้าของผู้จัด · https:// เท่านั้น ห้ามลิงก์ย่อ · ชื่อปุ่มสั้น ๆ บอกแค่ว่าคืออะไร เช่น “ใบสมัคร (.docx)”, “กติกา (.pdf)”, “จองตั๋ว” · แสดงในแถบขวาเหนือ Organizer
        </p>
        {links.map((l, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1.3fr)_auto]">
            <select
              aria-label="ประเภทลิงก์"
              value={l.kind}
              onChange={(e) => setLink(i, { kind: e.target.value as EventLinkKind })}
              className="h-10 rounded-md border border-input bg-background px-2 text-sm"
            >
              {(Object.entries(EVENT_LINK_KINDS) as [EventLinkKind, string][]).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
            <Input aria-label="ชื่อปุ่ม" maxLength={40} value={l.label} placeholder="ใบสมัคร (.docx)" onChange={(e) => setLink(i, { label: e.target.value })} />
            <Input
              aria-label="ลิงก์"
              value={l.url}
              placeholder="https://"
              aria-invalid={!!l.url.trim() && !isSafeEventLink(l.url.trim())}
              onChange={(e) => setLink(i, { url: e.target.value })}
            />
            <Button type="button" size="icon" variant="ghost" aria-label="ลบลิงก์" onClick={() => setLinks((cur) => cur.filter((_, j) => j !== i))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {badLinks.length ? (
          <p className="text-xs text-destructive">ลิงก์ที่ไม่มีชื่อปุ่ม ไม่ใช่ https:// หรือเป็นลิงก์ย่อ จะไม่ถูกบันทึก</p>
        ) : null}
        {links.length < 6 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => setLinks((cur) => [...cur, { kind: "download", label: "", url: "" }])}
          >
            <Plus className="h-4 w-4" aria-hidden /> เพิ่มปุ่ม
          </Button>
        ) : null}
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium text-foreground">หมวดผลงานที่เกี่ยวข้อง (สูงสุด 4)</legend>
        <p className="text-xs text-muted-foreground">ใช้แสดง “Works Like This on SAMECOR” ท้ายหน้างาน</p>
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
