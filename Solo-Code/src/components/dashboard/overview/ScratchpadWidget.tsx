import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { NotebookPen, Check, Loader2 } from "lucide-react";
import { useDashboardNotes } from "@/store/dashboardNotes";
import { toast } from "sonner";

export function ScratchpadWidget() {
  const { content, isLoading, save } = useDashboardNotes();
  const [draft, setDraft] = React.useState(content);
  const [status, setStatus] = React.useState<"idle" | "saving" | "saved">("idle");
  const lastSaved = React.useRef(content);
  const timer = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!isLoading) {
      setDraft(content);
      lastSaved.current = content;
    }
  }, [content, isLoading]);

  const onChange = (val: string) => {
    setDraft(val);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      if (val === lastSaved.current) return;
      setStatus("saving");
      try {
        await save(val);
        lastSaved.current = val;
        setStatus("saved");
        window.setTimeout(() => setStatus("idle"), 1500);
      } catch {
        setStatus("idle");
        toast.error("บันทึกโน้ตไม่สำเร็จ");
      }
    }, 600);
  };

  return (
    <Card className="rounded-xl border-border/60 shadow-soft bg-muted/30">
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <span className="rounded-lg bg-muted text-muted-foreground p-1.5">
            <NotebookPen className="h-3.5 w-3.5" />
          </span>
          Scratchpad
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
      <CardContent>
        <Textarea
          value={draft}
          onChange={(e) => onChange(e.target.value)}
          placeholder="ระบายไอเดีย จดเรื่องด่วน คอนเซปต์งาน หรือไอเดียบรีฟ ที่นี่ — บันทึกอัตโนมัติทุกครั้งที่หยุดพิมพ์"
          className="min-h-[180px] text-sm bg-background border-border/60 focus-visible:ring-primary/30 resize-none leading-relaxed"
          disabled={isLoading}
        />
      </CardContent>
    </Card>
  );
}
