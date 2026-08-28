import { useFeedbackComposer } from "@/stores/feedbackComposerStore";
import FeedbackComposer from "@/components/feedback/FeedbackComposer";
import FeedbackSnipOverlay from "@/components/feedback/FeedbackSnipOverlay";

export default function FeedbackTicketHost() {
  const phase = useFeedbackComposer((s) => s.phase);
  if (phase === "idle") return null;
  if (phase === "snip") return <FeedbackSnipOverlay />;
  return <FeedbackComposer />;
}
