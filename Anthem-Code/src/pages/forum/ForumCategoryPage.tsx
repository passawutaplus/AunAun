import { Link, useParams, useSearchParams } from "react-router-dom";
import { ForumPageHeader } from "@/components/forum/ForumLayout";
import { ForumTopicFilter } from "@/components/forum/ForumTopicFilter";
import { ForumTopicRow } from "@/components/forum/ForumTopicRow";
import { Button } from "@/components/ui/button";
import { useForumCategories, useForumTopics } from "@/hooks/useForum";
import { FORUM_CATEGORY_META, isForumCategorySlug } from "@/data/forumCategories";
import { parseForumListFilter, type ForumListFilter } from "@/lib/forum";

export default function ForumCategoryPage() {
  const { slug = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const filter = parseForumListFilter(params.get("filter"));
  const { data: categories = [] } = useForumCategories();
  const cat = categories.find((c) => c.slug === slug);
  const meta = isForumCategorySlug(slug) ? FORUM_CATEGORY_META[slug] : null;
  const { data: topics = [], isLoading, isError } = useForumTopics({
    categorySlug: slug,
    sort: "latest",
    filter,
  });

  const title = cat?.name_th ?? meta?.nameTh ?? "หมวดหมู่";
  const subtitle = cat?.description ?? meta?.description ?? "";

  const setFilter = (next: ForumListFilter | null) => {
    const p = new URLSearchParams(params);
    if (next) p.set("filter", next);
    else p.delete("filter");
    setParams(p);
  };

  const emptyLabel =
    filter === "mine"
      ? "คุณยังไม่มีกระทู้ในหมวดนี้"
      : filter === "saved"
        ? "ยังไม่มีกระทู้ที่บันทึกในหมวดนี้"
        : filter === "admin"
          ? "ยังไม่มีกระทู้จากแอดมินในหมวดนี้"
          : "ยังไม่มีกระทู้ในหมวดนี้";

  return (
    <>
      <ForumPageHeader title={title} subtitle={subtitle} />
      <div className="mb-4 flex items-center justify-end gap-2">
        <ForumTopicFilter value={filter} onChange={setFilter} />
        <Button asChild size="sm">
          <Link to={`/forum/new?category=${encodeURIComponent(slug)}`}>สร้างในหมวดนี้</Link>
        </Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8">กำลังโหลด…</p>
      ) : isError ? (
        <p className="text-sm text-destructive py-8">โหลดกระทู้ไม่สำเร็จ</p>
      ) : topics.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center space-y-3">
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
          {!filter || filter === "newest" || filter === "oldest" ? (
            <Button asChild>
              <Link to={`/forum/new?category=${encodeURIComponent(slug)}`}>สร้างกระทู้</Link>
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
