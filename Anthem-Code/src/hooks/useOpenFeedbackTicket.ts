import { useAuth } from "@/hooks/useAuth";
import { useAuthDialog } from "@/stores/authDialogStore";
import { useFeedbackComposer, type FeedbackDraft } from "@/stores/feedbackComposerStore";

export function useOpenFeedbackTicket() {
  const { user } = useAuth();
  const openLogin = useAuthDialog((s) => s.openLogin);
  const openForm = useFeedbackComposer((s) => s.openForm);

  return (preset?: Partial<FeedbackDraft>) => {
    if (!user) {
      openLogin();
      return;
    }
    openForm(preset);
  };
}
