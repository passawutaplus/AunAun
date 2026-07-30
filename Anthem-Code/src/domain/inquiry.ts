import { isUuid } from "@/lib/uuid";
import type { ChatEntrySource } from "@/lib/chatContext";

/** Hire/collab from a project must carry a valid project_id for attribution. */
export function validateProjectInquiry(input: {
  source: ChatEntrySource;
  projectId?: string | null;
  serviceId?: string | null;
}): string | null {
  if (input.source === "project") {
    if (!input.projectId || !isUuid(input.projectId)) {
      return "ไม่พบผลงานอ้างอิง — เปิดจากหน้าผลงานแล้วลองใหม่";
    }
    return null;
  }
  if (input.source === "service") {
    if (!input.serviceId || !isUuid(input.serviceId)) {
      return "ไม่พบบริการอ้างอิง — เลือกแพ็กเกจแล้วลองใหม่";
    }
    return null;
  }
  return null;
}
