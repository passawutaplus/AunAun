import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import FeedbackKindBadge from "@/components/feedback/FeedbackKindBadge";
import { RELEASE_TAG_LABEL, type ReleaseNote, type ReleaseTag } from "@/hooks/useReleaseNotes";
import type { FeedbackRow } from "@/pages/admin/AdminFeedbackPage";
import { cn } from "@/lib/utils";

/** Feedback worth crediting in a release: ideas / UX / bugs not yet adopted or dismissed. */
const LINKABLE_STATUSES = new Set(["new", "reviewing", "resolved"]);

export default function AdminReleaseNotesPanel({ feedback }: { feedback: FeedbackRow[] }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tag, setTag] = useState<ReleaseTag>("new");
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["admin", "release-notes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("release_notes" as never)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as ReleaseNote[];
    },
  });

  const linkable = useMemo(
    () =>
      feedback.filter(
        (f) => f.kind && f.kind !== "praise" && f.kind !== "rating" && LINKABLE_STATUSES.has(f.status),
      ),
    [feedback],
  );

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "release-notes"] });
    qc.invalidateQueries({ queryKey: ["admin", "feedback"] });
    qc.invalidateQueries({ queryKey: ["release-notes"] });
  };

  const create = useMutation({
    mutationFn: async (publish: boolean) => {
      const { error } = await supabase.from("release_notes" as never).insert({
        title: title.trim(),
        body: body.trim(),
        tag,
        feedback_ids: [...picked],
        published_at: publish ? new Date().toISOString() : null,
      } as never);
      if (error) throw error;
    },
    onSuccess: (_d, publish) => {
      setTitle("");
      setBody("");
      setTag("new");
      setPicked(new Set());
      invalidate();
      toast.success(publish ? "เผยแพร่แล้ว — แจ้งผู้ส่งฟีดแบ็กที่ลิงก์ไว้แล้ว" : "บันทึกร่างแล้ว");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setPublished = useMutation({
    mutationFn: async ({ id, publish }: { id: string; publish: boolean }) => {
      const { error } = await supabase
        .from("release_notes" as never)
        .update({ published_at: publish ? new Date().toISOString() : null } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("release_notes" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = (id: string) =>
    setPicked((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const canSave = title.trim().length > 0 && !create.isPending;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-3 rounded-lg border border-admin-border bg-admin-surface p-4">
        <p className="text-xs font-mono uppercase tracking-wider text-admin-muted">อัปเดตใหม่</p>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder="หัวข้อ เช่น ค้นหาผลงานด้วยสีได้แล้ว" />
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={4000}
          rows={4}
          placeholder="รายละเอียดสั้น ๆ ว่าเปลี่ยนอะไร ใช้ยังไง"
        />
        <div className="flex gap-1.5">
          {(Object.keys(RELEASE_TAG_LABEL) as ReleaseTag[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(t)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium",
                tag === t ? "border-foreground bg-foreground text-background" : "border-admin-border text-admin-muted",
              )}
            >
              {RELEASE_TAG_LABEL[t]}
            </button>
          ))}
        </div>

        <div>
          <p className="mb-1.5 text-xs text-admin-muted">
            ฟีดแบ็กที่อัปเดตนี้ตอบ ({picked.size}) — ตอนเผยแพร่จะเปลี่ยนเป็น "นำไปใช้" และแจ้งผู้ส่ง
          </p>
          <ul className="max-h-56 space-y-1 overflow-y-auto rounded border border-admin-border p-1.5">
            {linkable.length === 0 ? (
              <li className="px-1.5 py-2 text-xs text-admin-muted">ไม่มีฟีดแบ็กที่รอในช่วงที่เลือก</li>
            ) : (
              linkable.map((f) => (
                <li key={f.id}>
                  <label className="flex cursor-pointer items-start gap-2 rounded px-1.5 py-1 hover:bg-muted/40">
                    <input type="checkbox" checked={picked.has(f.id)} onChange={() => toggle(f.id)} className="mt-0.5" />
                    <FeedbackKindBadge kind={f.kind} />
                    <span className="line-clamp-2 text-xs">
                      <span className="font-mono text-[10px] text-admin-muted">{f.ticket_number || ""}</span> {f.message || f.route}
                    </span>
                  </label>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" disabled={!canSave} onClick={() => create.mutate(false)}>
            บันทึกร่าง
          </Button>
          <Button size="sm" disabled={!canSave} onClick={() => create.mutate(true)}>
            เผยแพร่
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-mono uppercase tracking-wider text-admin-muted">ทั้งหมด</p>
          <a href="/changelog" target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
            เปิดหน้า /changelog
          </a>
        </div>
        {isLoading ? (
          <p className="text-xs text-admin-muted">กำลังโหลด…</p>
        ) : notes.length === 0 ? (
          <p className="rounded-lg border border-dashed border-admin-border p-6 text-center text-xs text-admin-muted">
            ยังไม่มีอัปเดต
          </p>
        ) : (
          notes.map((n) => (
            <div key={n.id} className="rounded-lg border border-admin-border bg-admin-surface p-3">
              <div className="flex items-start gap-2">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">{RELEASE_TAG_LABEL[n.tag]}</span>
                <p className="min-w-0 flex-1 text-sm font-medium">{n.title}</p>
                <span className={cn("text-[10px]", n.published_at ? "text-emerald-600" : "text-admin-muted")}>
                  {n.published_at ? n.published_at.slice(0, 10) : "ร่าง"}
                </span>
              </div>
              {n.body ? <p className="mt-1 line-clamp-3 whitespace-pre-line text-xs text-admin-muted">{n.body}</p> : null}
              <div className="mt-2 flex items-center gap-2">
                {n.feedback_ids.length ? (
                  <span className="text-[10px] text-admin-muted">จากฟีดแบ็ก {n.feedback_ids.length} รายการ</span>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto h-7 text-xs"
                  onClick={() => setPublished.mutate({ id: n.id, publish: !n.published_at })}
                >
                  {n.published_at ? "ซ่อน" : "เผยแพร่"}
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => remove.mutate(n.id)}>
                  ลบ
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
