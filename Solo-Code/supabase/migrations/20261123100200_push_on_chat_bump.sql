-- Push for follow-up chat messages. The chat trigger (20260718120000_chat_notification_protocol_preview.sql) keeps
-- one unread in-app notification per conversation: a new message UPDATEs that row (new text, created_at = now())
-- instead of inserting another one. notifications_dispatch_push only ran AFTER INSERT, so once a conversation had
-- an unread notification, later messages never reached send-push (no phone notification, only the in-app bell).
-- Now a bump of created_at on an unread, not dismissed row sends a push too. send-push tags chat pushes per
-- conversation, so the phone shows one notification that updates.

DROP TRIGGER IF EXISTS notifications_dispatch_push_bump ON shared.notifications;
CREATE TRIGGER notifications_dispatch_push_bump
  AFTER UPDATE OF created_at ON shared.notifications
  FOR EACH ROW
  WHEN (
    NEW.created_at > OLD.created_at
    AND COALESCE(NEW.is_read, false) = false
    AND COALESCE(NEW.is_dismissed, false) = false
  )
  EXECUTE FUNCTION shared.dispatch_push_notification();
