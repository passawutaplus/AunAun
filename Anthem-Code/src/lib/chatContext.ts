export type ChatEntrySource = "project" | "profile";

export type HireContextInput = {
  source: ChatEntrySource;
  projectTitle?: string | null;
  profileName?: string | null;
};

export type CollabContextInput = {
  source: ChatEntrySource;
  projectTitle?: string | null;
  profileName?: string | null;
};

export function buildHireContextMessage(input: HireContextInput): string {
  const title = input.projectTitle?.trim();
  if (input.source === "project" && title) {
    return `คุยโอกาสจากผลงาน «${title}» — สนใจงานที่เกี่ยวข้องกับผลงานนี้`;
  }
  if (input.source === "profile") {
    const name = input.profileName?.trim();
    return name
      ? `ดูโปรไฟล์ ${name} แล้วสนใจคุยโอกาส — อยากคุยรายละเอียด`
      : "ดูโปรไฟล์แล้วสนใจคุยโอกาส — อยากคุยรายละเอียด";
  }
  return title
    ? `คุยโอกาสจากผลงาน «${title}» — สนใจงานที่เกี่ยวข้อง`
    : "สนใจคุยโอกาส — อยากคุยรายละเอียด";
}

export function buildCollabContextMessage(input: CollabContextInput): string {
  const title = input.projectTitle?.trim();
  const lines = ["🤝 คำชวนคอลแลป"];
  if (input.source === "project" && title) {
    lines.push(`อ้างอิง: ${title}`);
  } else if (input.source === "profile") {
    const name = input.profileName?.trim();
    if (name) lines.push(`จากโปรไฟล์: ${name}`);
  } else if (title) {
    lines.push(`อ้างอิง: ${title}`);
  }
  lines.push("", "สนใจร่วมงาน — อยากคุยรายละเอียดเพิ่ม");
  return lines.join("\n");
}

/** Default collab message when user skips the form (DB requires non-empty message). */
export const DEFAULT_COLLAB_MESSAGE = "สนใจร่วมงาน — อยากคุยรายละเอียดเพิ่ม";

/** Default hire message for instant chat when the brief form is empty. */
export const DEFAULT_HIRE_MESSAGE = "สนใจจ้าง — อยากคุยรายละเอียดในแชท";

/** Prefix stored in text messages when system type is unavailable (pre-migration fallback). */
export const SYSTEM_MESSAGE_PREFIX = "[context]";

export function isSystemFallbackContent(content: string | null | undefined): boolean {
  return !!content?.startsWith(SYSTEM_MESSAGE_PREFIX);
}

export function stripSystemFallbackPrefix(content: string): string {
  return content.startsWith(SYSTEM_MESSAGE_PREFIX)
    ? content.slice(SYSTEM_MESSAGE_PREFIX.length).trimStart()
    : content;
}
