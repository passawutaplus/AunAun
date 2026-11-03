import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useExtractEvent, useSimilarEvents, type ExtractedEvent } from "@/hooks/useExhibitionEvents";
import { EVENT_ORIGIN_LABEL, formatEventDates, type TeamEventDraft } from "@/lib/exhibitionEvents";
import { cn } from "@/lib/utils";

export type TeamFields = Pick<TeamEventDraft, "origin" | "source_name" | "source_url">;

/**
 * Admin-only block on top of the event form for SameCor's own events.
 * Curated: paste the organiser's page, AI fills a draft (only what the page states), the team checks every
 * field and publishes. Nothing here publishes on its own.
 */
export default function TeamEventPanel({
  eventId,
  team,
  onTeamChange,
  title,
  startsOn,
  onApply,
}: {
  eventId: string | null;
  team: TeamFields;
  onTeamChange: (t: TeamFields) => void;
  title: string;
  startsOn: string | null;
  onApply: (draft: ExtractedEvent["draft"]) => void;
}) {
  const [url, setUrl] = useState(team.source_url ?? "");
  const [result, setResult] = useState<ExtractedEvent | null>(null);
  const extract = useExtractEvent();
  const { data: similar = [] } = useSimilarEvents(title, startsOn, team.source_url, eventId);

  const run = async () => {
    try {
      const r = await extract.mutateAsync(url.trim());
      setResult(r);
      onApply(r.draft);
      onTeamChange({ origin: "curated", source_name: r.draft.source_name, source_url: r.draft.source_url });
    } catch {
      /* toast from the hook */
    }
  };

  const level = !result ? null : result.confidence >= 75 ? "high" : result.confidence >= 45 ? "mid" : "low";

  return (
    <section className="space-y-5 rounded-xl border border-border bg-muted/30 p-5" aria-labelledby="team-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="team-heading" className="font-display text-xl font-semibold text-foreground">
          SameCor Team Event
        </h2>
        <div className="flex gap-2" role="radiogroup" aria-label="ประเภทงาน">
          {(["curated", "original"] as const).map((o) => (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={team.origin === o}
              onClick={() => onTeamChange({ ...team, origin: o })}
              className={cn(
                "min-h-9 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground",
                team.origin === o ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:border-foreground/50",
              )}
            >
              {EVENT_ORIGIN_LABEL[o]}
            </button>
          ))}
        </div>
      </div>

      {team.origin === "curated" ? (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="team-url" className="text-sm font-medium text-foreground">
              ลิงก์หน้างานจากผู้จัด
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="team-url"
                type="url"
                inputMode="url"
                placeholder="https://gallery.example.com/exhibition/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <Button type="button" className="shrink-0 rounded-full" disabled={!/^https?:\/\//i.test(url.trim()) || extract.isPending} onClick={() => void run()}>
                {extract.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="mr-2 h-4 w-4" aria-hidden />}
                ให้ AI อ่านหน้านี้
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              AI กรอกเฉพาะข้อมูลที่หน้าเว็บระบุ ลิงก์ลงทะเบียน/ซื้อบัตรต้องมีอยู่จริงบนหน้านั้น ไม่คัดลอกรูป · Facebook/IG วางลิงก์ได้แต่อาจอ่านไม่ได้
            </p>
          </div>

          {result ? (
            <div className="space-y-2 rounded-lg border border-border bg-background p-4 text-sm">
              <p className="flex flex-wrap items-center gap-2 font-medium text-foreground">
                ความมั่นใจ
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold",
                    level === "high" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                    level === "mid" && "bg-amber-500/15 text-amber-800 dark:text-amber-300",
                    level === "low" && "bg-destructive/15 text-destructive",
                  )}
                >
                  {result.confidence}%
                </span>
                {result.structured ? <span className="text-xs text-muted-foreground">· หน้านี้มีข้อมูล Event แบบมาตรฐาน</span> : null}
              </p>
              {result.notes.length ? (
                <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                  {result.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              ) : null}
              <p className="text-xs text-muted-foreground">ตรวจทุกช่องด้านล่างก่อนเผยแพร่ — ช่องที่ว่างจะแสดงเป็น "ไม่ระบุ"</p>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="team-src-name" className="text-sm font-medium text-foreground">
                แหล่งที่มา<span className="text-destructive"> *</span>
              </Label>
              <Input
                id="team-src-name"
                maxLength={120}
                placeholder="เช่น Gallery ABC"
                value={team.source_name ?? ""}
                onChange={(e) => onTeamChange({ ...team, source_name: e.target.value || null })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="team-src-url" className="text-sm font-medium text-foreground">
                ลิงก์ต้นทาง<span className="text-destructive"> *</span>
              </Label>
              <Input
                id="team-src-url"
                type="url"
                inputMode="url"
                placeholder="https://"
                value={team.source_url ?? ""}
                onChange={(e) => onTeamChange({ ...team, source_url: e.target.value || null })}
              />
            </div>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">งานที่ SameCor จัดเอง — ไม่ต้องใส่แหล่งที่มา</p>
      )}

      {similar.length ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-foreground" role="status">
          <p className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4" aria-hidden /> อาจซ้ำกับงานที่มีอยู่แล้ว
          </p>
          <ul className="mt-2 space-y-1">
            {similar.map((s) => (
              <li key={s.id}>
                <Link to={`/exhibition/${s.id}`} target="_blank" className="font-medium underline-offset-2 hover:underline">
                  {s.title}
                </Link>{" "}
                <span className="text-muted-foreground">
                  · {formatEventDates(s.starts_on, s.ends_on)} · {EVENT_ORIGIN_LABEL[s.origin]} · {s.status} · {Math.round(s.score * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
