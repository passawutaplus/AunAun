import { Link } from "react-router-dom";
import { Fragment, type ReactNode } from "react";
import { isUuid } from "@/lib/profileRoutes";
import { isCommentEmojiToken, splitCommentEmojiParts } from "@/lib/twemoji";
import { TwemojiImg } from "@/components/comments/TwemojiImg";

const HANDLE = /@([a-zA-Z0-9_]{2,32})/g;
/** Last @… token still being typed (Thai/English). Stops at space or `[`. */
const AT_QUERY = /@([^\s[\]]*)$/u;
const PROJECT_TOKEN =
  /@\[([^\]]{1,80})\]\(\/project\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\)/gi;
const MENTION_SPLIT =
  /(@\[[^\]]{1,80}\]\(\/project\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\)|@[a-zA-Z0-9_]{2,32})/gi;

export const MENTION_PREVIEW_ROWS = 3;
export const MENTION_SEARCH_ROWS = 8;

export function mentionQueryFromText(text: string): string | null {
  const m = text.match(AT_QUERY);
  return m ? m[1] : null;
}

export function insertMentionHandle(text: string, handle: string): string {
  const token = `@${handle} `;
  if (AT_QUERY.test(text)) return text.replace(AT_QUERY, token);
  const pad = text && !text.endsWith(" ") ? " " : "";
  return `${text}${pad}${token}`;
}

export function sanitizeProjectMentionTitle(title: string): string {
  return title.replace(/[\[\]()]/g, "").replace(/\s+/g, " ").trim().slice(0, 80) || "ผลงาน";
}

export function formatProjectMention(title: string, projectId: string): string {
  return `@[${sanitizeProjectMentionTitle(title)}](/project/${projectId})`;
}

export function insertMentionProject(text: string, title: string, projectId: string): string {
  const token = `${formatProjectMention(title, projectId)} `;
  if (AT_QUERY.test(text)) return text.replace(AT_QUERY, token);
  const pad = text && !text.endsWith(" ") ? " " : "";
  return `${text}${pad}${token}`;
}

export function sliceMentionMatches<T>(
  items: T[],
  query: string,
  match: (item: T, q: string) => boolean,
): T[] {
  const q = query.trim().toLowerCase();
  const matched = q ? items.filter((item) => match(item, q)) : items;
  return matched.slice(0, q ? MENTION_SEARCH_ROWS : MENTION_PREVIEW_ROWS);
}

export function extractMentionHandles(text: string): string[] {
  const withoutProjects = text.replace(PROJECT_TOKEN, " ");
  const seen = new Set<string>();
  const out: string[] = [];
  const re = new RegExp(HANDLE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(withoutProjects))) {
    const handle = m[1].toLowerCase();
    if (seen.has(handle)) continue;
    seen.add(handle);
    out.push(handle);
  }
  return out;
}

export function extractMentionedProjectIds(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const re = new RegExp(PROJECT_TOKEN.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const id = m[2].toLowerCase();
    if (!isUuid(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function renderPlainWithTwemoji(text: string, keyPrefix: string): ReactNode {
  const parts = splitCommentEmojiParts(text);
  if (parts.length === 1 && !isCommentEmojiToken(parts[0] ?? "")) {
    return text;
  }
  return parts.map((part, i) => {
    if (!part) return null;
    if (isCommentEmojiToken(part)) {
      return <TwemojiImg key={`${keyPrefix}-e${i}`} emoji={part} />;
    }
    return <Fragment key={`${keyPrefix}-t${i}`}>{part}</Fragment>;
  });
}

export function renderCommentMentions(text: string): ReactNode {
  const parts = text.split(MENTION_SPLIT);
  return parts.map((part, i) => {
    const project = part.match(
      /^@\[([^\]]{1,80})\]\(\/project\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\)$/i,
    );
    if (project && isUuid(project[2])) {
      return (
        <Link
          key={i}
          to={`/project/${project[2]}`}
          className="text-primary font-medium hover:underline"
        >
          @{project[1]}
        </Link>
      );
    }
    const handle = part.match(/^@([a-zA-Z0-9_]{2,32})$/);
    if (!handle) return <Fragment key={i}>{renderPlainWithTwemoji(part, String(i))}</Fragment>;
    return (
      <Link key={i} to={`/@${handle[1]}`} className="text-primary font-medium hover:underline">
        {part}
      </Link>
    );
  });
}
