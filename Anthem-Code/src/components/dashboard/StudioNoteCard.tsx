import { Check, Loader2, StickyNote } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useStudioNote } from "@/hooks/useStudioHomeLocal";

type Props = {
  userId: string;
};

export default function StudioNoteCard({ userId }: Props) {
  const { draft, status, onChange } = useStudioNote(userId);

  return (
    <section className="flex h-full flex-col space-y-3 rounded-2xl glass-panel p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-base font-semibold text-foreground">
          <StickyNote className="h-4 w-4 text-muted-foreground" aria-hidden />
          โน้ต
        </h2>
        <p className="min-h-4 text-xs text-muted-foreground" aria-live="polite">
          {status === "saving" ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> กำลังบันทึก…
            </span>
          ) : null}
          {status === "saved" ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Check className="h-3 w-3" /> บันทึกแล้ว
            </span>
          ) : null}
        </p>
      </div>
      <label className="sr-only" htmlFor="studio-home-note">
        บันทึกโน้ตสตูดิโอ
      </label>
      <Textarea
        id="studio-home-note"
        value={draft}
        onChange={(e) => onChange(e.target.value)}
        placeholder={"- ส่งไฟล์รอบแก้ให้ลูกค้า\n- ถามเรทงานอีเวนต์"}
        className="min-h-[8rem] flex-1 resize-y rounded-xl bg-background/70 leading-relaxed"
      />
    </section>
  );
}
