import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import JournalCard from "@/components/journal/JournalCard";
import { sortedJournalArticles } from "@/data/journal/articles";

/** แถบ "ล่าสุดจาก Journal" ท้ายหน้าแรก — ดึงบทความล่าสุด 3 เรื่องจากไฟล์ข้อมูลเดียวกับหน้า /journal */
export default function JournalHomeStrip() {
  const latest = sortedJournalArticles().slice(0, 3);
  if (latest.length === 0) return null;
  return (
    <section aria-labelledby="journal-home-title" className="mx-auto mt-16 w-full max-w-6xl px-4 sm:px-6">
      <div className="flex items-end justify-between gap-4 border-t border-border pt-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Journal</p>
          <h2 id="journal-home-title" className="mt-1 text-2xl tracking-tight sm:text-3xl">
            Latest stories
          </h2>
          <p className="thai-body mt-1 text-sm text-muted-foreground">เรื่องราวด้านดีไซน์ ผู้คน และศิลปะ</p>
        </div>
        <Link
          to="/journal"
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-foreground transition-opacity hover:opacity-70"
        >
          ดูทั้งหมด
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {latest.map((a) => (
          <JournalCard key={a.slug} article={a} />
        ))}
      </div>
    </section>
  );
}
