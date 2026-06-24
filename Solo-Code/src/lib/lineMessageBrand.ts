import type { LineNotifyKind } from "@/lib/lineNotificationKinds";
import { formatLineNotification, LINE_NOTIFICATION_HEADER } from "@/lib/lineMessageFormat";

/** @deprecated Use LINE_NOTIFICATION_HEADER from lineMessageFormat */
export function lineMessagePrefix(): string {
  return LINE_NOTIFICATION_HEADER;
}

export function formatLineTestMessage(kind: LineNotifyKind, body: string): string {
  return formatLineNotification(kind, body);
}
