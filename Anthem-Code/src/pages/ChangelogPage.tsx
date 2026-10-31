import { Sparkles } from "lucide-react";
import SeoHead from "@/components/SeoHead";
import { Button } from "@/components/ui/button";
import { InlineLoader } from "@/components/ui/BanterLoader";
import { useOpenFeedbackTicket } from "@/hooks/useOpenFeedbackTicket";
import { RELEASE_TAG_LABEL, useReleaseNotes, type ReleaseNote } from "@/hooks/useReleaseNotes";
import { cn } from "@/lib/utils";

const TAG_TONE: Record<ReleaseNote["tag"], string> = {
  new: "bg-brand/10 text-foreground",
  improved: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  fixed: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
};

const monthLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("th-TH", { month: "long", year: "numeric" });

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short" });

export default function ChangelogPage() {
  const { data: notes = [], isLoading } = useReleaseNotes();
  const openFeedback = useOpenFeedbackTicket();

  const groups: { month: string; items: ReleaseNote[] }[] = [];
  for (const n of notes) {
    const month = monthLabel(n.published_at!);
    const last = groups[groups.length - 1];
    if (last?.month === month) last.items.push(n);
    else groups.push({ month, items: [n] });
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 pb-24">
      <SeoHead
        title="อัปเดตล่าสุด"
        description="ฟีเจอร์ใหม่ สิ่งที่ปรับปรุง และบั๊กที่แก้บน SAMECOR — หลายอย่างมาจากไอเดียของผู้ใช้"
        path="/changelog"
      />
      <div className="mb-8">
        <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Beta
        </p>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">อัปเดตล่าสุด</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          สิ่งที่เปลี่ยนบน SAMECOR — อันที่มีป้าย "จากไอเดียผู้ใช้" มาจากฟีดแบ็กของพวกคุณ
        </p>
        <Button size="sm" variant="outline" className="mt-4" onClick={() => openFeedback()}>
          เสนอไอเดีย
        </Button>
      </div>

      {isLoading ? (
        <InlineLoader />
      ) : groups.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          ยังไม่มีอัปเดต — เร็ว ๆ นี้
        </p>
      ) : (
        <div className="space-y-10">
          {groups.map((g) => (
            <section key={g.month}>
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g.month}</h2>
              <ol className="space-y-5 border-l border-border pl-5">
                {g.items.map((n) => (
                  <li key={n.id} className="relative">
                    <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", TAG_TONE[n.tag])}>
                        {RELEASE_TAG_LABEL[n.tag]}
                      </span>
                      <time className="text-xs text-muted-foreground" dateTime={n.published_at!}>
                        {dayLabel(n.published_at!)}
                      </time>
                      {n.feedback_ids.length ? (
                        <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[11px] font-medium text-violet-600 dark:text-violet-400">
                          จากไอเดียผู้ใช้
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-1.5 font-medium text-foreground">{n.title}</h3>
                    {n.body ? (
                      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{n.body}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
