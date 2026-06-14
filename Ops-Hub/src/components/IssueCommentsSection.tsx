import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAddIssueComment, useIssueComments } from "@/hooks/useIssueComments";

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function IssueCommentsSection({ issueId }: { issueId: string }) {
  const { data, isLoading } = useIssueComments(issueId);
  const addComment = useAddIssueComment();
  const [body, setBody] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    await addComment.mutateAsync({ issueId, body });
    setBody("");
  };

  return (
    <section className="space-y-3 border-t border-border pt-4">
      <h3 className="text-xs font-semibold text-muted">ความคิดเห็น</h3>

      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted" />
      ) : (
        <ul className="max-h-48 space-y-2 overflow-y-auto">
          {(data ?? []).map((c) => (
            <li key={c.id} className="rounded-lg bg-surface/60 px-3 py-2 text-sm">
              <p className="whitespace-pre-wrap">{c.body}</p>
              <p className="mt-1 text-[10px] text-muted">{fmtTime(c.created_at)}</p>
            </li>
          ))}
          {(data ?? []).length === 0 ? (
            <li className="text-xs text-muted">ยังไม่มีความคิดเห็น</li>
          ) : null}
        </ul>
      )}

      <form onSubmit={(e) => void submit(e)} className="space-y-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="เพิ่มความคิดเห็น..."
          className="w-full rounded-lg border border-border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={addComment.isPending || !body.trim()}
          className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {addComment.isPending ? <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> : "โพสต์"}
        </button>
      </form>
    </section>
  );
}
