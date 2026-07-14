import { Link, useSearchParams } from "react-router-dom";
import { ForumPageHeader } from "@/components/forum/ForumLayout";
import { ForumTopicRow } from "@/components/forum/ForumTopicRow";
import { Button } from "@/components/ui/button";
import { useMyForumBookmarks, useMyForumTopics } from "@/hooks/useForum";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "topics", label: "กระทู้ของฉัน" },
  { id: "saved", label: "ที่บันทึกไว้" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function ForumMyPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab") as TabId | null;
  const tab: TabId = TABS.some((t) => t.id === raw) ? (raw as TabId) : "topics";

  const mine = useMyForumTopics();
  const saved = useMyForumBookmarks();
  const active = tab === "topics" ? mine : saved;
  const topics = active.data ?? [];

  return (
    <>
      <ForumPageHeader
        title="โปรไฟล์ชุมชนของฉัน"
        subtitle="มอนิเตอร์กระทู้ที่คุณโพสต์ และรายการที่บันทึกไว้"
      />

      <div className="flex gap-1 border-b border-border mb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setParams(t.id === "topics" ? {} : { tab: t.id })}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {active.isLoading ? (
        <p className="text-sm text-muted-foreground py-8">กำลังโหลด…</p>
      ) : active.isError ? (
        <p className="text-sm text-destructive py-8">โหลดไม่สำเร็จ</p>
      ) : topics.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            {tab === "topics" ? "คุณยังไม่ได้สร้างกระทู้" : "ยังไม่มีกระทู้ที่บันทึกไว้"}
          </p>
          {tab === "topics" ? (
            <Button asChild>
              <Link to="/forum/new">สร้างกระทู้</Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link to="/forum">ไปหน้าชุมชน</Link>
            </Button>
          )}
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
