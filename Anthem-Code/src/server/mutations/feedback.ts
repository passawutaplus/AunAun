import { anthemDb } from "@/integrations/supabase/client";
import { collectFeedbackDiagnostics } from "@/lib/feedbackDiagnostics";
import { featureFromRoute } from "@/lib/featureRoute";
import { uploadFeedbackScreenshot } from "@/lib/feedbackScreenshot";
import type { FeedbackKind } from "@/lib/feedbackTicket";

export type FeedbackNote = {
  userId: string;
  kind: FeedbackKind;
  message: string;
  /** Page the note is about; the Feedback page itself when unknown. */
  route: string;
  screenshot?: Blob | null;
};

/**
 * Send a note through the existing `anthem.submit_feedback` RPC — the same table, ticket numbers
 * and admin inbox (/admin/feedback) as the old feedback composer. The screenshot goes to the
 * `feedback-screenshots` bucket under the sender's folder first, as before.
 */
export async function submitFeedback(note: FeedbackNote): Promise<{ ticketNumber: string | null }> {
  const screenshotPath = note.screenshot ? await uploadFeedbackScreenshot(note.userId, note.screenshot) : null;
  const { data, error } = await anthemDb.rpc("submit_feedback" as never, {
    _feature: featureFromRoute(note.route),
    _route: note.route,
    _rating: null,
    _message: note.message.slice(0, 2000),
    _project_id: null,
    _user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    _viewport: typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "",
    _kind: note.kind,
    _screenshot_path: screenshotPath,
    _annotation_json: { comments: [] },
    _diagnostics: collectFeedbackDiagnostics(),
  } as never);
  if (error) throw error;
  return { ticketNumber: (data as { ticket_number?: string | null } | null)?.ticket_number ?? null };
}

/** The RPC raises "RATE_LIMIT: …", "INVALID: …" or "AUTH: …" with a Thai sentence; show the sentence. */
export function feedbackErrorText(err: unknown): string {
  const msg = err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message ?? "") : "";
  const m = /^(RATE_LIMIT|INVALID|AUTH):\s*(.+)$/.exec(msg.trim());
  return m ? m[2] : "ส่งไม่สำเร็จ ลองใหม่อีกครั้ง";
}
