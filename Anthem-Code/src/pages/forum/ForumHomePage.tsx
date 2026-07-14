import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Megaphone, X } from "lucide-react";
import { ForumPageHeader } from "@/components/forum/ForumLayout";
import { ForumTopicFilter } from "@/components/forum/ForumTopicFilter";
import { ForumTopicRow } from "@/components/forum/ForumTopicRow";
import { Button } from "@/components/ui/button";
import { useForumAnnouncements, useForumTopics } from "@/hooks/useForum";
import { useAuth } from "@/hooks/useAuth";
import { useAuthDialog } from "@/stores/authDialogStore";
import { parseForumListFilter, type ForumListFilter, type ForumSortTab } from "@/lib/forum";
import { cn } from "@/lib/utils";

const TABS: { id: ForumSortTab; label: string }[] = [
  { id: "latest", label: "ล่าสุด" },
  { id: "popular", label: "ยอดนิยม" },
  { id: "unanswered", label: "ยังไม่มีคำตอบ" },
];

const POLICY_BANNER_KEY = "aplus1.forum.policyBanner.dismissed";

export default function ForumHomePage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as ForumSortTab) || "latest";
  const sort: ForumSortTab = TABS.some((t) => t.id === tab) ? tab : "latest";
  const filter = parseForumListFilter(params.get("filter"));
  const { data: topics = [], isLoading, isError } = useForumTopics({ sort, filter });
  const { data: announcements = [] } = useForumAnnouncements(3);
  const { user } = useAuth();
  const openSignup = useAuthDialog((s) => s.openSignup);
  const [policyDismissed, setPolicyDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setPolicyDismissed(localStorage.getItem(POLICY_BANNER_KEY) === "1");
    } catch {
      setPolicyDismissed(false);
    }
  }, []);

  const dismissPolicy = () => {
    setPolicyDismissed(true);
    try {
      localStorage.setItem(POLICY_BANNER_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const goNew = () => {
    if (!user) openSignup("/forum/new");
    else navigate("/forum/new");
  };

  const writeParams = (next: { tab?: ForumSortTab; filter?: ForumListFilter | null }) => {
    const p = new URLSearchParams();
    const nextTab = next.tab ?? sort;
    const nextFilter = next.filter === undefined ? filter : next.filter;
    if (nextTab !== "latest") p.set("tab", nextTab);
    if (nextFilter) p.set("filter", nextFilter);
    setParams(p);
  };

  const emptyLabel =
    filter === "mine"
      ? "คุณยังไม่ได้ตั้งกระทู้"
      : filter === "saved"
        ? "ยังไม่มีกระทู้ที่บันทึก"
        : filter === "admin"
          ? "ยังไม่มีกระทู้จากแอดมิน"
          : "ยังไม่มีกระทู้ในแท็บนี้";

  return (
    <>
      <ForumPageHeader
        title="ชุมชนคนสร้างสรรค์"
        subtitle="คุยเรื่องแพลตฟอร์ม แจ้งปัญหา เสนอไอเดีย — ช่วยกันพัฒนา Aplus1"
      />

      {announcements.length > 0 ? (
        <section className="mb-5 space-y-2">
          {announcements.map((a) => (
            <Link
              key={a.id}
              to={`/forum/t/${a.id}`}
              className="flex items-start gap-3 rounded-xl border border-orange-200/80 bg-orange-50/60 dark:border-orange-900/50 dark:bg-orange-950/30 px-4 py-3 hover:bg-orange-50 dark:hover:bg-orange-950/50 transition-colors"
            >
              <Megaphone className="h-4 w-4 mt-0.5 shrink-0 text-orange-600 dark:text-orange-400" />
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-orange-700/80 dark:text-orange-300/80">
                  ประกาศจากทีม
                </span>
                <span className="block text-sm font-semibold text-foreground leading-snug">{a.title}</span>
              </span>
            </Link>
          ))}
        </section>
      ) : null}

      {policyDismissed === false ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground leading-relaxed">
          <p className="min-w-0 flex-1">
            ฟอรัมนี้มีไว้พูดคุยและพัฒนาแพลตฟอร์มร่วมกัน —{" "}
            <span className="text-foreground font-medium">ห้ามลงหางานหรือประกาศจ้าง</span>
          </p>
          <button
            type="button"
            onClick={dismissPolicy}
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="ปิดประกาศนี้"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      <div className="flex items-center gap-2 border-b border-border mb-4">
        <div className="flex gap-1 min-w-0 flex-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => writeParams({ tab: t.id })}
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
        <ForumTopicFilter
          value={filter}
          onChange={(next) => writeParams({ filter: next })}
          className="-mb-px"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8">กำลังโหลด…</p>
      ) : isError ? (
        <p className="text-sm text-destructive py-8">โหลดกระทู้ไม่สำเร็จ</p>
      ) : topics.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center space-y-3">
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
          {!filter || filter === "newest" || filter === "oldest" ? (
            <Button type="button" onClick={goNew}>
              สร้างกระทู้แรก
            </Button>
          ) : null}
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
