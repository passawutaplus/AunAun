import { useSearchParams } from "react-router-dom";
import { CalendarX2 } from "lucide-react";
import JournalCard from "@/components/journal/JournalCard";
import EmptyState from "@/components/ui/EmptyState";
import { JOURNAL_CATEGORIES, type JournalArticle, type JournalCategoryId } from "@/data/journal/articles";
import { cn } from "@/lib/utils";

type Props = {
  /** บทความหลังกรองคำค้นแล้ว (ใหม่สุดก่อน) */
  articles: JournalArticle[];
};

const CATEGORY_IDS = Object.keys(JOURNAL_CATEGORIES) as JournalCategoryId[];

/**
 * หน้า Journal ในโหมด Exhibition: แถบหมวดด้านซ้าย เนื้อหาด้านขวา
 * มือถือ/แท็บเล็ต แถบหมวดกลายเป็นแถวเลื่อนแนวนอนด้านบน · หมวดที่เลือกอยู่ใน ?topic=
 */
export default function JournalBrowser({ articles }: Props) {
  const [params, setParams] = useSearchParams();
  const raw = params.get("topic");
  const topic: JournalCategoryId | "all" =
    raw && (CATEGORY_IDS as string[]).includes(raw) ? (raw as JournalCategoryId) : "all";
  const setTopic = (id: JournalCategoryId | "all") => {
    const next = new URLSearchParams(params);
    if (id === "all") next.delete("topic");
    else next.set("topic", id);
    setParams(next, { replace: true });
  };

  const list = topic === "all" ? articles : articles.filter((a) => a.category === topic);
  const items: { id: JournalCategoryId | "all"; label: string }[] = [
    { id: "all", label: "All stories" },
    ...CATEGORY_IDS.map((id) => ({ id, label: JOURNAL_CATEGORIES[id].label })),
  ];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 pb-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-10">
      <nav aria-label="หมวด Journal" className="min-w-0 lg:sticky lg:top-32 lg:self-start">
        <ul className="-mx-3 flex gap-2 overflow-x-auto px-3 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
          {items.map((it) => {
            const active = topic === it.id;
            return (
              <li key={it.id} className="shrink-0">
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTopic(it.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-full border px-4 py-1.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground lg:rounded-lg lg:border-0 lg:px-3 lg:py-2",
                    active
                      ? "border-foreground bg-foreground text-background lg:bg-foreground"
                      : "border-border text-foreground/80 hover:border-foreground/40 lg:hover:bg-accent",
                  )}
                >
                  <span className="whitespace-nowrap font-medium">{it.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="min-w-0">
        {list.length === 0 ? (
          <EmptyState
            icon={CalendarX2}
            title="ยังไม่มีบทความในหมวดนี้"
            description="เรากำลังเขียนเรื่องใหม่อยู่ ระหว่างนี้ลองอ่านหมวดอื่นก่อน"
            className="py-16"
          />
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((a) => (
              <JournalCard key={a.slug} article={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
