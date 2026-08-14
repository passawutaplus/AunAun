import { FolderOpen } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import { useAuth } from "@/hooks/useAuth";
import { useCommentMentionProjects, type MentionProject } from "@/hooks/useCommentMentionProjects";
import { useFollowingList } from "@/hooks/useFollowLists";
import {
  insertMentionHandle,
  insertMentionProject,
  mentionQueryFromText,
  sliceMentionMatches,
} from "@/lib/commentMentions";
import { cn } from "@/lib/utils";

export type MentionFriend = {
  handle: string;
  name: string;
  avatarUrl?: string | null;
};

export { insertMentionHandle, insertMentionProject, mentionQueryFromText };

type Props = {
  query: string | null;
  onPick: (nextText: string) => void;
  text: string;
  className?: string;
};

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="px-3 pt-2 pb-1 text-[11px] font-medium text-muted-foreground">
      {children}
    </p>
  );
}

/** Popup above the composer when the user types @ — people or published works. */
export function MentionFriendPopup({ query, text, onPick, className }: Props) {
  const { user } = useAuth();
  const { data: following = [] } = useFollowingList(user?.id);
  const { data: projects = [], isLoading: projectsLoading } = useCommentMentionProjects(query);

  if (query == null) return null;

  const friends: MentionFriend[] = following
    .filter((f) => f.username?.trim())
    .map((f) => ({
      handle: f.username!.trim(),
      name: f.displayName,
      avatarUrl: f.avatarUrl,
    }));

  const people = sliceMentionMatches(
    friends,
    query,
    (f, q) => f.handle.toLowerCase().includes(q) || f.name.toLowerCase().includes(q),
  );

  const pickPerson = (handle: string) => onPick(insertMentionHandle(text, handle));
  const pickProject = (p: MentionProject) => onPick(insertMentionProject(text, p.title, p.id));

  const noPeople = people.length === 0;
  const noProjects = !projectsLoading && projects.length === 0;

  return (
    <div
      className={cn(
        "absolute left-0 bottom-full z-30 mb-1 w-56 max-w-[calc(100%-0.5rem)] max-h-72 overflow-y-auto rounded-xl border border-border bg-popover shadow-lg",
        className,
      )}
      role="listbox"
      aria-label="เลือกคนหรือผลงานที่จะกล่าวถึง"
    >
      <SectionLabel>Follow</SectionLabel>
      {noPeople ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">
          {friends.length === 0
            ? "ยังไม่มีคนที่ติดตาม — ติดตามก่อนจึงกล่าวถึงได้"
            : "ไม่พบชื่อที่ตรง"}
        </p>
      ) : (
        people.map((f) => (
          <button
            key={f.handle}
            type="button"
            role="option"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/70"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pickPerson(f.handle)}
          >
            <UserAvatar
              src={f.avatarUrl}
              name={f.name}
              className="h-7 w-7"
              fallbackClassName="text-[10px]"
            />
            <span className="min-w-0 flex-1 truncate">
              <span className="font-medium">{f.name}</span>
              <span className="ml-1 text-xs text-muted-foreground">@{f.handle}</span>
            </span>
          </button>
        ))
      )}

      <div className="mx-3 my-1 border-t border-border" />

      <SectionLabel>Project</SectionLabel>
      {projectsLoading ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">กำลังค้นหาผลงาน…</p>
      ) : noProjects ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">
          {query.trim() ? "ไม่พบผลงานที่ตรง" : "ยังไม่มีผลงานที่เผยแพร่"}
        </p>
      ) : (
        projects.map((p) => (
          <button
            key={p.id}
            type="button"
            role="option"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/70"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => pickProject(p)}
          >
            {p.coverUrl ? (
              <img src={p.coverUrl} alt="" className="h-7 w-7 rounded-md object-cover shrink-0" />
            ) : (
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-muted">
                <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
            )}
            <span className="min-w-0 flex-1 truncate font-medium">{p.title}</span>
          </button>
        ))
      )}
    </div>
  );
}
