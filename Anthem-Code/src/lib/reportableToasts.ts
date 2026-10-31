import { toast, type ExternalToast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { recordFeedbackError } from "@/lib/feedbackDiagnostics";
import { useAuthDialog } from "@/stores/authDialogStore";
import { useFeedbackComposer } from "@/stores/feedbackComposerStore";

let installed = false;

function messageText(message: unknown): string {
  return typeof message === "string" ? message : "";
}

async function reportFromToast(text: string) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    useAuthDialog.getState().openLogin();
    return;
  }
  useFeedbackComposer.getState().openForm({
    kind: "bug",
    message: text ? `เจอข้อความ error: "${text}"\n\nตอนนั้นกำลังทำ: ` : "",
  });
}

/** Adds a "แจ้งปัญหานี้" action to every error toast and logs it for feedback diagnostics. */
export function installReportableErrorToasts(): void {
  if (installed) return;
  installed = true;
  const original = toast.error;
  toast.error = ((message: Parameters<typeof original>[0], data?: ExternalToast) => {
    const text = messageText(message).slice(0, 200);
    recordFeedbackError(`toast: ${text}`);
    const composerOpen = useFeedbackComposer.getState().phase !== "idle";
    if (composerOpen || data?.action || data?.cancel) return original(message, data);
    return original(message, {
      ...data,
      action: { label: "แจ้งปัญหานี้", onClick: () => void reportFromToast(text) },
    });
  }) as typeof toast.error;
}
