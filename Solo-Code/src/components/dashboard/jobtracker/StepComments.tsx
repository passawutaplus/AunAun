import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { listStepComments, addStepComment } from "@/server/step-comments.functions";
import { JOB_STEPS } from "./steps";

type Comment = {
  id: string;
  step_index: number;
  author_role: "owner" | "client";
  body: string;
  created_at: string;
};

interface Props {
  token: string;
  stepIndex: number;
  authorRole: "owner" | "client";
  /** Show all step comments grouped (true) or only current step (false) */
  showAllSteps?: boolean;
}

export function StepComments({ token, stepIndex, authorRole, showAllSteps = false }: Props) {
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [body, setBody] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const { comments: rows } = await listStepComments({ data: { token } });
      setComments(rows as Comment[]);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    const text = body.trim();
    if (!text) return;
    setSending(true);
    try {
      await addStepComment({ data: { token, step_index: stepIndex, body: text } });
      setBody("");
      await load();
      toast.success("บันทึกหมายเหตุแล้ว");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ไม่สำเร็จ");
    } finally {
      setSending(false);
    }
  };

  const visible = showAllSteps ? comments : comments.filter((c) => c.step_index === stepIndex);
  const grouped = React.useMemo(() => {
    const map = new Map<number, Comment[]>();
    visible.forEach((c) => {
      const arr = map.get(c.step_index) ?? [];
      arr.push(c);
      map.set(c.step_index, arr);
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [visible]);

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold">
        <MessageSquare className="h-3.5 w-3.5" />
        หมายเหตุ / คอมเมนต์ขั้นตอนนี้
      </div>

      {loading ? (
        <div className="flex justify-center py-2">
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        </div>
      ) : visible.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">ยังไม่มีคอมเมนต์ — เพิ่มได้เลย</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {grouped.map(([sidx, list]) => (
            <div key={sidx} className="space-y-1">
              {showAllSteps && (
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {JOB_STEPS[sidx]?.label ?? `ขั้นที่ ${sidx + 1}`}
                </div>
              )}
              {list.map((c) => (
                <div
                  key={c.id}
                  className={`rounded-md px-2 py-1.5 text-xs ${c.author_role === "owner" ? "bg-primary/10 border border-primary/20" : "bg-card border border-border"}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-[10px] font-semibold">
                      {c.author_role === "owner" ? "🧑‍💻 ฟรีแลนซ์" : "👤 ลูกค้า"}
                    </span>
                    <span className="text-[9px] text-muted-foreground">
                      {new Date(c.created_at).toLocaleString("th-TH", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap break-words">{c.body}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-1.5">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 1000))}
          rows={2}
          placeholder="พิมพ์หมายเหตุ/คอมเมนต์..."
          className="text-xs min-h-[44px] resize-none"
        />
        <Button
          size="sm"
          onClick={submit}
          disabled={sending || !body.trim()}
          className="h-9 w-9 p-0 shrink-0"
        >
          {sending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
      <div className="text-[9px] text-muted-foreground text-right">{body.length}/1000</div>
    </div>
  );
}
