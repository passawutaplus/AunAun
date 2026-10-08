import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote, Loader2, Check } from "lucide-react";
import { useDashboardNotes } from "@/store/dashboardNotes";
import { toast } from "sonner";

const AUTOSAVE_DELAY_MS = 600;

export function QuickNoteWidget() {
  const { content, isLoading, save } = useDashboardNotes();
  const [draft, setDraft] = React.useState(content);
  const [status, setStatus] = React.useState<"idle" | "saving" | "saved">("idle");
  const lastSaved = React.useRef(content);
  const latestDraft = React.useRef(content);
  /** True while the textarea holds edits the server has not confirmed yet. */
  const dirty = React.useRef(false);
  const timer = React.useRef<number | null>(null);
  const savedTimer = React.useRef<number | null>(null);
  const saveRef = React.useRef(save);
  saveRef.current = save;

  // Pull the server copy in (first load, or edits from another tab) — but never
  // overwrite text the user is still typing. Saving invalidates the query, so
  // without this guard the refetch would replace the draft with the older saved
  // value mid-typing: lost keystrokes and the caret jumping to the end.
  React.useEffect(() => {
    if (isLoading) return;
    lastSaved.current = content;
    if (!dirty.current) {
      latestDraft.current = content;
      setDraft(content);
    }
  }, [content, isLoading]);

  // Don't drop a pending edit when the widget unmounts (e.g. switching tabs
  // within the debounce window): flush it, and clear timers.
  React.useEffect(
    () => () => {
      if (savedTimer.current) window.clearTimeout(savedTimer.current);
      if (timer.current) {
        window.clearTimeout(timer.current);
        timer.current = null;
        if (dirty.current && latestDraft.current !== lastSaved.current) {
          void saveRef.current(latestDraft.current).catch(() => {});
        }
      }
    },
    [],
  );

  const onChange = (val: string) => {
    setDraft(val);
    latestDraft.current = val;
    dirty.current = true;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      timer.current = null;
      if (val === lastSaved.current) {
        dirty.current = latestDraft.current !== lastSaved.current;
        return;
      }
      setStatus("saving");
      try {
        await saveRef.current(val);
        lastSaved.current = val;
        // Only "clean" if nothing was typed while the request was in flight.
        dirty.current = latestDraft.current !== val;
        setStatus("saved");
        if (savedTimer.current) window.clearTimeout(savedTimer.current);
        savedTimer.current = window.setTimeout(() => setStatus("idle"), 1500);
      } catch {
        setStatus("idle");
        toast.error("บันทึกโน้ตไม่สำเร็จ");
      }
    }, AUTOSAVE_DELAY_MS);
  };

  return (
    <Card className="rounded-xl border-border/60 shadow-soft">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <span className="rounded-lg bg-muted text-muted-foreground p-1.5">
            <StickyNote className="h-3.5 w-3.5" />
          </span>
          Quick Note
        </CardTitle>
        <span className="text-[10px] text-muted-foreground flex items-center gap-1 min-h-[14px]">
          {status === "saving" && (
            <>
              <Loader2 className="h-3 w-3 animate-spin" /> กำลังบันทึก…
            </>
          )}
          {status === "saved" && (
            <>
              <Check className="h-3 w-3 text-success" /> บันทึกแล้ว
            </>
          )}
        </span>
      </CardHeader>
      <CardContent className="pt-0">
        <Textarea
          value={draft}
          onChange={(e) => onChange(e.target.value)}
          placeholder="- เช็คราคาโปรแกรมบัญชี&#10;- ถามพี่ปอเรื่อง rate งาน event"
          className="min-h-[90px] text-xs bg-background border-border/60 focus-visible:ring-primary/30 resize-y leading-relaxed"
          disabled={isLoading}
        />
      </CardContent>
    </Card>
  );
}
