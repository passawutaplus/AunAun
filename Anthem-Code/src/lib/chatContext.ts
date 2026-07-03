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
    return `คุยต่อจากผลงาน «${title}» — สนใจโอกาสที่เกี่ยวข้องกับงานนี้`;
  }
  if (input.source === "profile") {
    const name = input.profileName?.trim();
    return name
      ? `ดูโปรไฟล์ ${name} แล้วสนใจคุยโอกาส — อยากคุยรายละเอียด`
      : "ดูโปรไฟล์แล้วสนใจคุยโอกาส — อยากคุยรายละเอียด";
  }
  return title
    ? `คุยต่อจากผลงาน «${title}» — สนใจโอกาสที่เกี่ยวข้อง`
    : "สนใจคุยโอกาส — อยากคุยรายละเอียด";
}

export function buildCollabContextMessage(input: CollabContextInput): string {
  const title = input.projectTitle?.trim();
  if (input.source === "project" && title) {
    return `สนใจคอลแลปจากผลงาน «${title}» — อยากคุยกัน`;
  }
  if (input.source === "profile") {
    const name = input.profileName?.trim();
    return name
      ? `ดูโปรไฟล์ ${name} แล้วสนใจร่วมงาน — อยากคุยกัน`
      : "ดูโปรไฟล์แล้วสนใจร่วมงาน — อยากคุยกัน";
  }
  return title
    ? `สนใจคอลแลปจากผลงาน «${title}» — อยากคุยกัน`
    : "สนใจคอลแลป — อยากคุยกัน";
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
