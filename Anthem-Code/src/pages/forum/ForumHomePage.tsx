import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { ForumPageHeader } from "@/components/forum/ForumLayout";
import { ForumTopicRow } from "@/components/forum/ForumTopicRow";
import { Button } from "@/components/ui/button";
import { useForumTopics } from "@/hooks/useForum";
import { useAuth } from "@/hooks/useAuth";
import { useAuthDialog } from "@/stores/authDialogStore";
import type { ForumSortTab } from "@/lib/forum";
import { cn } from "@/lib/utils";
import UserAvatar from "@/components/UserAvatar";
import { useProfile } from "@/hooks/useProfile";

const TABS: { id: ForumSortTab; label: string }[] = [
  { id: "latest", label: "ล่าสุด" },
  { id: "popular", label: "ยอดนิยม" },
  { id: "unanswered", label: "ยังไม่มีคำตอบ" },
];

export default function ForumHomePage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as ForumSortTab) || "latest";
  const sort: ForumSortTab = TABS.some((t) => t.id === tab) ? tab : "latest";
  const { data: topics = [], isLoading, isError } = useForumTopics({ sort });
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const openSignup = useAuthDialog((s) => s.openSignup);

  const goNew = () => {
    if (!user) openSignup("/forum/new");
    else navigate("/forum/new");
  };

  return (
    <>
      <ForumPageHeader title="ชุมชนคนสร้างสรรค์" subtitle="ถาม แชร์ และเติบโตไปด้วยกัน" />
      <div className="flex gap-1 border-b border-border mb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setParams(t.id === "latest" ? {} : { tab: t.id })}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              sort === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-6 flex items-center gap-3 rounded-xl border border-border bg-card p-3">
        <UserAvatar
          src={(profile as { avatar_url?: string | null } | null)?.avatar_url}
          name={(profile as { display_name?: string | null } | null)?.display_name}
          guest={!user}
          className="h-10 w-10"
        />
        <button
          type="button"
          className="flex-1 text-left text-sm text-muted-foreground rounded-lg bg-muted/50 px-3 py-2.5 hover:bg-muted"
          onClick={goNew}
        >
          มีอะไรอยากถามหรือแชร์กับชุมชน?
        </button>
        <Button type="button" size="sm" className="hidden sm:inline-flex gap-1 shrink-0" onClick={goNew}>
          <Plus className="h-4 w-4" /> สร้างกระทู้
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8">กำลังโหลด…</p>
      ) : isError ? (
        <p className="text-sm text-destructive py-8">โหลดกระทู้ไม่สำเร็จ</p>
      ) : topics.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center space-y-3">
          <p className="text-sm text-muted-foreground">ยังไม่มีกระทู้ในแท็บนี้</p>
          <Button type="button" onClick={goNew}>
            สร้างกระทู้แรก
          </Button>
        </div>
      ) : (
        <div>
          {topics.map((t) => (
            <ForumTopicRow key={t.id} topic={t} />
          ))}
        </div>
      )}
    </>
  );
}
