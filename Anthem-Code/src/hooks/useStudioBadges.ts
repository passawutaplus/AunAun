import { useAuth } from "@/hooks/useAuth";
import { useHiringRequests } from "@/hooks/useHiringRequests";
import { useReceivedCollabRequests } from "@/hooks/useCollabRequests";
import { useChatInboxBadgeCount } from "@/hooks/useChat";
import { isContactedNewStatus } from "@/lib/hiringStatus";
import { isCollabContactedNewStatus } from "@/lib/collabInbox";
import type { StudioBadgeKey } from "@/lib/studioNav";
import { useMyStudioDocSummary } from "@/hooks/useStudioDocuments";

/** Counts for the My Studio sidebar pills (requests waiting for a reply, unread chats). */
export function useStudioBadges(): Record<StudioBadgeKey, number> {
  const { user } = useAuth();
  const { data: hire = [] } = useHiringRequests(user?.id);
  const { data: collab = [] } = useReceivedCollabRequests();
  const { data: chatUnread = 0 } = useChatInboxBadgeCount();
  const { data: money } = useMyStudioDocSummary();
  return {
    hireNew: hire.filter((r) => isContactedNewStatus(r.status)).length,
    collabNew: collab.filter((r) => isCollabContactedNewStatus(r.status)).length,
    chatUnread,
    // Overdue invoices + "client says paid" waiting for a receipt.
    billingAttention: (money?.overdueCount ?? 0) + (money?.clientMarkedCount ?? 0),
  };
}
