import { ClipboardList, Link2, Users, CheckSquare } from "lucide-react";
import { ChatCardShell, type ChatCardTone } from "@/components/chat/ChatCardShell";
import {
  COLLAB_TOOL_PREFIX,
  type CollabToolKind,
} from "@/lib/collabToolkit";

const META: Record<
  CollabToolKind,
  { title: string; icon: typeof ClipboardList; tone: ChatCardTone }
> = {
  plan: { title: "แผนงานคอลแลป", icon: ClipboardList, tone: "collab" },
  roles: { title: "แบ่งบทบาท", icon: Users, tone: "collab" },
  refs: { title: "อ้างอิงร่วม", icon: Link2, tone: "collab" },
  checkin: { title: "เช็คอิน", icon: CheckSquare, tone: "collab" },
};

type Props = {
  kind: CollabToolKind;
  content: string;
};

/** Renders structured collab-tool / pipeline snapshot messages as a card. */
export function CollabToolkitCard({ kind, content }: Props) {
  const meta = META[kind];
  const prefixes =
    kind === "plan"
      ? [COLLAB_TOOL_PREFIX.plan, COLLAB_TOOL_PREFIX.planLegacy]
      : [COLLAB_TOOL_PREFIX[kind]];
  let body = content.trim();
  for (const prefix of prefixes) {
    if (body.startsWith(prefix)) {
      body = body.slice(prefix.length).replace(/^\n+/, "");
      break;
    }
  }

  return (
    <ChatCardShell tone={meta.tone} icon={meta.icon} title={meta.title} className="min-w-[15rem] max-w-[22rem]">
      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-foreground">
        {body}
      </p>
    </ChatCardShell>
  );
}
